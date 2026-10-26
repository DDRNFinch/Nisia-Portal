/* Symi laid out exactly like Evia. The four tabs are drawn here in Evia's layout: a title with Messages and the
   avatar, one summary card, then one tidy list, and one way to each thing:
     Timetable   today's classes, then the week (tap a day to see its classes)
     Registers   today's register, your registers, then Classes and Past registers
     Learners    how many and their attendance, then everyone
     Resources   Symi's own library, tidied by symi-evia.css
   Pages further in (taking a register, a learner's profile, a class, the wizards) are still Symi's own, tidied, with a
   way back. Every button here presses Symi's own button or calls Symi (window.SamosApp), so Symi works exactly as it
   did. The avatar holds Profile, Evia Portal and Help. */
(function () {
  const S = window.SamosApp;
  if (!S) return;
  const $ = (q, r) => (r || document).querySelector(q);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const svg = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>";
  const IC = {
    profile: svg('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>'),
    help: svg('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.7"/><path d="M12 17h.01"/>'),
    link: svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    install: svg('<path d="M12 4v11"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>'),
    reg: svg('<path d="M9.5 3h5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8.5 5H7a2.5 2.5 0 0 0-2.5 2.5v11A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 17 5h-1.5"/><path d="M8.5 13.5l2.3 2.3 4.7-4.7"/>'),
    classes: svg('<path d="M3.5 7.5l8.5-4 8.5 4-8.5 4z"/><path d="M3.5 12l8.5 4 8.5-4M3.5 16.5l8.5 4 8.5-4"/>'),
    past: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  };
  const app = $("#staffApp"), main = $("main"), body = document.body;
  body.classList.add("se-look");

  /* ---------- Dates and classes ---------- */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const key = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const st = () => { try { return S.getState(); } catch (_) { return {}; } };
  const regs = () => (st().classes || []).filter((c) => !c.archived);
  function on(c, d) {
    const r = c.recurrence || {}, k = key(d), day = DAYS[d.getDay()];
    if (r.type === "once") return r.onceDate === k;
    if (r.startDate && k < r.startDate) return false;
    if (r.endDate && k > r.endDate) return false;
    if (r.type === "monthly" || c.dayOfMonth) return Number(c.dayOfMonth) === d.getDate() || (r.monthDays || []).includes(d.getDate());
    return c.day === day || (r.weekdays || []).includes(day);
  }
  const onDay = (d) => regs().filter((c) => on(c, d)).sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")));
  const people = (c) => { const n = (c.learners || []).length; return n + " learner" + (n === 1 ? "" : "s"); };
  const times = (c) => (c.start || "") + (c.end ? "–" + c.end : "");
  const repeat = (c) => c.dayOfMonth ? "Monthly, day " + c.dayOfMonth : (c.recurrence || {}).type === "once" ? "One day" : c.day ? "Every " + c.day : "";

  /* ---------- Pieces ---------- */
  const row = (o) => '<button type="button" class="se-lrow"' + (o.data || "") + ">" + (o.lead || "") + '<span class="se-copy"><strong>' + esc(o.title) + "</strong>" + (o.sub ? "<small>" + esc(o.sub) + "</small>" : "") + "</span>" + (o.pill || "") + '<span class="se-go" aria-hidden="true">›</span></button>';
  const ic = (name) => '<span class="se-ic">' + IC[name] + "</span>";
  const timeTile = (c) => '<span class="se-time"><b>' + esc(c.start || "–") + "</b></span>";
  const head = (title) => '<header class="se-head"><h1>' + esc(title) + '</h1><span class="se-slot"></span></header>';

  /* ---------- The avatar, and Messages beside it ---------- */
  const me = document.createElement("button");
  me.type = "button"; me.className = "se-me"; me.setAttribute("aria-label", "Profile, Evia Portal and help");
  const acts = document.createElement("div");
  acts.className = "se-acts"; acts.appendChild(me);
  const name = () => String((st().settings || {}).teacherName || "").trim();
  const connected = () => { const c = $(".sn-chip"); return !!(c && c.classList.contains("on")); };
  function drawMe() {
    const n = name(), i = n ? n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "";
    me.innerHTML = (i ? "<b>" + esc(i) + "</b>" : '<span class="se-eyes" aria-hidden="true"><i></i><i></i></span>') + (connected() ? "" : '<em class="se-dot" aria-hidden="true"></em>');
    const side = document.querySelector(".sy-side-me b"); if (side) side.textContent = n || "Your profile";
    const msg = document.getElementById("nm-btn");
    if (msg && msg.parentNode !== acts) acts.insertBefore(msg, me);
  }
  /* Into whichever page is showing: its slot (our pages), or the top of Symi's own Resources page. */
  function place() {
    const slot = $(".se-page .se-slot") || $("#staffApp>.se-backrow .se-slot") || (body.classList.contains("se-is-home") && $(".se-home .se-slot")) || $("#staffApp .staff-page-head.sy-top-head");
    if (slot && acts.parentNode !== slot) slot.appendChild(acts);
    if (!slot && acts.parentNode) acts.remove();
  }
  function sheet(title, rows) {
    const o = document.createElement("div");
    o.className = "se-overlay";
    o.innerHTML = '<section class="se-sheet" role="dialog" aria-modal="true" aria-labelledby="se-title"><span class="se-grab" aria-hidden="true"></span><div class="se-sheet-head"><h2 id="se-title">' + esc(title) + '</h2><button type="button" class="se-close" aria-label="Close">×</button></div>' +
      '<div class="se-group">' + rows.map((r, i) => '<button type="button" class="se-lrow" data-i="' + i + '">' + ic(r[0]) + '<span class="se-copy"><strong>' + esc(r[1]) + '</strong><small class="' + (r[4] || "") + '">' + esc(r[2]) + '</small></span><span class="se-go" aria-hidden="true">›</span></button>').join("") + "</div></section>";
    const close = () => { o.classList.add("se-closing"); setTimeout(() => o.remove(), 200); };
    o.addEventListener("click", (e) => {
      if (e.target === o || e.target.closest(".se-close")) return close();
      const b = e.target.closest("[data-i]"); if (!b) return;
      o.remove(); setTimeout(rows[+b.dataset.i][3], 30);
    });
    body.appendChild(o);
  }
  me.addEventListener("click", () => {
    const chip = $(".sn-chip"), inst = $("#installApp"), ok = connected();
    const rows = [
      ["profile", "Profile", "Your name, college and settings", () => $("#profileButton") && $("#profileButton").click()],
      ["link", "Evia Portal", ok ? "Connected" : "Not connected: connect so learners can check in", () => chip && chip.click(), ok ? "" : "se-warn"],
      ["help", "Help", "How Symi works", () => $("#helpButton") && $("#helpButton").click()],
    ];
    if (inst && !inst.hidden) rows.push(["install", "Install Symi", "Add it to your home screen", () => inst.click()]);
    sheet(name() || "You", rows);
  });

  /* ---------- Timetable ---------- */
  let pick = null; /* the day picked in the week, as a date key */
  function homePage() {
    const now = new Date(), today = onDay(now), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const week = [...Array(7)].map((_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
    if (!pick || !week.some((d) => key(d) === pick)) pick = key(now);
    const picked = week.find((d) => key(d) === pick), list = onDay(picked), isToday = pick === key(now);
    const label = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const classRow = (c) => row({ data: ' data-se-open="' + esc(c.id) + '"', lead: timeTile(c), title: c.name, sub: [c.room, people(c)].filter(Boolean).join(" · ") });
    return head("Timetable") +
      '<section class="se-hero"><span class="se-k">Today · ' + esc(label) + "</span>" +
        (today.length
          ? '<strong class="se-big">' + today.length + "<small> " + (today.length === 1 ? "class" : "classes") + '</small></strong><div class="se-in">' + today.map(classRow).join("") + "</div>"
          : '<strong class="se-big se-big-s">Nothing on today</strong><small class="se-note">' + (regs().length ? "Your week is below." : "Make a register from Symi’s menu.") + "</small>") +
      "</section>" +
      '<h2 class="se-h2">This week</h2><div class="se-group"><div class="se-strip">' + week.map((d) => { const k = key(d), has = onDay(d).length;
        return '<button type="button" class="se-day' + (k === pick ? " on" : "") + (k === key(now) ? " today" : "") + '" data-se-day="' + k + '" aria-pressed="' + (k === pick) + '"><small>' + d.toLocaleDateString("en-GB", { weekday: "short" }) + "</small><b>" + d.getDate() + "</b><i" + (has ? ' class="has"' : "") + "></i></button>"; }).join("") + "</div>" +
        (isToday ? "" : list.length ? list.map(classRow).join("") : '<p class="se-empty">Nothing on ' + esc(picked.toLocaleDateString("en-GB", { weekday: "long" })) + ".</p>") +
      "</div>";
  }

  /* ---------- Registers ---------- */
  let detail = true; /* a register open on its own; the list shows when the Registers tab is tapped */
  function registersPage() {
    const all = regs(), t = onDay(new Date())[0], past = (st().history || []).length;
    return head("Registers") +
      '<section class="se-hero">' + (t
        ? '<span class="se-k">Today</span><strong class="se-big se-big-s">' + esc(t.name) + '</strong><small class="se-note">' + esc([times(t), t.room, people(t)].filter(Boolean).join(" · ")) + '</small><div class="se-btns"><button type="button" class="blue-button" data-se-open="' + esc(t.id) + '">Take the register</button></div>'
        : '<span class="se-k">Today</span><strong class="se-big se-big-s">No register today</strong><small class="se-note">' + (all.length ? "Your registers are below." : "Make your first one to get started.") + "</small>" + (all.length ? "" : '<div class="se-btns"><button type="button" class="blue-button" data-se-new>Make a register</button></div>')) +
      "</section>" +
      (all.length ? '<h2 class="se-h2">Your registers</h2><div class="se-group">' + all.map((c) => row({ data: ' data-se-open="' + esc(c.id) + '"', lead: ic("reg"), title: c.name, sub: [repeat(c), times(c)].filter(Boolean).join(" · "), pill: c === t ? '<span class="se-pill">Today</span>' : "" })).join("") + "</div>" : "") +
      '<div class="se-group se-more">' + row({ data: " data-se-classes", lead: ic("classes"), title: "Classes", sub: "Courses, dates and who’s in them" }) + row({ data: " data-se-past", lead: ic("past"), title: "Past registers", sub: past ? past + " finished" : "None finished yet" }) + "</div>";
  }

  /* ---------- Patterns worth a quiet word ----------
     From the learner's finished registers, oldest first: missed the last two without a reason, or late to at least
     3 of their last 5. Marks from Evia Portal (here, late, absent with or without a reason) count first; otherwise the
     time they were first clocked in, against the register's start (more than 10 minutes counts as late). */
  const marksAll = () => { try { return JSON.parse(localStorage.getItem("symi.nisia.marks.v1") || "{}") || {}; } catch (_) { return {}; } };
  function pattern(id) {
    const s = st(), mk = marksAll();
    const rows = (s.history || []).filter((h) => h && h.data && h.data[id]).sort((a, b) => String(a.date).localeCompare(String(b.date))).map((h) => {
      const d = h.data[id], m = (mk[h.classId + ":" + h.date] || {})[id], reg = (s.classes || []).find((c) => c.id === h.classId);
      const absent = m ? m.kind === "absent" : !(Number(d.attendedMs) > 0), why = !!(m && m.kind === "absent" && m.reason);
      let late = !!(m && m.kind === "late");
      if (!m && !absent && reg && /^\d\d:\d\d/.test(reg.start || "") && d.intervals && d.intervals[0]) {
        const t = new Date(h.date + "T00:00:00"); t.setHours(+reg.start.slice(0, 2), +reg.start.slice(3, 5), 0, 0);
        late = Number(d.intervals[0].start) > t.getTime() + 10 * 6e4;
      }
      return { absent, why, late };
    });
    const last2 = rows.slice(-2), came = rows.filter((r) => !r.absent).slice(-5), lateN = came.filter((r) => r.late).length;
    return { missed: last2.length === 2 && last2.every((r) => r.absent && !r.why), late: came.length >= 3 && lateN >= 3, lateN, of: came.length };
  }
  const flagPill = (f) => f.missed ? '<span class="se-pill se-pill-r">Missed 2 in a row</span>' : f.late ? '<span class="se-pill se-pill-y">Often late</span>' : "";
  window.SymiPatterns = { pattern };

  /* ---------- Learners ---------- */
  function learnersPage() {
    const rows = [...app.querySelectorAll(".learner-row[data-learner-info]")].map((r) => ({ id: r.dataset.learnerInfo, name: ($("strong", r) || {}).textContent || "", sub: ($("small", r) || {}).textContent || "", pct: parseInt(($(".mini-progress b", r) || {}).textContent, 10) }));
    const seen = rows.filter((r) => !isNaN(r.pct) && !/\b0 sessions/.test(r.sub)), avg = seen.length ? Math.round(seen.reduce((a, r) => a + r.pct, 0) / seen.length) : null;
    const ini = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
    const tone = (p) => (p >= 90 ? "" : p >= 75 ? " se-pill-y" : " se-pill-r");
    const flagged = rows.map((r) => ({ r, f: pattern(r.id) })).filter((x) => x.f.missed || x.f.late);
    return head("Learners") +
      '<section class="se-hero"><span class="se-k">Your learners</span><strong class="se-big">' + rows.length + "<small> " + (rows.length === 1 ? "learner" : "learners") + (avg == null ? "" : " · " + avg + "% attendance") + "</small></strong>" +
        '<div class="se-btns"><button type="button" class="blue-button" data-se-add>Add a learner</button></div></section>' +
      /* Worth a quiet word: only when someone has missed two in a row or keeps arriving late. */
      (flagged.length ? '<h2 class="se-h2">Worth a word</h2><div class="se-group">' + flagged.map(({ r, f }) => row({ data: ' data-se-learner="' + esc(r.id) + '"', lead: '<span class="se-av">' + esc(ini(r.name)) + "</span>", title: r.name,
        sub: f.missed ? "Missed their last 2 sessions without a reason" : "Late to " + f.lateN + " of their last " + f.of + " sessions", pill: flagPill(f) })).join("") + '</div><h2 class="se-h2">Everyone</h2>' : "") +
      (rows.length ? '<div class="se-group' + (flagged.length ? "" : " se-gap") + '">' + rows.map((r) => row({ data: ' data-se-learner="' + esc(r.id) + '"', lead: '<span class="se-av">' + esc(ini(r.name)) + "</span>", title: r.name, sub: r.sub, pill: seen.includes(r) ? '<span class="se-pill' + tone(r.pct) + '">' + r.pct + "%</span>" : "" })).join("") + "</div>" : "");
  }

  /* ---------- Drawing ---------- */
  const press = (sel) => { const b = app.querySelector(sel); if (b) b.click(); return !!b; };
  const homeBox = document.createElement("section");
  homeBox.className = "se-home"; (main || body).insertBefore(homeBox, app);
  function show(el, html) { el.innerHTML = html; el.classList.remove("se-enter"); void el.offsetWidth; el.classList.add("se-enter"); }
  let lastView = "";
  function draw() {
    const v = st().view || "home";
    if (v !== "registers") detail = true;
    const home = v === "home", list = (v === "registers" && !detail) || v === "learners";
    body.classList.toggle("se-is-home", home);
    body.classList.toggle("se-list", list);
    body.classList.toggle("se-detail", v === "registers" && detail);
    if (home) { const sig = JSON.stringify([pick, key(new Date()), regs().map((c) => [c.id, c.name, c.start, c.end, c.room, c.day, c.recurrence, (c.learners || []).length])]); if (sig !== homeBox.dataset.sig || v !== lastView) { homeBox.dataset.sig = sig; show(homeBox, homePage()); } }
    if (list && !app.querySelector(".se-page")) {
      const pg = document.createElement("div"); pg.className = "se-page";
      app.prepend(pg); show(pg, v === "registers" ? registersPage() : learnersPage());
    }
    if (!list) { const old = app.querySelector(".se-page"); if (old) old.remove(); }
    /* A way back from a register, Classes or Past registers to the Registers list. */
    if (((v === "registers" && detail) || ["classes", "registerList"].includes(v)) && !app.querySelector(".se-backrow")) {
      const r = document.createElement("div"); r.className = "se-backrow";
      r.innerHTML = '<button type="button" class="se-back"><span aria-hidden="true">‹</span> Registers</button><span class="se-slot"></span>';
      r.firstChild.onclick = () => { detail = false; if (st().view === "registers") draw(); else S.openRegisters(); window.scrollTo({ top: 0 }); };
      app.prepend(r);
    }
    /* A learner linked to Evia Portal: their timeline under their profile, the same story as in Milos and Paros. */
    if (v === "learner" && !app.querySelector(".se-tl")) {
      const l = (st().learners || []).find((x) => x.id === st().selectedLearnerId), en = l && l.nisia && l.nisia.enrolmentId;
      if (en && connected()) {
        const sec = document.createElement("section"); sec.className = "se-tl";
        sec.innerHTML = '<h2 class="se-h2">Timeline</h2><div class="se-tl-box"></div>';
        app.appendChild(sec);
        Promise.all([import("../../packages/core/timeline.js"), import("../../packages/core/nisia.js")])
          .then(([t, n]) => t.mountTimeline(sec.querySelector(".se-tl-box"), { rpc: n.rpc, enrolment: en })).catch(() => sec.remove());
      }
    }
    lastView = v;
    drawMe(); place();
  }
  /* Taps on our pages: each presses Symi's own button, or calls Symi. */
  function tap(e) {
    const o = e.target.closest("[data-se-open]"), d = e.target.closest("[data-se-day]"), l = e.target.closest("[data-se-learner]");
    if (d) { pick = d.dataset.seDay; return draw(); }
    if (o) {
      const id = o.dataset.seOpen; detail = true;
      const old = app.querySelector(".se-page"); if (old) old.remove();
      if (st().view === "registers" && press('[data-select-register="' + CSS.escape(id) + '"]')) { draw(); return window.scrollTo({ top: 0 }); }
      S.mutate((x) => { x.activeClassId = id; x.view = "registers"; }); window.scrollTo({ top: 0 }); return;
    }
    if (e.target.closest("[data-se-new]")) return void press("[data-new-register]");
    if (e.target.closest("[data-se-past]")) return void press("[data-register-list]");
    if (e.target.closest("[data-se-classes]")) { S.openClasses(); return window.scrollTo({ top: 0 }); }
    if (e.target.closest("[data-se-add]")) return void press("[data-add-learner]");
    if (l) press('[data-learner-info="' + CSS.escape(l.dataset.seLearner) + '"]');
  }
  homeBox.addEventListener("click", tap);
  app.addEventListener("click", (e) => { if (e.target.closest(".se-page")) tap(e); });
  document.addEventListener("click", (e) => { if (e.target.closest('[data-sy-tab="registers"]')) detail = false; }, true);

  new MutationObserver(draw).observe(app, { childList: true });
  /* On the register (drawn a moment after the page), a small tag by anyone with a pattern worth a word. */
  let tagWait = 0;
  function tags() {
    tagWait = 0;
    if (st().view !== "registers") return;
    const cache = {};
    app.querySelectorAll("[data-attendance-learner]").forEach((rw) => {
      const nm = rw.querySelector(".attendance-name"); if (!nm || nm.querySelector(".se-flag")) return;
      const id = rw.dataset.attendanceLearner, f = cache[id] || (cache[id] = pattern(id)); if (!(f.missed || f.late)) return;
      nm.insertAdjacentHTML("beforeend", '<span class="se-flag ' + (f.missed ? "r" : "y") + '">' + (f.missed ? "Missed last 2" : "Often late") + "</span>");
    });
  }
  new MutationObserver(() => { if (!tagWait) tagWait = setTimeout(tags, 150); }).observe(app, { childList: true, subtree: true });
  /* Signing in, and the Messages button, arrive after Symi starts. */
  new MutationObserver(() => { drawMe(); place(); }).observe($(".header-utility-actions") || body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { homeBox.dataset.sig = ""; draw(); } });
  draw();
})();
