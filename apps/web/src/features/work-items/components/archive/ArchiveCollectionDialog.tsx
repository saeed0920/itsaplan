'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { IssueArchive } from '@/lib/api/endpoints/issueArchives';
import { useSaveIssueArchive } from '@/services/issueArchives.service';
import Modal from '@/components/common/overlay/Modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ArchiveCollectionDialog({
  projectKey,
  archive,
  onClose,
}: {
  projectKey: string;
  archive?: IssueArchive;
  onClose: () => void;
}) {
  const t = useTranslations('workItems.archives');
  const common = useTranslations('common');
  const [name, setName] = useState(archive?.name ?? '');
  const save = useSaveIssueArchive(projectKey);
  return (
    <Modal title={archive ? t('rename') : t('create')} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || save.isPending) return;
          save.mutate(
            { name: name.trim(), id: archive?.id },
            {
              onSuccess: () => {
                toast.success(t('saved'));
                onClose();
              },
            },
          );
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="archive-name">{t('name')}</Label>
          <Input
            id="archive-name"
            autoFocus
            maxLength={80}
            value={name}
            disabled={save.isPending}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
            {common('cancel')}
          </Button>
          <Button type="submit" disabled={!name.trim() || save.isPending}>
            {common('save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
