import { Archive } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import ViewTabChrome from './ViewTabChrome';

export default function ArchiveViewTab({
  active,
  count,
  onSelect,
}: {
  active: boolean;
  count?: number;
  onSelect: () => void;
}) {
  const t = useTranslations('views');
  const format = useFormatter();
  return (
    <ViewTabChrome active={active}>
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={onSelect}
        className="flex items-center gap-1.5 px-2 py-1"
      >
        <Archive className="size-3.5" />
        {t('archive')}
        {count !== undefined && (
          <span className="text-xs text-muted-foreground">{format.number(count)}</span>
        )}
      </button>
    </ViewTabChrome>
  );
}
