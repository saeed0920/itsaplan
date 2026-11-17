import { afterEach, expect, test, spyOn } from 'bun:test';
import { createServer } from 'node:http';
import { telegramFetch } from '../telegram';

const originalProxy = process.env.TELEGRAM_PROXY_URL;
afterEach(() => {
  if (originalProxy === undefined) delete process.env.TELEGRAM_PROXY_URL;
  else process.env.TELEGRAM_PROXY_URL = originalProxy;
});

test('only Telegram uses explicit proxy, preserving payload and cancellation', async () => {
  process.env.TELEGRAM_PROXY_URL = 'http://proxy.internal:10809';
  const signal = new AbortController().signal;
  const fetchSpy = spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
  try {
    await telegramFetch('https://api.telegram.org/botsynthetic/getMe', {
      method: 'POST',
      body: '{}',
      signal,
    });
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({
      proxy: 'http://proxy.internal:10809',
      redirect: 'error',
      method: 'POST',
      body: '{}',
      signal,
    });
    delete process.env.TELEGRAM_PROXY_URL;
    await telegramFetch('https://api.telegram.org/botsynthetic/getMe');
    expect(fetchSpy.mock.calls[1]?.[1]).toMatchObject({ proxy: '' });
    for (const url of [
      'https://api.telegram.org.evil.test',
      'http://api.telegram.org',
      'https://user:secret@api.telegram.org',
      'http://127.0.0.1',
    ]) {
      await expect(telegramFetch(url)).rejects.toThrow('Telegram transport requires');
    }
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    for (const proxy of [
      'secret-invalid-url',
      'socks5://localhost:1080',
      'http://localhost:1080/path',
    ]) {
      process.env.TELEGRAM_PROXY_URL = proxy;
      await expect(telegramFetch('https://api.telegram.org')).rejects.toThrow('TELEGRAM_PROXY_URL');
    }
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    delete process.env.TELEGRAM_PROXY_URL;
    fetchSpy.mockRejectedValue(new Error('secret-bot-token proxy-password'));
    await expect(telegramFetch('https://api.telegram.org')).rejects.toThrow(
      /^Telegram request failed$/,
    );
  } finally {
    fetchSpy.mockRestore();
  }
});

test('Bun sends HTTPS CONNECT to configured proxy without contacting Telegram', async () => {
  const server = createServer();
  let target = '';
  server.on('connect', (req, socket) => {
    target = req.url ?? '';
    socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test proxy port');
    process.env.TELEGRAM_PROXY_URL = `http://127.0.0.1:${address.port}`;
    const response = await telegramFetch('https://api.telegram.org/botsynthetic/getMe', {
      signal: AbortSignal.timeout(2000),
    });
    expect(response.status).toBe(403);
    expect(target).toBe('api.telegram.org:443');
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
