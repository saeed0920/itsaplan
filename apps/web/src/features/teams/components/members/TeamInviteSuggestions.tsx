'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useInviteCandidatesQuery } from '@/services/teams.service';
import Avatar from '@/components/common/Avatar';

export default function TeamInviteSuggestions({
  teamId,
  address,
  onPick,
}: {
  teamId: number;
  address: string;
  onPick: (email: string) => void;
}) {
  const t = useTranslations('teams.invite');
  const term = useDebouncedValue(address, 300);
  const query = useInviteCandidatesQuery(teamId, term);
  const candidates = query.data ?? [];
  const typedOne = candidates.some(
    (person) => person.email.toLowerCase() === address.toLowerCase(),
  );
  if (query.isPending)
    return (
      <p role="status" className="text-xs text-muted-foreground">
        {t('loadingPeople')}
      </p>
    );
  if (query.isError)
    return (
      <Button type="button" variant="outline" onClick={() => void query.refetch()}>
        {t('retryPeople')}
      </Button>
    );
  if (typedOne) return null;
  if (candidates.length === 0)
    return <p className="text-xs text-muted-foreground">{t('noPeople')}</p>;

  return (
    <div
      role="group"
      aria-label={t('workspacePeople')}
      className="max-h-56 overflow-y-auto rounded-md border p-1"
    >
      {candidates.map((person) => {
        const name = person.name || person.email;
        return (
          <Button
            key={person.userId}
            data-user-id={person.userId}
            type="button"
            variant="ghost"
            className="h-auto min-h-11 w-full justify-start px-2 py-2 text-start font-normal"
            onClick={() => onPick(person.email)}
          >
            <Avatar name={name} image={person.image} className="size-6 text-[10px]" />
            <div className="min-w-0 flex-1">
              <p className="truncate">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{person.email}</p>
            </div>
          </Button>
        );
      })}
    </div>
  );
}
