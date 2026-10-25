/* A learner's timeline, the same in Milos, Paros and Symi: one date-ordered story of college days, evidence and the
   assessor's decision, learning hours and whether they were confirmed, visits, reviews, the employer's feedback and
   days off (Evia Portal's nisia_learner_timeline). Grouped by month, newest first, in Evia's rows.
   Kept on the device too, so it shows without signal (from the last time it was opened).
     mountTimeline(box, { rpc, enrolment })   draws it into box; returns a promise */
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[x]));
const svg = (d) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>";
const IC = {
  college: svg('<path d="M2.5 9.5L12 4.5l9.5 5-9.5 5z"/><path d="M6.5 11.6V16c1.6 1.4 3.4 2 5.5 2s3.9-.6 5.5-2v-4.4"/>'),
  evidence: svg('<rect x="3.5" y="6" width="17" height="13.5" rx="2.5"/><circle cx="12" cy="12.75" r="3.2"/><path d="M8.5 6l1.4-2h4.2l1.4 2"/>'),
  hours: svg('<circle cx="12" cy="12.5" r="8"/><path d="M12 8.5v4.2l2.8 1.8"/>'),
  visit: svg('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  review: svg('<path d="M6 3.5h8.5l4 4v12a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-14.5A1.5 1.5 0 0 1 6 3.5z"/><path d="M14 3.5V8h4.5M8 12.5h8M8 16h5"/>'),
  feedback: svg('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>'),
  off: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 9.8h17M8 3v4M16 3v4M9.5 13.5l5 5M14.5 13.5l-5 5"/>'),
};
const CSS = `.tl-month{margin:20px 4px 8px;font-size:12.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#667085}
.tl-month:first-child{margin-top:4px}
.tl-group{border-radius:20px;background:#fff;border:1px solid #e9edf2;box-shadow:0 1px 2px rgba(16,24,40,.04),0 6px 20px rgba(16,24,40,.05);overflow:hidden}
.tl-row{display:flex;align-items:center;gap:12px;padding:12px 16px;min-height:60px;border-top:1px solid #f2f3f5}
.tl-row:first-child{border-top:0}
.tl-ic{width:38px;height:38px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;background:#f2f4f7;color:#344054}
.tl-ic svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.tl-ic.good{background:#e7f6ee;color:#067647}.tl-ic.warn{background:#fef0c7;color:#93370d}.tl-ic.bad{background:#fee4e2;color:#b42318}
.tl-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.tl-copy b{font-size:15px;line-height:1.25;color:#172033}
.tl-copy small{font-size:13px;color:#667085;line-height:1.35;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.tl-when{flex:none;font-size:12.5px;font-weight:700;color:#98a2b3;text-align:right;line-height:1.2}
.tl-when.soon{color:var(--accent,#172033)}
.tl-empty,.tl-wait{padding:18px 16px;font-size:14px;color:#667085}
.tl-more{display:block;width:100%;margin-top:12px;min-height:44px;border-radius:14px;border:1px solid #e9edf2;background:#fff;font:inherit;font-weight:700;font-size:14.5px;color:#172033;cursor:pointer}`;
function style() {
  if (document.getElementById("tl-css")) return;
  const s = document.createElement("style"); s.id = "tl-css"; s.textContent = CSS; document.head.appendChild(s);
}
const KEY = (id) => "nisia-timeline-" + id;
const read = (id) => { try { return JSON.parse(localStorage.getItem(KEY(id)) || "null"); } catch (_) { return null; } };
const save = (id, v) => { try { localStorage.setItem(KEY(id), JSON.stringify(v)); } catch (_) { /* full */ } };
const dayOf = (s) => new Date(/T|\s/.test(String(s)) ? s : s + "T12:00:00");

/* The rows, by month; the first 30 straight away and the rest when asked. */
function html(list, all) {
  if (!list.length) return '<div class="tl-group"><p class="tl-empty">Nothing on the timeline yet. College days, evidence, hours and visits show here as they happen.</p></div>';
  const now = Date.now(), shown = all ? list : list.slice(0, 30);
  let out = "", month = "";
  shown.forEach((x) => {
    const d = dayOf(x.at), m = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (m !== month) { out += (month ? "</div>" : "") + '<p class="tl-month">' + esc(m) + '</p><div class="tl-group">'; month = m; }
    const soon = d.getTime() > now;
    out += '<div class="tl-row"><span class="tl-ic' + (x.tone ? " " + esc(x.tone) : "") + '">' + (IC[x.kind] || IC.evidence) + '</span><span class="tl-copy"><b>' + esc(x.title) + "</b>" + (x.sub ? "<small>" + esc(x.sub) + "</small>" : "") +
      '</span><span class="tl-when' + (soon ? " soon" : "") + '">' + esc(d.toLocaleDateString("en-GB", { weekday: "short" })) + "<br>" + d.getDate() + "</span></div>";
  });
  out += "</div>";
  if (!all && list.length > shown.length) out += '<button type="button" class="tl-more" data-tl-more>Show ' + (list.length - shown.length) + " more</button>";
  return out;
}
export async function mountTimeline(box, { rpc, enrolment }) {
  if (!box || !enrolment) return;
  style();
  const draw = (list, all) => {
    box.innerHTML = html(list, all);
    const more = box.querySelector("[data-tl-more]"); if (more) more.onclick = () => draw(list, true);
  };
  const had = read(enrolment);
  if (had) draw(had); else box.innerHTML = '<div class="tl-group"><p class="tl-wait">Getting the timeline…</p></div>';
  if (typeof navigator !== "undefined" && navigator.onLine === false) { if (!had) box.innerHTML = '<div class="tl-group"><p class="tl-wait">Open this once with signal to see the timeline.</p></div>'; return; }
  try { const list = (await rpc("nisia_learner_timeline", { p_enrolment: enrolment })) || []; save(enrolment, list); if (box.isConnected) draw(list); }
  catch (e) { if (!had && box.isConnected) box.innerHTML = '<div class="tl-group"><p class="tl-wait">The timeline couldn’t load: ' + esc(e.message || "try again with signal") + "</p></div>"; }
}
