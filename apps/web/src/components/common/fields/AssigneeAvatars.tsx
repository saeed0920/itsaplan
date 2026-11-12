import Avatar from '@/components/common/Avatar';

export default function AssigneeAvatars({
  ids,
  people,
}: {
  ids: string[];
  people: Map<string, { name: string; image?: string | null }>;
}) {
  const members = ids.flatMap((id) => people.get(id) ?? []);
  const names = members.map((member) => member.name).join(', ');
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1"
      title={names}
      role="img"
      aria-label={names}
    >
      {members.slice(0, 3).map((member, index) => (
        <Avatar
          key={ids[index]}
          name={member.name}
          image={member.image}
          className="size-5 shrink-0 text-[9px]"
        />
      ))}
      {members.length > 3 && (
        <span className="text-xs text-muted-foreground">+{members.length - 3}</span>
      )}
    </span>
  );
}
