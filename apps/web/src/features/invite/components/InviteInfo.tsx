import { FolderKanban, Mail, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { InviteView } from '@/lib/api/endpoints/invites';
import InviteInfoRow from './InviteInfoRow';

// The invite summary shown at the top of the accept screen: which team, which
// project when it names one, for which email, as which role.
export default function InviteInfo({ invite }: { invite: InviteView }) {
  const t = useTranslations('invite');
  const tCommon = useTranslations('common');
  const tTeams = useTranslations('teams.manage');
  const projectRoleLabel =
    invite.role === 'owner' ? tCommon('owner') : (invite.roleName ?? tCommon('member'));
  return (
    <div className="divide-y rounded-lg border bg-muted/30 text-start">
      <InviteInfoRow
        icon={<Users className="size-4" />}
        label={t('teamLabel')}
        value={invite.teamName}
        badge={tTeams(`roles.${invite.teamRole}`)}
      />
      {invite.projectName && (
        <InviteInfoRow
          icon={<FolderKanban className="size-4" />}
          label={t('projectLabel')}
          value={invite.projectName}
          badge={projectRoleLabel}
        />
      )}
      {invite.email != null && (
        <InviteInfoRow
          icon={<Mail className="size-4" />}
          label={t('emailLabel')}
          value={invite.email}
        />
      )}
    </div>
  );
}
