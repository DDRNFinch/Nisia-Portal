/* Assistants: what the college has (Evia Core and Evia Portal), what Symi, Milos and Paros each add, a worked example
   of each with made-up people, the price for this college's seats, and how to keep or add one.
   Prices and what's in each come from packages/core/plans.js. Every capability is marked live or coming, so nothing
   unbuilt is shown as working. During the pilot every college has all three assistants switched on; buying online is
   still to come, so "Keep" or "Add" makes a request the college sends to the Evia team. */
import { PLANS, quote, money } from "../../packages/core/plans.js";

let ui;
const IC = { evia: "#E5BC02", symi: "#38A96B", milos: "#2C85F7", paros: "#F28C28" };
const APP = { evia: "Evia", symi: "Symi", milos: "Milos", paros: "Paros" };
const face = (c) => '<span class="as-face" style="background:' + c + '" aria-hidden="true"><i></i><i></i></span>';

export function assistantsPage(deps) {
  ui = deps;
  const { esc } = ui, s = ui.summary(), seats = s.seats || 0, ends = s.licence_ends ? ui.ukDate(s.licence_ends) : "";
  const all = quote(seats, PLANS.assistants.map((a) => a.id)), core = quote(seats, []);
  const list = (items, live) => items.map((t) => '<li class="' + (live ? "as-live" : "as-soon") + '"><span>' + esc(t) + '</span>' + (live ? "" : '<em class="pill idle">Coming</em>') + '</li>').join("");
  ui.shell(
    '<div class="topbar"><div><div class="label">' + esc(s.name) + '</div><h1>Assistants</h1></div></div>' +
    '<p class="as-lead">Your college has <b>Evia Core and Evia Portal</b>. Add any of the three assistants, in any order: each one adds to what you have and never takes anything away. Prices are per learner seat per year.</p>' +

    '<section class="panel as-core"><div class="panel-head"><h2>' + face(IC.evia) + esc(PLANS.core.name) + '</h2><span class="pill good">Included</span></div>' +
      '<p class="muted">' + esc(PLANS.core.purpose) + '</p>' +
      '<ul class="as-list cols">' + list(PLANS.core.live, true) + list(PLANS.core.coming, false) + '</ul>' +
      '<p class="as-price"><b>' + money(PLANS.core.price) + '</b> per seat a year · ' + seats + ' seats = ' + money(core.net) + ' a year + VAT</p></section>' +

    PLANS.assistants.map((a) => {
      const q = quote(seats, [a.id]), extra = q.net - core.net;
      return '<section class="panel as-card" id="as-' + a.id + '" style="--as:' + a.colour + '">' +
        '<div class="panel-head"><h2>' + face(a.colour) + esc(a.name) + '</h2><span class="pill good">Active · pilot</span></div>' +
        '<p class="as-purpose">' + esc(a.purpose) + '</p><p class="small muted">For: ' + esc(a.who) + '</p>' +
        '<div class="as-grid">' +
          '<div><h3>What it adds to Evia Core</h3><ul class="as-list">' + list(a.live, true) + list(a.coming, false) + '</ul>' +
            (a.note ? '<p class="small muted as-note">' + esc(a.note) + '</p>' : "") + '</div>' +
          '<div><h3>How it works: an example</h3><ol class="as-story">' + a.story.map(([who, role, app, text, live]) =>
            '<li class="' + (live ? "" : "as-soon") + '"><span class="as-who" style="--c:' + IC[app] + '">' + esc(APP[app]) + '</span><div><b>' + esc(who) + '</b> <span class="small muted">' + esc(role) + '</span>' +
            (live ? "" : ' <em class="pill idle">Coming</em>') + '<p>' + esc(text) + '</p></div></li>').join("") +
            '</ol><p class="small muted">Made-up people, for illustration.</p></div>' +
        '</div>' +
        '<div class="as-foot"><p class="as-price"><b>+' + money(a.price) + '</b> per seat a year · covers all ' + seats + ' seats · +' + money(extra) + ' a year + VAT</p>' +
          '<div class="as-acts"><a class="btn" href="' + esc(a.app) + '" target="_blank" rel="noopener" data-app="' + esc(a.name) + '">Open ' + esc(a.name) + '</a>' +
          '<button class="btn primary" type="button" data-keep="' + a.id + '">Keep after the pilot</button></div></div>' +
      '</section>';
    }).join("") +

    '<section class="panel as-all"><div class="panel-head"><h2>All three assistants</h2></div>' +
      '<p><b>' + money(PLANS.bundle.price) + '</b> per seat a year for Evia with Symi, Milos and Paros, instead of ' + money(PLANS.core.price + PLANS.assistants.reduce((n, a) => n + a.price, 0)) + '. ' +
      'For your ' + seats + ' seats: ' + money(all.net) + ' a year + VAT.</p>' +
      '<button class="btn primary" type="button" data-keep="all">Keep all three after the pilot</button></section>' +

    '<p class="small muted as-terms">Every college has all three assistants during the pilot' + (ends ? ", which runs until " + esc(ends) : "") + '. Staff accounts are free and unlimited. ' +
      'Removing an assistant never deletes evidence, hours or records. No set-up fee. Buying seats and assistants online here is coming; until then the Evia team sets it up with you.</p>');
  document.querySelectorAll("[data-keep]").forEach((b) => b.onclick = () => request(b.dataset.keep, s));
}

/* What keeping an assistant would cost this college, and the request to send. */
function request(id, s) {
  const { esc } = ui, seats = s.seats || 0;
  const ids = id === "all" ? PLANS.assistants.map((a) => a.id) : [id];
  const q = quote(seats, ids), names = ids.map((x) => PLANS.assistants.find((a) => a.id === x).name).join(", ");
  const text = "Please keep " + names + " for " + s.name + " after the pilot: " + seats + " learner seats, " + money(q.each) + " per seat a year (Evia Core included), " +
    money(q.net) + " + VAT " + money(q.vat) + " = " + money(q.total) + " a year.";
  ui.modal("Keep " + (id === "all" ? "all three assistants" : names),
    '<table class="as-quote"><tbody>' +
      '<tr><td>Evia Core + Evia Portal' + (ids.length ? " with " + esc(names) : "") + '</td><td>' + money(q.each) + ' × ' + seats + ' seats</td></tr>' +
      '<tr><td>A year, before VAT</td><td>' + money(q.net) + '</td></tr><tr><td>VAT (' + Math.round(PLANS.vatRate * 100) + '%)</td><td>' + money(q.vat) + '</td></tr>' +
      '<tr class="as-total"><td>A year, with VAT</td><td>' + money(q.total) + '</td></tr></tbody></table>' +
    '<p class="small muted">Covers every learner seat for a year from the end of the pilot. Seats can be moved between learners; more seats cost the same per seat. Nothing is charged until you sign the order with the Evia team.</p>' +
    '<label class="field">Your request<textarea rows="4" readonly id="asText">' + esc(text) + '</textarea></label>' +
    '<div class="row-actions"><button class="btn" type="button" id="asCopy">Copy the request</button><button class="btn primary" type="button" id="asDone">Done</button></div>' +
    '<p class="small muted">Send it to your Evia contact. Buying online here is coming.</p>');
  document.getElementById("asCopy").onclick = async () => {
    const t = document.getElementById("asText");
    try { await navigator.clipboard.writeText(t.value); } catch (_) { t.select(); document.execCommand("copy"); }
    ui.hit("assistant.request." + id); ui.toast("Copied. Send it to your Evia contact.");
  };
  document.getElementById("asDone").onclick = ui.closeModal;
}
