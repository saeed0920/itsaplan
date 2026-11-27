import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { it } from 'node:test';

const root = new URL('../packages/db/drizzle/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
type Entry = { idx: number; when: number; tag: string };
const { entries }: { entries: Entry[] } = JSON.parse(read('meta/_journal.json').toString());
const forkCount = 191;

// Hash journal entries together with their SQL byte hashes in application order.
const ledgerHash = (segment: Entry[]) =>
  sha256(JSON.stringify(segment.map((entry) => [entry, sha256(read(`${entry.tag}.sql`))])));

it('preserves the 191 applied fork migrations and their journal entries', () => {
  assert.equal(
    ledgerHash(entries.slice(0, forkCount)),
    'db216f3ebb190875d35cad7a6a01a72dd7b45502d589fc832019c7fe88639360',
  );
});

it('appends the 14 v1.13.0 migrations with shifted tags and exact SQL and timestamps', () => {
  const upstream = entries.slice(forkCount, forkCount + 14);
  assert.equal(upstream.length, 14);
  assert.equal(
    ledgerHash(upstream),
    '345140f76e6cede5f70aae179e7e794060edf1fead1c461ff17faaa4c70da9c5',
  );
  assert.deepEqual(
    readdirSync(root)
      .filter((file) => file.endsWith('.sql'))
      .sort(),
    entries.map(({ tag }) => `${tag}.sql`),
  );
});

it('keeps the fork and appended upstream snapshots in one chain', () => {
  const snapshot = (index: number) =>
    JSON.parse(read(`meta/${String(index).padStart(4, '0')}_snapshot.json`).toString());
  let previous = snapshot(176);
  const ids = new Set([previous.id]);
  for (let index = 177; index < entries.length; index++) {
    assert.equal(entries[index].idx, index);
    assert.ok(entries[index].when > entries[index - 1].when);
    const current = snapshot(index);
    assert.equal(current.prevId, previous.id, entries[index].tag);
    assert.ok(!ids.has(current.id), `duplicate snapshot ID at ${entries[index].tag}`);
    ids.add(current.id);
    previous = current;
  }
});
