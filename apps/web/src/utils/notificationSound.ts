const players = new WeakMap<Window, { audio: HTMLAudioElement; ready: Promise<void> }>();

// Chromium defers a new media element in a hidden tab. Unlock it on an app interaction.
export function unlockNotificationSound(): void {
  if (players.has(window)) return;
  try {
    const audio = new Audio('/sounds/notification.wav');
    audio.volume = 0;
    const timeout = setTimeout(() => audio.pause(), 1500);
    const ready = audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0.22;
      })
      .catch(() => {
        players.delete(window);
      })
      .finally(() => clearTimeout(timeout));
    players.set(window, { audio, ready });
  } catch {
    // A blocked browser can try again on the next interaction.
  }
}

export async function playNotificationSound(createdAt: string, signal: AbortSignal): Promise<void> {
  if (!navigator.locks || signal.aborted) return;
  try {
    await navigator.locks.request('desktop-notification-sound', { signal }, async () => {
      if (signal.aborted || localStorage.getItem('desktopNotifications') !== 'on') return;
      const key = 'desktopNotificationSoundAt';
      if ((localStorage.getItem(key) ?? '') >= createdAt) return;
      const player = players.get(window);
      if (!player) return;
      await player.ready;
      if (signal.aborted || !players.has(window)) return;
      const { audio } = player;
      const stop = () => audio.pause();
      signal.addEventListener('abort', stop, { once: true });
      const timeout = setTimeout(stop, 1500);
      try {
        audio.currentTime = 0;
        await audio.play();
        if (!signal.aborted) localStorage.setItem(key, createdAt);
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener('abort', stop);
      }
    });
  } catch {
    // Autoplay, storage or locks can be blocked; desktop delivery is unchanged.
  }
}
