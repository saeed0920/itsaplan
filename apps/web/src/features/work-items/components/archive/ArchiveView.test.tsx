import assert from 'node:assert/strict';
import { it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { ShellCtx, type ShellContext } from '@/context/shellContext';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import { qk } from '@/services/queryKeys';
import common from '../../../../../messages/en/common.json';
import workItems from '../../../../../messages/en/workItems.json';
import issue from '../../../../../messages/en/issue.json';
import ArchiveView from './ArchiveView';

function render(editable: boolean, failed = false) {
  const project = {
    project: { ref: 'eng.ARC' },
    columns: [{ id: 1, stateType: 'completed', name: 'Done', color: '#00aa00' }],
    issues: [],
    viewer: { role: 'member', via: 'member' },
    permissions: { work_items: { read: true, edit: editable } },
  } as unknown as ProjectDetail;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(qk.issueArchives('eng.ARC'), [
    { id: 7, projectId: 1, name: 'December-month-archive' },
  ]);
  client.setQueryData(qk.archivedIssues('eng.ARC'), [
    {
      id: 4,
      identifier: 'ARC-4',
      title: 'December report',
      columnId: 1,
      archiveId: 7,
      archivedAt: '2026-12-31T12:00:00Z',
    },
  ]);
  if (failed)
    client
      .getQueryCache()
      .find({ queryKey: qk.archivedIssues('eng.ARC') })!
      .setState({ status: 'error', error: new Error('Failed') });
  const html = renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="en" messages={{ common, workItems, issue }} timeZone="UTC">
        <ShellCtx.Provider value={{ project } as ShellContext}>
          <ArchiveView project={project} onOpenIssue={() => {}} />
        </ShellCtx.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  client.clear();
  return html;
}

it('shows named collections, archived cards, search and editor actions', () => {
  const html = render(true);
  for (const value of [
    'December-month-archive',
    'December report',
    'All archived',
    'Unfiled',
    'Search archived issues',
    'New archive',
    'Restore ARC-4',
    'Move ARC-4',
  ])
    assert.ok(html.includes(value), value);
});

it('keeps archive cards readable without edit controls for readers', () => {
  const html = render(false);
  assert.ok(html.includes('December report'));
  for (const value of ['New archive', 'Restore ARC-4', 'Move ARC-4'])
    assert.ok(!html.includes(value), value);
});

it('renders a retry state rather than an empty archive after a failed read', () => {
  const html = render(true, true);
  assert.ok(html.includes('Could not load archives.'));
  assert.ok(html.includes('Retry'));
  assert.ok(!html.includes('December report'));
});
