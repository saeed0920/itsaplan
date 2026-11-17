import { useDraggable } from '@dnd-kit/core';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { Issue } from '@/lib/api/endpoints/issues';
import { useIsPhone } from '@/hooks/useIsPhone';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { CalendarIssueTooltip } from './CalendarIssueTooltip';

// A draggable chip inside a day cell. A click (no drag) opens the issue; a drag
// moves it to another day or the unscheduled panel.
export function CalendarDayChip({
  project,
  issue,
  color,
  onOpen,
}: {
  project: ProjectDetail;
  issue: Issue;
  color: string;
  onOpen: (id: number) => void;
}) {
  // Drag is disabled on phones, and without work_items edit (rescheduling an
  // issue is an issue edit).
  const { can } = usePermissions();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.id,
    disabled: useIsPhone() || !can('work_items', 'edit'),
  });
  return (
    <CalendarIssueTooltip project={project} issue={issue} dragging={isDragging}>
      <button
        type="button"
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOpen(issue.id);
        }}
        className={cn(
          'flex w-full min-w-0 cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-start text-xs transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
          isDragging && 'opacity-40',
        )}
      >
        <span
          className="inline-block size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="truncate text-foreground">{issue.title}</span>
      </button>
    </CalendarIssueTooltip>
  );
}
