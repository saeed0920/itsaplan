import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIssueArchive,
  listIssueArchives,
  renameIssueArchive,
} from '@/lib/api/endpoints/issueArchives';
import { listArchivedIssues } from '@/lib/api/endpoints/issues';
import { qk } from './queryKeys';

export function useIssueArchivesQuery(projectKey: string | null) {
  return useQuery({
    queryKey: qk.issueArchives(projectKey ?? ''),
    queryFn: () => listIssueArchives(projectKey!),
    enabled: !!projectKey,
  });
}

export function useArchivedIssuesQuery(projectKey: string | null) {
  // ponytail: reuse the whole-list archive endpoint; add server paging if archives outgrow board-sized lists.
  return useQuery({
    queryKey: qk.archivedIssues(projectKey ?? ''),
    queryFn: () => listArchivedIssues(projectKey!),
    enabled: !!projectKey,
  });
}

export function useSaveIssueArchive(projectKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, id }: { name: string; id?: number }) =>
      id === undefined
        ? createIssueArchive(projectKey, name)
        : renameIssueArchive(projectKey, id, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.issueArchives(projectKey) });
    },
  });
}
