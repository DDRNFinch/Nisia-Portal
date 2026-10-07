/* Symi in the Nisia apps' look (Evia, Milos, Paros): the floating bar along the bottom (Registers, Learners, Symi's
   face for what needs doing, Resources and Timetable), and the timetable as the home screen. Classes sit with the
   registers, and courses and games with the resources, one tap apart. Only adds to the screen:
   every page is still drawn by app.js, and every button here calls Symi's own (window.SamosApp). */
(function () {
  const S = window.SamosApp;
  if (!S) return;
  const svg = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>";
  const IC = {
    home: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M8.5 14.5l2.2 2.2 4.8-4.8"/>'),
    registers: svg('<path d="M9.5 3h5a1 1 0 0 1 1 1v1.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8.5 5H7a2.5 2.5 0 0 0-2.5 2.5v11A2.5 2.5 0 0 0 7 21h10a2.5 2.5 0 0 0 2.5-2.5v-11A2.5 2.5 0 0 0 17 5h-1.5"/><path d="M8.5 13.5l2.3 2.3 4.7-4.7"/>'),
    classes: svg('<path d="M3.5 7.5l8.5-4 8.5 4-8.5 4z"/><path d="M3.5 12l8.5 4 8.5-4M3.5 16.5l8.5 4 8.5-4"/>'),
    resources: svg('<path d="M6.5 3h12v15h-12a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2Z"/><path d="M4.5 20a2 2 0 0 0 2 1.5h12V18"/><path d="M8.5 3v15"/>'),
    learners: svg('<circle cx="9" cy="8.5" r="3.5"/><path d="M2.8 19.5c.8-3.4 3.3-5.3 6.2-5.3s5.4 1.9 6.2 5.3"/><circle cx="17" cy="9.5" r="2.7"/><path d="M16.5 14.3c2.4.1 4.1 1.7 4.7 4.2"/>'),
    chev: svg('<path d="M9 5l7 7-7 7"/>'),
  };
  const go = (view, extra) => S.mutate((st) => { st.view = view; Object.assign(st, extra || {}); });
  const TABS = [["registers", "Registers", () => S.openRegisters()], ["learners", "Learners", () => S.openLearners()], null, ["resources", "Resources", () => go("resources", { resourceFilter: "all", resourceCourseFilter: "" })], ["home", "Timetable", () => S.goHome()]];
  /* The pages that share a tab, with a row to move between them at the top. */
  const GROUPS = {
    registers: [["registers", "Registers", () => S.openRegisters()], ["classes", "Classes", () => go("classes", { selectedTeachingClassId: null })]],
    resources: [["resources", "All resources", () => go("resources", { resourceFilter: "all", resourceCourseFilter: "" })], ["courses", "Courses", () => go("courses", { selectedCourseId: null })], ["games", "Games", () => go("games")]],
  };
  const TAB_OF = { home: "home", registers: "registers", classes: "registers", class: "registers", learners: "learners", learner: "learners", resources: "resources", resource: "resources", courses: "resources", games: "resources" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /* The bar along the bottom. */
  const nav = document.createElement("nav");
  nav.className = "sy-nav"; nav.setAttribute("aria-label", "Symi");
  nav.innerHTML = TABS.map((t, i) => t
    ? '<button type="button" data-sy-tab="' + t[0] + '">' + IC[t[0]] + "<span>" + t[1] + "</span></button>"
    : '<button type="button" class="sy-nav-face" data-sy-face aria-label="Open Symi’s menu"><span class="sy-av" aria-hidden="true"><i></i><i></i></span></button>').join("");
  nav.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-sy-face")) return S.openAssistantMenu();
    const t = TABS.find((x) => x && x[0] === b.dataset.syTab); if (t) { t[2](); window.scrollTo({ top: 0 }); }
  });
  document.body.appendChild(nav);
  document.body.classList.add("sy-look");

  /* Home: a greeting and today's classes, above the week. */
  const hello = document.createElement("section");
  hello.className = "sy-home"; hello.setAttribute("aria-label", "Today");
  const main = document.querySelector("main"), app = document.getElementById("staffApp");
  main.insertBefore(hello, app);
  hello.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sy-open]"); if (!b) return;
    const id = b.dataset.syOpen;
    S.mutate((s) => { s.activeClassId = id; }, false); S.openRegisters();
  });
  hello.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sy-go]"); if (!b) return;
    const t = TABS.find((x) => x && x[0] === b.dataset.syGo); if (t) t[2]();
  });

  function todays(st) {
    const d = new Date(), key = S.today ? S.today() : d.toISOString().slice(0, 10), day = DAYS[d.getDay()];
    return (st.classes || []).filter((c) => {
      const r = c.recurrence || {};
      if (r.type === "once") return r.onceDate === key;
      if (r.startDate && key < r.startDate) return false;
      if (r.endDate && key > r.endDate) return false;
      return c.day === day;
    }).sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")));
  }
  function drawHome(st) {
    const h = new Date().getHours(), name = ((st.settings || {}).teacherName || "").trim().split(/\s+/)[0];
    const greet = (h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening") + (name ? " " + name : "");
    const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const list = todays(st), learners = (st.learners || []).length, regs = (st.classes || []).length;
    hello.innerHTML =
      '<div class="sy-hello"><h1>' + esc(greet) + "</h1><p>" + esc(date) + "</p></div>" +
      '<div class="sy-card"><p class="sy-label">Today’s classes</p>' +
        (list.length
          ? '<p class="sy-big">' + list.length + "<small> " + (list.length === 1 ? "class" : "classes") + "</small></p>" +
            '<div class="sy-rows">' + list.map((c) => '<button type="button" class="sy-row" data-sy-open="' + esc(c.id) + '"><span class="sy-time">' + esc(c.start || "") + '</span><span class="sy-row-main"><b>' + esc(c.name) + "</b><small>" +
              esc([c.room, (c.learners || []).length + " learner" + ((c.learners || []).length === 1 ? "" : "s")].filter(Boolean).join(" · ")) + '</small></span><span class="sy-chev">' + IC.chev + "</span></button>").join("") + "</div>"
          : '<p class="sy-big">0<small> classes</small></p><p class="sy-sub">Nothing on today. Your week is below.</p>') +
      "</div>";
  }

  /* Which tab is on, and the home screen, follow whatever Symi is showing. */
  let last = "";
  function sync() {
    let st; try { st = S.getState(); } catch (_) { return; }
    const view = st.view || "home", tab = TAB_OF[view] || "";
    pills(view);
    nav.querySelectorAll("[data-sy-tab]").forEach((b) => { const on = b.dataset.syTab === tab; b.classList.toggle("on", on); if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    const home = view === "home";
    document.body.classList.toggle("sy-is-home", home);
    if (home) {
      const sig = JSON.stringify([new Date().getHours() < 12, new Date().toDateString(), (st.settings || {}).teacherName, (st.classes || []).map((c) => [c.id, c.name, c.room, c.start, c.day, c.recurrence, (c.learners || []).length]), (st.learners || []).length]);
      if (sig !== last) { last = sig; drawHome(st); }
    }
  }
  /* Registers and Classes, or Resources, Courses and Games: a row of pills under the page title. */
  function pills(view) {
    const g = GROUPS[TAB_OF[view]], at = view;
    if (!g || !g.some((x) => x[0] === at) || app.querySelector(".sy-pills")) return;
    const row = document.createElement("div");
    row.className = "sy-pills"; row.setAttribute("role", "tablist");
    row.innerHTML = g.map((x) => '<button type="button" role="tab" data-sy-pill="' + x[0] + '" aria-selected="' + (x[0] === at) + '" class="' + (x[0] === at ? "on" : "") + '">' + esc(x[1]) + "</button>").join("");
    row.addEventListener("click", (e) => { const b = e.target.closest("[data-sy-pill]"); if (!b) return; const x = g.find((y) => y[0] === b.dataset.syPill); if (x) { x[2](); window.scrollTo({ top: 0 }); } });
    const head = app.querySelector(".staff-page-head");
    if (head) head.after(row); else app.prepend(row);
  }
  new MutationObserver(() => sync()).observe(app, { childList: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { last = ""; sync(); } });
  sync();
})();
