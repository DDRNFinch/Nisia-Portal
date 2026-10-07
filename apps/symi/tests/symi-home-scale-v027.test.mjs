import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../symi-home-scale-v027.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

test('Symi home assistant is reduced to the same visual scale as Milos/Evia',()=>{
  assert.match(css,/width:122px!important/);
  assert.match(css,/height:122px!important/);
  assert.match(css,/width:156px!important/);
  assert.match(index,/symi-home-scale-v027\.css\?v=0\.31\.1/);
  assert.ok(index.indexOf('symi-home-scale-v027.css')>index.indexOf('symi-home-polish-v025.css'));
  assert.match(sw,/symi-home-scale-v027\.css/);
});