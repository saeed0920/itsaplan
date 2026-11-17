import { useState, type ReactElement } from 'react';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { Issue } from '@/lib/api/endpoints/issues';
import IssueMetadata from '@/components/common/IssueMetadata';
import IssueContextMenu from '@/features/issue/components/actions/IssueContextMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function CalendarIssueTooltip({
  project,
  issue,
  children,
  dragging = false,
}: {
  project: ProjectDetail;
  issue: Issue;
  children: ReactElement;
  dragging?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip delayDuration={300} open={open && !dragging} onOpenChange={setOpen}>
      <IssueContextMenu project={project} issue={issue}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
      </IssueContextMenu>
      <TooltipContent className="max-w-72 space-y-2 p-3 text-start">
        <span className="block font-mono text-muted-foreground" dir="ltr">
          {issue.identifier}
        </span>
        <span className="block font-medium break-words" dir="auto">
          {issue.title}
        </span>
        <IssueMetadata
          columnName={project.columns.find((column) => column.id === issue.columnId)?.name}
          cycleName={issue.cycle?.name}
          dueDate={issue.dueDate}
        />
      </TooltipContent>
    </Tooltip>
  );
}
