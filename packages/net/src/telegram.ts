// Only fixed Telegram API calls use this transport; user-supplied URLs use pinnedFetch.
export async function telegramFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
  );
  if (url.origin !== 'https://api.telegram.org' || url.username || url.password) {
    throw new Error('Telegram transport requires https://api.telegram.org');
  }
  const proxy = process.env.TELEGRAM_PROXY_URL?.trim() || '';
  if (proxy) {
    let parsed: URL;
    try {
      parsed = new URL(proxy);
    } catch {
      throw new Error('Invalid TELEGRAM_PROXY_URL');
    }
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.hash ||
      parsed.search ||
      parsed.pathname !== '/'
    ) {
      throw new Error('TELEGRAM_PROXY_URL requires an HTTP(S) proxy origin');
    }
  }
  try {
    return await fetch(input, { ...init, proxy, redirect: 'error' });
  } catch {
    // Fetch errors can contain the bot token in the request URL or proxy credentials.
    throw new Error('Telegram request failed');
  }
}
