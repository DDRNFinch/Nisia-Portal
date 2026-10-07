import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeCss=readFileSync(new URL('../symi-home-polish-v025.css',import.meta.url),'utf8');
const homeJs=readFileSync(new URL('../symi-home-polish-v025.js',import.meta.url),'utf8');
const calendar=readFileSync(new URL('../symi-week-calendar-v023.js',import.meta.url),'utf8');
const managerCss=readFileSync(new URL('../symi-calendar-manager-v025.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');

test('Symi home keeps the name top left and removes the duplicate centre name',()=>{
  assert.match(homeCss,/\.app-header \.brand-word\{display:block/);
  assert.match(homeCss,/\.staff-face-copy strong\{display:none/);
  assert.match(homeCss,/top:43\.5dvh/);
  assert.match(homeCss,/width:164px/);
  assert.match(index,/<div class="staff-face-copy"><span>Tap me to get started<\/span><\/div>/);
  assert.doesNotMatch(index,/staff-face-copy"><strong>/);
  assert.match(index,/symi-home-polish-v025\.css\?v=0\.31\.2/);
});

test('home startup patch no longer runs a permanent mutation observer and can repair stale PWA state',()=>{
  assert.doesNotMatch(homeJs,/new MutationObserver/);
  assert.match(homeJs,/SamosApp\.openAssistantMenu/);
  assert.match(homeJs,/repairStartup/);
  assert.match(homeJs,/caches\.keys\(\)/);
  assert.match(homeJs,/getRegistrations\(\)/);
  assert.match(homeJs,/symi-startup-repair-026/);
  assert.match(sw,/request\.mode==='navigate'/);
});

test('calendar items open complete details',()=>{
  assert.match(calendar,/data-scal-event=/);
  assert.match(calendar,/scal-detail-grid/);
  assert.match(calendar,/detail\('Date'/);
  assert.match(calendar,/detail\('Time'/);
  assert.match(calendar,/detail\('Class'/);
  assert.match(calendar,/detail\('Course'/);
  assert.match(calendar,/detail\('Lesson plan'/);
  assert.match(calendar,/detail\('Location \/ room'/);
  assert.match(managerCss,/\.scal-detail/);
});

test('manual Symi bookings can be edited rescheduled and deleted',()=>{
  assert.match(calendar,/Edit \/ reschedule/);
  assert.match(calendar,/Delete booking/);
  assert.match(calendar,/name="date" type="date"/);
  assert.match(calendar,/data-booking-id/);
  assert.match(calendar,/window\.confirm/);
  assert.match(managerCss,/\.scal-danger/);
});

test('recurring classes remain timetable-driven and show lesson/session details',()=>{
  assert.match(calendar,/editable:false,removable:false/);
  assert.match(calendar,/sessionNumber:n/);
  assert.match(calendar,/lessonTitle:lesson\?\.title/);
  assert.match(calendar,/Change the class timetable to alter its recurring dates/);
});