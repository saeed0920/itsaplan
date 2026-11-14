import { db, issueArchive } from '@repo/db';
import { and, asc, eq } from 'drizzle-orm';
import { HttpError, iso, rethrowDuplicate } from '#shared/lib';

export async function listIssueArchives(projectId: number) {
  const rows = await db
    .select()
    .from(issueArchive)
    .where(eq(issueArchive.projectId, projectId))
    .orderBy(asc(issueArchive.name), asc(issueArchive.id));
  return rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}

export async function saveIssueArchive(projectId: number, name: string, id?: number) {
  try {
    const [row] =
      id === undefined
        ? await db.insert(issueArchive).values({ projectId, name: name.trim() }).returning()
        : await db
            .update(issueArchive)
            .set({ name: name.trim() })
            .where(and(eq(issueArchive.projectId, projectId), eq(issueArchive.id, id)))
            .returning();
    if (!row) throw new HttpError(404, 'Archive not found');
    return { ...row, createdAt: iso(row.createdAt) };
  } catch (error) {
    rethrowDuplicate(error, 'Archive name');
  }
}

export async function assertIssueArchive(projectId: number, archiveId?: number | null) {
  if (archiveId == null) return;
  const [row] = await db
    .select({ id: issueArchive.id })
    .from(issueArchive)
    .where(and(eq(issueArchive.id, archiveId), eq(issueArchive.projectId, projectId)));
  if (!row) throw new HttpError(400, 'Archive is not in this project');
}
