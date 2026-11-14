'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SubtaskDisposition } from '@/lib/api/endpoints/issues';
import { useIssueArchivesQuery } from '@/services/issueArchives.service';
import IssueArchiveSelect from '@/components/common/fields/IssueArchiveSelect';
import { Button } from '@/components/ui/button';
import { dispositionReady } from '@/utils/subtasks';
import ConfirmDialog from '@/components/common/overlay/ConfirmDialog';
import SubtaskDisposalChoice from '@/features/issue/components/actions/SubtaskDisposalChoice';

// Mounted per selection so the collection and subtask choices cannot carry over.
export function BulkRemovalDialog({
  projectKey,
  action,
  ids,
  subtaskCount,
  onConfirm,
  onClose,
}: {
  projectKey: string;
  action: 'delete' | 'archive';
  ids: number[];
  subtaskCount: number;
  onConfirm: (subtasks?: SubtaskDisposition, archiveId?: number | null) => Promise<unknown>;
  onClose: () => void;
}) {
  const t = useTranslations('workItems.removal');
  const archives = useIssueArchivesQuery(action === 'archive' ? projectKey : null);
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const a = useTranslations('workItems.archives');
  const [disposition, setDisposition] = useState<SubtaskDisposition | null>(null);

  return (
    <ConfirmDialog
      title={t(`${action}.title`, { count: ids.length })}
      confirmLabel={t(`${action}.confirm`, { count: ids.length })}
      confirmDisabled={
        (subtaskCount > 0 && !dispositionReady(disposition)) ||
        (action === 'archive' && (archives.isPending || archives.isError))
      }
      onConfirm={async () => {
        await onConfirm(disposition ?? undefined, action === 'archive' ? archiveId : undefined);
        onClose();
      }}
      onClose={onClose}
    >
      <p className="text-sm text-muted-foreground">
        {t(`${action}.description`, { count: ids.length })}
      </p>
      {action === 'archive' && (
        <IssueArchiveSelect
          archives={archives.data ?? []}
          value={archiveId}
          onChange={setArchiveId}
          disabled={archives.isPending || archives.isError}
        />
      )}
      {action === 'archive' && archives.isError && (
        <Button variant="outline" onClick={() => void archives.refetch()}>
          {a('retry')}
        </Button>
      )}
      {subtaskCount > 0 && (
        <SubtaskDisposalChoice
          projectKey={projectKey}
          action={action}
          count={subtaskCount}
          removedIssueIds={ids}
          value={disposition}
          onChange={setDisposition}
        />
      )}
    </ConfirmDialog>
  );
}
