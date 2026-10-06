# Evia checks

Run these before pushing a change to `main`.

- `node tests/check-files.js` — quick, no browser. Checks every script is valid JavaScript, every file the app loads
  exists, every loaded file is saved for offline use, and the service worker version matches `index.html`.
- `node tests/smoke.js` — opens Evia on a phone-sized screen (Playwright + Chromium) and clicks through Home,
  Progress, Portfolio, an evidence pack, Send to e-portfolio, the chat, a test, the confidence check, a scenario,
  the first-run demo's Progress step, Evia's shapes and opening offline. Prints ✓/✗ for each check.
