import { expect, test } from 'bun:test';
import { createServer } from 'node:http';
import { Bot, type ApiClientOptions } from 'grammy';
import { telegramFetch } from '@repo/net/telegram';

test('grammY uses the Telegram-only Bun transport for polling and replies', async () => {
  const originalProxy = process.env.TELEGRAM_PROXY_URL;
  const server = createServer();
  const targets: string[] = [];
  server.on('connect', (req, socket) => {
    targets.push(req.url ?? '');
    socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test proxy port');
    process.env.TELEGRAM_PROXY_URL = `http://127.0.0.1:${address.port}`;
    const bot = new Bot('123:synthetic', {
      client: { fetch: telegramFetch as unknown as ApiClientOptions['fetch'] },
    });
    await expect(bot.api.getMe()).rejects.toThrow();
    await expect(bot.api.getUpdates({ timeout: 1 })).rejects.toThrow();
    await expect(bot.api.sendMessage(123, 'synthetic')).rejects.toThrow();
    expect(targets).toEqual(Array(3).fill('api.telegram.org:443'));
  } finally {
    if (originalProxy === undefined) delete process.env.TELEGRAM_PROXY_URL;
    else process.env.TELEGRAM_PROXY_URL = originalProxy;
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
