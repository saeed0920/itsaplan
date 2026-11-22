# Notification sound

`notification.wav` is the original Warm wood G4/C5 two-note tap selected for this fork.
No samples or third-party audio. Distributed under the repository license.
Mono PCM, 22050 Hz, 16 bit, 0.72 seconds; playback volume is 22%.

The existing Desktop notifications switch controls it. A new background notification batch
plays one chime across tabs using Web Locks and a stored timestamp. Initial inbox reads and
foreground activity remain quiet. Web Push uses browser/OS sound and does not play this file.

A click or key press in the app silently initializes its reusable audio element before the tab
is hidden. Enabling Desktop notifications also initializes it. Browser autoplay or site-audio
restrictions may prevent the chime; interact with the app after opening it and allow site audio. Desktop notification delivery and its OS sound options
are unchanged when playback fails. No new controls, server settings or database fields are added.
