import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../symi-standard-ui-v024.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../symi-standard-ui-v024.js',import.meta.url),'utf8');
const homeCss=readFileSync(new URL('../symi-home-polish-v025.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

test('Symi 0.27 keeps standardized UI offline with final home polish after it',()=>{
  assert.match(index,/symi-standard-ui-v024\.css\?v=0\.30\.2/);
  assert.match(index,/symi-standard-ui-v024\.js\?v=0\.30\.2/);
  assert.match(index,/symi-home-polish-v025\.css\?v=0\.30\.2/);
  assert.ok(index.indexOf('symi-home-polish-v025.css')>index.indexOf('symi-standard-ui-v024.css'));
  assert.match(sw,/symi-standard-ui-v024\.css/);
  assert.match(sw,/symi-home-polish-v025\.css/);
});

test('Symi brand has a green i and remains top left on home',()=>{
  assert.match(css,/--std-brand:#38A96B/);
  assert.match(index,/Sym<span class="app-brand-i">i<\/span>/);
  assert.match(index,/Classroom assistant/);
  assert.match(js,/Sym<span class="app-brand-i">i<\/span>/);
  assert.match(homeCss,/\.app-header \.brand-word\{display:block/);
  assert.match(homeCss,/left:max\(16px,env\(safe-area-inset-left\)\)/);
});

test('Symi uses the same professional component geometry as Milos',()=>{
  assert.match(css,/--std-radius:18px/);
  assert.match(css,/\.staff-card,\.ta-card/);
  assert.match(css,/\.samos-row,\.class-learner-row/);
  assert.match(css,/\.blue-button,\.ta-actions \.primary/);
  assert.match(css,/\.staff-form input/);
  assert.match(css,/\.staff-page-head/);
});