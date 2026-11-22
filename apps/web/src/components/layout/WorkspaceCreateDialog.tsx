'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import Modal from '@/components/common/overlay/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWorkspace } from '@/services/workspaces.service';
import { workspacePath } from '@/utils/paths';

export default function WorkspaceCreateDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('teams.workspace');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const create = useCreateWorkspace();
  const [name, setName] = useState('');
  const id = useId();
  const close = () => {
    if (!create.isPending) onClose();
  };

  return (
    <Modal title={t('create')} description={t('info.workspaceHint')} onClose={close}>
      <form
        className="space-y-4 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || create.isPending) return;
          create.mutate(
            { name: name.trim() },
            {
              onSuccess: (workspace) => {
                toast.success(t('info.saved'));
                onClose();
                router.push(workspacePath(workspace.id));
              },
            },
          );
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor={id}>{tCommon('name')}</Label>
          <Input
            id={id}
            dir="auto"
            value={name}
            maxLength={60}
            required
            disabled={create.isPending}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={create.isPending} onClick={close}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={!name.trim() || create.isPending}>
            {create.isPending ? tCommon('saving') : t('create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
