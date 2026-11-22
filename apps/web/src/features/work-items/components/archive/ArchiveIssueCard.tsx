import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { Issue } from '@/lib/api/endpoints/issues';
import { useRestoreIssue } from '@/services/issues.service';
import { formatDateTime } from '@/utils/dates';
import ArchivedBadge from '@/components/common/ArchivedBadge';
import { Button } from '@/components/ui/button';
import { StateIcon } from '@/features/issue/components/shared/IssueIcons';

export default function ArchiveIssueCard({
  issue,
  project,
  editable,
  onOpen,
  onMove,
}: {
  issue: Issue;
  project: ProjectDetail;
  editable: boolean;
  onOpen: () => void;
  onMove: () => void;
}) {
  const t = useTranslations('workItems.archives');
  const restore = useRestoreIssue(project.project.ref);
  const column = project.columns.find((one) => one.id === issue.columnId);
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground" dir="ltr">
          {issue.identifier}
        </span>
        <ArchivedBadge />
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="text-start text-sm font-medium hover:underline"
      >
        <span dir="auto">{issue.title}</span>
      </button>
      {column && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <StateIcon stateType={column.stateType} color={column.color} className="size-3.5" />
          {column.name}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {t('archivedOn', { date: issue.archivedAt ? formatDateTime(issue.archivedAt) : '' })}
      </p>
      {editable && (
        <div className="mt-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={restore.isPending}
            aria-label={t('restoreIssue', { issue: issue.identifier })}
            onClick={() =>
              restore.mutate(issue.id, { onSuccess: () => toast.success(t('restored')) })
            }
          >
            {t('restore')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={restore.isPending}
            aria-label={t('moveIssue', { issue: issue.identifier })}
            onClick={onMove}
          >
            {t('move')}
          </Button>
        </div>
      )}
    </article>
  );
}
