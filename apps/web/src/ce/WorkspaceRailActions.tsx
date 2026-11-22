'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { workspaceRowClass, workspaceTileClass } from '@/components/layout/utils/workspaceTile';
import WorkspaceCreateDialog from '@/components/layout/WorkspaceCreateDialog';
import { useWorkspaceCreationQuery } from '@/services/workspaces.service';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function WorkspaceRailActions({ variant = 'tile' }: { variant?: 'tile' | 'row' }) {
  const t = useTranslations('teams.workspace');
  const [open, setOpen] = useState(false);
  const creation = useWorkspaceCreationQuery();
  const trigger = useRef<HTMLButtonElement>(null);

  if (!creation.data?.allowed) return null;

  return (
    <>
      {variant === 'row' ? (
        <Button
          ref={trigger}
          variant="ghost"
          className={`${workspaceRowClass} text-muted-foreground`}
          onClick={() => setOpen(true)}
        >
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed"
          >
            <Plus className="size-3.5" />
          </span>
          {t('create')}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              ref={trigger}
              type="button"
              aria-label={t('create')}
              className={`${workspaceTileClass(false)} border border-dashed text-muted-foreground hover:text-foreground`}
              onClick={() => setOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('create')}</TooltipContent>
        </Tooltip>
      )}
      {open && (
        <WorkspaceCreateDialog
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
        />
      )}
    </>
  );
}
