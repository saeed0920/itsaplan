import assert from 'node:assert/strict';
import { test } from 'node:test';
import { issueAssigneeIds, toggleAssignee } from './assignees';
import { applyFilters, type FilterSet } from './filters';
import { buildGroups, groupIssues, type GroupLabels } from './project';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { Issue } from '@/lib/api/endpoints/issues';

test('legacy single assignment and authoritative empty arrays', () => {
  assert.deepEqual(issueAssigneeIds({ assigneeUserId: 'one' }), ['one']);
  assert.deepEqual(issueAssigneeIds({ assigneeUserId: null }), []);
  assert.deepEqual(issueAssigneeIds({ assigneeUserId: 'old', assigneeUserIds: [] }), []);
});

test('a secondary-assignee filter does not hide the primary-assignee group', () => {
  const fixture: Pick<ProjectDetail, 'columns' | 'assignees'> = {
    columns: [],
    assignees: ['one', 'two'].map((userId) => ({
      userId,
      name: userId,
      email: `${userId}@example.test`,
      username: null,
      image: null,
      kind: 'member' as const,
      agentKind: null,
      restrictedToUserId: null,
      respondsToMention: null,
      canReadWorkItems: true,
    })),
  };
  const project = fixture as ProjectDetail;
  const issue = { id: 1, assigneeUserId: 'one', assigneeUserIds: ['one', 'two'] } as Issue;
  const filters: FilterSet = {
    conditions: [{ id: 'test', field: 'assignee', op: 'is', values: ['two'] }],
  };
  const visible = applyFilters([issue], filters, project);
  const groups = buildGroups(
    project,
    'assignee',
    { noAssignee: 'No assignee' } as GroupLabels,
    filters,
  );
  assert.deepEqual(groupIssues(groups, visible, 'assignee').get('aone'), [issue]);
  assert.deepEqual(
    applyFilters([issue], { conditions: [{ ...filters.conditions[0], op: 'is_not' }] }, project),
    [],
  );
});

test('toggle preserves other assignees without duplicates', () => {
  assert.deepEqual(toggleAssignee(['one'], 'two'), ['one', 'two']);
  assert.deepEqual(toggleAssignee(['one', 'two'], 'one'), ['two']);
  assert.deepEqual(toggleAssignee(['one'], 'one'), []);
});
