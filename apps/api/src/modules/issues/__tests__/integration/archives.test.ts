import { beforeEach, describe, expect, it } from 'bun:test';
import { authedApi, createProject } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { createRole } from '#tests/helpers/roles';

async function setup() {
  const owner = await signUpTestUser();
  const api = authedApi(owner.cookie);
  const first = (await createProject(api, { key: 'ARC', name: 'Archives' })).data!;
  const second = (await createProject(api, { key: 'SEC', name: 'Second' })).data!;
  const route = api.projects({ projectKey: first.ref });
  const other = api.projects({ projectKey: second.ref });
  const scaffold = (await route.get()).data!;
  const issue = async (title = 'Task', parentId?: number) =>
    (await route.issues.post({ title, columnId: scaffold.columns[0].id, parentId })).data!;
  return { api, route, other, issue, first, second, scaffold };
}

describe('named issue archives', () => {
  beforeEach(resetDb);

  it('creates and renames project-scoped collections with validated unique names', async () => {
    const { route, other } = await setup();
    const created = await route.archives.post({ name: '  December 2026  ' });
    expect(created.status).toBe(201);
    expect(created.data?.name).toBe('December 2026');
    const id = created.data!.id;
    expect((await route.archives.post({ name: 'December 2026' })).status).toBe(409);
    for (const name of ['', '   ', 'x'.repeat(81)])
      expect((await route.archives.post({ name })).status).toBe(400);
    expect(
      (await route.archives({ archiveId: id }).patch({ name: 'December done' })).data?.name,
    ).toBe('December done');
    expect((await other.archives({ archiveId: id }).patch({ name: 'Wrong project' })).status).toBe(
      404,
    );
    expect((await route.archives.get()).data?.map((a) => a.name)).toEqual(['December done']);
  });

  it('archives any status into a collection, moves without restamping and restores', async () => {
    const { api, route, issue, scaffold } = await setup();
    const a = (await route.archives.post({ name: 'December' })).data!;
    const b = (await route.archives.post({ name: 'January' })).data!;
    const task = await issue();
    const archived = await api.issues({ issueId: task.id }).archive.post({ archiveId: a.id });
    expect(archived.status).toBe(200);
    expect(archived.data?.archiveId).toBe(a.id);
    const stamp = archived.data!.archivedAt;
    const moved = await api.issues({ issueId: task.id }).archive.post({ archiveId: b.id });
    expect(moved.data?.archivedAt).toEqual(stamp);
    expect(moved.data?.archiveId).toBe(b.id);
    const feed = await api.issues({ issueId: task.id }).feed.get({ query: {} });
    expect(feed.data?.items.filter((entry) => entry.action === 'archived')).toHaveLength(1);
    expect((await route.issues.archived.get()).data?.map((i) => i.id)).toContain(task.id);
    expect((await route.issues.get()).data?.map((i) => i.id)).not.toContain(task.id);
    const unfiled = await api.issues({ issueId: task.id }).archive.post({ archiveId: null });
    expect(unfiled.data?.archiveId).toBeNull();
    expect(unfiled.data?.archivedAt).toEqual(stamp);
    const restored = await api.issues({ issueId: task.id }).restore.post();
    expect(restored.data).toMatchObject({
      archiveId: null,
      archivedAt: null,
      columnId: scaffold.columns[0].id,
    });
  });

  it('validates destinations before changing subtasks, cascades into the same collection', async () => {
    const { api, route, other, issue } = await setup();
    const parent = await issue('Parent');
    const child = await issue('Child', parent.id);
    const a = (await route.archives.post({ name: 'December' })).data!;
    const foreign = (await other.archives.post({ name: 'Foreign' })).data!;
    expect(
      (
        await api
          .issues({ issueId: parent.id })
          .archive.post({ archiveId: foreign.id, subtasks: 'cascade' })
      ).status,
    ).toBe(400);
    expect((await api.issues({ issueId: child.id }).get()).data?.archivedAt).toBeNull();
    expect(
      (await api.issues({ issueId: parent.id }).archive.post({ archiveId: a.id })).status,
    ).toBe(409);
    expect(
      (
        await api
          .issues({ issueId: parent.id })
          .archive.post({ archiveId: a.id, subtasks: 'cascade' })
      ).status,
    ).toBe(200);
    expect((await api.issues({ issueId: child.id }).get()).data?.archiveId).toBe(a.id);
    expect(
      (await api.issues({ issueId: parent.id }).archive.post({ archiveId: null })).status,
    ).toBe(200);
  });

  it('leaves already-archived children in their collection when cascading an active parent', async () => {
    const { api, route, issue } = await setup();
    const a = (await route.archives.post({ name: 'December' })).data!;
    const b = (await route.archives.post({ name: 'January' })).data!;
    for (const destination of [b.id, null]) {
      const parent = await issue('Parent');
      const child = await issue('Archived child', parent.id);
      const sibling = await issue('Active child', parent.id);
      const original = await api.issues({ issueId: child.id }).archive.post({ archiveId: a.id });
      const result = await api
        .issues({ issueId: parent.id })
        .archive.post({ archiveId: destination, subtasks: 'cascade' });
      expect(result.status).toBe(200);
      const retained = (await api.issues({ issueId: child.id }).get()).data!;
      expect(retained.archiveId).toBe(a.id);
      expect(retained.archivedAt).toEqual(original.data!.archivedAt);
      expect((await api.issues({ issueId: sibling.id }).get()).data?.archiveId).toBe(destination);
      const feed = await api.issues({ issueId: child.id }).feed.get({ query: {} });
      expect(feed.data?.items.filter((entry) => entry.action === 'archived')).toHaveLength(1);
    }
  });

  it('clears collection membership when an archived issue moves projects', async () => {
    const { api, route, issue, second } = await setup();
    const a = (await route.archives.post({ name: 'December' })).data!;
    const task = await issue();
    await api.issues({ issueId: task.id }).archive.post({ archiveId: a.id });
    const moved = await api.issues({ issueId: task.id }).move.post({ projectId: second.id });
    expect(moved.status).toBe(200);
    expect(moved.data?.archiveId).toBeNull();
    expect(moved.data?.archivedAt).toBeTruthy();
  });

  it('advances the board revision when collections are created or renamed', async () => {
    const { api, route, first } = await setup();
    const read = async () =>
      (await api.sync.rev.get({ query: { scopes: `board:${first.id}` } })).data!.revs[
        `board:${first.id}`
      ];
    const before = await read();
    const a = (await route.archives.post({ name: 'December' })).data!;
    const created = await read();
    expect(created).not.toBe(before);
    await route.archives({ archiveId: a.id }).patch({ name: 'January' });
    expect(await read()).not.toBe(created);
  });

  it('lets read-only members list archives but refuses collection and membership writes', async () => {
    const { api, route, first, issue } = await setup();
    const member = await signUpTestUser({ team: false });
    const invite = await api
      .teams({ teamId: first.teamId })
      .invites.post({ email: member.email, role: 'member' });
    const reader = authedApi(member.cookie);
    await reader.invites({ token: invite.data!.token }).accept.post();
    const role = (
      await createRole(api, 'ARC', {
        name: 'Archive reader',
        permissions: { work_items: { read: true } },
      })
    ).data!;
    await route.members.post({ userId: member.userId, role: 'member', roleId: role.id });
    const a = (await route.archives.post({ name: 'December' })).data!;
    const task = await issue();
    const readRoute = reader.projects({ projectKey: first.ref });
    expect((await readRoute.archives.get()).status).toBe(200);
    expect((await readRoute.archives.post({ name: 'Wrong' })).status).toBe(403);
    expect((await readRoute.archives({ archiveId: a.id }).patch({ name: 'Wrong' })).status).toBe(
      403,
    );
    expect(
      (await reader.issues({ issueId: task.id }).archive.post({ archiveId: a.id })).status,
    ).toBe(403);
  });

  it('deletes a project with named archived issues through existing cascades', async () => {
    const { api, route, first, issue } = await setup();
    const a = (await route.archives.post({ name: 'December' })).data!;
    const task = await issue();
    await api.issues({ issueId: task.id }).archive.post({ archiveId: a.id });
    expect(
      (await api.teams({ teamId: first.teamId }).projects({ projectId: first.id }).delete()).status,
    ).toBe(204);
  });

  it('bulk archives only issues in the authorized project and refuses foreign archives', async () => {
    const { api, route, other, issue } = await setup();
    const a = (await route.archives.post({ name: 'December' })).data!;
    const foreign = (await other.archives.post({ name: 'Foreign' })).data!;
    const one = await issue('One');
    const two = await issue('Two');
    expect(
      (await route.issues.bulk.archive.post({ ids: [one.id, two.id], archiveId: foreign.id }))
        .status,
    ).toBe(400);
    expect(
      (await route.issues.bulk.archive.post({ ids: [one.id, two.id], archiveId: a.id })).data
        ?.archived,
    ).toBe(2);
    expect((await route.issues.archived.get()).data?.every((i) => i.archiveId === a.id)).toBe(true);
    const outsider = authedApi((await signUpTestUser()).cookie);
    expect(
      (
        await outsider
          .projects({ projectKey: (await route.get()).data!.project.ref })
          .archives.get()
      ).status,
    ).toBe(403);
    expect((await api.issues({ issueId: one.id }).archive.post({ archiveId: -1 })).status).toBe(
      400,
    );
  });
});
