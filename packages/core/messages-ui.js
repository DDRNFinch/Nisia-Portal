/* Messages: the same message icon and conversations in every Evia Portal app (Evia, Symi, Milos, Paros and the portal).
   A round icon in the app's colour sits at the top right, just below the profile button, with the number of unread
   messages. It opens the conversations: who the person is, what was said last, and a "New message" list of the people
   this person can message (the rules are Evia Portal's: services/supabase/messages.sql). In a conversation, tapping your
   own message removes it (both people then see "Message removed"); tapping theirs reports it to the college.
   Nothing is ever deleted, and the college's safeguarding team can read any conversation; the screen says so.

   Plain script, so it works in Evia (classic scripts) and the module apps alike. The same file is copied into Evia
   (tools/sync-actions.sh).

   NisiaMessages.mount({app, color, soft, rpc, ready, place})   returns {open(withMember?), refresh(), update(), unread(), close()}
   NisiaMessages.under(id)   a place() that puts the icon just below the app's profile button with that id
     rpc(fn, args)   runs an Evia Portal function and returns its data, or throws
     ready()         true when this person is signed in to Evia Portal (the icon only shows then)
     place(button)   puts the icon in the app's header; without it the icon sits fixed at the top right
     top, right      where the fixed icon sits (px), below the profile button
     ink, on         the icon's colour on white (default: color) and the text colour on the app's colour (default: white)
   version: messages-ui 1 */
(function (g) {
  if (g.NisiaMessages) return;
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[x]));
  const ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12.2c0 4-3.6 7.1-8 7.1-1.1 0-2.2-.2-3.1-.6L4 20l1.3-3.7A6.6 6.6 0 0 1 4 12.2C4 8.3 7.6 5 12 5s8 3.3 8 7.2Z"/><path d="M8.5 11.5h7M8.5 14.3h4.5"/></svg>';
  const BACK = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
  const SEND = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12 20 4l-4 16-4-7-8-1Z"/><path d="m12 13 8-9"/></svg>';
  const CSS = `
.nm-btn{position:relative;width:42px;height:42px;border-radius:50%;border:1px solid #e4e8ed;background:#fff;color:var(--nm-c);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 3px 10px rgba(16,24,40,.06);padding:0;flex:none;-webkit-tap-highlight-color:transparent}
.nm-btn:hover{background:var(--nm-soft)}.nm-btn:focus-visible{outline:3px solid var(--nm-c);outline-offset:2px}
.nm-btn.nm-fixed{position:fixed;z-index:60}
.nm-stack{display:flex;flex-direction:column;align-items:center;gap:8px;flex:none}
.nm-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:#d92d20;color:#fff;font:700 11.5px/20px system-ui,-apple-system,"Segoe UI",Arial,sans-serif;text-align:center;border:2px solid #fff;box-sizing:content-box}
.nm-badge[hidden]{display:none}
.nm-overlay{position:fixed;inset:0;z-index:10050;background:rgba(20,28,42,.32);display:flex;align-items:flex-end;justify-content:center;animation:nm-fade .16s ease-out}
.nm-panel{width:min(560px,100%);height:min(92vh,760px);height:min(92dvh,760px);background:#fff;border-radius:24px 24px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -12px 40px rgba(20,28,42,.2);font-family:inherit;color:#172033;animation:nm-up .2s ease-out}
@media(min-width:760px){.nm-overlay{align-items:center}.nm-panel{border-radius:22px;height:min(86vh,760px)}}
@media(prefers-reduced-motion:reduce){.nm-overlay,.nm-panel{animation:none}}
@keyframes nm-fade{from{opacity:0}}@keyframes nm-up{from{transform:translateY(24px);opacity:.6}}
.nm-head{display:flex;align-items:center;gap:10px;padding:16px 16px 12px;border-bottom:1px solid #eef0f3;flex:none}
.nm-head h2{margin:0;font-size:20px;font-weight:800;letter-spacing:-.02em;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nm-head small{display:block;font-size:12.5px;font-weight:500;color:#667085;letter-spacing:0}
.nm-icon{width:40px;height:40px;border-radius:50%;border:0;background:#f4f6f8;color:#344054;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;flex:none;font-size:24px;line-height:1}
.nm-body{flex:1;overflow:auto;padding:12px 16px;-webkit-overflow-scrolling:touch}
.nm-new{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:14px;background:var(--nm-c);color:#fff;font-weight:700;font-size:15px;line-height:1;font-family:inherit;padding:13px;cursor:pointer;margin:2px 0 12px}
.nm-row{display:flex;align-items:center;gap:12px;width:100%;border:0;background:none;text-align:left;padding:11px 6px;border-bottom:1px solid #f1f3f6;cursor:pointer;font:inherit;color:inherit}
.nm-row:hover{background:#fafbfc}
.nm-av{width:42px;height:42px;border-radius:50%;background:var(--nm-soft);color:var(--nm-ink,#172033);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex:none}
.nm-main{flex:1;min-width:0}.nm-main b{display:block;font-size:15.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nm-main span{display:block;font-size:13px;color:#667085;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.nm-row.nm-unread .nm-main span{color:#172033;font-weight:650}
.nm-side{display:flex;flex-direction:column;align-items:flex-end;gap:5px;font-size:12px;color:#98a2b3;flex:none}
.nm-count{min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--nm-c);color:#fff;font-weight:800;font-size:11.5px;line-height:20px;text-align:center}
.nm-empty{text-align:center;color:#667085;padding:40px 16px;line-height:1.5}
.nm-note{font-size:12.5px;color:#667085;line-height:1.45;padding:12px 4px 4px;margin:0}
.nm-search{width:100%;box-sizing:border-box;border:1px solid #e3e7ed;border-radius:12px;padding:11px 12px;font:inherit;font-size:15px;margin-bottom:6px}
.nm-chat{display:flex;flex-direction:column;gap:4px;padding:12px 14px}
.nm-day{align-self:center;font-size:12px;color:#98a2b3;font-weight:700;margin:12px 0 4px}
.nm-msg{max-width:80%;padding:9px 12px;border-radius:16px;font-size:15px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word;border:0;text-align:left;font-family:inherit;cursor:pointer}
.nm-msg.nm-theirs{align-self:flex-start;background:#f2f4f7;color:#172033;border-bottom-left-radius:6px}
.nm-msg.nm-mine{align-self:flex-end;background:var(--nm-c);color:var(--nm-on,#fff);border-bottom-right-radius:6px}
.nm-msg.nm-removed{background:none;border:1px dashed #d0d5dd;color:#98a2b3;font-style:italic;cursor:default}
.nm-msg.nm-sending{opacity:.6}
.nm-time{font-size:11px;color:#98a2b3;margin:0 4px 6px}.nm-time.nm-r{align-self:flex-end}.nm-time.nm-l{align-self:flex-start}
.nm-menu{align-self:stretch;display:flex;gap:8px;justify-content:flex-end;margin:2px 0 8px}.nm-menu.nm-l{justify-content:flex-start}
.nm-menu button{border:1px solid #e4e7ec;background:#fff;border-radius:999px;padding:8px 12px;font-weight:600;font-size:13px;line-height:1;font-family:inherit;cursor:pointer;color:#344054}
.nm-menu button.nm-bad{color:#b42318;border-color:#fecdca}
.nm-compose{display:flex;gap:8px;align-items:flex-end;padding:10px 12px calc(10px + env(safe-area-inset-bottom));border-top:1px solid #eef0f3;flex:none;background:#fff}
.nm-compose textarea{flex:1;min-height:44px;max-height:140px;resize:none;border:1px solid #e3e7ed;border-radius:14px;padding:11px 12px;font:inherit;font-size:16px;line-height:1.35;box-sizing:border-box}
.nm-compose textarea:focus{outline:2px solid var(--nm-c);outline-offset:0;border-color:transparent}
.nm-send{width:46px;height:46px;border-radius:50%;border:0;background:var(--nm-c);color:var(--nm-on,#fff);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:none}
.nm-send:disabled{opacity:.4;cursor:default}
.nm-err{color:#b42318;font-size:13px;padding:0 14px 8px;margin:0}
.nm-closed{padding:14px 16px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #eef0f3;color:#667085;font-size:14px;margin:0}
`;
  const initials = (n) => String(n || "?").trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const dayKey = (d) => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  function when(at, long) {
    const d = new Date(at), now = new Date(), y = new Date(now); y.setDate(y.getDate() - 1);
    const t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (dayKey(d) === dayKey(now)) return long ? "Today" : t;
    if (dayKey(d) === dayKey(y)) return "Yesterday";
    return d.toLocaleDateString("en-GB", Object.assign({ day: "numeric", month: "short" }, long ? { weekday: "long" } : {}));
  }

  function mount(o) {
    if (!document.getElementById("nm-style")) { const s = document.createElement("style"); s.id = "nm-style"; s.textContent = CSS; document.head.appendChild(s); }
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "nm-btn"; btn.id = "nm-btn"; btn.setAttribute("aria-label", "Messages"); btn.hidden = true;
    btn.innerHTML = ICON + '<span class="nm-badge" hidden></span>';
    btn.style.setProperty("--nm-c", o.ink || o.color); btn.style.setProperty("--nm-soft", o.soft || "#f2f4f7");
    btn.addEventListener("click", () => open());
    let unread = 0, view = null, timer = null, sheet = null, busy = false;
    const ready = () => { try { return !!(o.ready ? o.ready() : true); } catch (_) { return false; } };
    const placeIt = () => {
      const on = ready();
      btn.hidden = !on;
      if (!on) return;
      if (o.place) { try { o.place(btn); } catch (_) {} return; }
      if (!btn.isConnected) { btn.classList.add("nm-fixed"); btn.style.top = "calc(" + (o.top == null ? 62 : o.top) + "px + env(safe-area-inset-top))"; btn.style.right = "calc(" + (o.right == null ? 12 : o.right) + "px + env(safe-area-inset-right))"; document.body.appendChild(btn); }
    };
    const badge = (n) => {
      unread = Math.max(0, parseInt(n, 10) || 0);
      const b = btn.querySelector(".nm-badge");
      b.hidden = !unread; b.textContent = unread > 99 ? "99+" : String(unread);
      btn.setAttribute("aria-label", unread ? "Messages, " + unread + " unread" : "Messages");
      if (o.onUnread) try { o.onUnread(unread); } catch (_) {}
    };
    async function refresh() {
      placeIt();
      if (!ready() || (typeof navigator !== "undefined" && navigator.onLine === false)) return unread;
      try { badge(await o.rpc("msg_unread", {}) || 0); } catch (_) {}
      return unread;
    }

    /* ---------- The sheet ---------- */
    function shell() {
      if (sheet && sheet.isConnected) return sheet;
      sheet = document.createElement("div");
      sheet.className = "nm-overlay";
      sheet.style.setProperty("--nm-c", o.color); sheet.style.setProperty("--nm-soft", o.soft || "#f2f4f7");
      if (o.on) sheet.style.setProperty("--nm-on", o.on);
      sheet.innerHTML = '<section class="nm-panel" role="dialog" aria-modal="true" aria-labelledby="nm-title"></section>';
      sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
      document.body.appendChild(sheet);
      document.addEventListener("keydown", onKey);
      return sheet;
    }
    const onKey = (e) => { if (e.key === "Escape" && sheet) close(); };
    const panel = () => shell().querySelector(".nm-panel");
    function close() {
      clearInterval(timer); timer = null; view = null;
      document.removeEventListener("keydown", onKey);
      if (sheet) sheet.remove(); sheet = null;
      refresh();
      try { btn.focus({ preventScroll: true }); } catch (_) {}
    }
    const head = (title, sub, back) => '<header class="nm-head">' + (back ? '<button type="button" class="nm-icon" data-nm="back" aria-label="Back">' + BACK + "</button>" : "") +
      '<h2 id="nm-title">' + esc(title) + (sub ? "<small>" + esc(sub) + "</small>" : "") + '</h2><button type="button" class="nm-icon" data-nm="close" aria-label="Close">×</button></header>';
    const wire = (p) => { const c = p.querySelector('[data-nm="close"]'), b = p.querySelector('[data-nm="back"]'); if (c) c.onclick = close; if (b) b.onclick = () => list(); };
    const loading = (title, back) => { const p = panel(); p.innerHTML = head(title, "", back) + '<div class="nm-body"><p class="nm-empty">Loading…</p></div>'; wire(p); return p; };
    const failed = (p, e) => { const b = p.querySelector(".nm-body"); if (b) b.innerHTML = '<p class="nm-empty">' + esc(navigator.onLine === false ? "No signal. Messages need the internet." : (e && e.message) || "That didn’t load. Try again.") + "</p>"; };
    const NOTE = '<p class="nm-note">Messages are kept by your college. Its safeguarding team can read them if there’s ever a concern.</p>';

    async function list() {
      clearInterval(timer); view = { kind: "list" };
      const p = loading("Messages");
      const draw = (threads) => {
        if (!view || view.kind !== "list") return;
        const total = threads.reduce((n, t) => n + (t.unread || 0), 0); badge(total);
        p.innerHTML = head("Messages") + '<div class="nm-body"><button type="button" class="nm-new" data-nm="new">' + ICON + "New message</button>" +
          (threads.length ? threads.map((t) => '<button type="button" class="nm-row' + (t.unread ? " nm-unread" : "") + '" data-with="' + esc(t.with) + '"><span class="nm-av">' + esc(initials(t.name)) +
            '</span><span class="nm-main"><b>' + esc(t.name) + "</b><span>" + esc(t.last ? (t.last.mine ? "You: " : "") + t.last.body : t.about) + '</span></span><span class="nm-side">' +
            (t.last ? esc(when(t.last.at)) : "") + (t.unread ? '<span class="nm-count">' + t.unread + "</span>" : "") + "</span></button>").join("")
            : '<p class="nm-empty">No messages yet.<br>Tap <b>New message</b> to start one.</p>') + NOTE + "</div>";
        wire(p);
        p.querySelector('[data-nm="new"]').onclick = contacts;
        p.querySelectorAll("[data-with]").forEach((b) => (b.onclick = () => chat(b.dataset.with)));
      };
      const load = async () => { try { draw((await o.rpc("msg_threads", {})) || []); } catch (e) { if (view && view.kind === "list" && !p.querySelector(".nm-row")) failed(p, e); } };
      await load();
      timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, 15000);
    }

    async function contacts() {
      clearInterval(timer); view = { kind: "contacts" };
      const p = loading("New message", true);
      let people = [];
      try { people = (await o.rpc("msg_contacts", {})) || []; } catch (e) { return failed(p, e); }
      if (!view || view.kind !== "contacts") return;
      const rows = (q) => {
        const f = people.filter((x) => !q || (x.name + " " + x.about).toLowerCase().includes(q.toLowerCase()));
        return f.length ? f.map((x) => '<button type="button" class="nm-row" data-with="' + esc(x.member_id) + '"><span class="nm-av">' + esc(initials(x.name)) + '</span><span class="nm-main"><b>' + esc(x.name) + "</b><span>" + esc(x.about) + "</span></span></button>").join("")
          : '<p class="nm-empty">' + (people.length ? "Nobody by that name." : "There’s nobody you can message yet. Your college links you with your tutor, assessor and employer.") + "</p>";
      };
      p.innerHTML = head("New message", "Who to?", true) + '<div class="nm-body">' + (people.length > 7 ? '<input class="nm-search" type="search" placeholder="Search by name" aria-label="Search by name">' : "") + '<div class="nm-people">' + rows("") + "</div></div>";
      wire(p);
      const hook = () => p.querySelectorAll(".nm-people [data-with]").forEach((b) => (b.onclick = () => chat(b.dataset.with)));
      const s = p.querySelector(".nm-search");
      if (s) s.oninput = () => { p.querySelector(".nm-people").innerHTML = rows(s.value.trim()); hook(); };
      hook();
    }

    async function chat(withId) {
      clearInterval(timer); view = { kind: "chat", with: withId, picked: null };
      const p = loading("Messages", true);
      let data = null, draft = "";
      const draw = (keepScroll) => {
        if (!view || view.kind !== "chat" || view.with !== withId || !data) return;
        const box = p.querySelector(".nm-body"), atEnd = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 60, top = box ? box.scrollTop : 0;
        const ta = p.querySelector("textarea"); if (ta) draft = ta.value;
        const ms = data.messages || [], lastMine = [...ms].reverse().find((m) => m.mine && !m.removed && !m.pending);
        let html = "", day = "";
        ms.forEach((m) => {
          const d = new Date(m.at), k = dayKey(d);
          if (k !== day) { day = k; html += '<span class="nm-day">' + esc(when(m.at, true)) + "</span>"; }
          const side = m.mine ? "nm-mine" : "nm-theirs";
          html += m.removed ? '<span class="nm-msg ' + side + ' nm-removed">Message removed</span>'
            : '<button type="button" class="nm-msg ' + side + (m.pending ? " nm-sending" : "") + '" data-id="' + esc(m.id) + '">' + esc(m.body) + "</button>";
          if (view.picked === m.id && !m.removed && !m.pending) html += '<div class="nm-menu' + (m.mine ? "" : " nm-l") + '">' + (m.mine ? '<button type="button" class="nm-bad" data-act="remove">Remove message</button>'
            : m.reported ? '<button type="button" disabled>Reported to the college</button>' : '<button type="button" class="nm-bad" data-act="report">Report to the college</button>') + '<button type="button" data-act="cancel">Cancel</button></div>';
          else if (m === lastMine && data.their_read_at && Date.parse(data.their_read_at) >= Date.parse(m.at)) html += '<span class="nm-time nm-r">Seen</span>';
          else if (m.pending) html += '<span class="nm-time nm-r">Sending…</span>';
        });
        const firstTime = !ms.length;
        p.innerHTML = head(data.name, data.about, true) + '<div class="nm-body nm-chat">' + (firstTime ? '<p class="nm-empty">Say hello to ' + esc(String(data.name).split(" ")[0]) + ".</p>" + NOTE : html) + "</div>" +
          (view.err ? '<p class="nm-err" role="alert">' + esc(view.err) + "</p>" : "") +
          (data.can_send ? '<div class="nm-compose"><textarea rows="1" maxlength="2000" placeholder="Message ' + esc(String(data.name).split(" ")[0]) + '" aria-label="Message"></textarea><button type="button" class="nm-send" aria-label="Send" disabled>' + SEND + "</button></div>"
            : '<p class="nm-closed">You can’t send messages to ' + esc(data.name) + " any more.</p>");
        wire(p);
        const body = p.querySelector(".nm-body");
        body.scrollTop = keepScroll && !atEnd ? top : body.scrollHeight;
        body.querySelectorAll(".nm-msg[data-id]").forEach((b) => (b.onclick = () => { view.picked = view.picked === b.dataset.id ? null : b.dataset.id; draw(true); }));
        body.querySelectorAll("[data-act]").forEach((b) => (b.onclick = () => act(b.dataset.act)));
        const t = p.querySelector("textarea"), s = p.querySelector(".nm-send");
        if (t) {
          t.value = draft; s.disabled = !t.value.trim();
          const grow = () => { t.style.height = "auto"; t.style.height = Math.min(140, t.scrollHeight) + "px"; s.disabled = !t.value.trim() || busy; };
          t.oninput = grow; grow();
          t.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer:fine)").matches) { e.preventDefault(); send(); } };
          s.onclick = send;
        }
      };
      async function load(keepScroll) {
        try { const d = await o.rpc("msg_open", { p_with: withId }); if (!view || view.kind !== "chat" || view.with !== withId) return; data = Object.assign(d, { messages: (d.messages || []).concat((data && data.messages || []).filter((m) => m.pending)) }); draw(keepScroll); }
        catch (e) { if (!data) failed(p, e); }
      }
      async function send() {
        const t = p.querySelector("textarea"); if (!t || busy) return;
        const body = t.value.trim(); if (!body) return;
        busy = true; view.err = ""; draft = "";
        const temp = { id: "tmp" + Date.now(), mine: true, body, at: new Date().toISOString(), pending: true };
        data.messages.push(temp); t.value = ""; draw();
        try { await o.rpc("msg_send", { p_with: withId, p_body: body }); data.messages = data.messages.filter((m) => m !== temp); await load(); }
        catch (e) { data.messages = data.messages.filter((m) => m !== temp); draft = body; view.err = navigator.onLine === false ? "No signal. Your message wasn’t sent; try again when you have signal." : (e && e.message) || "That didn’t send. Try again."; draw(); }
        finally { busy = false; const s = p.querySelector(".nm-send"), ta = p.querySelector("textarea"); if (s && ta) s.disabled = !ta.value.trim(); if (ta) ta.focus({ preventScroll: true }); }
      }
      async function act(a) {
        const id = view.picked; view.picked = null;
        if (a === "cancel" || !id) return draw(true);
        try {
          if (a === "remove") await o.rpc("msg_remove", { p_message: id });
          if (a === "report") { await o.rpc("msg_report", { p_message: id, p_reason: null }); view.err = ""; }
          await load(true);
          if (a === "report") { const n = document.createElement("p"); n.className = "nm-note"; n.setAttribute("role", "status"); n.textContent = "Thanks. The college has been told and will look at it."; p.querySelector(".nm-body").appendChild(n); }
        } catch (e) { view.err = (e && e.message) || "That didn’t work. Try again."; draw(true); }
      }
      await load();
      timer = setInterval(() => { if (document.visibilityState === "visible" && !busy) load(true); }, 5000);
    }

    function open(withMember) {
      if (!ready()) return;
      shell();
      if (withMember) chat(withMember); else list();
    }

    placeIt();
    refresh();
    /* The app redraws its header: put the icon back straight away. */
    if (o.place && typeof MutationObserver !== "undefined") { let q = 0; new MutationObserver(() => { if (!q) q = requestAnimationFrame(() => { q = 0; if (!btn.isConnected || btn.hidden === ready()) placeIt(); }); }).observe(document.body, { childList: true, subtree: true }); }
    setInterval(() => { placeIt(); if (document.visibilityState === "visible") refresh(); }, 30000);
    setInterval(placeIt, 1500);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
    addEventListener("online", refresh);
    return { open, close, refresh, update: placeIt, unread: () => unread, button: btn };
  }
  /* A place(): the icon just below the app's own profile button (#id), the two in a column. */
  function under(id) {
    return (btn) => {
      const me = document.getElementById(id);
      if (!me) { btn.remove(); return; }
      const p = me.parentElement;
      if (p && p.classList.contains("nm-stack")) { if (btn.parentElement !== p) p.appendChild(btn); return; }
      const st = document.createElement("div"); st.className = "nm-stack"; me.replaceWith(st); st.append(me, btn);
    };
  }
  g.NisiaMessages = { mount, under };
})(typeof window !== "undefined" ? window : globalThis);
