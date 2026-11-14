import { Archive } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { IssueArchive } from '@/lib/api/endpoints/issueArchives';
import type { Issue } from '@/lib/api/endpoints/issues';
import { cn } from '@/lib/utils';

export default function ArchiveCollections({
  archives,
  issues,
  selected,
  onSelect,
}: {
  archives: IssueArchive[];
  issues: Issue[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const t = useTranslations('workItems.archives');
  const format = useFormatter();
  const counts = new Map<number | null, number>();
  for (const issue of issues) {
    const id = issue.archiveId ?? null;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const entries = [
    { value: 'all', name: t('all'), count: issues.length },
    { value: 'unfiled', name: t('unfiled'), count: counts.get(null) ?? 0 },
    ...archives.map((archive) => ({
      value: String(archive.id),
      name: archive.name,
      count: counts.get(archive.id) ?? 0,
    })),
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label={t('collections')}>
      {entries.map((entry) => (
        <button
          key={entry.value}
          type="button"
          aria-pressed={selected === entry.value}
          onClick={() => onSelect(entry.value)}
          className={cn(
            'flex min-w-0 items-center gap-3 rounded-lg border p-3 text-start transition-colors hover:bg-accent',
            selected === entry.value && 'border-primary/40 bg-accent',
          )}
        >
          <Archive className="size-4 shrink-0 text-muted-foreground" />
          <span dir="auto" className="min-w-0 flex-1 truncate text-sm font-medium">
            {entry.name}
          </span>
          <span className="text-xs text-muted-foreground">{format.number(entry.count)}</span>
        </button>
      ))}
    </div>
  );
}
