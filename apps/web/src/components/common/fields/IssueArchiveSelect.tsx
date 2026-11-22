import { useTranslations } from 'next-intl';
import type { IssueArchive } from '@/lib/api/endpoints/issueArchives';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function IssueArchiveSelect({
  archives,
  value,
  onChange,
  disabled,
}: {
  archives: IssueArchive[];
  value: number | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('workItems.archives');
  return (
    <div className="space-y-2">
      <Label>{t('destination')}</Label>
      <Select
        value={value === null ? 'unfiled' : String(value)}
        onValueChange={(id) => onChange(id === 'unfiled' ? null : Number(id))}
        disabled={disabled}
      >
        <SelectTrigger className="w-full" aria-label={t('destination')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unfiled">{t('unfiled')}</SelectItem>
          {archives.map((archive) => (
            <SelectItem key={archive.id} value={String(archive.id)}>
              {archive.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
