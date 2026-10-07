import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const updater=readFileSync(new URL('../symi-updater-v027.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

test('Symi 0.27 loads a visible update notifier',()=>{
  assert.match(index,/symi-updater-v027\.js\?v=0\.33\.0/);
  assert.match(updater,/Symi updated · \$\{CURRENT\}/);
  assert.match(updater,/Update available · \$\{item\.version\}/);
  assert.match(updater,/update\.json\?check=/);
});

test('Symi keeps one installed HTML shell until an update is installed',()=>{
  assert.match(sw,/const CACHE=`symi-\$\{BUILD\}`/);
  assert.match(sw,/const cached=\(await cache\.match\('\.\/index\.html'\)\)/);
  assert.doesNotMatch(sw,/cache\.put\('\.\/index\.html'/);
});

test('Symi updater installs and waits for the matching complete cache',()=>{
  assert.match(updater,/serviceWorker\.register\(`\.\/service-worker\.js\?v=/);
  assert.match(updater,/symi-\$\{version\}/);
  assert.match(updater,/waitCache/);
});