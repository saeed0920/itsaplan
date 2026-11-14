import { useContext } from 'react';
import { ShellCtx } from '@/context/shellContext';
import type { WeekStart } from '@/utils/viewSettings';

export function useWeekStart(): WeekStart {
  return useContext(ShellCtx)?.project?.project.workspaceWeekStart ?? 0;
}
