import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import { usePermissions } from '@/hooks/usePermissions';
import { usePaging } from '@/hooks/usePaging';
import { useArchivedIssuesQuery, useIssueArchivesQuery } from '@/services/issueArchives.service';
import { useArchiveAction } from '@/features/issue/hooks/useArchiveAction';
import ListPager from '@/components/common/ListPager';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ArchiveCollections from './ArchiveCollections';
import ArchiveCollectionDialog from './ArchiveCollectionDialog';
import ArchiveIssueCard from './ArchiveIssueCard';

export default function ArchiveView({
  project,
  onOpenIssue,
}: {
  project: ProjectDetail;
  onOpenIssue: (id: number) => void;
}) {
  const t = useTranslations('workItems.archives');
  const { can } = usePermissions();
  const editable = can('work_items', 'edit');
  const issues = useArchivedIssuesQuery(project.project.ref);
  const archives = useIssueArchivesQuery(project.project.ref);
  const [selected, setSelected] = useState('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<'new' | 'rename' | null>(null);
  const paging = usePaging(25);
  const move = useArchiveAction(project);
  const current = archives.data?.find((archive) => String(archive.id) === selected);
  const query = search.trim().toLocaleLowerCase();
  const filtered = (issues.data ?? []).filter((issue) => {
    const collection = issue.archiveId == null ? 'unfiled' : String(issue.archiveId);
    return (
      (selected === 'all' || collection === selected) &&
      `${issue.identifier} ${issue.title}`.toLocaleLowerCase().includes(query)
    );
  });
  if (issues.isPending || archives.isPending)
    return (
      <p className="p-4 text-sm text-muted-foreground" role="status">
        {t('loading')}
      </p>
    );
  if (issues.isError || archives.isError)
    return (
      <div className="space-y-3 p-4" role="alert">
        <p>{t('loadError')}</p>
        <Button
          variant="outline"
          onClick={() => {
            void issues.refetch();
            void archives.refetch();
          }}
        >
          {t('retry')}
        </Button>
      </div>
    );
  return (
    <div className="flex-1 space-y-5 overflow-auto p-3 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
        </div>
        {editable && (
          <Button size="sm" onClick={() => setEditing('new')}>
            {t('create')}
          </Button>
        )}
      </div>
      <ArchiveCollections
        archives={archives.data ?? []}
        issues={issues.data ?? []}
        selected={selected}
        onSelect={(value) => {
          setSelected(value);
          setSearch('');
          paging.reset();
        }}
      />
      <div className="flex items-center gap-2">
        <Input
          aria-label={t('search')}
          placeholder={t('search')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            paging.reset();
          }}
        />
        {editable && current && (
          <Button variant="outline" onClick={() => setEditing('rename')}>
            {t('rename')}
          </Button>
        )}
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {query ? t('noMatches') : t('empty')}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paging.slice(filtered).map((issue) => (
            <ArchiveIssueCard
              key={issue.id}
              issue={issue}
              project={project}
              editable={editable}
              onOpen={() => onOpenIssue(issue.id)}
              onMove={() => move.archive(issue)}
            />
          ))}
        </div>
      )}
      <ListPager paging={paging} total={filtered.length} />
      {editing && (
        <ArchiveCollectionDialog
          projectKey={project.project.ref}
          archive={editing === 'rename' ? current : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      {move.dialog}
    </div>
  );
}
