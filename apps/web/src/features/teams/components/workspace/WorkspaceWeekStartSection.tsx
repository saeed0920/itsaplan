'use client';

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { Workspace } from '@/lib/api/endpoints/workspaces';
import { useUpdateWorkspace } from '@/services/workspaces.service';
import SettingsSection from '@/components/common/page/SettingsSection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DAYS = [6, 0, 1] as const;

export default function WorkspaceWeekStartSection({ workspace }: { workspace: Workspace }) {
  const t = useTranslations('teams.workspace.weekStart');
  const days = useTranslations('display.weekStart');
  const saved = useTranslations('teams.workspace.info');
  const update = useUpdateWorkspace(workspace.id);

  return (
    <SettingsSection
      title={t('title')}
      description={t('description')}
      action={
        <Select
          value={String(workspace.weekStart)}
          disabled={update.isPending}
          onValueChange={(value) =>
            update.mutate(
              { weekStart: Number(value) as Workspace['weekStart'] },
              {
                onSuccess: () => toast.success(saved('saved')),
              },
            )
          }
        >
          <SelectTrigger className="h-8 w-40" aria-label={t('title')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((day) => (
              <SelectItem key={day} value={String(day)}>
                {days(String(day) as '0' | '1' | '6')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  );
}
