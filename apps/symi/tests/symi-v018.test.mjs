import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hub=readFileSync(new URL('../symi-course-hub-v018.js',import.meta.url),'utf8');
const otj=readFileSync(new URL('../symi-otj-share-v017.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
const calendar=readFileSync(new URL('../symi-week-calendar-v023.js',import.meta.url),'utf8');
const manifest=JSON.parse(readFileSync(new URL('../manifest.webmanifest',import.meta.url),'utf8'));

test('Symi keeps Course as the parent of delivery',()=>{
  assert.match(hub,/COURSE DELIVERY/);
  assert.match(hub,/Sessions & lesson plans/);
  assert.match(hub,/Build course sessions/);
  assert.match(hub,/teachingClassId/);
  assert.match(hub,/symi\.course\.sessions\.v1/);
  assert.match(hub,/symi\.session\.lesson\.v1/);
});

test('delivery setup creates matching recurring registers and dated sessions',()=>{
  assert.match(hub,/generateDates\(/);
  assert.match(hub,/recurrence=\{type:'weekly',interval,weekdays:\[day\]/);
  assert.match(hub,/registerId:reg\?\.id/);
  assert.match(hub,/lessonPlanId:lp\?\.id/);
});

test('migration QR carries previous figures without learner identity',()=>{
  assert.match(hub,/NISI:SYMI:MIGRATION:1/);
  assert.match(hub,/t:'migration'/);
  assert.match(hub,/om:otjMinutes/);
  assert.match(hub,/a:\{p,em:expectedMinutes,am:attendedMinutes,x:Boolean\(expectedMinutes\)\}/);
  const payload=hub.match(/const payload=\{v:1,t:'migration'[^;]+/s)?.[0]||'';
  assert.doesNotMatch(payload,/learnerId|learnerName|name:/);
});

test('normal Symi OTJ receipts include attendance and remain anonymous',()=>{
  assert.match(otj,/a:attendanceSnapshot\(learnerId\)/);
  assert.match(otj,/NISI:SYMI:COLLEGEOTJ:1/);
  const payload=otj.match(/function payload\([^}]+return\{[^}]+/s)?.[0]||'';
  assert.doesNotMatch(payload,/name:|learnerId:/);
});

test('0.27 shell calendar update system home polish cache and manifest are aligned',()=>{
  assert.match(index,/symi-build" content="0\.32\.1"/);
  assert.match(index,/symi-week-calendar-v023\.css\?v=0\.32\.1/);
  assert.match(index,/symi-week-calendar-v023\.js\?v=0\.32\.1/);
  assert.match(index,/symi-standard-ui-v024\.css\?v=0\.32\.1/);
  assert.match(index,/symi-calendar-manager-v025\.css\?v=0\.32\.1/);
  assert.match(index,/symi-home-polish-v025\.css\?v=0\.32\.1/);
  assert.match(index,/symi-home-polish-v025\.js\?v=0\.32\.1/);
  assert.match(index,/symi-updater-v027\.js\?v=0\.32\.1/);
  assert.match(sw,/const BUILD='0\.32\.1'/);
  assert.match(sw,/symi-calendar-manager-v025\.css/);
  assert.match(sw,/symi-home-polish-v025\.js/);
  assert.match(sw,/symi-updater-v027\.js/);
  assert.match(sw,/request\.mode==='navigate'/);
  assert.match(calendar,/function lessonFor\(/);
  assert.match(calendar,/function classEvents\(/);
  assert.match(calendar,/Edit \/ reschedule/);
  assert.equal(manifest.short_name,'Symi');
  assert.equal(manifest.start_url,'./?v=0.32.1');
});