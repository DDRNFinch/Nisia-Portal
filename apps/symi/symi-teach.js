/* Symi teaching: every class gets a scheme of work set to its own dates, and each session a lesson plan, slides to
   teach from and a class quiz. Nothing to write: it's made from the course's units and KSBs (the course pack in
   Nisia) and the lessons in Evia's Teach me, which were checked one by one (teach-*.js, with their pictures). A course
   with no Teach me lessons yet still gets a full plan, built from the standard's own KSB wording, so any course a
   college adds in Nisia works straight away.

   Where: a strip on the register ("Today: Session 3 · Mixing mortar") with Teach, Quiz and Lesson plan, and the
   whole scheme of work. Plans and documents print. Tutors' own notes for a session are kept on the phone.
   window.SymiTeach: open(regId, view), planFor(regId), sessionFor(regId, key). */
(() => {
"use strict";
const App = () => window.SamosApp;
const V = window.SYMI_BUILD || "";
const EVIA = "../evia/";
const TEACH_FILES = { bricklayer: "teach-bricklayer.js", joiner: "teach-joiner.js", site: "teach-site.js", trowel3: "teach-trowel3.js" };
const NOTES = "symi.teach.notes.v1";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = (s) => esc(s).replace(/\*([^*]+)\*/g, "<b>$1</b>");
const plain = (s) => String(s || "").replace(/\*([^*]+)\*/g, "$1");
/* Teach me talks to someone tapping on a phone; on a classroom screen those instructions don't fit, so they go. */
const forClass = (s) => String(s || "").split(/(?<=[.!?])\s+/).filter((x) => !/^(tap|drag|swipe|press|pick|choose)\b|\btap (each|the|on|them|it)\b/i.test(x.trim())).join(" ");
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch (_) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* full */ } };
const P2 = (n) => String(n).padStart(2, "0");
const keyOf = (d) => d.getFullYear() + "-" + P2(d.getMonth() + 1) + "-" + P2(d.getDate());
const addDays = (k, n) => { const d = new Date(k + "T12:00:00"); d.setDate(d.getDate() + n); return keyOf(d); };
const dayText = (k, long) => new Date(k + "T12:00:00").toLocaleDateString("en-GB", long ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" });
const mins = (t) => { const [h, m] = String(t || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const clock = (n) => P2(Math.floor(n / 60) % 24) + ":" + P2(n % 60);
const hm = (n) => { n = Math.max(0, Math.round(n)); const h = Math.floor(n / 60), m = n % 60; return (h ? h + "h" : "") + (m ? (h ? " " : "") + m + "m" : h ? "" : "0m"); };
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const unitNo = (s) => { const m = /^(?:unit\s*)?(\d{3})\b/i.exec(String(s || "").trim()); return m ? m[1] : null; };
const sameUnit = (a, b) => norm(a) === norm(b) || (unitNo(a) && unitNo(a) === unitNo(b));
/* A steady shuffle: the same question always shows its answers in the same order, so a printed quiz matches. */
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const shuffle = (list, seed) => { const a = list.slice(); let h = hash(seed); for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- Loading the course and its lessons ---------- */
const scripts = {};
const script = (src) => scripts[src] || (scripts[src] = new Promise((ok, no) => {
  const s = document.createElement("script"); s.src = src + (V ? "?v=" + V : ""); s.onload = ok;
  s.onerror = () => { delete scripts[src]; no(new Error("Couldn’t load the lessons. Check your connection and try again.")); };
  document.head.appendChild(s);
}));
let packs = null;
const loadPacks = () => packs || (packs = import("../../packages/core/packs.js"));
async function courseList() { const m = await loadPacks(); return Object.entries(m.allCoursePacks()).map(([code, c]) => ({ code, name: c.name })); }
async function teachUnits(code) {
  const f = TEACH_FILES[code];
  if (!f) return null;
  await script(EVIA + "teach-kit.js"); await script(EVIA + "teach-pics.js"); await script(EVIA + f);
  try { await script(EVIA + "practice-tasks.js"); } catch (_) { /* the plan works without them */ }
  return ((window.EVIA_TEACH || {}).courses || {})[code] || null;
}
const pic = (name) => { const T = window.EVIA_TEACH, f = T && T.pics && T.pics[name]; if (!f) return ""; try { return f(); } catch (_) { return ""; } };

/* ---------- Slides and questions from a Teach me lesson ---------- */
function slidesOf(lesson) {
  const out = [];
  for (const s of lesson.steps || []) {
    if (s.t === "teach" || s.t === "learn") out.push({ title: s.title || s.key || lesson.title, text: forClass(s.say || s.text), pic: s.pic || "" });
    else if (s.t === "explore") out.push({ title: s.title, text: forClass(s.say), pic: s.pic || "", points: (s.spots || []).map((p) => [p.label, p.text]) });
    else if (s.t === "watch") (s.frames || []).forEach((f, i, all) => out.push({ title: s.title + (all.length > 1 ? " · " + (i + 1) + " of " + all.length : ""), text: f.text, pic: f.pic || "" }));
    else if (s.t === "cards") out.push({ title: s.title, text: "", pic: "", points: (s.cards || []).map((c) => [c.term, c.back]) });
    /* The lesson's activities teach too: terms and their meanings, the steps in order, good and bad practice. */
    else if (s.t === "match" && s.pairs) out.push({ title: "Key terms", text: plain(s.why || ""), points: s.pairs.map((p) => [p[0], p[1]]) });
    else if (s.t === "order" && s.items) out.push({ title: "Step by step", text: plain(s.q || ""), points: s.items.map((x, i) => ["" + (i + 1) + ".", x]), pic: (s.again && s.again.pic) || "" });
    else if (s.t === "judge" && s.items) out.push({ title: "Good practice, bad practice", text: "", points: s.items.map((i) => [i.good ? "✓" : "✗", i.text + (i.why ? " — " + i.why : "")]) });
    else if (s.t === "sort" && s.bins && s.items) out.push({ title: plain(s.q || "Sort it"), text: "", points: s.bins.map((b) => [b, s.items.filter((i) => i.bin === b || i.bin === s.bins.indexOf(b)).map((i) => i.text).filter(Boolean).join(", ")]).filter((p) => p[1]) });
  }
  /* And what the answers explain, as the lesson's key points. */
  const why = (lesson.steps || []).flatMap((s) => (s.t === "choice" || s.t === "tf" || s.t === "spot") && s.why ? [s.why]
    : s.t === "scene" && s.opts ? (s.opts.filter((o) => o.ok && o.why).map((o) => o.why)) : s.t === "gap" && s.text ? [s.text.replace(/\[([^\]]+)\]/g, "*$1*")] : []);
  if (out.length && why.length) out.push({ title: "Key points", text: "", points: why.slice(0, 6).map((w) => ["", w]), key: true });
  return out;
}
function quizOf(lesson) {
  const out = [], seed = lesson.id || lesson.title;
  const choice = (q, opts, right, why) => { const sh = shuffle(opts, seed + q); out.push({ q, opts: sh, a: sh.indexOf(right), why: why || "" }); };
  for (const s of lesson.steps || []) {
    if (s.t === "choice" && s.opts) choice(s.q, s.opts, s.opts[s.a || 0], s.why);
    else if (s.t === "tf") out.push({ q: s.q, opts: ["True", "False"], a: s.a ? 0 : 1, why: s.why || "" });
    else if (s.t === "quick") (s.items || []).forEach((i) => out.push({ q: i.q, opts: ["True", "False"], a: i.a ? 0 : 1, why: "" }));
    else if (s.t === "scene" && s.opts) { const ok = s.opts.find((o) => o.ok) || s.opts[0]; choice((s.say ? (s.who ? s.who + ": " : "") + "“" + s.say + "” " : "") + s.q, s.opts.map((o) => o.text), ok.text, ok.why); }
    else if (s.t === "next" && s.opts) choice("What comes next? " + (s.seq || []).join(" → ") + " → …", s.opts, s.opts[0], s.why);
    else if (s.t === "spot" && s.lines) out.push({ q: s.q, opts: s.lines, a: s.a, why: s.why || "" });
    else if (s.t === "order" && s.items) out.push({ q: s.q, answer: s.items.map((x, i) => (i + 1) + ". " + x).join("\n"), why: s.why || "" });
    else if (s.t === "gap" && s.text) out.push({ q: "Fill the gaps: " + s.text.replace(/\[[^\]]+\]/g, "_____"), answer: s.text.replace(/\[([^\]]+)\]/g, "$1"), why: s.why || "" });
    else if (s.t === "match" && s.pairs) out.push({ q: s.q, answer: s.pairs.map((p) => p[0] + " → " + p[1]).join("\n"), why: s.why || "" });
    else if (s.t === "build" && s.answer) out.push({ q: s.q, answer: Array.isArray(s.answer) ? s.answer.join(" ") : String(s.answer), why: s.why || "" });
    else if (s.t === "judge" && s.items) out.push({ q: s.q, answer: s.items.map((i) => (i.good ? "✓ " : "✗ ") + i.text).join("\n"), why: "" });
  }
  return out.filter((x) => x.q);
}
/* A course with no Teach me lessons yet: a lesson for every few KSBs, from the standard's wording. */
function fallbackLessons(unitName, codes, text) {
  const groups = [];
  for (let i = 0; i < codes.length; i += 3) groups.push(codes.slice(i, i + 3));
  return groups.map((g, n) => ({
    id: norm(unitName).replace(/ /g, "-") + "-" + (n + 1), title: unitName + (groups.length > 1 ? " · part " + (n + 1) : ""), blurb: g.map((c) => text[c] || c).join(" "), draft: true,
    slides: [{ title: unitName, text: "What this session covers, from the standard.", points: g.map((c) => [c, text[c] || ""]) }]
      .concat(g.map((c) => ({ title: c, text: text[c] || "", points: [["On site", "Where does this happen in your work? Give an example."], ["Show it", "What would an assessor need to see?"], ["Get it right", "What goes wrong, and how do you avoid it?"]] }))),
    quiz: g.map((c) => ({ q: "Explain in your own words: " + (text[c] || c), answer: "Look for an answer that covers: " + (text[c] || c), why: "" })),
  }));
}
function practiceFor(code, unit) {
  const list = ((window.EVIA_PRACTICE_TASKS || {})[code]) || [];
  const words = new Set(norm(unit.name + " " + (unit.skill || "")).split(" ").filter((w) => w.length > 3));
  let best = null, score = 0;
  for (const t of list) {
    let n = (t.skills || []).includes(unit.skill) ? 5 : 0;
    norm(t.title + " " + (t.skills || []).join(" ")).split(" ").forEach((w) => { if (words.has(w)) n++; });
    if (n > score) { score = n; best = t; }
  }
  return best;
}

/* The course: its units in order, each with its KSBs and lessons (slides and questions). Kept once made. */
const courses = {};
function course(code) {
  return courses[code] || (courses[code] = (async () => {
    const m = await loadPacks(), pack = m.coursePack(code);
    if (!pack) throw new Error("That course isn’t in Nisia yet.");
    let tu = null; try { tu = await teachUnits(code); } catch (e) { tu = null; }
    const text = Object.fromEntries(pack.ksbs || []);
    const units = (pack.units || []).map(([name, codes]) => {
      const t = tu && tu.find((u) => sameUnit(u.unit, name));
      const u = { name, codes: codes || [], skill: t ? t.skill : "", rich: !!t,
        lessons: t ? t.lessons.map((l) => ({ id: l.id, title: l.title, blurb: l.blurb || "", slides: slidesOf(l), quiz: quizOf(l) })) : fallbackLessons(name, codes || [], text) };
      u.task = practiceFor(code, u);
      return u;
    }).filter((u) => u.lessons.length);
    return { code, name: pack.name, std: pack.std, text, units, rich: units.some((u) => u.rich) };
  })().catch((e) => { delete courses[code]; throw e; }));
}

/* ---------- The scheme of work: the course spread over the class's own dates ---------- */
function regOf(regId) { const st = App().getState(); return (st.classes || []).find((c) => c.id === regId) || null; }
function classDays(reg) {
  const r = reg.recurrence || {}, today = App().today();
  const from = r.startDate || reg.classStartDate || reg.startDate || today, to = r.endDate || reg.classEndDate || reg.endDate || addDays(from, 7 * 39);
  const out = [];
  for (let k = from, n = 0; k <= to && n < 800 && out.length < 300; k = addDays(k, 1), n++) if (App().occursOn(reg.id, k)) out.push(k);
  return out;
}
function teachMinutes(reg) {
  const day = mins(reg.end) - mins(reg.start);
  const off = (reg.breaks || []).reduce((n, b) => n + Math.max(0, Math.min(mins(b.end), mins(reg.end)) - Math.max(mins(b.start), mins(reg.start))), 0);
  return Math.max(0, day - off);
}
function sow(c, days) {
  const U = c.units, S = days.length, out = days.map((date, i) => ({ n: i + 1, date, week: Math.floor((new Date(date + "T12:00:00") - new Date(days[0] + "T12:00:00")) / 6048e5) + 1, parts: [] }));
  if (!S || !U.length) return out;
  const part = (u, lessons, extra) => Object.assign({ unit: u, lessons }, extra || {});
  if (S <= U.length) {
    U.forEach((u, i) => out[Math.min(S - 1, Math.floor(i * S / U.length))].parts.push(part(u, u.lessons.filter((l) => l.slides.length), { check: true })));
  } else {
    const size = (u) => Math.max(1, u.lessons.filter((l) => l.slides.length).length);
    const review = S >= U.length * 2 + 2 ? 1 : 0, avail = S - review, W = U.reduce((n, u) => n + size(u), 0);
    const want = U.map((u) => avail * size(u) / W), n = want.map((w) => Math.max(1, Math.floor(w)));
    let left = avail - n.reduce((a, b) => a + b, 0);
    const order = want.map((w, i) => [w - Math.floor(w), i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; left > 0; k++, left--) n[order[k % order.length][1]]++;
    for (let k = U.length - 1; left < 0; k = (k + U.length - 1) % U.length) if (n[k] > 1) { n[k]--; left++; }
    let at = 0;
    U.forEach((u, i) => {
      /* The lessons that teach go first (all together when there are only a few, so the deck has substance); later
         sessions on the unit are practical, with a recap. Quiz-only lessons are the unit check. */
      const teach = u.lessons.filter((l) => l.slides.length), L = teach.length, spread = L > 3 ? Math.min(n[i], Math.ceil(L / 3)) : 1;
      for (let j = 0; j < n[i]; j++) {
        const ls = j < spread ? teach.slice(Math.floor(j * L / spread), Math.floor((j + 1) * L / spread)) : [];
        out[at++].parts.push(part(u, ls, { practice: !ls.length, check: j === n[i] - 1 }));
      }
    });
    if (review) out[S - 1].review = true;
  }
  return out;
}
const plans = {};
async function planFor(regId) {
  const reg = regOf(regId);
  if (!reg) throw new Error("That register has gone.");
  const code = reg.courseCode;
  if (!code) return { reg, needsCourse: true };
  const k = [regId, code, reg.start, reg.end, JSON.stringify(reg.recurrence || {}), JSON.stringify(reg.breaks || [])].join("|");
  if (plans[regId] && plans[regId].k === k) return plans[regId].p;
  const c = await course(code), days = classDays(reg), sessions = sow(c, days);
  const p = { reg, course: c, sessions, teach: teachMinutes(reg) };
  plans[regId] = { k, p };
  return p;
}
const sessionAt = (p, key) => p.sessions.find((s) => s.date === key) || null;
const nextSession = (p, key) => p.sessions.find((s) => s.date >= key) || null;
const codesOf = (s) => [...new Set(s.review ? [] : s.parts.flatMap((x) => x.unit.codes))];
const titleOf = (s) => s.review ? "Course review and assessment" : s.parts.map((x) => x.unit.name).filter((v, i, a) => a.indexOf(v) === i).join(" · ") || "Practical";
const lessonsOf = (s) => s.parts.flatMap((x) => x.lessons);
function slidesFor(p, s) {
  if (s.review) return [{ title: "Course review", unit: p.course.name, text: "Everything we’ve covered. What do you remember, and what are you unsure of?", cover: true }]
    .concat(p.course.units.map((u) => ({ title: u.name, text: "", points: u.lessons.filter((l) => l.slides.length).slice(0, 4).map((l) => [l.title, plain(l.blurb)]) })));
  const lessons = lessonsOf(s);
  const out = [{ title: titleOf(s), unit: "Session " + s.n + " · " + dayText(s.date), cover: true, text: lessons.length ? "Today you’ll learn:" : "Today is practical: putting what you’ve learned into practice.",
    points: lessons.length ? lessons.map((l) => [l.title, plain(l.blurb)]) : [] }];
  for (const part of s.parts) {
    if (!part.lessons.length) {
      const keys = part.unit.lessons.flatMap((l) => l.slides.filter((x) => x.key).flatMap((x) => x.points)).slice(0, 6);
      out.push({ title: "Recap: " + part.unit.name, text: "Remember from last time:", points: keys.length ? keys : part.unit.lessons.filter((l) => l.slides.length).map((l) => [l.title, plain(l.blurb)]) });
      /* The unit's pictures again, for a quick recap and the demonstration before the practical. */
      out.push(...part.unit.lessons.flatMap((l) => l.slides.filter((x) => x.pic)).slice(0, 6));
    }
    for (const l of part.lessons) { out.push({ title: l.title, text: plain(l.blurb), cover: true, unit: part.unit.name }); out.push(...l.slides); }
    const t = part.unit.task;
    if (t) out.push({ title: "Practical: " + t.title, text: t.brief, points: (t.steps || []).slice(0, 6).map((x, i) => [(i + 1) + ".", x]) });
  }
  return out;
}
function quizFor(p, s) {
  if (s.review) return p.course.units.flatMap((u) => u.lessons.flatMap((l) => l.quiz).filter((q) => q.opts).slice(0, 2));
  const fromLessons = lessonsOf(s).flatMap((l) => l.quiz);
  const challenge = s.parts.filter((x) => x.check).flatMap((x) => x.unit.lessons.filter((l) => !l.slides.length).flatMap((l) => l.quiz));
  const unitQs = s.parts.flatMap((x) => x.unit.lessons.flatMap((l) => l.quiz));
  const base = challenge.length ? challenge.concat(fromLessons) : fromLessons.length ? fromLessons : unitQs;
  const choice = base.filter((q) => q.opts), other = base.filter((q) => !q.opts);
  return choice.concat(other).slice(0, s.parts.some((x) => x.check) ? 12 : 8);
}
function recapFor(p, s) {
  const prev = p.sessions.filter((x) => x.n < s.n && !x.review).slice(-1)[0];
  return prev ? lessonsOf(prev).flatMap((l) => l.quiz).filter((q) => q.opts).slice(0, 4) : [];
}

/* ---------- The lesson plan: timed to the class's own day, around its breaks ---------- */
function timeline(p, s) {
  const reg = p.reg, T = p.teach, lessons = lessonsOf(s), recap = recapFor(p, s).length;
  const acts = [{ what: "Welcome, register and check-in", detail: "Learners check in on Evia with the code on Symi. Safety briefing for the day.", m: 10 }];
  if (recap) acts.push({ what: "Recap quiz", detail: "Four questions from last session, answered together.", m: 10 });
  if (s.review) acts.push({ what: "Course review", detail: "Go through each unit with the slides; learners say what they remember and what they’re unsure of.", m: 40 });
  lessons.forEach((l) => acts.push({ what: "Teach: " + l.title, detail: plain(l.blurb) + " (" + l.slides.length + " slides)", m: Math.min(45, 10 + 3 * l.slides.length), lesson: l.id }));
  const quizM = s.review ? 30 : 15, endM = 15;
  const fixed = acts.reduce((n, a) => n + a.m, 0) + quizM + endM, task = (s.parts.find((x) => x.unit.task) || {}).unit;
  const practical = T - fixed;
  if (practical >= 20) acts.push({ what: s.review ? "Practical assessment" : "Practical in the workshop", detail: task && task.task ? task.task.title + ". " + task.task.brief : "Demonstrate first, then learners practise in their bays. Watch each learner against today’s KSBs and give feedback.", m: practical, practical: true });
  acts.push({ what: s.review ? "Final quiz" : "Class quiz", detail: s.parts.some((x) => x.check) ? "Unit check: what has everyone got?" : "Check what’s gone in, and what to go over again.", m: quizM, quiz: true });
  acts.push({ what: "Review and next steps", detail: "What did we learn? Photos of work go to Evia as evidence. Learning hours are confirmed when the register is finished.", m: endM });
  /* Too much for a short day: shrink the teaching in step, but keep each part at least 5 minutes. */
  const need = acts.reduce((n, a) => n + a.m, 0);
  if (need > T && T > 0) { const f = T / need; acts.forEach((a) => { a.m = Math.max(5, Math.round(a.m * f)); }); }
  const breaks = (reg.breaks || []).map((b) => [mins(b.start), mins(b.end)]).sort((a, b) => a[0] - b[0]);
  const rows = []; let t = mins(reg.start);
  const breakAt = (x) => breaks.find((b) => x >= b[0] && x < b[1]);
  for (const a of acts) {
    let left = a.m, first = true;
    while (left > 0) {
      const b = breakAt(t); if (b) { rows.push({ from: b[0], to: b[1], what: "Break", brk: true }); t = b[1]; continue; }
      const nb = breaks.find((x) => x[0] > t), until = nb ? Math.min(nb[0], t + left) : t + left;
      rows.push(Object.assign({}, a, { from: t, to: until, what: first ? a.what : a.what + " (continued)" }));
      left -= until - t; t = until; first = false;
    }
  }
  for (const b of breaks) if (b[0] >= t && b[1] <= mins(reg.end)) rows.push({ from: b[0], to: b[1], what: "Break", brk: true });
  return rows.sort((a, b) => a.from - b.from);
}
function keyWords(s) {
  const words = new Set();
  for (const l of lessonsOf(s)) for (const sl of l.slides) { (String(sl.text || "").match(/\*([^*]+)\*/g) || []).forEach((w) => words.add(w.replace(/\*/g, ""))); (sl.points || []).forEach((p) => { if (p[0] && p[0].length < 28) words.add(p[0]); }); }
  return [...words].slice(0, 14);
}

/* ---------- The screens ---------- */
let sheet = null, view = null;
function close() { if (sheet) { sheet.remove(); sheet = null; } document.removeEventListener("keydown", keys); document.body.classList.remove("st-open"); }
function keys(e) {
  if (!view) return;
  if (e.key === "Escape") { e.preventDefault(); view.back ? view.back() : close(); }
  else if (view.next && (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ")) { e.preventDefault(); view.next(); }
  else if (view.prev && (e.key === "ArrowLeft" || e.key === "PageUp")) { e.preventDefault(); view.prev(); }
}
function frame(html, cls) {
  if (!sheet) { sheet = document.createElement("div"); sheet.id = "stSheet"; sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); document.body.appendChild(sheet); document.addEventListener("keydown", keys); document.body.classList.add("st-open"); }
  sheet.className = "st-sheet " + (cls || "");
  sheet.innerHTML = html;
  sheet.scrollTop = 0;
  const x = sheet.querySelector("[data-st-close]"); if (x) x.onclick = close;
  return sheet;
}
const head = (title, sub, back) => '<header class="st-head">' + (back ? '<button type="button" class="st-iconbtn" data-st-back aria-label="Back">‹</button>' : "") +
  '<div class="st-title"><small>' + esc(sub || "") + '</small><h2>' + esc(title) + '</h2></div><button type="button" class="st-iconbtn" data-st-close aria-label="Close">×</button></header>';
function wire(el, back) { const b = el.querySelector("[data-st-back]"); if (b) b.onclick = back; view = { back }; }

async function open(regId, what, key) {
  frame(head("Teaching", "Getting the lessons ready…") + '<div class="st-body"><p class="st-loading">Getting the lessons ready…</p></div>');
  view = { back: null };
  let p;
  try { p = await planFor(regId); } catch (e) { frame(head("Teaching", "") + '<div class="st-body"><p class="st-err">' + esc(e.message) + '</p></div>'); return; }
  if (p.needsCourse) return chooseCourse(regId, what);
  if (!p.sessions.length) { frame(head(p.reg.name, p.course.name) + '<div class="st-body"><p class="st-err">This class has no days set yet. Set its days and dates, then come back.</p></div>'); return; }
  const k = key || App().today(), s = sessionAt(p, k) || nextSession(p, k) || p.sessions[p.sessions.length - 1];
  if (what === "today") return todayFlow(p, s);
  if (what === "slides") return slides(p, s, () => close());
  if (what === "quiz") return quiz(p, s, () => close());
  if (what === "lesson") return lesson(p, s, () => schemeOfWork(p));
  return schemeOfWork(p);
}
async function chooseCourse(regId, what) {
  const reg = regOf(regId); let list = [];
  try { list = await courseList(); } catch (e) { /* none */ }
  const el = frame(head(reg.name, "Teaching") + '<div class="st-body"><section class="st-card"><h3>Which course is this class?</h3><p class="st-muted">Symi makes the scheme of work, lesson plans, slides and quizzes from the course.</p>' +
    '<div class="st-courses">' + list.map((c) => '<button type="button" class="st-course" data-code="' + esc(c.code) + '"><b>' + esc(c.name) + '</b></button>').join("") + '</div></section></div>');
  wire(el, null);
  el.querySelectorAll("[data-code]").forEach((b) => b.onclick = () => { App().mutate((st) => { const r = (st.classes || []).find((x) => x.id === regId); if (r) r.courseCode = b.dataset.code; }, true); open(regId, what); });
}
function schemeOfWork(p) {
  const today = App().today(), now = nextSession(p, today), c = p.course, total = p.sessions.length;
  const el = frame(head("Scheme of work", p.reg.name + " · " + c.name) +
    '<div class="st-body"><section class="st-sum"><div><b>' + total + '</b><span>sessions</span></div><div><b>' + hm(p.teach) + '</b><span>teaching each</span></div><div><b>' + hm(p.teach * total) + '</b><span>teaching in total</span></div><div><b>' + c.units.length + '</b><span>units</span></div></section>' +
    (c.rich ? "" : '<p class="st-note">Made from the standard’s KSB wording. Check it and add your own detail in each lesson’s notes.</p>') +
    '<div class="st-actions"><button type="button" class="st-btn" data-st-print>Print the scheme of work</button></div>' +
    '<ol class="st-sow">' + p.sessions.map((s) => '<li><button type="button" class="st-row' + (now && s.n === now.n ? " st-now" : "") + (s.date < today ? " st-past" : "") + '" data-n="' + s.n + '">' +
      '<span class="st-n">' + s.n + '</span><span class="st-when"><b>' + esc(dayText(s.date)) + '</b><small>Week ' + s.week + '</small></span>' +
      '<span class="st-what"><b>' + esc(titleOf(s)) + '</b><small>' + esc(s.review ? "Every unit, final quiz" : lessonsOf(s).map((l) => l.title).join(" · ") || "Practical, with a recap quiz") + '</small></span>' +
      '<span class="st-ksbs">' + (s.parts.some((x) => x.check) ? '<em>Unit check</em>' : "") + esc(codesOf(s).slice(0, 6).join(" ")) + (codesOf(s).length > 6 ? " +" + (codesOf(s).length - 6) : "") + '</span></button></li>').join("") + '</ol></div>');
  wire(el, null);
  el.querySelectorAll("[data-n]").forEach((b) => b.onclick = () => lesson(p, p.sessions[Number(b.dataset.n) - 1], () => schemeOfWork(p)));
  el.querySelector("[data-st-print]").onclick = () => printDoc(sowDoc(p));
  const cur = el.querySelector(".st-now"); if (cur) setTimeout(() => cur.scrollIntoView({ block: "center" }), 30);
}
function lessonHtml(p, s, forPrint) {
  const c = p.course, reg = p.reg, rows = timeline(p, s), codes = codesOf(s), notes = (read(NOTES, {})[reg.id + ":" + s.date] || "");
  const lessons = lessonsOf(s), words = keyWords(s), checks = quizFor(p, s).slice(0, 3), task = (s.parts.find((x) => x.unit.task) || {}).unit;
  const maths = lessons.some((l) => l.slides.some((x) => /\d|ratio|measure|gauge|square|area|volume|angle/i.test(x.text + " " + (x.points || []).flat().join(" "))));
  return '<section class="st-card st-doc"><div class="st-meta"><span><small>Class</small><b>' + esc(reg.name) + '</b></span><span><small>Date</small><b>' + esc(dayText(s.date, true)) + '</b></span>' +
    '<span><small>Time</small><b>' + esc(reg.start + "–" + reg.end) + ' · ' + hm(p.teach) + ' teaching</b></span><span><small>Session</small><b>' + s.n + ' of ' + p.sessions.length + ' · week ' + s.week + '</b></span>' +
    (reg.room ? '<span><small>Room</small><b>' + esc(reg.room) + '</b></span>' : "") + '<span><small>Learners</small><b>' + (reg.learners || []).length + '</b></span><span><small>Course</small><b>' + esc(c.name + (c.std ? " (" + c.std + ")" : "")) + '</b></span></div>' +
    '<h3>Aim</h3><p>' + (s.review ? "Bring the whole course together, find any gaps and check readiness for assessment." : esc(titleOf(s)) + ": " + (lessons.length ? lessons.map((l) => esc((plain(l.blurb) || l.title).replace(/[.\s]+$/, ""))).join("; ") + "." : "practical skills, applying what’s been taught.")) + '</p>' +
    (lessons.length ? '<h3>By the end of the session learners can</h3><ul>' + lessons.map((l) => '<li>' + esc(l.title) + (l.blurb ? ": " + esc(plain(l.blurb)) : "") + '</li>').join("") + '</ul>' : "") +
    (codes.length ? '<h3>KSBs</h3><ul class="st-ksblist">' + codes.map((k) => '<li><b>' + esc(k) + '</b> ' + esc(c.text[k] || "") + '</li>').join("") + '</ul>' : "") +
    '<h3>Session plan</h3><table class="st-table"><thead><tr><th>Time</th><th>Activity</th><th>Detail</th></tr></thead><tbody>' +
      rows.map((r) => '<tr class="' + (r.brk ? "st-brk" : "") + '"><td>' + clock(r.from) + '–' + clock(r.to) + '</td><td><b>' + esc(r.what) + '</b></td><td>' + (r.brk ? "" : esc(r.detail || "")) + '</td></tr>').join("") + '</tbody></table>' +
    (task && task.task ? '<h3>Practical task</h3><p><b>' + esc(task.task.title) + '.</b> ' + esc(task.task.brief) + '</p><ol>' + (task.task.steps || []).map((x) => '<li>' + esc(x) + '</li>').join("") + '</ol>' + ((task.task.check || []).length ? '<p><b>What good looks like:</b> ' + esc([].concat(task.task.check).join("; ")) + '</p>' : "") : "") +
    (words.length ? '<h3>Key words</h3><p>' + words.map(esc).join(" · ") + '</p>' : "") +
    (checks.length ? '<h3>Checking understanding</h3><ul>' + checks.map((q) => '<li>' + esc(plain(q.q)) + '</li>').join("") + '</ul><p class="st-muted">Plus the ' + (s.parts.some((x) => x.check) ? "unit check" : "class quiz") + ' (' + quizFor(p, s).length + ' questions) and watching each learner in the practical.</p>' : "") +
    '<h3>Supporting every learner</h3><p>Pictures on every slide and short steps. Pair learners where it helps; give a stretch task to those who finish early, and more time or one-to-one help to anyone who needs it. Check Evia for anyone flagged as needing support.</p>' +
    '<h3>Health and safety</h3><p>PPE checked before the practical; tools checked and used safely; tidy work area and safe manual handling. Stop work if anything is unsafe.</p>' +
    '<h3>English, maths and digital</h3><p>English: the key words, reading the task and explaining their work.' + (maths ? " Maths: the measuring, quantities and working out in today’s topic." : "") + ' Digital: checking in and uploading photos of their work to Evia.</p>' +
    '<h3>Resources</h3><p>' + (lessons.length ? lessons.reduce((n, l) => n + l.slides.length, 0) + " slides and a " : "A ") + quizFor(p, s).length + '-question quiz in Symi; the workshop, tools and materials for the practical; learners’ phones with Evia.</p>' +
    (forPrint ? (notes ? '<h3>Tutor’s notes</h3><p>' + esc(notes).replace(/\n/g, "<br>") + '</p>' : "") : '<h3>Your notes</h3><textarea class="st-notes" rows="3" placeholder="Anything to change or remember for this session">' + esc(notes) + '</textarea>') + '</section>';
}
function lesson(p, s, back) {
  const i = p.sessions.indexOf(s), prev = p.sessions[i - 1], next = p.sessions[i + 1];
  const el = frame(head("Session " + s.n + ": " + titleOf(s), dayText(s.date, true), !!back) +
    '<div class="st-body"><div class="st-big-actions"><button type="button" class="st-go" data-st-slides><b>Teach</b><small>' + slidesFor(p, s).length + ' slides</small></button>' +
      '<button type="button" class="st-go" data-st-quiz><b>' + (s.parts.some((x) => x.check) ? "Unit check" : "Class quiz") + '</b><small>' + quizFor(p, s).length + ' questions</small></button>' +
      '<button type="button" class="st-go st-go-soft" data-st-print><b>Print</b><small>Lesson plan</small></button></div>' +
    lessonHtml(p, s) +
    '<div class="st-pager">' + (prev ? '<button type="button" class="st-btn" data-st-go="' + prev.n + '">‹ Session ' + prev.n + '</button>' : "<span></span>") + (next ? '<button type="button" class="st-btn" data-st-go="' + next.n + '">Session ' + next.n + ' ›</button>' : "") + '</div></div>');
  wire(el, back);
  el.querySelector("[data-st-slides]").onclick = () => slides(p, s, () => lesson(p, s, back));
  el.querySelector("[data-st-quiz]").onclick = () => quiz(p, s, () => lesson(p, s, back));
  el.querySelector("[data-st-print]").onclick = () => printDoc('<h1>Lesson plan</h1>' + lessonHtml(p, s, true));
  el.querySelectorAll("[data-st-go]").forEach((b) => b.onclick = () => lesson(p, p.sessions[Number(b.dataset.stGo) - 1], back));
  const ta = el.querySelector(".st-notes");
  if (ta) ta.oninput = () => { const all = read(NOTES, {}); if (ta.value.trim()) all[p.reg.id + ":" + s.date] = ta.value; else delete all[p.reg.id + ":" + s.date]; write(NOTES, all); };
}
function slides(p, s, back, hooks) {
  hooks = hooks || {};
  const list = slidesFor(p, s);
  let i = 0;
  const draw = () => {
    const x = list[i] || { title: "No slides", text: "" }, svg = x.pic ? pic(x.pic) : "";
    if (i === list.length - 1 && hooks.onEnd) hooks.onEnd();
    const el = frame('<div class="st-deck"><header class="st-deckbar"><span>' + esc(p.reg.name) + ' · ' + esc(titleOf(s)) + '</span><span class="st-count">' + (i + 1) + ' / ' + list.length + '</span><button type="button" class="st-iconbtn" data-st-back aria-label="Close slides">×</button></header>' +
      '<article class="st-slide' + (x.cover ? " st-cover" : "") + (svg ? " st-has-pic" : "") + '"><div class="st-slide-text">' + (x.unit ? '<small>' + esc(x.unit) + '</small>' : "") + '<h1>' + esc(x.title) + '</h1>' + (x.text ? '<p>' + md(x.text) + '</p>' : "") +
        (x.points && x.points.length ? '<ul>' + x.points.map((pt) => '<li>' + (pt[0] ? '<b>' + md(pt[0]) + '</b> ' : "") + md(pt[1] || "") + '</li>').join("") + '</ul>' : "") + '</div>' +
        (svg ? '<div class="st-pic">' + svg + '</div>' : "") + '</article>' +
      '<footer class="st-deckfoot"><button type="button" class="st-nav" data-prev ' + (i ? "" : "disabled") + ' aria-label="Previous slide">‹</button><div class="st-dots" aria-hidden="true"><i style="width:' + ((i + 1) / list.length * 100) + '%"></i></div>' +
        (i < list.length - 1 ? '<button type="button" class="st-nav" data-next aria-label="Next slide">›</button>' : '<button type="button" class="st-btn st-primary" data-done>' + (quizFor(p, s).length ? "Class quiz" : "Done") + '</button>') + '</footer></div>', "st-dark");
    view = { back, next: () => { if (i < list.length - 1) { i++; draw(); } }, prev: () => { if (i) { i--; draw(); } } };
    el.querySelector("[data-st-back]").onclick = back;
    const pv = el.querySelector("[data-prev]"), nx = el.querySelector("[data-next]"), dn = el.querySelector("[data-done]");
    if (pv) pv.onclick = view.prev; if (nx) nx.onclick = view.next;
    if (dn) dn.onclick = () => quizFor(p, s).length ? quiz(p, s, back, hooks) : back();
    const sl = el.querySelector(".st-slide"); let x0 = null;
    sl.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    sl.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) (dx < 0 ? view.next : view.prev)(); });
  };
  draw();
}
function quiz(p, s, back, hooks) {
  hooks = hooks || {};
  const list = quizFor(p, s);
  let i = 0, shown = false, got = 0;
  const L = "ABCDEFGH";
  const draw = () => {
    if (i >= list.length) {
      if (hooks.onDone) hooks.onDone(got, list.length);
      const el = frame('<div class="st-deck"><header class="st-deckbar"><span>' + esc(titleOf(s)) + '</span><span></span><button type="button" class="st-iconbtn" data-st-back aria-label="Close">×</button></header>' +
        '<article class="st-slide st-cover"><div class="st-slide-text"><small>Quiz done</small><h1>' + got + ' of ' + list.length + ' right as a class</h1><p>Go over anything that tripped people up before the practical.</p></div></article>' +
        '<footer class="st-deckfoot"><button type="button" class="st-btn" data-again>Start again</button><span></span><button type="button" class="st-btn st-primary" data-done>Finish</button></footer></div>', "st-dark");
      view = { back }; el.querySelector("[data-st-back]").onclick = back; el.querySelector("[data-done]").onclick = back; el.querySelector("[data-again]").onclick = () => { i = 0; got = 0; shown = false; draw(); };
      return;
    }
    const q = list[i];
    const el = frame('<div class="st-deck"><header class="st-deckbar"><span>' + esc(s.parts.some((x) => x.check) ? "Unit check" : "Class quiz") + ' · ' + esc(titleOf(s)) + '</span><span class="st-count">' + (i + 1) + ' / ' + list.length + '</span><button type="button" class="st-iconbtn" data-st-back aria-label="Close quiz">×</button></header>' +
      '<article class="st-slide st-q"><div class="st-slide-text"><small>Question ' + (i + 1) + '</small><h1>' + md(q.q) + '</h1>' +
        (q.opts ? '<ol class="st-opts">' + q.opts.map((o, k) => '<li class="' + (shown ? (k === q.a ? "st-right" : "st-wrong") : "") + '"><i>' + L[k] + '</i><span>' + md(o) + '</span></li>').join("") + '</ol>'
          : shown ? '<div class="st-answer">' + md(q.answer).replace(/\n/g, "<br>") + '</div>' : '<p class="st-muted">Ask the class, then show the answer.</p>') +
        (shown && q.why ? '<p class="st-why">' + md(q.why) + '</p>' : "") + '</div></article>' +
      '<footer class="st-deckfoot">' + (shown ? '<span class="st-tally">Did most of the class get it? <button type="button" class="st-btn" data-n>No</button><button type="button" class="st-btn st-primary" data-y>Yes</button></span>'
        : '<span></span><button type="button" class="st-btn st-primary" data-show>Show the answer</button>') + '</footer></div>', "st-dark");
    view = { back, next: () => { if (!shown) { shown = true; draw(); } } };
    el.querySelector("[data-st-back]").onclick = back;
    const sh = el.querySelector("[data-show]"); if (sh) sh.onclick = () => { shown = true; draw(); };
    const y = el.querySelector("[data-y]"), n = el.querySelector("[data-n]");
    if (y) y.onclick = () => { got++; i++; shown = false; draw(); };
    if (n) n.onclick = () => { i++; shown = false; draw(); };
  };
  draw();
}

/* ---------- Today's class: register, teach, quiz, finish ----------
   One place to run the day, in order, each step ticked as it's done. Finishing the register confirms everyone's
   hours, and the session (what was taught, and its KSBs) goes with them to each learner's Evia and to their assessor
   in Milos (nisia-link.js sends it). */
const FLOW = "symi.teach.flow.v1";
const flowGet = (regId, k) => (read(FLOW, {})[regId + ":" + k]) || {};
const flowSet = (regId, k, v) => { const all = read(FLOW, {}); all[regId + ":" + k] = Object.assign(all[regId + ":" + k] || {}, v); write(FLOW, all); };
function todayFlow(p, s) {
  const k = s.date, f = flowGet(p.reg.id, k), done = App().done(p.reg.id, k), check = s.parts.some((x) => x.check), codes = codesOf(s);
  const steps = [
    { id: "reg", title: "Take the register", sub: "Learners check in on Evia with the code on the screen. You mark anyone late or off.", btn: "Show the check-in code", ok: !!(f.reg || done) },
    { id: "teach", title: "Teach", sub: titleOf(s) + " · " + slidesFor(p, s).length + " slides with pictures", btn: f.taught ? "Teach again" : "Start teaching", ok: !!f.taught },
    { id: "quiz", title: check ? "Unit check" : "Class quiz", sub: quizFor(p, s).length + " questions" + (f.quiz ? " · " + f.quiz + " right as a class" : ""), btn: f.quiz ? "Do it again" : "Start the quiz", ok: !!f.quiz },
    { id: "finish", title: "Finish the class", sub: done ? "Done. Everyone’s hours, and what you taught" + (codes.length ? " (" + codes.length + " KSBs)" : "") + ", are in their Evia and with their assessor in Milos."
      : "Confirms everyone’s hours. What you taught" + (codes.length ? " (" + codes.slice(0, 8).join(", ") + (codes.length > 8 ? "…" : "") + ")" : "") + " goes to each learner’s Evia and their assessor in Milos.", btn: done ? "" : "Finish the register", ok: done },
  ];
  const next = steps.findIndex((x) => !x.ok);
  const el = frame(head("Today’s class", p.reg.name + " · " + dayText(k, true)) +
    '<div class="st-body"><section class="st-flow-top"><div><small>Session ' + s.n + ' of ' + p.sessions.length + '</small><b>' + esc(titleOf(s)) + '</b></div>' +
      '<div class="st-flow-dots" aria-label="' + steps.filter((x) => x.ok).length + ' of 4 done">' + steps.map((x) => '<i class="' + (x.ok ? "ok" : "") + '"></i>').join("") + '</div></section>' +
    '<ol class="st-flow">' + steps.map((x, i) => '<li class="st-step' + (x.ok ? " st-done" : "") + (i === next ? " st-next" : "") + '"><span class="st-step-n">' + (x.ok ? "✓" : i + 1) + '</span>' +
      '<span class="st-step-text"><b>' + esc(x.title) + '</b><small>' + esc(x.sub) + '</small></span>' +
      (x.btn ? '<button type="button" class="st-btn' + (i === next ? " st-primary" : "") + '" data-step="' + x.id + '">' + esc(x.btn) + '</button>' : "") + '</li>').join("") + '</ol>' +
    '<div class="st-actions"><button type="button" class="st-btn" data-st-plan>Lesson plan</button></div></div>');
  wire(el, null);
  el.querySelector("[data-st-plan]").onclick = () => lesson(p, s, () => todayFlow(p, s));
  const go = {
    reg: () => {
      flowSet(p.reg.id, k, { reg: true }); close();
      const b = document.querySelector("[data-sn-show]") || document.querySelector("[data-sn-connect]");
      if (b) b.click(); else App().toast("The register is below: tap each learner as they arrive.");
    },
    teach: () => slides(p, s, () => todayFlow(p, s), { onEnd: () => flowSet(p.reg.id, k, { taught: true }), onDone: (got, n) => flowSet(p.reg.id, k, { quiz: got + " of " + n }) }),
    quiz: () => quiz(p, s, () => todayFlow(p, s), { onDone: (got, n) => flowSet(p.reg.id, k, { quiz: got + " of " + n }) }),
    finish: () => {
      close();
      const b = document.querySelector("[data-finish-register]");
      if (b) b.click(); else App().toast("You can finish the register once the class has started.");
    },
  };
  el.querySelectorAll("[data-step]").forEach((b) => b.onclick = go[b.dataset.step]);
}

/* ---------- Printing: the scheme of work and lesson plans as documents ---------- */
function sowDoc(p) {
  const c = p.course;
  return '<h1>Scheme of work</h1><section class="st-card st-doc"><div class="st-meta"><span><small>Class</small><b>' + esc(p.reg.name) + '</b></span><span><small>Course</small><b>' + esc(c.name + (c.std ? " (" + c.std + ")" : "")) + '</b></span>' +
    '<span><small>Dates</small><b>' + esc(dayText(p.sessions[0].date) + " to " + dayText(p.sessions[p.sessions.length - 1].date)) + '</b></span><span><small>Sessions</small><b>' + p.sessions.length + ' · ' + hm(p.teach) + ' teaching each · ' + hm(p.teach * p.sessions.length) + ' in total</b></span></div>' +
    '<table class="st-table"><thead><tr><th>#</th><th>Date</th><th>Unit</th><th>Content</th><th>KSBs</th><th>Assessment</th></tr></thead><tbody>' +
    p.sessions.map((s) => '<tr><td>' + s.n + '</td><td>' + esc(dayText(s.date)) + '<br><small>Week ' + s.week + '</small></td><td>' + esc(titleOf(s)) + '</td><td>' + esc(s.review ? "Review of every unit" : lessonsOf(s).map((l) => l.title).join("; ") || "Practical, with a recap quiz") + '</td><td>' + esc(codesOf(s).join(", ")) + '</td><td>' + (s.review ? "Final quiz and practical assessment" : s.parts.some((x) => x.check) ? "Unit check quiz, observation" : "Class quiz, observation") + '</td></tr>').join("") +
    '</tbody></table></section>';
}
function printDoc(html) {
  let box = document.getElementById("stPrint");
  if (!box) { box = document.createElement("div"); box.id = "stPrint"; document.body.appendChild(box); }
  box.innerHTML = '<div class="st-print-mark">Symi · ' + esc(new Date().toLocaleDateString("en-GB")) + '</div>' + html;
  document.body.classList.add("st-printing");
  const done = () => { document.body.classList.remove("st-printing"); box.innerHTML = ""; window.removeEventListener("afterprint", done); };
  window.addEventListener("afterprint", done);
  setTimeout(() => { window.print(); setTimeout(done, 1000); }, 50);
}

/* ---------- On the register: today's session, one tap to teach ---------- */
let painting = false, last = "";
const strips = {};
function place(regId, html) {
  const cur = document.querySelector("#registerWorkspace .clean-register-card");
  if (!cur) return;
  const have = cur.querySelector(".st-strip");
  if (have && have.dataset.reg === regId && have.dataset.k === last) return;
  cur.querySelectorAll(".st-strip").forEach((x) => x.remove());
  const strip = document.createElement("div"); strip.className = "st-strip"; strip.dataset.reg = regId; strip.dataset.k = last; strip.innerHTML = html;
  const at = cur.querySelector(".register-compact-meta"); at ? at.before(strip) : cur.appendChild(strip);
  strip.querySelectorAll("[data-st]").forEach((b) => b.onclick = () => open(regId, b.dataset.st));
}
async function paint() {
  const host = document.querySelector("#registerWorkspace .clean-register-card");
  if (!host || !App()) return;
  const regId = App().activeRegisterId(), reg = regId && regOf(regId);
  if (!reg) return;
  /* Made already for this class and day: put it straight back, in the same moment Symi redraws (no flicker). */
  if (strips[last] != null) return place(regId, strips[last]);
  if (painting) return;
  painting = true;
  const k = last;
  try {
    let html;
    if (!reg.courseCode) html = '<span class="st-strip-text"><b>Lessons for this class</b><small>Choose its course to get a scheme of work, lesson plans, slides and quizzes.</small></span><button type="button" class="soft-button" data-st="sow">Choose course</button>';
    else {
      const p = await planFor(regId), today = App().today(), s = sessionAt(p, today), nx = s || nextSession(p, today);
      html = nx ? '<span class="st-strip-text"><small>' + (s ? "Today" : esc(dayText(nx.date))) + ' · Session ' + nx.n + ' of ' + p.sessions.length + '</small><b>' + esc(titleOf(nx)) + '</b></span>' +
          '<span class="st-strip-btns">' + (s ? '<button type="button" class="blue-button" data-st="today">Start today’s class</button><button type="button" class="soft-button" data-st="slides">Teach</button>'
            : '<button type="button" class="blue-button" data-st="slides">Teach</button><button type="button" class="soft-button" data-st="quiz">Quiz</button>') +
          '<button type="button" class="soft-button" data-st="lesson">Lesson plan</button><button type="button" class="soft-button" data-st="sow">Scheme of work</button></span>'
        : '<span class="st-strip-text"><b>' + esc(p.course.name) + '</b><small>All ' + p.sessions.length + ' sessions are done.</small></span><button type="button" class="soft-button" data-st="sow">Scheme of work</button>';
    }
    strips[k] = html;
    if (k === last) place(regId, html);
  } catch (e) { console.warn("Symi teaching:", e.message); }
  finally { painting = false; }
  if (k !== last) paint();
}
/* Symi draws the register again every second: put the strip back each time, and work the plan out again only when
   the class or the day changes. */
const repaint = () => { const st = App() && App().getState(), reg = st && (st.classes || []).find((c) => c.id === App().activeRegisterId()); last = reg ? [reg.id, reg.courseCode, reg.start, reg.end, JSON.stringify(reg.recurrence || {}), JSON.stringify(reg.breaks || []), App().today()].join("|") : ""; paint(); };
new MutationObserver(() => repaint()).observe(document.getElementById("staffApp") || document.body, { childList: true, subtree: true });
setTimeout(repaint, 300);

window.SymiTeach = { open, planFor, sessionFor: async (regId, key) => { const p = await planFor(regId); return p.sessions ? sessionAt(p, key || App().today()) : null; }, titleOf, codesOf, lessonsOf, slidesFor, quizFor };
})();
