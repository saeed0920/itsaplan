import { db, issue, issueAssignee } from '@repo/db';
import { eq, sql } from 'drizzle-orm';

// Primary first; legacy writes and existing issues need no backfill.
export const assigneeIdsSql = sql<string[]>`array_remove(
  ARRAY[${issue.assigneeUserId}] || ARRAY(
    SELECT a.user_id FROM issue_assignee a
    WHERE a.issue_id = ${issue.id} AND a.user_id IS DISTINCT FROM ${issue.assigneeUserId}
    ORDER BY a.position, a.user_id), NULL)`;

export function assigneeCondition(userId: string | null) {
  return userId === null
    ? sql`cardinality(${assigneeIdsSql}) = 0`
    : sql`${userId} = ANY(${assigneeIdsSql})`;
}

export async function replaceAdditionalAssignees(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  issueId: number,
  projectId: number,
  ids: string[],
) {
  await tx.delete(issueAssignee).where(eq(issueAssignee.issueId, issueId));
  if (ids.length > 1)
    await tx.insert(issueAssignee).values(
      ids.slice(1).map((userId, position) => ({
        issueId,
        projectId,
        userId,
        position,
      })),
    );
}
