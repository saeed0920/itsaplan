import { type ReactNode } from 'react';
import { CircleDashed } from 'lucide-react';
import { useIsMutating } from '@tanstack/react-query';
import type { Assignee } from '@/lib/api/endpoints/projects';
import { assignableMembers } from '@/utils/project';
import { useSession } from '@/lib/auth-client';
import { toggleAssignee } from '@/utils/assignees';
import Avatar from '@/components/common/Avatar';
import { Pill } from './Pill';
import PopoverPick, { type PickItem } from './PopoverPick';
import { useTranslations } from 'next-intl';

type Props = {
  assignees: Assignee[];
  placeholder?: string;
  readOnly?: boolean;
  trigger?: ReactNode;
  issueId?: number;
} & (
  | {
      multiple: true;
      value: string[];
      onChange: (ids: string[]) => void;
    }
  | {
      multiple?: false;
      value: string | null;
      onChange: (id: string | null) => void;
    }
);

export default function AssigneeSelect(props: Props) {
  const { assignees, placeholder, readOnly, trigger, issueId } = props;
  const t = useTranslations('issue.fieldSelects');
  const none = t('noAssignee');
  const { data: session } = useSession();
  const pending =
    useIsMutating({
      mutationKey: ['updateIssue'],
      predicate: (mutation) =>
        issueId !== undefined &&
        (mutation.state.variables as { id?: number } | undefined)?.id === issueId,
    }) > 0;
  const ids = props.multiple ? props.value : [props.value ?? ''].filter(Boolean);
  const selected = assignees.filter((a) => a.kind === 'member' && ids.includes(a.userId));
  const members = assignableMembers(assignees);
  const choices = props.multiple ? [...members, ...selected.filter((a) => !a.canAssign)] : members;
  const select = (id: string | null) => {
    if (pending) return;
    if (props.multiple) props.onChange(id === null ? [] : toggleAssignee(ids, id));
    else props.onChange(id);
  };
  const toItem = (a: Assignee): PickItem => ({
    key: a.userId,
    search: a.name,
    icon: <Avatar name={a.name} image={a.image} className="size-4 text-[8px]" />,
    label: a.name,
    selected: ids.includes(a.userId),
    disabled: pending,
    onSelect: () => select(a.userId),
  });
  const me = members.find((a) => a.userId === session?.user.id);
  const names = selected.map((a) => a.name).join(', ');

  return (
    <PopoverPick
      readOnly={readOnly}
      closeOnSelect={!props.multiple}
      trigger={
        trigger ?? (
          <Pill active={selected.length > 0} aria-busy={pending} title={names || none}>
            {selected.length ? (
              <Avatar
                name={selected[0].name}
                image={selected[0].image}
                className="size-4 text-[8px]"
              />
            ) : (
              <CircleDashed />
            )}
            <span className="truncate">{names || placeholder || none}</span>
          </Pill>
        )
      }
      inputPlaceholder={t('assignTo')}
      emptyText={t('noMembers')}
      items={[
        {
          key: 'none',
          search: none,
          icon: <CircleDashed />,
          label: none,
          selected: ids.length === 0,
          disabled: pending,
          onSelect: () => select(null),
        },
      ]}
      groups={[
        ...(me ? [{ heading: t('you'), items: [toItem(me)] }] : []),
        { heading: t('members'), items: choices.filter((a) => a !== me).map(toItem) },
      ]}
    />
  );
}
