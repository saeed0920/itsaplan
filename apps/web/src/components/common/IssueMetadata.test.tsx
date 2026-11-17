import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import issue from '../../../messages/en/issue.json';
import IssueMetadata from './IssueMetadata';

function render(props: Parameters<typeof IssueMetadata>[0]) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={{ issue }} timeZone="UTC">
      <IssueMetadata {...props} />
    </NextIntlClientProvider>,
  );
}

describe('IssueMetadata', () => {
  it('omits unset metadata', () => {
    assert.equal(render({}), '');
    assert.equal(render({ columnName: null, cycleName: null, dueDate: null }), '');
  });

  it('renders status alone without empty planning labels', () => {
    const html = render({ columnName: 'In progress' });
    assert.ok(html.includes('In progress'));
    assert.ok(html.includes('State:'));
    assert.ok(!html.includes('Cycle:'));
    assert.ok(!html.includes('Due date:'));
  });

  it('escapes user text and preserves the due date', () => {
    const html = render({
      columnName: 'In progress',
      cycleName: '<script>test</script>',
      dueDate: '2026-11-30',
    });
    assert.ok(html.includes('&lt;script&gt;test&lt;/script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('dateTime="2026-11-30"'));
    assert.ok(html.includes('Due date:'));
  });
});
