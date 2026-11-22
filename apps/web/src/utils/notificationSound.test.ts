import assert from 'node:assert/strict';
import { afterEach, beforeEach, it } from 'node:test';
import { playNotificationSound, unlockNotificationSound } from './notificationSound';

const globals = ['window', 'navigator', 'localStorage', 'Audio'];
let saved: Map<string, PropertyDescriptor | undefined>;
let values: Map<string, string>;
let played: { src: string; volume: number }[];
let blocked: boolean;
function replace(key: string, value: unknown) {
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
beforeEach(async () => {
  saved = new Map(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  values = new Map([['desktopNotifications', 'on']]);
  played = [];
  blocked = false;
  replace('window', {});
  replace('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  let queue = Promise.resolve();
  replace('navigator', {
    locks: {
      request: (_key: string, _options: LockOptions, callback: () => Promise<void>) => {
        const result = queue.then(callback);
        queue = result.catch(() => {});
        return result;
      },
    },
  });
  replace(
    'Audio',
    class {
      volume = 0;
      constructor(public src: string) {}
      async play() {
        if (blocked) throw new Error('Autoplay blocked');
        if (this.volume > 0) played.push({ src: this.src, volume: this.volume });
      }
      pause() {}
    },
  );
  unlockNotificationSound();
  await Promise.resolve();
});
afterEach(() => {
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete (globalThis as Record<string, unknown>)[key];
  }
});
it('waits for an app interaction before trying background playback', async () => {
  replace('window', {});
  await playNotificationSound('2026-11-17T12:00:00.000Z', new AbortController().signal);
  assert.equal(played.length, 0);
  unlockNotificationSound();
  await playNotificationSound('2026-11-17T12:00:00.000Z', new AbortController().signal);
  assert.equal(played.length, 1);
});
it('plays Warm wood once across competing tabs, suppressing older batches', async () => {
  const signal = new AbortController().signal;
  const at = '2026-11-17T12:00:00.000Z';
  await Promise.all([playNotificationSound(at, signal), playNotificationSound(at, signal)]);
  assert.deepEqual(played, [{ src: '/sounds/notification.wav', volume: 0.22 }]);
  await playNotificationSound('2026-11-17T11:59:00.000Z', signal);
  assert.equal(played.length, 1);
  await playNotificationSound('2026-11-17T12:01:00.000Z', signal);
  assert.equal(played.length, 2);
});
it('cancels queued audio on cleanup or when desktop notifications are off', async () => {
  const done = new AbortController();
  const pending = playNotificationSound('2026-11-17T12:00:00.000Z', done.signal);
  done.abort();
  await pending;
  values.delete('desktopNotifications');
  await playNotificationSound('2026-11-17T12:01:00.000Z', new AbortController().signal);
  assert.equal(played.length, 0);
  assert.equal(values.has('desktopNotificationSoundAt'), false);
});
it('catches autoplay refusal without consuming the batch or changing desktop preferences', async () => {
  const signal = new AbortController().signal;
  blocked = true;
  await playNotificationSound('2026-11-17T12:00:00.000Z', signal);
  assert.equal(values.has('desktopNotificationSoundAt'), false);
  assert.equal(values.get('desktopNotifications'), 'on');
  blocked = false;
  await playNotificationSound('2026-11-17T12:00:00.000Z', signal);
  assert.equal(played.length, 1);
});
it('leaves desktop delivery alone when locks or storage are unavailable', async () => {
  const signal = new AbortController().signal;
  replace('localStorage', {
    getItem() {
      throw new Error('Storage blocked');
    },
  });
  await playNotificationSound('2026-11-17T12:00:00.000Z', signal);
  replace('navigator', {});
  await playNotificationSound('2026-11-17T12:00:00.000Z', signal);
  assert.equal(played.length, 0);
});
