import { beforeEach, describe, expect, it } from 'bun:test';
import { db, issueAssignee } from '@repo/db';
import { eq } from 'drizzle-orm';
import { api, authedApi, createProject } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { createRole } from '#tests/helpers/roles';
import { createAgent } from '#tests/helpers/agents';
import { applyFilters } from '#modules/views/filters';
import { getIssue } from '#modules/issues/service';
import { exportProject } from '#modules/import-export/export';

async function setup() {
  const owner = await signUpTestUser();
  const client = authedApi(owner.cookie);
  await createProject(client, { key: 'MKT', name: 'Marketing' });
  const member = await signUpTestUser();
  const invite = await client
    .projects({ projectKey: 'MKT' })
    .invites.post({ email: member.email, role: 'member' });
  const memberApi = authedApi(member.cookie);
  await memberApi.invites({ token: invite.data!.token }).accept.post();
  const project = (await client.projects({ projectKey: 'MKT' }).get()).data!;
  const create = (assigneeUserIds: string[]) =>
    client.projects({ projectKey: 'MKT' }).issues.post({
      title: 'Shared task',
      columnId: project.columns[0].id,
      assigneeUserIds,
    });
  return { owner, client, member, memberApi, project, create };
}

beforeEach(resetDb);

describe('multiple issue assignees', () => {
  it('creates and reads every assignee; legacy primary is unchanged', async () => {
    const { owner, client, member, project, create } = await setup();
    const ids = [owner.userId, member.userId];
    const created = await create(ids);
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({ assigneeUserId: owner.userId, assigneeUserIds: ids });
    const read = await client.issues({ issueId: created.data!.id }).get();
    expect(read.data!.assigneeUserIds).toEqual(ids);
    expect(read.data!.watchers.map((w) => w.userId)).toContain(member.userId);
    const legacy = await client.projects({ projectKey: 'MKT' }).issues.post({
      title: 'Legacy',
      columnId: project.columns[0].id,
      assigneeUserId: member.userId,
    });
    expect(legacy.data).toMatchObject({
      assigneeUserId: member.userId,
      assigneeUserIds: [member.userId],
    });
    const exported = await exportProject(project.project.id);
    expect(
      exported.issues.find((i) => i.identifier === created.data!.identifier)!.assigneeEmails,
    ).toEqual([owner.email, member.email]);
  });

  it('matches secondary assignees in lists, board and saved-view filters', async () => {
    const { owner, client, member, project, create } = await setup();
    const created = (await create([owner.userId, member.userId])).data!;
    const hits = await client.issues.get({ query: { assigneeUserId: member.userId } });
    expect(hits.data!.map((i) => i.id)).toContain(created.id);
    const board = await client.projects({ projectKey: 'MKT' }).issues.board.get();
    const row = board.data!.issues.find((i) => i.id === created.id)!;
    expect(row.assigneeUserIds).toEqual([owner.userId, member.userId]);
    expect(
      applyFilters(
        [(await getIssue(created.id))!],
        { conditions: [{ field: 'assignee', op: 'is', values: [member.userId] }] },
        project.columns,
      ).map((i) => i.id),
    ).toEqual([created.id]);
  });

  it('adds, removes, clears and notifies only newly assigned members', async () => {
    const { owner, client, member, memberApi, create } = await setup();
    const created = (await create([owner.userId])).data!;
    const resource = client.issues({ issueId: created.id });
    expect((await resource.patch({ assigneeUserIds: [owner.userId, member.userId] })).status).toBe(
      200,
    );
    expect((await resource.patch({ assigneeUserIds: [owner.userId, member.userId] })).status).toBe(
      200,
    );
    const notifications = await memberApi.notifications.get();
    expect(
      notifications.data!.items.filter((n) => n.issueId === created.id && n.type === 'assigned'),
    ).toHaveLength(1);
    const removed = await resource.patch({ assigneeUserIds: [member.userId] });
    expect(removed.data).toMatchObject({
      assigneeUserId: member.userId,
      assigneeUserIds: [member.userId],
    });
    expect((await resource.patch({ assigneeUserIds: [] })).data).toMatchObject({
      assigneeUserId: null,
      assigneeUserIds: [],
    });
  });

  it('rejects outsiders, duplicates, conflicting scalar/array and excessive ids without partial writes', async () => {
    const { owner, client, create } = await setup();
    const outsider = await signUpTestUser();
    const created = (await create([owner.userId])).data!;
    const resource = client.issues({ issueId: created.id });
    expect(
      (
        await resource.patch({
          assigneeUserIds: [owner.userId, outsider.userId],
          title: 'Must not persist',
        })
      ).status,
    ).toBe(400);
    expect((await resource.patch({ assigneeUserIds: [owner.userId, owner.userId] })).status).toBe(
      400,
    );
    expect((await resource.patch({ assigneeUserIds: [], assigneeUserId: null })).status).toBe(400);
    expect((await create(Array.from({ length: 101 }, (_, i) => `invalid-${i}`))).status).toBe(400);
    expect((await resource.get()).data).toMatchObject({
      title: 'Shared task',
      assigneeUserIds: [owner.userId],
    });
    expect(
      (
        await authedApi(outsider.cookie)
          .issues({ issueId: created.id })
          .patch({ assigneeUserIds: [outsider.userId] })
      ).status,
    ).toBe(403);
  });

  it('retains co-assignees on legacy primary changes, clears them on explicit unassign', async () => {
    const { owner, client, member, create } = await setup();
    const created = (await create([owner.userId, member.userId])).data!;
    const resource = client.issues({ issueId: created.id });
    expect((await resource.patch({ assigneeUserId: member.userId })).data!.assigneeUserIds).toEqual(
      [member.userId],
    );
    expect((await resource.patch({ assigneeUserId: owner.userId })).data!.assigneeUserIds).toEqual([
      owner.userId,
      member.userId,
    ]);
    expect((await resource.patch({ assigneeUserId: null })).data!.assigneeUserIds).toEqual([]);
  });

  it('applies bulk arrays and removes assignments when membership or issue is deleted', async () => {
    const { owner, client, member, create } = await setup();
    const created = (await create([owner.userId])).data!;
    expect(
      (
        await client.projects({ projectKey: 'MKT' }).issues.bulk.patch({
          ids: [created.id],
          patch: { assigneeUserIds: [owner.userId, member.userId] },
        })
      ).status,
    ).toBe(200);
    expect(
      (await client.projects({ projectKey: 'MKT' }).members({ userId: member.userId }).delete())
        .status,
    ).toBe(204);
    expect((await client.issues({ issueId: created.id }).get()).data!.assigneeUserIds).toEqual([
      owner.userId,
    ]);
    expect((await client.issues({ issueId: created.id }).delete()).status).toBe(204);
    expect(
      await db.select().from(issueAssignee).where(eq(issueAssignee.issueId, created.id)),
    ).toEqual([]);
  });

  it('redacts every assignee from reduced public shares', async () => {
    const { owner, client, member, create } = await setup();
    const created = (await create([owner.userId, member.userId])).data!;
    const shared = await client.issues({ issueId: created.id }).share.post();
    expect(shared.status).toBe(200);
    const read = await api.share.issue({ token: shared.data!.token }).get();
    expect(read.data!.issue.assigneeUserIds).toEqual([]);
    expect(read.data!.issue.assigneeUserId).toBeNull();
    expect(read.data!.project.assignees).toEqual([]);
  });

  it('moves only the assignees who belong to the destination project', async () => {
    const { owner, client, member, create } = await setup();
    const target = (await createProject(client, { key: 'OPS', name: 'Operations' })).data!;
    await client
      .projects({ projectKey: 'OPS' })
      .members.post({ userId: member.userId, role: 'member' });
    const kept = (await create([owner.userId, member.userId])).data!;
    const moved = await client.issues({ issueId: kept.id }).move.post({ projectId: target.id });
    expect(moved.status).toBe(200);
    expect(moved.data!.assigneeUserIds).toEqual([owner.userId, member.userId]);
    const second = (await createProject(client, { key: 'NEW', name: 'New' })).data!;
    const dropped = await client.issues({ issueId: kept.id }).move.post({ projectId: second.id });
    expect(dropped.status).toBe(200);
    expect(dropped.data!.assigneeUserIds).toEqual([owner.userId]);
  });

  it('keeps AI agents in delegate rather than human assignee fields', async () => {
    const { owner, client, create } = await setup();
    const agent = await createAgent(client, 'MKT', {
      name: 'Test agent',
      username: 'test-agent',
      kind: 'external',
    });
    const agentId = agent.data!.agent.userId;
    expect((await create([owner.userId, agentId])).status).toBe(400);
    const issue = (await create([owner.userId])).data!;
    expect(
      (await client.issues({ issueId: issue.id }).patch({ assigneeUserId: agentId })).status,
    ).toBe(400);
    expect(
      (await client.issues({ issueId: issue.id }).patch({ delegateUserId: agentId })).status,
    ).toBe(200);
  });

  it('refuses a reader assigning people', async () => {
    const { owner, client, member, memberApi, create } = await setup();
    const role = await createRole(client, 'MKT', {
      name: 'Reader',
      permissions: { work_items: { read: true } },
    });
    await client
      .projects({ projectKey: 'MKT' })
      .members({ userId: member.userId })
      .patch({ role: 'member', roleId: role.data!.id });
    const created = (await create([owner.userId])).data!;
    expect(
      (await memberApi.issues({ issueId: created.id }).patch({ assigneeUserIds: [member.userId] }))
        .status,
    ).toBe(403);
  });
});
