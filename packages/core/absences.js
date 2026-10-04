/* Days off, for the staff and employer apps (Milos, Paros): a learner's booked absences, booking more, cancelling.
   The same absences Evia and Symi book and show: Nisia tells the learner, their tutor, assessor and employer, and the
   days show on every register with the reason. The last list is kept on the device for when there's no signal.
   mountAbsences(box, { enrolment, name, sheet, toast, hit }) */
import { rpc, esc } from "./nisia.js";
/* Through the shared actions when the app has loaded them (nisia-actions.js); each app connects them to Nisia. */
const ask = (name, fn, args) => window.NisiaActions ? window.NisiaActions.send(name, args) : rpc(fn, args);

export const KINDS = [["ill", "Ill"], ["holiday", "Holiday"], ["appointment", "Appointment"], ["work", "At work"], ["other", "Other"]];
const pad = (n) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const sayDay = (k) => new Date(k + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const sayDays = (f, t) => f === t ? sayDay(f) : sayDay(f) + " to " + sayDay(t);
const first = (n) => String(n || "").split(" ")[0];
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch (_) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
const ROLE = { learner: "", tutor: "tutor", assessor: "assessor", employer: "employer", admin: "college" };
const CAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M9.5 13.5l5 5M14.5 13.5l-5 5"/></svg>';

let styled = false;
function style() {
  if (styled) return; styled = true;
  const s = document.createElement("style");
  s.textContent = ".ab-card{display:flex;flex-direction:column;gap:10px}.ab-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.ab-head .btn{flex:none}" +
    ".ab-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line,#e8ebf0);animation:abIn .3s ease both}.ab-row:first-of-type{border-top:0}" +
    ".ab-row b{display:block;font-size:14.5px}.ab-row small{color:var(--ink-3,#667085);font-size:12.5px}.ab-row .ab-main{flex:1;min-width:0}" +
    ".ab-x{border:0;background:none;color:var(--ink-3,#667085);font:inherit;font-size:13px;font-weight:700;cursor:pointer;padding:6px}" +
    ".ab-kinds{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.ab-kinds button{padding:9px 14px;border-radius:999px;border:1px solid var(--line,#d5dce4);background:var(--surface,#fff);font:inherit;font-weight:700;font-size:14px;color:inherit;cursor:pointer;transition:transform .15s}" +
    ".ab-kinds button.on{background:var(--ink,#1d2733);border-color:var(--ink,#1d2733);color:#fff}.ab-kinds button:active{transform:scale(.95)}" +
    ".ab-dates{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}.ab-err{color:#b3261e;min-height:1em;margin:6px 0 0;font-size:14px}" +
    "@keyframes abIn{from{opacity:0;transform:translateY(6px)}}@media (prefers-reduced-motion:reduce){.ab-row{animation:none}}";
  document.head.appendChild(s);
}

export async function mountAbsences(box, o) {
  style();
  const key = "nisia-absences-" + o.enrolment;
  const draw = (list, note) => {
    const upcoming = (list || []).filter((a) => a.ends_on >= today()), past = (list || []).filter((a) => a.ends_on < today()).slice(0, 3);
    const row = (a, old) => '<div class="ab-row"><span class="m-ic">' + CAL + '</span><span class="ab-main"><b>' + esc(sayDays(a.starts_on, a.ends_on)) + ' · ' + esc(a.reason) + '</b><small>' +
      (a.booked_by_role === "learner" ? "Booked by " + esc(first(o.name)) : "Booked by " + esc(a.booked_by || "") + (ROLE[a.booked_by_role] ? " (" + ROLE[a.booked_by_role] + ")" : "")) + '</small></span>' +
      (old ? "" : '<button type="button" class="ab-x" data-cancel="' + esc(a.id) + '" aria-label="Cancel ' + esc(sayDays(a.starts_on, a.ends_on)) + '">Cancel</button>') + '</div>';
    box.innerHTML = '<section class="card m-card ab-card"><div class="ab-head"><p class="label">Days off</p><button type="button" class="btn ghost" data-book>Book days off</button></div>' +
      (upcoming.length ? upcoming.map((a) => row(a)).join("") : '<p class="m-card-sub">None booked. ' + esc(first(o.name)) + ' can book their own in Evia.</p>') +
      (past.length ? '<p class="label" style="margin-top:4px">Recently</p>' + past.map((a) => row(a, true)).join("") : "") +
      (note ? '<p class="small muted">' + esc(note) + '</p>' : "") + '</section>';
    box.querySelector("[data-book]").onclick = () => book();
    box.querySelectorAll("[data-cancel]").forEach((b) => b.onclick = async () => {
      if (!navigator.onLine) return o.toast("You need signal to cancel it.");
      b.disabled = true;
      try { await ask("cancelAbsence", "nisia_cancel_absence", { p_id: b.dataset.cancel }); if (o.hit) o.hit("absence.cancel"); o.toast("Cancelled. Everyone sees it on the register again."); load(); }
      catch (e) { b.disabled = false; o.toast(e.message); }
    });
  };
  const load = async () => {
    const kept = read(key, null);
    if (kept) draw(kept);
    else box.innerHTML = '<section class="card m-card"><p class="label">Days off</p><p class="m-card-sub">Loading…</p></section>';
    if (!navigator.onLine) return draw(kept || [], "No signal: this is the list from last time.");
    try { const list = await ask("absences", "nisia_absences", { p_enrolment: o.enrolment }); write(key, list || []); draw(list || []); }
    catch (e) { draw(kept || [], "Couldn’t reach Nisia: " + e.message); }
  };
  function book() {
    const t = today();
    const layer = o.sheet('<h2>Book days off</h2><p class="muted">' + esc(o.name) + '. They, their tutor, assessor and employer are told, and the days show on every register with the reason.</p>' +
      '<div class="ab-dates"><label class="field">First day<input type="date" name="from" value="' + t + '"></label><label class="field">Last day<input type="date" name="to" value="' + t + '"></label></div>' +
      '<div class="ab-kinds" role="group" aria-label="Reason">' + KINDS.map(([k, x]) => '<button type="button" data-k="' + k + '">' + x + '</button>').join("") + '</div>' +
      '<label class="field">In their words<input name="reason" maxlength="200" placeholder="Optional (needed for Other)"></label>' +
      '<p class="ab-err" role="alert"></p><button type="button" class="btn primary wide" data-save>Book</button>', "Book days off");
    let kind = "";
    const $ = (s) => layer.querySelector(s);
    layer.querySelectorAll("[data-k]").forEach((b) => b.onclick = () => { kind = b.dataset.k; layer.querySelectorAll("[data-k]").forEach((x) => x.classList.toggle("on", x === b)); if (kind === "other") $("[name=reason]").focus(); });
    $("[name=from]").onchange = () => { if ($("[name=to]").value < $("[name=from]").value) $("[name=to]").value = $("[name=from]").value; };
    $("[data-save]").onclick = async () => {
      const from = $("[name=from]").value, to = $("[name=to]").value, reason = $("[name=reason]").value.trim(), err = $(".ab-err");
      if (!from || !to || to < from) return (err.textContent = "Choose the first and last day.");
      if (!kind) return (err.textContent = "Choose a reason.");
      if (kind === "other" && !reason) return (err.textContent = "Say what the reason is.");
      if (!navigator.onLine) return (err.textContent = "You need signal to book it.");
      $("[data-save]").disabled = true;
      try {
        await ask("bookAbsence", "nisia_book_absence", { p_from: from, p_to: to, p_kind: kind, p_reason: reason || null, p_enrolment: o.enrolment });
        layer.remove(); if (o.hit) o.hit("absence.book");
        o.toast("Booked. " + first(o.name) + " and everyone with them has been told."); load();
      } catch (e) { $("[data-save]").disabled = false; err.textContent = e.message; }
    };
  }
  await load();
}
