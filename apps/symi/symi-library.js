/* Symi's Resources: one library, four tabs.
     Course         the course's own lessons, unit by unit: the same slides, quizzes and plans the register teaches from
                    (symi-teach.js). The default.
     College        what the college shares in Nisia: tutors' slides, quizzes and lesson plans, and links to files the
                    college keeps elsewhere. Any of them can be put into a session on the scheme of work.
     Community      shared between colleges, once checked: coming soon.
     My resources   what the tutor made in Symi themselves (the old library), with Share with my college.
   Once, it clears out the blank slides, quizzes and lesson plans Symi used to make from a course's KSB list (nothing a
   tutor wrote is touched; what's cleared is kept in a backup on the phone).
   window.SymiLibrary: render(app, head) (app.js calls it for the Resources page; false means "My resources", drawn by
   app.js as before), decorateMine(app). */
(() => {
"use strict";
const App = () => window.SamosApp, T = () => window.SymiTeach, N = () => window.SymiNisia;
const TAB = "symi.library.tab", COURSE = "symi.library.course", CACHE = "symi.library.college", CLEANED = "symi.library.cleaned.v1", BACKUP = "symi.library.cleared.v1";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch (_) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* full */ } };
const plain = (s) => String(s || "").replace(/\*([^*]+)\*/g, "$1");
const TABS = [["course", "Course"], ["college", "College"], ["community", "Community"], ["mine", "My resources"]];
const KIND = { slides: "Slides", quiz: "Quiz", lesson: "Lesson plan", link: "Link" };
let host = null, headHtml = "";

/* ---------- The old blank resources, cleared once ---------- */
const BLANK = ["Add the subject-specific explanation in short sentences.", "Add the tools, equipment, drawings, specifications, handouts, images or digital resources required for this subject."];
function generatedBlank(r) {
  if (r.kind !== "created") return false;
  if (r.type === "lesson-plan") return /^Generated from /.test(r.notes || "") && (r.fields || {}).resources === BLANK[1];
  if (r.type === "presentation") return (r.slides || []).some((x) => String(x.text || "").startsWith(BLANK[0])) && !(r.slides || []).some((x) => x.imageKey);
  if (r.type === "quiz") return / · KSB check$/.test(r.title || "") && !(r.results || []).length && (r.questions || []).every((q) => /^Which statement best matches /.test(q.text || ""));
  if (r.type === "sow") return r.notes === "DfE/Ofsted-aligned planning structure. Tutor controlled.";
  return false;
}
function cleanOnce() {
  if (read(CLEANED, false) || !App()) return;
  const st = App().getState(), gone = (st.resources || []).filter(generatedBlank);
  write(CLEANED, true);
  if (!gone.length) return;
  write(BACKUP, gone);
  const ids = new Set(gone.map((r) => r.id));
  App().mutate((s) => { s.resources = (s.resources || []).filter((r) => !ids.has(r.id)); (s.courses || []).forEach((c) => { c.lessonPlanIds = (c.lessonPlanIds || []).filter((x) => !ids.has(x)); if (ids.has(c.sowId)) c.sowId = ""; }); }, false);
}

/* ---------- The page ---------- */
const tab = () => { const t = read(TAB, "course"); return TABS.some((x) => x[0] === t) ? t : "course"; };
const tabsHtml = (on) => '<div class="sl-tabs" role="tablist" aria-label="Resources">' + TABS.map(([k, t]) => '<button type="button" role="tab" data-sl-tab="' + k + '" aria-selected="' + (k === on) + '" class="' + (k === on ? "on" : "") + '">' + t + (k === "community" ? ' <small>soon</small>' : "") + '</button>').join("") + '</div>';
function bindTabs(root) {
  root.querySelectorAll("[data-sl-tab]").forEach((b) => b.onclick = () => { write(TAB, b.dataset.slTab); App().mutate((st) => { st.view = "resources"; }, true); window.scrollTo({ top: 0 }); });
}
function render(app, head) {
  cleanOnce();
  const t = tab();
  if (t === "mine") return false;
  host = app; headHtml = head;
  app.innerHTML = head + tabsHtml(t) + '<div class="sl-body"><p class="sl-loading">Loading…</p></div>';
  bindTabs(app);
  const body = app.querySelector(".sl-body");
  if (t === "course") courseTab(body); else if (t === "college") collegeTab(body); else communityTab(body);
  return true;
}
/* My resources: app.js draws the tutor's own library; it gets the tabs, loses the old course uploader, and each
   slide deck, quiz and lesson plan can be shared with the college. */
function decorateMine(app) {
  if (tab() !== "mine" || app.querySelector(".sl-tabs")) return;
  const head = app.querySelector(".staff-page-head");
  if (head) head.insertAdjacentHTML("afterend", tabsHtml("mine") + '<p class="sl-note">Slides, quizzes and lesson plans you made yourself. Share them, and every tutor at your college can teach from them.</p>');
  bindTabs(app);
  app.querySelectorAll(".samos-section-head h2").forEach((h) => { if (/Official courses/.test(h.textContent)) h.closest("section").remove(); });
  app.querySelectorAll("[data-resource-id]").forEach((row) => {
    const r = (App().getState().resources || []).find((x) => x.id === row.dataset.resourceId);
    if (!r || !["presentation", "quiz", "lesson-plan"].includes(r.type) || row.querySelector("[data-sl-share]")) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "text-button"; b.dataset.slShare = r.id; b.textContent = "Share with my college";
    b.onclick = (e) => { e.stopPropagation(); shareMine(r, b); };
    const acts = row.querySelector(".row-actions"); if (acts) acts.prepend(b);
  });
}

/* ---------- Course ---------- */
async function courseTab(body) {
  let list = [];
  try { list = await T().courseList(); } catch (_) { /* none */ }
  const st = App().getState(), mineCodes = [...new Set((st.classes || []).filter((c) => !c.archived && c.courseCode).map((c) => c.courseCode))];
  const active = (st.classes || []).find((c) => c.id === st.activeClassId);
  let code = read(COURSE, "") || (active && active.courseCode) || mineCodes[0] || (list[0] && list[0].code);
  if (!list.some((c) => c.code === code)) code = list[0] && list[0].code;
  if (!code) { body.innerHTML = '<section class="staff-card"><p>No courses yet. They come from Nisia.</p></section>'; return; }
  const sorted = list.slice().sort((a, b) => (mineCodes.includes(b.code) - mineCodes.includes(a.code)) || a.name.localeCompare(b.name));
  body.innerHTML = '<div class="sl-bar"><label class="sl-pick">Course<select data-sl-course>' + sorted.map((c) => '<option value="' + esc(c.code) + '"' + (c.code === code ? " selected" : "") + '>' + esc(c.name) + (mineCodes.includes(c.code) ? " · your classes" : "") + '</option>').join("") + '</select></label></div><p class="sl-loading">Getting the lessons ready…</p>';
  body.querySelector("[data-sl-course]").onchange = (e) => { write(COURSE, e.target.value); courseTab(body); };
  let c;
  try { c = await T().course(code); } catch (e) { body.querySelector(".sl-loading").outerHTML = '<p class="sl-err">' + esc(e.message) + '</p>'; return; }
  if (!body.isConnected) return;
  const lessons = c.units.reduce((n, u) => n + u.lessons.length, 0), slides = c.units.reduce((n, u) => n + u.lessons.reduce((m, l) => m + l.slides.length, 0), 0);
  body.querySelector(".sl-loading").outerHTML =
    '<p class="sl-note">' + esc(c.name) + (c.std ? " (" + esc(c.std) + ")" : "") + ': ' + c.units.length + ' units, ' + lessons + ' lessons, ' + slides + ' slides. The same lessons your registers teach from; your scheme of work spreads them over your class’s dates.' +
      (c.rich ? "" : " Made from the standard’s KSB wording: check them and add your own detail.") + '</p>' +
    c.units.map((u, i) => { const teach = u.lessons.filter((l) => l.slides.length), qs = u.lessons.reduce((n, l) => n + l.quiz.length, 0);
      return '<details class="sl-unit"' + (i === 0 ? " open" : "") + '><summary><span class="sl-n">' + (i + 1) + '</span><span class="sl-unit-t"><b>' + esc(u.name) + '</b><small>' + teach.length + (teach.length === 1 ? " lesson" : " lessons") + ' · ' + qs + ' questions · ' + esc(u.codes.slice(0, 8).join(" ")) + (u.codes.length > 8 ? " +" + (u.codes.length - 8) : "") + '</small></span></summary>' +
        '<div class="sl-lessons">' + teach.map((l) => '<div class="sl-row"><span class="sl-row-t"><b>' + esc(l.title) + (l.draft ? ' <em class="sl-draft">Draft</em>' : "") + '</b><small>' + esc(plain(l.blurb)) + ' · ' + l.slides.length + ' slides' + (l.quiz.length ? ' · ' + l.quiz.length + ' questions' : "") + '</small></span>' +
          '<span class="sl-acts"><button type="button" class="soft-button" data-play="slides" data-u="' + esc(u.name) + '" data-l="' + esc(l.id) + '">Teach</button>' + (l.quiz.length ? '<button type="button" class="soft-button" data-play="quiz" data-u="' + esc(u.name) + '" data-l="' + esc(l.id) + '">Quiz</button>' : "") + '</span></div>').join("") +
          '<div class="sl-row sl-unit-row"><span class="sl-row-t"><b>The whole unit</b><small>Every lesson’s slides, and the unit check</small></span><span class="sl-acts"><button type="button" class="soft-button" data-play="slides" data-u="' + esc(u.name) + '">Teach all</button><button type="button" class="soft-button" data-play="quiz" data-u="' + esc(u.name) + '">Unit check</button></span></div>' +
        '</div></details>'; }).join("");
  body.querySelectorAll("[data-play]").forEach((b) => b.onclick = () => T().playLibrary(code, b.dataset.u, b.dataset.l || null, b.dataset.play));
}

/* ---------- College ---------- */
/* A college resource as slides or questions the teaching screens can show. */
const asSlides = (r) => ((r.content && r.content.slides) || []).map((x) => ({ title: x.title || r.title, text: x.text || "", points: x.points || null }));
const asQuiz = (r) => ((r.content && r.content.questions) || []).map((q) => q.opts ? q : { q: q.text || q.q || "", opts: q.answers || q.opts || [], a: Number(q.correct ?? q.a ?? 0), why: q.why || "" }).filter((q) => q.q && q.opts && q.opts.length > 1);
async function collegeTab(body) {
  const n = N();
  if (!n || !n.college()) {
    body.innerHTML = '<section class="staff-card sl-empty"><h2>Your college’s resources</h2><p>Sign in to Nisia to see the slides, quizzes and files your college shares.</p><button type="button" class="blue-button" data-sl-signin>Connect to Nisia</button></section>';
    body.querySelector("[data-sl-signin]").onclick = () => { const b = document.getElementById("nisiaButton"); if (b) b.click(); };
    return;
  }
  let names = {}; try { names = Object.fromEntries((await T().courseList()).map((c) => [c.code, c.name])); } catch (_) { /* codes, then */ }
  const cname = (c) => names[c] || c;
  const draw = (rows, note) => {
    const filter = read(COURSE + ".college", ""), courses = [...new Set(rows.map((r) => r.course_code).filter(Boolean))];
    const shown = rows.filter((r) => !filter || r.course_code === filter);
    body.innerHTML = '<div class="sl-bar">' + (courses.length ? '<label class="sl-pick">Course<select data-sl-cfilter><option value="">All courses</option>' + courses.map((c) => '<option value="' + esc(c) + '"' + (c === filter ? " selected" : "") + '>' + esc(cname(c)) + '</option>').join("") + '</select></label>' : "<span></span>") +
        '<button type="button" class="blue-button" data-sl-addlink>+ Add a link</button></div>' +
      '<p class="sl-note">Shared by tutors and admins at ' + esc(n.college().organisation) + '. Put any slides or quiz into a session on your scheme of work and the register’s Teach button uses it.' + (note ? " " + esc(note) : "") + '</p>' +
      (shown.length ? '<div class="staff-card sl-list">' + shown.map((r) => '<div class="sl-row" data-rid="' + esc(r.id) + '"><span class="sl-kind k-' + esc(r.kind) + '">' + esc(KIND[r.kind] || r.kind) + '</span><span class="sl-row-t"><b>' + esc(r.title) + '</b><small>' + esc([r.course_code && cname(r.course_code), r.unit, r.shared_by && "Shared by " + r.shared_by].filter(Boolean).join(" · ")) + '</small></span>' +
          '<span class="sl-acts">' + (r.kind === "slides" ? '<button type="button" class="soft-button" data-c="teach">Teach</button>' : r.kind === "quiz" ? '<button type="button" class="soft-button" data-c="quiz">Play</button>' : r.kind === "lesson" ? '<button type="button" class="soft-button" data-c="view">View</button>' : '<button type="button" class="soft-button" data-c="open">Open</button>') +
          (r.kind === "slides" || r.kind === "quiz" ? '<button type="button" class="soft-button" data-c="use">Use in a session</button>' : "") + (r.can_remove ? '<button type="button" class="danger-text" data-c="down">Take down</button>' : "") + '</span></div>').join("") + '</div>'
        : '<section class="staff-card sl-empty"><h2>Nothing shared yet</h2><p>Share your own slides and quizzes from My resources, or add a link to a file your college keeps (a PowerPoint, a video).</p></section>');
    const f = body.querySelector("[data-sl-cfilter]"); if (f) f.onchange = () => { write(COURSE + ".college", f.value); draw(rows, note); };
    body.querySelector("[data-sl-addlink]").onclick = () => addLink(body);
    body.querySelectorAll("[data-c]").forEach((b) => b.onclick = () => {
      const r = rows.find((x) => x.id === b.closest("[data-rid]").dataset.rid), c = b.dataset.c;
      if (c === "teach") T().playList(r.title, "slides", asSlides(r));
      else if (c === "quiz") T().playList(r.title, "quiz", asQuiz(r));
      else if (c === "open") window.open(r.url, "_blank", "noopener");
      else if (c === "view") viewLesson(r);
      else if (c === "use") useInSession(r);
      else if (c === "down") { if (!confirm("Take “" + r.title + "” down? Tutors at your college won’t see it any more.")) return; n.unshare(r.id).then(() => { App().toast("Taken down"); collegeTab(body); }).catch((e) => App().toast(e.message)); }
    });
  };
  const kept = read(CACHE, null);
  if (kept) draw(kept, navigator.onLine === false ? "(No signal: this is what was here last time.)" : "");
  if (navigator.onLine === false) { if (!kept) body.innerHTML = '<section class="staff-card sl-empty"><p>No signal. Your college’s resources show here when you’re back online.</p></section>'; return; }
  try { const rows = (await n.resources()) || []; write(CACHE, rows); if (body.isConnected) draw(rows, ""); }
  catch (e) { if (!kept) body.innerHTML = '<p class="sl-err">' + esc(e.message) + '</p>'; }
}
function sheetOpen(title, html) {
  const o = document.createElement("div"); o.className = "sl-sheet"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true");
  o.innerHTML = '<div class="sl-card"><header><h2>' + esc(title) + '</h2><button type="button" class="sl-x" aria-label="Close">×</button></header>' + html + '</div>';
  o.querySelector(".sl-x").onclick = () => o.remove(); o.addEventListener("click", (e) => { if (e.target === o) o.remove(); });
  document.body.appendChild(o); return o;
}
async function codesAndUnits() { let list = []; try { list = await T().courseList(); } catch (_) { } return list; }
async function addLink(body) {
  const list = await codesAndUnits();
  const o = sheetOpen("Add a link", '<form class="sl-form"><label>Name<input name="title" required maxlength="200" placeholder="e.g. Cavity walls PowerPoint"></label><label>Link<input name="url" required type="url" placeholder="https://"></label>' +
    '<label>Course<select name="course"><option value="">Any course</option>' + list.map((c) => '<option value="' + esc(c.code) + '">' + esc(c.name) + '</option>').join("") + '</select></label><label>Unit <small>(optional)</small><input name="unit" maxlength="200"></label>' +
    '<p class="sl-err" hidden></p><button type="submit" class="blue-button">Share with my college</button></form>');
  const f = o.querySelector("form"), err = f.querySelector(".sl-err");
  f.onsubmit = async (e) => { e.preventDefault(); err.hidden = true;
    try { await N().share("link", f.title.value, { url: f.url.value.trim(), course: f.course.value, unit: f.unit.value }); o.remove(); App().toast("Shared with your college"); collegeTab(body); }
    catch (x) { err.textContent = x.message; err.hidden = false; } };
}
async function shareMine(r, btn) {
  const n = N();
  if (!n || !n.college()) { App().toast("Sign in to Nisia first, then share."); const b = document.getElementById("nisiaButton"); if (b) b.click(); return; }
  const st = App().getState(), active = (st.classes || []).find((c) => c.id === st.activeClassId), course = active && active.courseCode || null;
  const content = r.type === "presentation" ? { slides: (r.slides || []).map((x) => ({ title: x.title || "", text: x.text || "" })) }
    : r.type === "quiz" ? { questions: (r.questions || []).map((q) => ({ q: q.text || "", opts: q.answers || [], a: Number(q.correct) || 0 })) } : { fields: r.fields || {} };
  btn.disabled = true; btn.textContent = "Sharing…";
  try { await n.share(r.type === "presentation" ? "slides" : r.type === "quiz" ? "quiz" : "lesson", r.title, { course, content }); btn.textContent = "Shared ✓"; App().toast("Shared: every tutor at your college can use it"); }
  catch (e) { btn.disabled = false; btn.textContent = "Share with my college"; App().toast(e.message); }
}
const FIELD_NAMES = { topic: "Topic", learningOutcomes: "Learning outcomes", priorLearning: "Prior learning", starter: "Starter", tutorActivities: "Tutor activities", learnerActivities: "Learner activities", assessment: "Checking understanding", resources: "Resources", englishMathsDigital: "English, maths and digital", inclusion: "Supporting every learner", safeguarding: "Safeguarding and wellbeing", workplace: "Workplace", healthSafety: "Health and safety", plenary: "Plenary", nextLearning: "Next" };
function viewLesson(r) {
  const f = (r.content && r.content.fields) || {};
  sheetOpen(r.title, '<div class="sl-doc">' + Object.keys(FIELD_NAMES).filter((k) => f[k]).map((k) => '<h3>' + FIELD_NAMES[k] + '</h3><p>' + esc(f[k]).replace(/\n/g, "<br>") + '</p>').join("") + (r.shared_by ? '<p class="sl-note">Shared by ' + esc(r.shared_by) + '</p>' : "") + '</div>');
}
async function useInSession(r) {
  const st = App().getState(), regs = (st.classes || []).filter((c) => !c.archived && c.courseCode);
  if (!regs.length) { App().toast("Set a course on one of your registers first."); return; }
  const o = sheetOpen("Use in a session", '<form class="sl-form"><label>Class<select name="reg">' + regs.map((c) => '<option value="' + esc(c.id) + '"' + (c.id === st.activeClassId ? " selected" : "") + '>' + esc(c.name) + '</option>').join("") + '</select></label>' +
    '<label>Session<select name="date"><option>Loading…</option></select></label><p class="sl-note">Its ' + (r.kind === "quiz" ? "quiz" : "slides") + ' will be “' + esc(r.title) + '” instead of the course’s own.</p><button type="submit" class="blue-button">Use it</button></form>');
  const f = o.querySelector("form");
  const fill = async () => { const list = await T().upcoming(f.reg.value); f.date.innerHTML = list.length ? list.map((x) => '<option value="' + esc(x.date) + '">' + esc(T().dayText(x.date) + " · Session " + x.n + " · " + x.title) + '</option>').join("") : '<option value="">No sessions coming up</option>'; };
  f.reg.onchange = fill; await fill();
  f.onsubmit = (e) => { e.preventDefault(); if (!f.date.value) return;
    T().swapInto(f.reg.value, f.date.value, { kind: r.kind, title: r.title, list: r.kind === "quiz" ? asQuiz(r) : asSlides(r) });
    o.remove(); App().toast("Done: that session will teach “" + r.title + "”"); App().mutate(() => {}, true); };
}

/* ---------- Community ---------- */
function communityTab(body) {
  body.innerHTML = '<section class="staff-card sl-soon"><span class="sl-soon-tag">Coming soon</span><h2>Community resources</h2>' +
    '<p>Slides, quizzes and lesson plans shared between colleges on Nisia, for every course. Tutors share what works; each one is checked before other colleges see it, so it’s accurate and it’s yours to share.</p>' +
    '<ul><li>Search by course, unit and KSB</li><li>Put any of them into a session on your scheme of work</li><li>Rate what you use, so the best rise to the top</li></ul></section>';
}

window.SymiLibrary = { render, decorateMine };
/* Symi drew its first page before this loaded: draw Resources again if that's where it opened. */
setTimeout(() => { try { if (App() && App().getState().view === "resources") App().mutate(() => {}, true); } catch (_) { } }, 0);
})();
