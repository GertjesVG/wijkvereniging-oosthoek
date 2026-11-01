// Desktop shortcut "Sinterklaas 2026 - Storybook": opens Storybook in the default browser. If it is not running yet,
// this script starts `npm run storybook` in its own minimized window on the taskbar (close that window to stop
// Storybook) and waits until it answers. A second click never starts a second server; an occupied port is never taken
// over. Works without VS Code, also right after Windows starts.
//
// Usage: node .storybook/openen.mjs   → http://127.0.0.1:6008/
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 6008; // same as the `storybook` script in package.json
const ADDRESS = `http://127.0.0.1:${PORT}/`;
/** Recognition: another project's Storybook may run on the same address. */
const OWN_STORY = './src/Components.stories.tsx';

function fail(message) {
  console.error(`${message}\n\nDruk op Enter om dit venster te sluiten.`);
  process.stdin.resume();
  process.stdin.once('data', () => process.exit(1));
}

/** Does this project's Storybook answer here (its story list `index.json`)? */
async function answers() {
  try {
    const r = await fetch(`${ADDRESS}index.json`, { signal: AbortSignal.timeout(5000) });
    return r.ok && Object.values((await r.json()).entries ?? {}).some((e) => e.importPath === OWN_STORY);
  } catch {
    return false;
  }
}

function portFree() {
  return new Promise((ok) => {
    const s = net.createServer();
    s.once('error', () => ok(false));
    s.listen({ port: PORT, host: '127.0.0.1', exclusive: true }, () => s.close(() => ok(true)));
  });
}

/** One starter at a time (double click): the pipe exists while this script runs and disappears by itself. */
function takeSlot() {
  return new Promise((ok) => {
    const s = net.createServer();
    s.once('error', () => ok(false));
    s.listen('\\\\.\\pipe\\sinterklaas-storybook', () => ok(true)).unref();
  });
}

async function start() {
  if (await answers()) return true;
  if (await takeSlot()) {
    // Look again: a previous click may just have started Storybook.
    if (await answers()) return true;
    if (!(await portFree())) return fail(`Poort ${PORT} is bezet door een andere app (bijvoorbeeld de Storybook van een ander project). Er wordt niets overgenomen of gestopt.`);
    console.log('Storybook starten (eerste keer na het opstarten van de pc) …');
    // `start /min`: own window on the taskbar; `|| pause` keeps an error message readable.
    spawn('cmd.exe', ['/c', 'start', '"Storybook Sinterklaas"', '/min', 'cmd.exe', '/c', '"npm.cmd run storybook -- --ci --exact-port || pause"'], {
      cwd: ROOT,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      windowsVerbatimArguments: true,
    }).unref();
  } else {
    console.log('Storybook wordt al gestart, even wachten …');
  }
  // No port probe while waiting: it would occupy the port for a moment just as Storybook opens it.
  for (let i = 0; i < 240; i++) {
    await new Promise((ok) => setTimeout(ok, 500));
    if (await answers()) return true;
  }
  return fail('Storybook antwoordt niet na 2 minuten. Bekijk het venster in de taakbalk, of start het met `npm run storybook` in de websitemap om de fout te zien.');
}

if (await start()) spawn('explorer.exe', [ADDRESS], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
