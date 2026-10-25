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
  if (app) new MutationObserver(drawMe).observe(app, { childList: true });
  /* The Evia Portal button arrives once Symi has checked the sign-in. */
  new MutationObserver(drawMe).observe(document.querySelector(".header-utility-actions") || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  titleHome(); drawMe();
})();
