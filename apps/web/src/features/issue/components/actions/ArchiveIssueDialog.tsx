import { toast } from 'sonner';
import { useState } from 'react';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { Issue, SubtaskDisposition } from '@/lib/api/endpoints/issues';
import { dispositionReady, removalCount, subtaskCount } from '@/utils/subtasks';
import { useArchiveIssue, useIssueSubtreeQuery } from '@/services/issues.service';
import { useIssueArchivesQuery } from '@/services/issueArchives.service';
import IssueArchiveSelect from '@/components/common/fields/IssueArchiveSelect';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/common/overlay/ConfirmDialog';
import SubtaskDisposalChoice from './SubtaskDisposalChoice';
import { useTranslations } from 'next-intl';

// Archived cards can change collection without changing their archive date.
export default function ArchiveIssueDialog({
  project,
  issue,
  onClose,
  onArchived,
}: {
  project: ProjectDetail;
  issue: Issue;
  onClose: () => void;
  onArchived?: () => void;
}) {
  const t = useTranslations('issue.actions');
  const tr = useTranslations('workItems.removal');
  const archiveIssue = useArchiveIssue(project.project.ref);
  const archives = useIssueArchivesQuery(project.project.ref);
  const [archiveId, setArchiveId] = useState<number | null>(issue.archiveId ?? null);
  const a = useTranslations('workItems.archives');
  const subtasks = subtaskCount(project.issues, [issue.id]);
  const [disposition, setDisposition] = useState<SubtaskDisposition | null>(null);
  const subtree = useIssueSubtreeQuery(project.project.ref, [issue.id]).data;
  const active = (subtree ?? []).filter((subtask) => !subtask.archived);
  const archived = removalCount([issue.id], active, disposition);

  return (
    <ConfirmDialog
      title={
        issue.archivedAt ? t('archiveTitle') : t('archiveQuestion', { issue: issue.identifier })
      }
      confirmLabel={archived > 1 ? tr('archive.confirm', { count: archived }) : t('archiveTitle')}
      confirmDisabled={
        archives.isPending || archives.isError || (subtasks > 0 && !dispositionReady(disposition))
      }
      wide="xl"
      onConfirm={async () => {
        await archiveIssue.mutateAsync({
          id: issue.id,
          subtasks: disposition ?? undefined,
          archiveId,
        });
        toast.success(a('issueSaved'));
        onClose();
        onArchived?.();
      }}
      onClose={onClose}
    >
      <p className="text-sm text-muted-foreground">
        {issue.archivedAt
          ? a('moveDescription', { issue: issue.identifier })
          : t('archiveDescription')}
      </p>
      <IssueArchiveSelect
        archives={archives.data ?? []}
        value={archiveId}
        onChange={setArchiveId}
        disabled={archives.isPending || archives.isError}
      />
      {archives.isError && (
        <Button variant="outline" onClick={() => void archives.refetch()}>
          {a('retry')}
        </Button>
      )}
      {subtasks > 0 && (
        <SubtaskDisposalChoice
          projectKey={project.project.ref}
          action="archive"
          count={subtasks}
          removedIssueIds={[issue.id]}
          value={disposition}
          onChange={setDisposition}
        />
      )}
    </ConfirmDialog>
  );
}
