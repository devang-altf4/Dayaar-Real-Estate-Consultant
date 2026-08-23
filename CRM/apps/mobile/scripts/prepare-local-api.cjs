const { spawnSync } = require('node:child_process');

const result = spawnSync('adb', ['reverse', 'tcp:4000', 'tcp:4000'], {
  stdio: 'inherit',
});

if (result.error || result.status !== 0) {
  console.warn(
    '[mobile] Could not forward API port 4000. Start/connect the Android device first, or use a LAN/deployed API URL in the app.',
  );
} else {
  console.log('[mobile] Forwarded device port 4000 to the local Dayaar API.');
}
