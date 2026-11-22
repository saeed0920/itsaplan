'use client';

import { useState, type ReactNode } from 'react';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { Issue } from '@/lib/api/endpoints/issues';
import ArchiveIssueDialog from '../components/actions/ArchiveIssueDialog';

// Every entry point asks for the destination collection before archiving.
export function useArchiveAction(
  // Null where the project is still loading (the command palette mounts before
  // it), which leaves the action inert.
  project: ProjectDetail | null,
  onArchived?: () => void,
): { archive: (issue: Issue) => void; dialog: ReactNode } {
  const [confirming, setConfirming] = useState<Issue | null>(null);

  const archive = (issue: Issue) => {
    if (!project) return;
    setConfirming(issue);
  };

  const dialog =
    project && confirming ? (
      <ArchiveIssueDialog
        project={project}
        issue={confirming}
        onClose={() => setConfirming(null)}
        onArchived={onArchived}
      />
    ) : null;

  return { archive, dialog };
}
