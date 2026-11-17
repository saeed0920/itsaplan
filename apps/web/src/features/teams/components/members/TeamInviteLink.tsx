'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useCreateTeamInvite } from '@/services/teams.service';
import { inviteLink } from '@/utils/paths';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TeamInviteLink({ teamId }: { teamId: number }) {
  const t = useTranslations('teams.invite');
  const create = useCreateTeamInvite(teamId);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setError('');
    try {
      const invite = await create.mutateAsync({ role: 'member' });
      setUrl(inviteLink(window.location.origin, invite.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('linkError'));
    }
  }

  async function copy() {
    setError('');
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError(t('copyError'));
    }
  }

  return (
    <section className="mb-6 space-y-3 border-b pb-6">
      <h2 className="text-sm font-medium">{t('sharedLink')}</h2>
      <p className="text-sm text-muted-foreground">{t('sharedLinkHint')}</p>
      {url ? (
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={t('sharedLink')}
            dir="ltr"
            readOnly
            value={url}
            className="min-w-0 flex-1"
            onFocus={(event) => event.target.select()}
          />
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? t('copied') : t('copyLink')}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" disabled={create.isPending} onClick={generate}>
          {create.isPending ? t('creatingLink') : t('createLink')}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {copied && (
        <p role="status" className="text-xs text-muted-foreground">
          {t('copied')}
        </p>
      )}
    </section>
  );
}
