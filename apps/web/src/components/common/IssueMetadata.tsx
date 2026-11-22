import { CalendarDays, Circle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/utils/dates';

export default function IssueMetadata({
  columnName,
  cycleName,
  dueDate,
}: {
  columnName?: string | null;
  cycleName?: string | null;
  dueDate?: string | null;
}) {
  const t = useTranslations('issue.fields');
  if (!columnName && !cycleName && !dueDate) return null;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {columnName && (
        <span className="inline-flex min-w-0 items-center gap-1">
          <span className="sr-only">{t('state')}: </span>
          <Circle className="size-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words" dir="auto">
            {columnName}
          </span>
        </span>
      )}
      {cycleName && (
        <span className="inline-flex min-w-0 items-center gap-1">
          <span className="sr-only">{t('cycle')}: </span>
          <RefreshCw className="size-3 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words" dir="auto">
            {cycleName}
          </span>
        </span>
      )}
      {dueDate && (
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3 shrink-0" aria-hidden="true" />
          <span>
            {t('dueDate')}: <time dateTime={dueDate}>{formatDate(dueDate)}</time>
          </span>
        </span>
      )}
    </span>
  );
}
