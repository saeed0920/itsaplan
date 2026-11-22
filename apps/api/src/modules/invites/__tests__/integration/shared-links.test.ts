import { beforeEach, describe, expect, it } from 'bun:test';
import { db, teamInvite } from '@repo/db';
import { eq } from 'drizzle-orm';
import { authedApi } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { setInviteEmailPolicy } from '../../email-policy';

async function setup() {
  const owner = await signUpTestUser();
  const api = authedApi(owner.cookie);
  const team = (await api.teams.get()).data!.find((row) => row.role === 'owner')!;
  return { owner, api, teamId: team.id };
}

beforeEach(resetDb);

describe('shared team invite links', () => {
  it('lets different signed-in accounts join as members without consuming the link', async () => {
    const { api, teamId } = await setup();
    const result = await api.teams({ teamId }).invites.post({ role: 'member' });
    expect(result.status).toBe(201);
    expect(result.data).toMatchObject({
      email: null,
      emailQueued: false,
      emailFailed: false,
    });
    expect(new Date(result.data!.expiresAt!).getTime()).toBeLessThanOrEqual(
      Date.now() + 7 * 86400000,
    );
    const token = result.data!.token;
    for (let i = 0; i < 2; i++) {
      const person = await signUpTestUser();
      const client = authedApi(person.cookie);
      expect((await client.invites({ token }).accept.post()).status).toBe(200);
      expect((await client.teams({ teamId }).get()).data!.role).toBe('member');
      expect((await client.invites({ token }).accept.post()).status).toBe(200);
    }
    expect((await api.invites({ token }).get()).data!.status).toBe('pending');
  });

  it('refuses shared links granting manager or owner and creation by a member', async () => {
    const { api, teamId } = await setup();
    expect((await api.teams({ teamId }).invites.post({ role: 'manager' })).status).toBe(400);
    expect((await api.teams({ teamId }).invites.post({ role: 'owner' })).status).toBe(400);
    const person = await signUpTestUser();
    const token = (await api.teams({ teamId }).invites.post({ role: 'member' })).data!.token;
    const member = authedApi(person.cookie);
    await member.invites({ token }).accept.post();
    expect((await member.teams({ teamId }).invites.post({ role: 'member' })).status).toBe(403);
  });

  it('honors workspace-specific invitation email policy on acceptance', async () => {
    const { api, teamId } = await setup();
    const token = (await api.teams({ teamId }).invites.post({ role: 'member' })).data!.token;
    const person = authedApi((await signUpTestUser()).cookie);
    setInviteEmailPolicy(async () => false);
    try {
      expect((await person.invites({ token }).accept.post()).status).toBe(400);
      expect((await person.teams.get()).data!.some((row) => row.id === teamId)).toBe(false);
    } finally {
      setInviteEmailPolicy();
    }
  });

  it('never lowers an existing team rank', async () => {
    const { api, teamId } = await setup();
    const token = (await api.teams({ teamId }).invites.post({ role: 'member' })).data!.token;
    expect((await api.invites({ token }).accept.post()).status).toBe(200);
    expect((await api.teams({ teamId }).get()).data!.role).toBe('owner');
  });

  it('refuses a link after its sender loses invitation authority', async () => {
    const { api, teamId } = await setup();
    const manager = await signUpTestUser();
    const addressed = await api
      .teams({ teamId })
      .invites.post({ email: manager.email, role: 'manager' });
    const client = authedApi(manager.cookie);
    await client.invites({ token: addressed.data!.token }).accept.post();
    const link = (await client.teams({ teamId }).invites.post({ role: 'member' })).data!;
    expect(
      (await api.teams({ teamId }).members({ userId: manager.userId }).patch({ role: 'member' }))
        .status,
    ).toBe(204);
    const person = authedApi((await signUpTestUser()).cookie);
    expect((await person.invites({ token: link.token }).accept.post()).status).toBe(409);
  });

  it('cannot be globally rejected by a recipient and stops working on revocation', async () => {
    const { api, teamId } = await setup();
    const link = (await api.teams({ teamId }).invites.post({ role: 'member' })).data!;
    const person = authedApi((await signUpTestUser()).cookie);
    expect((await person.invites({ token: link.token }).reject.post()).status).toBe(400);
    expect((await api.invites({ token: link.token }).get()).data!.status).toBe('pending');
    expect((await api.teams({ teamId }).invites({ inviteId: link.id }).delete()).status).toBe(204);
    expect((await person.invites({ token: link.token }).accept.post()).status).toBe(404);
  });

  it('expires even when addressed invitations never expire, and renews under a new token', async () => {
    const { api, teamId } = await setup();
    await api.god['auth-settings'].put({ inviteTtlDays: 0 });
    const link = (await api.teams({ teamId }).invites.post({ role: 'member' })).data!;
    await db
      .update(teamInvite)
      .set({ createdAt: new Date(Date.now() - 8 * 86400000) })
      .where(eq(teamInvite.id, link.id));
    const person = authedApi((await signUpTestUser()).cookie);
    expect((await api.invites({ token: link.token }).get()).data!.expired).toBe(true);
    expect((await person.invites({ token: link.token }).accept.post()).status).toBe(409);
    const renewed = await api.teams({ teamId }).invites({ inviteId: link.id }).renew.post();
    expect(renewed.status).toBe(201);
    expect(renewed.data!.token).not.toBe(link.token);
    expect((await person.invites({ token: link.token }).accept.post()).status).toBe(404);
    expect((await person.invites({ token: renewed.data!.token }).accept.post()).status).toBe(200);
  });

  it('offers workspace people with global search off, without exposing other workspaces', async () => {
    const { api, teamId, owner } = await setup();
    const colleague = await signUpTestUser({ name: 'Workspace Colleague' });
    const outsider = await signUpTestUser({ name: 'Unrelated Account' });
    const sibling = await api.teams.post({
      name: 'Sibling',
      slug: 'sibling',
      workspaceId: owner.workspaceId!,
    });
    expect(sibling.status).toBe(201);
    const invite = await api
      .teams({ teamId: sibling.data!.id })
      .invites.post({ email: colleague.email, role: 'member' });
    await authedApi(colleague.cookie).invites({ token: invite.data!.token }).accept.post();
    const candidates = await api
      .teams({ teamId })
      .invites.candidates.get({ query: { search: '' } });
    expect(candidates.status).toBe(200);
    expect(candidates.data!.map((row) => row.userId)).toContain(colleague.userId);
    expect(candidates.data!.map((row) => row.userId)).not.toContain(outsider.userId);
    const selected = await api
      .teams({ teamId })
      .invites.post({ email: colleague.email, role: 'member' });
    expect(selected.status).toBe(201);
  });
});
