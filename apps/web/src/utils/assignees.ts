export function issueAssigneeIds(issue: {
  assigneeUserId: string | null;
  assigneeUserIds?: string[];
}): string[] {
  return issue.assigneeUserIds ?? (issue.assigneeUserId ? [issue.assigneeUserId] : []);
}

export function toggleAssignee(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}
