import assert from 'node:assert/strict';
import { it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { ShellCtx, type ShellContext } from '@/context/shellContext';
import { PREFERENCE_DEFAULTS } from '@/services/preferences.service';
import { qk } from '@/services/queryKeys';
import { DateCalendar } from './DateCalendar';

function markup(calendar: 'gregory' | 'persian', locale = 'en') {
  const client = new QueryClient();
  client.setQueryData(qk.accountPreferences, { ...PREFERENCE_DEFAULTS, calendar });
  const shell = { project: { project: { workspaceWeekStart: 6 } } } as ShellContext;
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale={locale} messages={{}} timeZone="UTC">
        <ShellCtx.Provider value={shell}>
          <DateCalendar mode="single" month={new Date(2025, 2, 21)} />
        </ShellCtx.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

it('renders real Persian picker captions, days and Saturday-first headings in English', () => {
  const html = markup('persian');
  assert.match(html, /Farvardin 1404/);
  assert.match(html, /Saturday/);
  assert.match(html, /data-day="1404-01-01"/);
  assert.ok(html.indexOf('>Sa<') < html.indexOf('>Su<'));
  assert.doesNotMatch(html, /March 2025/);
});

it('renders Persian labels independently of UI direction and Gregorian when selected', () => {
  assert.match(markup('persian', 'fa'), /فروردین/);
  assert.match(markup('gregory', 'fa'), /2025|۲۰۲۵/);
  assert.doesNotMatch(markup('gregory', 'fa'), /فروردین/);
});
