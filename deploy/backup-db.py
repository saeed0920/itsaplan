#!/usr/bin/env python3
"""Root-only online PostgreSQL backup, isolated restore validation, 30-day retention."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = Path('/var/backups/itsaplan-db')
INTERVAL = 3 * 86400
RETENTION = 30 * 86400
FORMAT = 'itsaplan-pg-custom-v1'
NAME = re.compile(r'db-\d{8}T\d{6}Z-\d+')


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def completed(directory):
    if directory.is_symlink() or not directory.is_dir() or not NAME.fullmatch(directory.name):
        return None
    expected = {'database.dump', 'metadata.json', 'SHA256SUMS', 'COMPLETE', 'restore.log'}
    if set(p.name for p in directory.iterdir()) != expected:
        return None
    if any(p.is_symlink() or not p.is_file() for p in directory.iterdir()):
        return None
    try:
        data = json.loads((directory / 'metadata.json').read_text())
        if data['format'] != FORMAT or data['restoreVerified'] is not True:
            return None
        if (directory / 'COMPLETE').read_text() != FORMAT + '\n':
            return None
        if (directory / 'SHA256SUMS').read_text() != data['sha256'] + '  database.dump\n':
            return None
        if sha(directory / 'database.dump') != data['sha256']:
            return None
        return data
    except (ValueError, KeyError, OSError):
        return None


def due(root, now):
    # A broken marker fails closed; never silently replace a corrupt schedule state.
    marker = root / 'last-success.json'
    return not marker.exists() or now - json.loads(marker.read_text())['finishedAt'] >= INTERVAL


def prune(root, newest, now):
    for directory in root.iterdir():
        if directory == newest:
            continue
        data = completed(directory)
        if data and now - data['finishedAt'] > RETENTION:
            shutil.rmtree(directory)


def run(args, log, **kwargs):
    return subprocess.run(args, check=True, stderr=log, timeout=180, **kwargs)


def self_test():
    with tempfile.TemporaryDirectory(prefix='itsaplan-backup-check-') as temp:
        root = Path(temp)
        now = 4_000_000
        assert due(root, now)
        (root / 'last-success.json').write_text(json.dumps({'finishedAt': now - INTERVAL + 1}))
        assert not due(root, now)
        assert due(root, now + 1)
        def fixture(name, age):
            directory = root / name
            directory.mkdir()
            (directory / 'database.dump').write_bytes(b'synthetic-only')
            digest = sha(directory / 'database.dump')
            (directory / 'metadata.json').write_text(json.dumps({'format': FORMAT, 'restoreVerified': True, 'finishedAt': now - age, 'sha256': digest}))
            (directory / 'SHA256SUMS').write_text(digest + '  database.dump\n')
            (directory / 'COMPLETE').write_text(FORMAT + '\n')
            (directory / 'restore.log').write_text('')
            return directory
        old = fixture('db-20260101T000000Z-1', RETENTION + 1)
        newest = fixture('db-20260201T000000Z-2', 0)
        incomplete = fixture('db-20260101T000000Z-3', RETENTION + 1)
        (incomplete / 'COMPLETE').unlink()
        unrelated = root / 'manual-backup'; unrelated.mkdir()
        corrupt = fixture('db-20260101T000000Z-4', RETENTION + 1)
        (corrupt / 'database.dump').write_bytes(b'corrupt')
        link = root / 'db-20260101T000000Z-5'; link.symlink_to(newest, target_is_directory=True)
        prune(root, newest, now)
        assert not old.exists() and newest.exists() and incomplete.exists() and unrelated.exists() and corrupt.exists() and link.is_symlink()
        assert completed(newest) and not completed(corrupt)
    print('PASS: 72h due boundary, verified-only 30-day retention, corruption/incomplete/symlink/unrelated preservation')


def backup():
    assert os.geteuid() == 0 and sys.argv[1:] in (['--apply'], ['--if-due']), 'Requires root --apply or --if-due'
    os.umask(0o077)
    ROOT.mkdir(mode=0o700, parents=True, exist_ok=True)
    assert not ROOT.is_symlink() and ROOT.stat().st_uid == 0 and ROOT.stat().st_mode & 0o777 == 0o700
    with (ROOT / '.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Backup already running; skipped')
            return
        if sys.argv[1] == '--if-due' and not due(ROOT, time.time()):
            return
        assert shutil.disk_usage(ROOT).free >= 2 * 1024 ** 3, 'Less than 2GiB free; backup refused'
        name = datetime.datetime.now(datetime.timezone.utc).strftime('db-%Y%m%dT%H%M%SZ-') + str(os.getpid())
        directory = ROOT / name
        directory.mkdir(mode=0o700)
        clone = 'itsaplan-db-restore-' + str(os.getpid())
        created = False
        try:
            with (directory / 'restore.log').open('w') as log:
                size = run(['docker', 'exec', 'itsaplan-postgres-1', 'sh', '-c', 'exec psql -XAt -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT pg_database_size(current_database());"'], log, stdout=subprocess.PIPE, text=True)
                assert int(size.stdout.strip()) <= 256 * 1024 ** 2, 'DB exceeds tested 256MiB backup/restore ceiling; operator review required'
                with (directory / 'database.dump').open('wb') as dump:
                    run(['docker', 'exec', 'itsaplan-postgres-1', 'sh', '-c', 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl --lock-wait-timeout=10s'], log, stdout=dump)
                assert (directory / 'database.dump').stat().st_size > 0
                collision = subprocess.run(['docker', 'container', 'inspect', clone], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
                assert collision.returncode != 0, 'Restore container collision'
                # ponytail: 384MiB disposable data ceiling; raise only after measuring larger restore needs.
                run(['docker', 'run', '--pull=never', '-d', '--name', clone, '--network', 'none', '--memory', '512m', '--memory-swap', '512m', '--cpus', '1', '--pids-limit', '128', '--label', 'puzzley.task=itsaplan-db-backup', '--tmpfs', '/var/lib/postgresql/data:size=384m', '-e', 'POSTGRES_USER=itsaplan', '-e', 'POSTGRES_PASSWORD=disposable-restore-only', '-e', 'POSTGRES_DB=itsaplan_restore_test', 'postgres:17-alpine'], log, stdout=log)
                created = True
                for _ in range(40):
                    ready = subprocess.run(['docker', 'exec', clone, 'pg_isready', '-U', 'itsaplan', '-d', 'itsaplan_restore_test'], stdout=log, stderr=log, timeout=5)
                    if ready.returncode == 0:
                        break
                    time.sleep(1)
                else:
                    raise RuntimeError('Restore clone not ready')
                with (directory / 'database.dump').open('rb') as dump:
                    run(['docker', 'exec', '-i', clone, 'pg_restore', '--exit-on-error', '--no-owner', '--no-acl', '-U', 'itsaplan', '-d', 'itsaplan_restore_test'], log, stdin=dump, stdout=log)
                run(['docker', 'exec', clone, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'itsaplan', '-d', 'itsaplan_restore_test', '-c', 'SELECT count(*) FROM issue; SELECT count(*) FROM issue_assignee;'], log, stdout=log)
            subprocess.run(['docker', 'rm', '-f', clone], check=True, stdout=subprocess.DEVNULL, timeout=30)
            created = False
            digest = sha(directory / 'database.dump')
            metadata = {'format': FORMAT, 'finishedAt': time.time(), 'restoreVerified': True, 'sha256': digest, 'encrypted': False}
            (directory / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
            (directory / 'SHA256SUMS').write_text(digest + '  database.dump\n')
            (directory / 'COMPLETE').write_text(FORMAT + '\n')
            assert completed(directory)
            temporary = ROOT / '.last-success.tmp'
            temporary.write_text(json.dumps({'finishedAt': metadata['finishedAt'], 'backup': name}) + '\n')
            temporary.replace(ROOT / 'last-success.json')
            prune(ROOT, directory, metadata['finishedAt'])
            print('Backup/isolated restore/SHA PASS:', directory)
        finally:
            if created:
                subprocess.run(['docker', 'rm', '-f', clone], check=True, stdout=subprocess.DEVNULL, timeout=30)


if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        self_test()
    else:
        backup()
