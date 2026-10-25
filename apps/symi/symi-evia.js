/* Symi laid out exactly like Evia: each tab opens with its name as the title and a round avatar on the right (Evia's
   page header), with Profile, Help and Evia Portal in a sheet behind the avatar instead of a row of buttons along the
   top. Every page is still drawn by Symi (app.js, symi-look.js) and every row here presses Symi's own button, so all
   of Symi works the same; symi-evia.css gives the pages Evia's cards, rows, buttons and week strip. */
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
  };
  document.body.classList.add("se-look");

  /* The avatar: the tutor's initials (from Profile), or Symi's eyes before a name is set. */
  const me = document.createElement("button");
  me.type = "button"; me.className = "se-me"; me.setAttribute("aria-label", "Profile, help and Evia Portal");
  const main = $("main");
  function initials() {
    let n = ""; try { n = ((S.getState().settings || {}).teacherName || "").trim(); } catch (_) {}
    return n ? n.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() : "";
  }
  /* Put it in the header of whichever tab is showing (the four tabs' pages; pages further in have a back button). */
  /* With it, the Messages button (once signed in), like the one beside Evia's avatar. */
  const acts = document.createElement("div");
  acts.className = "se-acts"; acts.appendChild(me);
  function place() {
    const msg = document.getElementById("nm-btn");
    if (msg && msg.parentNode !== acts) acts.insertBefore(msg, me);
    const head = $(".sy-is-home .sy-hello") || $("#staffApp .staff-page-head.sy-top-head");
    if (head && acts.parentNode !== head) head.appendChild(acts);
    else if (!head && acts.parentNode !== main) (main || document.body).prepend(acts);
  }
  function drawMe() {
    place();
    const i = initials(), chip = $(".sn-chip"), on = !!(chip && chip.classList.contains("on"));
    me.innerHTML = (i ? "<b>" + esc(i) + "</b>" : '<span class="se-eyes" aria-hidden="true"><i></i><i></i></span>') + (on ? "" : '<em class="se-dot" aria-hidden="true"></em>');
  }

  /* The sheet behind the avatar: rows that press Symi's own Profile, Help/Symi and Evia Portal buttons. */
  function openMe() {
    const chip = $(".sn-chip"), on = !!(chip && chip.classList.contains("on")), inst = $("#installApp");
    const rows = [
      ["profile", "Profile", "Your name, college and settings", () => $("#profileButton") && $("#profileButton").click()],
      ["link", "Evia Portal", on ? "Connected" : "Not connected: connect so learners can check in", () => chip && chip.click(), on ? "" : "se-warn"],
      ["help", "Help", "How Symi works", () => $("#helpButton") && $("#helpButton").click()],
    ];
    if (inst && !inst.hidden) rows.push(["install", "Install Symi", "Add it to your home screen", () => inst.click()]);
    const o = document.createElement("div");
    o.className = "se-overlay";
    o.innerHTML = '<section class="se-sheet" role="dialog" aria-modal="true" aria-labelledby="se-title"><div class="se-sheet-head"><div><small>SYMI</small><h2 id="se-title">' + esc(initials() ? (S.getState().settings || {}).teacherName : "You") + '</h2></div><button type="button" class="se-close" aria-label="Close">×</button></div>' +
      '<div class="se-group">' + rows.map((r, i) => '<button type="button" class="se-row" data-i="' + i + '"><span class="se-ic">' + IC[r[0]] + '</span><span class="se-copy"><strong>' + esc(r[1]) + '</strong><small class="' + (r[4] || "") + '">' + esc(r[2]) + '</small></span><span class="se-go">›</span></button>').join("") + "</div></section>";
    const close = () => { o.classList.add("se-closing"); setTimeout(() => o.remove(), 180); };
    o.addEventListener("click", (e) => {
      if (e.target === o || e.target.closest(".se-close")) return close();
      const b = e.target.closest(".se-row"); if (!b) return;
      const r = rows[+b.dataset.i]; o.remove(); setTimeout(r[3], 30);
    });
    document.body.appendChild(o);
    o.querySelector(".se-close").focus();
  }
  me.addEventListener("click", openMe);

  /* Home: the tab's name as the title (like Evia), with the greeting and date underneath. */
  const home = $(".sy-home");
  function titleHome() {
    const h = home && home.querySelector(".sy-hello");
    if (!h || h.dataset.se) return;
    const g = h.querySelector("h1"), p = h.querySelector("p");
    h.dataset.se = "1";
    if (p) p.textContent = (g ? g.textContent + " · " : "") + p.textContent;
    if (g) g.textContent = "Timetable";
  }
  if (home) new MutationObserver(() => { titleHome(); place(); }).observe(home, { childList: true });
  const app = $("#staffApp");
  /* ---------- Registers and Learners: Evia's page, a summary card on top and a list to tap into ----------
     The rows press Symi's own (hidden) buttons, so opening a register, adding one, or opening a learner is Symi's own. */
  const ICR = {
    reg: svg('<path d="M9.5 3h5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8.5 5H7a2.5 2.5 0 0 0-2.5 2.5v11A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 17 5h-1.5"/><path d="M8.5 13.5l2.3 2.3 4.7-4.7"/>'),
    past: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  };
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const isToday = (c) => { const r = c.recurrence || {}, k = S.today ? S.today() : new Date().toISOString().slice(0, 10);
    if (r.type === "once") return r.onceDate === k; if (r.startDate && k < r.startDate) return false; if (r.endDate && k > r.endDate) return false;
    return c.day === DAYS[new Date().getDay()] || (r.weekdays || []).includes(DAYS[new Date().getDay()]); };
  const when = (c) => [c.dayOfMonth ? "Monthly · day " + c.dayOfMonth : c.day ? "Every " + c.day : "", (c.start || "") + (c.end ? "–" + c.end : ""), c.room].filter(Boolean).join(" · ");
  const press = (sel) => { const b = app.querySelector(sel); if (b) b.click(); return !!b; };
  const row = (o) => '<button type="button" class="se-lrow"' + (o.data || "") + ">" + (o.lead || "") + '<span class="se-copy"><strong>' + esc(o.title) + "</strong>" + (o.sub ? "<small>" + esc(o.sub) + "</small>" : "") + "</span>" + (o.pill || "") + '<span class="se-go">›</span></button>';
  /* The list shows when the tutor taps the Registers tab; anything else that opens Registers (today's class on the
     home screen, "Take the register" from Symi's panel) goes straight to that register, as before. */
  let detail = true;
  document.addEventListener("click", (e) => { if (e.target.closest('[data-sy-tab="registers"],[data-sy-pill="registers"]')) detail = false; }, true);
  function registersPage(st) {
    const regs = (st.classes || []).filter((c) => !c.archived), today = regs.filter(isToday).sort((a, b) => String(a.start).localeCompare(String(b.start)));
    const t = today[0], n = (c) => (c.learners || []).length + " learner" + ((c.learners || []).length === 1 ? "" : "s");
    return '<section class="se-hero">' + (t
        ? '<span class="se-k">Today</span><strong class="se-big">' + esc(t.name) + '</strong><small class="se-note">' + esc([(t.start || "") + (t.end ? "–" + t.end : ""), t.room, n(t)].filter(Boolean).join(" · ")) + "</small>" +
          '<div class="se-btns"><button type="button" class="blue-button" data-se-open="' + esc(t.id) + '">Take the register</button><button type="button" class="soft-button" data-se-new>+ New</button></div>'
        : '<span class="se-k">Today</span><strong class="se-big">No class today</strong><small class="se-note">' + (regs.length ? "Your registers are below." : "Make your first register to get started.") + "</small>" +
          '<div class="se-btns"><button type="button" class="blue-button" data-se-new>+ New register</button></div>') + "</section>" +
      (regs.length ? '<h2 class="se-h2">Your registers</h2><div class="se-group">' + regs.map((c) => row({ data: ' data-se-open="' + esc(c.id) + '"', lead: '<span class="se-ic">' + ICR.reg + "</span>", title: c.name, sub: [when(c), n(c)].filter(Boolean).join(" · "), pill: isToday(c) ? '<span class="se-pill">Today</span>' : "" })).join("") + "</div>" : "") +
      '<div class="se-group se-quiet">' + row({ data: " data-se-list", lead: '<span class="se-ic">' + ICR.past + "</span>", title: "Past registers", sub: "Every register you've finished, and the spreadsheet" }) + "</div>";
  }
  function learnersPage() {
    const rows = [...app.querySelectorAll(".learner-row[data-learner-info]")].map((r) => ({ id: r.dataset.learnerInfo, name: (r.querySelector("strong") || {}).textContent || "", sub: (r.querySelector("small") || {}).textContent || "", pct: parseInt((r.querySelector(".mini-progress b") || {}).textContent, 10) }));
    const withPct = rows.filter((r) => !isNaN(r.pct) && !/ 0 sessions/.test(r.sub)), avg = withPct.length ? Math.round(withPct.reduce((a, r) => a + r.pct, 0) / withPct.length) : null;
    const ini = (n) => n.trim().split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase();
    const tone = (p) => p >= 90 ? "g" : p >= 75 ? "y" : "r";
    return '<section class="se-hero"><span class="se-k">Your learners</span><strong class="se-big">' + rows.length + "<small> " + (rows.length === 1 ? "learner" : "learners") + "</small></strong>" +
      '<small class="se-note">' + (avg == null ? "Attendance shows here once registers are finished." : "Average attendance " + avg + "%") + "</small>" +
      '<div class="se-btns"><button type="button" class="blue-button" data-se-add>+ Add learner</button></div></section>' +
      (rows.length ? '<h2 class="se-h2">Everyone</h2><div class="se-group">' + rows.map((r) => row({ data: ' data-se-learner="' + esc(r.id) + '"', lead: '<span class="se-av">' + esc(ini(r.name)) + "</span>", title: r.name, sub: r.sub,
        pill: isNaN(r.pct) || / 0 sessions/.test(r.sub) ? "" : '<span class="se-pill se-pill-' + tone(r.pct) + '">' + r.pct + "%</span>" })).join("") + "</div>" : "");
  }
  function pages() {
    let st; try { st = S.getState(); } catch (_) { return; }
    const v = st.view || "home";
    if (v !== "registers") detail = true;
    const list = (v === "registers" && !detail) || v === "learners";
    document.body.classList.toggle("se-list", list);
    document.body.classList.toggle("se-detail", v === "registers" && detail);
    if (!list) {
      const old = app.querySelector(".se-page"); if (old) old.remove();
      if (v === "registers" && detail && !app.querySelector(".se-back")) {
        const b = document.createElement("button"); b.type = "button"; b.className = "se-back"; b.textContent = "‹ Registers";
        b.onclick = () => { detail = false; pages(); window.scrollTo({ top: 0 }); };
        const at = app.querySelector(".staff-page-head"); if (at) at.after(b); else app.prepend(b);
      }
      return;
    }
    if (app.querySelector(".se-page")) return;
    const pg = document.createElement("div"); pg.className = "se-page";
    pg.innerHTML = v === "registers" ? registersPage(st) : learnersPage();
    const after = app.querySelector(".sy-pills") || app.querySelector(".staff-page-head");
    if (after) after.after(pg); else app.prepend(pg);
    pg.addEventListener("click", (e) => {
      const o = e.target.closest("[data-se-open]"), l = e.target.closest("[data-se-learner]");
      if (o) { detail = true; document.body.classList.remove("se-list"); if (!press('[data-select-register="' + CSS.escape(o.dataset.seOpen) + '"]')) pages(); else setTimeout(pages, 0); window.scrollTo({ top: 0 }); return; }
      if (e.target.closest("[data-se-new]")) return void press("[data-new-register]");
      if (e.target.closest("[data-se-list]")) return void press("[data-register-list]");
      if (e.target.closest("[data-se-add]")) return void press("[data-add-learner]");
      if (l) press('[data-learner-info="' + CSS.escape(l.dataset.seLearner) + '"]');
    });
  }
  if (app) new MutationObserver(() => { drawMe(); pages(); }).observe(app, { childList: true });
  /* The Evia Portal button arrives once Symi has checked the sign-in. */
  new MutationObserver(drawMe).observe(document.querySelector(".header-utility-actions") || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  titleHome(); drawMe(); pages();
})();
