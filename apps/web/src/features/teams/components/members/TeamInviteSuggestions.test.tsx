import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { JSDOM } from 'jsdom';
import { NextIntlClientProvider } from 'next-intl';
import teams from '../../../../../messages/en/teams.json';
import members from '../../../../../messages/en/members.json';
import type { InviteCandidate } from '@/lib/api/endpoints/invites';

const replacedGlobals = [
  'window',
  'document',
  'navigator',
  'Node',
  'Element',
  'HTMLElement',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'ResizeObserver',
  'fetch',
  'IS_REACT_ACT_ENVIRONMENT',
] as const;

const ada: InviteCandidate = {
  userId: 'u-ada',
  name: 'Ada Lovelace',
  email: 'ada@engine.test',
  image: null,
};

let dom: JSDOM;
let root: Root;
let client: QueryClient;
let originals: Map<string, PropertyDescriptor | undefined>;
let searches: string[];
let picked: string[];

async function settle() {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function render(address: string) {
  const { default: TeamInviteSuggestions } = await import('./TeamInviteSuggestions');
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="en" messages={{ teams }} timeZone="UTC">
          <TeamInviteSuggestions
            teamId={7}
            address={address}
            onPick={(email) => picked.push(email)}
          />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    ),
  );
  await settle();
}

const items = () => [...document.querySelectorAll<HTMLElement>('button[data-user-id]')];

beforeEach(async () => {
  originals = new Map(
    replacedGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  dom = new JSDOM('<!doctype html><div id="root"></div>', {
    url: 'https://example.test/',
    pretendToBeVisual: true,
  });
  for (const name of replacedGlobals) {
    if (name in dom.window) {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        value: dom.window[name as keyof typeof dom.window],
      });
    }
  }
  searches = [];
  picked = [];
  Object.defineProperties(globalThis, {
    getComputedStyle: {
      configurable: true,
      value: dom.window.getComputedStyle.bind(dom.window),
    },
    requestAnimationFrame: {
      configurable: true,
      value: dom.window.requestAnimationFrame.bind(dom.window),
    },
    cancelAnimationFrame: {
      configurable: true,
      value: dom.window.cancelAnimationFrame.bind(dom.window),
    },
    ResizeObserver: {
      configurable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    },
    fetch: {
      configurable: true,
      value: async (input: string | URL) => {
        const url = new URL(String(input));
        assert.equal(url.pathname, '/teams/7/invites/candidates');
        searches.push(url.searchParams.get('search') ?? '');
        return Response.json([ada]);
      },
    },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  Object.defineProperty(window, '__ITSAPLAN_ENV__', {
    value: { apiUrl: 'https://api.test', privacyUrl: '', termsUrl: '' },
  });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { createRoot } = await import('react-dom/client');
  root = createRoot(document.getElementById('root')!);
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  dom.window.close();
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

describe('TeamInviteSuggestions', () => {
  it('creates a link without an email and reports clipboard failure', async () => {
    const { default: TeamInviteLink } = await import('./TeamInviteLink');
    let submitted: unknown;
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: async (_input: unknown, init: RequestInit) => {
        submitted = JSON.parse(String(init.body));
        return Response.json({
          token: 'shared-token',
          email: null,
          emailQueued: false,
          emailFailed: false,
        });
      },
    });
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <NextIntlClientProvider locale="en" messages={{ teams, members }} timeZone="UTC">
            <TeamInviteLink teamId={7} />
          </NextIntlClientProvider>
        </QueryClientProvider>,
      ),
    );
    await act(async () => document.querySelector<HTMLButtonElement>('button')!.click());
    await settle();
    assert.deepEqual(submitted, { role: 'member' });
    const link = document.querySelector<HTMLInputElement>('input')!;
    assert.equal(link.value, 'https://example.test/invite/shared-token');
    assert.equal(link.readOnly, true);
    await act(async () => document.querySelector<HTMLButtonElement>('button')!.click());
    assert.match(document.querySelector('[role="alert"]')!.textContent!, /copy it manually/);
  });

  it('lists the matches and puts the picked address in the field', async () => {
    await render('lov');

    assert.deepEqual(searches, ['lov']);
    assert.equal(items().length, 1);
    assert.match(items()[0]!.textContent ?? '', /Ada Lovelace.*ada@engine\.test/);

    await act(async () => items()[0]!.click());
    assert.deepEqual(picked, ['ada@engine.test']);
  });

  it('offers workspace people before typing', async () => {
    await render('');

    assert.deepEqual(searches, ['']);
    assert.equal(items().length, 1);
  });

  it('hides the list once the field holds a listed address', async () => {
    await render('ADA@engine.test');

    assert.equal(searches.length, 1);
    assert.equal(items().length, 0);
  });
});
