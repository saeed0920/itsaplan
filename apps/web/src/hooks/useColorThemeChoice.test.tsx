import assert from 'node:assert/strict';
import { it } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import account from '../../messages/en/account.json';
import { useColorThemeChoice } from './useColorThemeChoice';

it('switches to light when picking Puzzley and preserves the mode for Charbug', () => {
  function Selection() {
    const { patchFor } = useColorThemeChoice({ palette: 'default', customTheme: null });
    assert.deepEqual(patchFor('puzzley'), { palette: 'puzzley', theme: 'light' });
    assert.deepEqual(patchFor('charbug'), { palette: 'charbug' });
    return null;
  }
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={{ account }} timeZone="UTC">
      <Selection />
    </NextIntlClientProvider>,
  );
});
