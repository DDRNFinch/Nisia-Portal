/* Evidence strength, as the learner sees it in Evia: three signal bars per unit (weak, good, strong).
   Evia works it out (photos, and how much of the unit's "things to mention" the write-up covers) and sends it in
   its snapshot. For a learner whose Evia hasn't sent it yet, a rough version from photos and words stands in. */
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (t) => String(t || "").trim().split(/\s+/).filter(Boolean).length;

/* items: [{photos, text}] for the unit's evidence. */
export function unitStrength(snapshot, unitName, items) {
  const u = ((snapshot && snapshot.units) || []).find((x) => norm(x.name) === norm(unitName));
  if (u && u.strength !== undefined) return u.strength;
  if (!items || !items.length) return null;
  const photos = items.reduce((n, i) => n + (i.photos || 0), 0), w = items.reduce((n, i) => n + words(i.text), 0);
  const p = photos >= 10 ? "strong" : photos >= 5 ? "good" : "weak", t = w >= 100 ? "strong" : w >= 50 ? "good" : "weak";
  return p === "strong" && t === "strong" ? "strong" : p === "weak" || t === "weak" ? "weak" : "good";
}
const LABEL = { strong: "Strong evidence", good: "Good evidence", weak: "Weak evidence" };
export function strengthBars(level) {
  const n = level === "strong" ? 3 : level === "good" ? 2 : level === "weak" ? 1 : 0;
  return '<span class="sbars sbars-' + (level || "none") + '" role="img" aria-label="' + (LABEL[level] || "No evidence yet") + '" title="' + (LABEL[level] || "No evidence yet") + '">' +
    [1, 2, 3].map((i) => '<i class="sbar sbar-' + i + (i <= n ? " on" : "") + '"></i>').join("") + '</span>';
}
