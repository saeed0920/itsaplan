import { request } from '@/lib/api/core/client';

export interface IssueArchive {
  id: number;
  projectId: number;
  name: string;
  createdAt: string;
}

export const listIssueArchives = (projectKey: string) =>
  request<IssueArchive[]>(`/projects/${projectKey}/archives`);
export const createIssueArchive = (projectKey: string, name: string) =>
  request<IssueArchive>(`/projects/${projectKey}/archives`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
export const renameIssueArchive = (projectKey: string, id: number, name: string) =>
  request<IssueArchive>(`/projects/${projectKey}/archives/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
