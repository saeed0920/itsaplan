import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';

const root = new URL('../packages/db/drizzle/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const journal = JSON.parse(read('meta/_journal.json'));

it('keeps fork history ahead of appended v1.11 migrations and snapshots in one chain', () => {
  const tail = journal.entries.slice(177);
  assert.deepEqual(
    tail.map((entry: { tag: string }) => entry.tag),
    [
      '0177_issue_multi_assignee',
      '0178_thin_blue_shield',
      '0179_chilly_multiple_man',
      '0180_far_lorna_dane',
      '0181_upstream_import_record_more_entities',
      '0182_upstream_import_job_source_project',
      '0183_upstream_onboarding_seen',
      '0184_upstream_seed_job_settings',
      '0185_upstream_web_push',
    ],
  );
  assert.deepEqual(
    tail.slice(0, 4).map((entry: { when: number }) => entry.when),
    [1794473221479, 1794658696861, 1794679509254, 1794738171966],
  );
  for (let index = 177; index < journal.entries.length; index++) {
    const entry = journal.entries[index];
    assert.equal(entry.idx, index);
    assert.ok(entry.when > journal.entries[index - 1].when);
    assert.ok(read(entry.tag + '.sql').length > 0);
    const current = JSON.parse(read(`meta/${String(index).padStart(4, '0')}_snapshot.json`));
    const previous = JSON.parse(read(`meta/${String(index - 1).padStart(4, '0')}_snapshot.json`));
    assert.equal(current.prevId, previous.id);
  }
});
it('preserves the upstream SQL payloads exactly', () => {
  const hashes = [
    'f785e6ce5b6d6a33cd865a2db8a9022eb6ffee6662aab9f8acdb5ba848a53c7c',
    '2bc0869267eb080f40601cd4c7f80a2508078e437099588de6a7183f8a94f4e0',
    '29d5e103fa0d7e04f40b9e23cda98cc22f825ba5ec260a311f6eb5473b876387',
    '6d681f81923403c175c595e018209b04c68267cfb86aeafb8e894de5ee1fc6a6',
    '3192dc5ea5a8537033f7de81b5e2e6b8b92295e2d4d56d7b83c7cddb9a7f8d0e',
  ];
  journal.entries.slice(181).forEach((entry: { tag: string }, index: number) =>
    assert.equal(
      createHash('sha256')
        .update(read(entry.tag + '.sql'))
        .digest('hex'),
      hashes[index],
    ),
  );
});
