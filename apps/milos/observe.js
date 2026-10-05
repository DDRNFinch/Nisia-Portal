/* Milos observations: the assessor captures evidence the way the learner does in Evia (pick the unit, photos against
   its "things to capture", a write-up that ticks off its "things to mention", with the same strength bars), then signs
   it off with the KSBs it meets, as when marking. It's saved on the phone first, then to Nisia as the learner's
   evidence (recorded as the assessor's observation, photos in the college's private evidence store), now or once
   there's signal. */
import { db, esc } from "../../packages/core/nisia.js";
import { coursePack } from "../../packages/core/packs.js";
import { PROMPTS, split, termMatched } from "../../packages/core/prompts.js";
import { unitStrength, strengthBars } from "../../packages/core/strength.js";
import { saveObservation } from "./store.js";
import { evidencePdf } from "./portfolio.js";

/* Evia's strength rules (strength.js), for a pack being captured. */
const words = (t) => String(t || "").trim().split(/\s+/).filter(Boolean).length;
const photoLevel = (n) => n >= 10 ? "strong" : n >= 5 ? "good" : "weak";
function writeLevel(text, terms) {
  if (!words(text)) return "weak";
  if (!terms.length) return words(text) >= 100 ? "strong" : words(text) >= 50 ? "good" : "weak";
  const got = terms.filter((t) => termMatched(t, text)).length / terms.length;
  return got >= 2 / 3 ? "strong" : got >= 1 / 3 ? "good" : "weak";
}
const combine = (p, w) => p === "strong" && w === "strong" ? "strong" : p === "weak" || w === "weak" ? "weak" : "good";
const LEVEL = { strong: "Strong", good: "Good", weak: "Needs more" };

/* The units to observe against, in the course's order, with Evia's prompts. The NVQ works by site job, as in Evia. */
export function observationUnits(code) {
  const C = coursePack(code) || { units: [] }, P = PROMPTS[code] || {};
  if (code === "trowel3") return Object.entries(P).map(([name, p]) => {
    const u = C.units.find(([n]) => n.startsWith(p.unit + " "));
    return { name, sub: u ? u[0] : "", ksbs: u ? u[1] : [], capture: split(p.photos), mention: split(p.writeup) };
  });
  return C.units.map(([name, ksbs], i) => ({ no: i + 1, name, ksbs, capture: split((P[name] || {}).photos), mention: split((P[name] || {}).writeup) }));
}

/* Photos are made smaller on the phone first (long side 2000px), so they upload quickly on site. */
async function shrink(file) {
  if (!/^image\/(jpeg|png|webp|heic|heif)/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file), k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.type === "image/jpeg" && file.size < 2.5e6) return file;
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b || file), "image/jpeg", 0.85));
  } catch (_) { return file; }
}
const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const ksbText = (C, code) => ((C.ksbs || []).find((k) => k[0] === code) || [code, ""])[1];

export function openObservation({ L, me }, onSaved) {
  const code = L.row.course_code, C = coursePack(code, L.row.enrolment_id) || { units: [], ksbs: [] }, units = observationUnits(code);
  const word = code === "trowel3" ? "criteria" : "KSBs";
  const DRAFT = "milos-obs-" + L.row.enrolment_id;
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(DRAFT) || "{}") || {}; } catch (_) {}
  const S = { step: saved.unit ? "capture" : "unit", unit: units.find((u) => u.name === saved.unit) || null, text: saved.text || "", on: saved.on || today(), photos: [], ticked: null, feedback: "", evId: null, sent: {} };
  const keep = () => { try { localStorage.setItem(DRAFT, JSON.stringify({ unit: S.unit && S.unit.name, text: S.text, on: S.on })); } catch (_) {} };

  const o = document.createElement("div"); o.className = "rv obs"; o.setAttribute("role", "dialog"); o.setAttribute("aria-modal", "true"); o.setAttribute("aria-label", "New observation");
  document.body.appendChild(o); document.body.style.overflow = "hidden";
  const close = () => { S.photos.forEach((p) => URL.revokeObjectURL(p.url)); o.remove(); document.body.style.overflow = ""; };
  const leave = () => { if ((S.photos.length || S.text.trim()) && !confirm("Leave this observation? " + (S.photos.length ? "The photos haven’t been saved. " : "") + "What you’ve written is kept for next time.")) return; close(); };
  const level = () => combine(photoLevel(S.photos.length), writeLevel(S.text, S.unit ? S.unit.mention : []));

  const draw = () => {
    const first = (L.row.name || "").split(" ")[0];
    if (S.step === "unit") {
      o.innerHTML = '<div class="rv-top"><button class="btn ghost" id="obBack">‹ ' + esc(first) + '</button><b style="flex:1">New observation</b></div>' +
        '<div class="rv-body"><h2>Which unit?</h2><p class="muted small">Pick the unit you’re observing. Evia’s bars show how strong ' + esc(first) + '’s evidence is for each one already.</p>' +
        '<div class="card list obs-units">' + units.map((u, i) => '<button class="item" style="--cols:1" data-u="' + i + '"><span class="pf-no">' + (u.no || "") + '</span><span class="name-cell"><span class="name">' + esc(u.name) + '</span>' + (u.sub ? '<span class="sub">' + esc(u.sub) + '</span>' : "") + '</span>' +
          strengthBars(unitStrength(L.snapshot, u.name, L.evidence.filter((e) => (e.source_metadata || {}).unit === u.name).map((e) => ({ photos: ((e.source_metadata || {}).photoIds || []).length || (e.source_metadata || {}).photoCount || 0, text: (e.source_metadata || {}).text })))) + '<span class="chev">›</span></button>').join("") + '</div></div>';
      o.querySelector("#obBack").onclick = leave;
      o.querySelectorAll("[data-u]").forEach((b) => b.onclick = () => { S.unit = units[+b.dataset.u]; S.ticked = null; S.step = "capture"; keep(); draw(); });
      return;
    }
    const u = S.unit;
    if (S.step === "capture") {
      o.innerHTML = '<div class="rv-top"><button class="btn ghost" id="obBack">‹ Units</button><span class="obs-title"><b>' + esc(u.name) + '</b><span class="sub">Observation · ' + esc(L.row.name) + '</span></span><span id="obLevel"></span></div>' +
        '<div class="rv-body">' +
        '<label class="field obs-date">Date observed<input type="date" id="obOn" value="' + esc(S.on) + '" max="' + today() + '"></label>' +
        (u.capture.length ? '<section class="obs-prompts"><p class="label">Things to capture</p><div class="chips">' + u.capture.map((t) => '<span class="chip">' + esc(t) + '</span>').join("") + '</div></section>' : "") +
        '<section><div class="between"><p class="label" id="obPhotoLabel"></p><span class="row"><label class="btn">Take photo<input type="file" accept="image/*" capture="environment" id="obCam" hidden></label><label class="btn ghost">Add photos<input type="file" accept="image/*,video/*" multiple id="obPick" hidden></label></span></div>' +
          '<div class="obs-photos" id="obPhotos"></div><p class="small muted">Beginning, middle and end of the job, close up and further back. Ten or more makes a strong pack.</p></section>' +
        '<section><label class="field">What you observed<textarea id="obText" rows="8" placeholder="What ' + esc(first) + ' did, in order, how they did it, and what they said when you asked them why.">' + esc(S.text) + '</textarea></label>' +
          (u.mention.length ? '<p class="label">Things to mention</p><div class="chips" id="obMention"></div>' : "") + '</section>' +
        '</div><div class="rv-foot"><span class="small muted" id="obHint" style="flex:1;align-self:center"></span><button class="btn primary" id="obNext">Next: sign off</button></div>';
      const refresh = () => {
        const lv = level();
        o.querySelector("#obLevel").innerHTML = '<span class="obs-level">' + strengthBars(lv) + '<small>' + LEVEL[lv] + '</small></span>';
        o.querySelector("#obPhotoLabel").textContent = "Photos (" + S.photos.length + ")";
        const m = o.querySelector("#obMention");
        if (m) m.innerHTML = u.mention.map((t) => '<span class="chip' + (termMatched(t, S.text) ? " on" : "") + '">' + (termMatched(t, S.text) ? "✓ " : "") + esc(t) + '</span>').join("");
        o.querySelector("#obHint").textContent = !S.photos.length && !S.text.trim() ? "Add photos or write what you saw" : "";
      };
      const drawPhotos = () => {
        o.querySelector("#obPhotos").innerHTML = S.photos.map((p, i) => '<figure>' + (/^video\//.test(p.blob.type) ? '<video src="' + p.url + '" muted playsinline></video>' : '<img src="' + p.url + '" alt="Photo ' + (i + 1) + '">') +
          '<button type="button" class="obs-rm" data-rm="' + i + '" aria-label="Remove photo ' + (i + 1) + '">×</button></figure>').join("");
        o.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => { const [p] = S.photos.splice(+b.dataset.rm, 1); URL.revokeObjectURL(p.url); drawPhotos(); refresh(); });
      };
      const add = async (files) => { for (const f of files) { const blob = /^video\//.test(f.type) ? f : await shrink(f); S.photos.push({ blob, url: URL.createObjectURL(blob) }); } drawPhotos(); refresh(); };
      ["#obCam", "#obPick"].forEach((id) => { const i = o.querySelector(id); i.onchange = () => { add([...i.files]); i.value = ""; }; });
      o.querySelector("#obText").oninput = (e) => { S.text = e.target.value; keep(); refresh(); };
      o.querySelector("#obOn").onchange = (e) => { S.on = e.target.value || today(); keep(); };
      o.querySelector("#obBack").onclick = () => { S.step = "unit"; draw(); };
      o.querySelector("#obNext").onclick = () => {
        if (!S.photos.length && !S.text.trim()) { o.querySelector("#obHint").textContent = "Add photos or write what you saw first."; return; }
        S.step = "sign"; draw();
      };
      drawPhotos(); refresh();
      return;
    }
    /* Sign-off: the unit's KSBs, all ticked to start with (Evia maps a pack to its whole unit), untick any not met. */
    if (!S.ticked) S.ticked = new Set(u.ksbs);
    const rest = (C.ksbs || []).map((k) => k[0]).filter((k) => !u.ksbs.includes(k));
    const extra = [...S.ticked].filter((k) => !u.ksbs.includes(k));
    const row = (k) => '<label class="ksb-row"><input type="checkbox" value="' + esc(k) + '"' + (S.ticked.has(k) ? " checked" : "") + '><span><b>' + esc(k) + '</b> ' + esc(ksbText(C, k)) + '</span></label>';
    o.innerHTML = '<div class="rv-top"><button class="btn ghost" id="obBack">‹ Observation</button><span class="obs-title"><b>Sign off</b><span class="sub">' + esc(u.name) + ' · ' + S.photos.length + (S.photos.length === 1 ? " photo" : " photos") + '</span></span><span class="obs-level">' + strengthBars(level()) + '<small>' + LEVEL[level()] + '</small></span></div>' +
      '<div class="rv-body"><section class="card assess"><h2>Your assessment</h2>' +
      '<p class="label">' + (code === "trowel3" ? "Criteria" : "KSBs") + ' this observation meets</p><p class="small muted">All of the unit’s are ticked to start with. Untick any you didn’t see met, or add others.</p>' +
      '<div class="ksbs">' + u.ksbs.map(row).join("") + extra.map(row).join("") + '</div>' +
      (rest.length ? '<label class="field">Add another<select id="addKsb"><option value="">Choose…</option>' + rest.filter((k) => !S.ticked.has(k)).map((k) => '<option value="' + esc(k) + '">' + esc(k + " " + ksbText(C, k)).slice(0, 110) + '</option>').join("") + '</select></label>' : "") +
      '<label class="field">Feedback for the learner <small>(optional)</small><textarea id="obFb" rows="3" placeholder="What went well, and what to work on next">' + esc(S.feedback) + '</textarea></label>' +
      '<p class="err" role="alert"></p></section></div>' +
      '<div class="rv-foot"><span class="small muted" id="obProg" style="flex:1;align-self:center"></span><button class="btn primary" id="obSave">Save and sign off ' + S.ticked.size + ' ' + (S.ticked.size === 1 ? word.replace(/s$/, "").replace(/criteria$/, "criterion") : word) + '</button></div>';
    o.querySelector("#obBack").onclick = () => { S.step = "capture"; draw(); };
    o.querySelectorAll(".ksb-row input").forEach((c) => c.onchange = () => { c.checked ? S.ticked.add(c.value) : S.ticked.delete(c.value); draw(); });
    const addK = o.querySelector("#addKsb"); if (addK) addK.onchange = () => { if (addK.value) { S.ticked.add(addK.value); draw(); } };
    o.querySelector("#obFb").oninput = (e) => { S.feedback = e.target.value; };
    o.querySelector("#obSave").onclick = () => save();
  };

  /* Saved on this phone first, then sent to Nisia now if there's signal, or as soon as there is (store.js). */
  async function save() {
    const b = o.querySelector("#obSave"), err = o.querySelector(".err"), prog = o.querySelector("#obProg");
    if (!S.ticked.size) { err.textContent = "Tick at least one " + (code === "trowel3" ? "criterion" : "KSB") + " this observation meets."; return; }
    b.disabled = true; err.textContent = ""; prog.textContent = navigator.onLine ? "Saving and sending…" : "Saving on this phone…";
    const org = L.enrolment.organisation_id, u = S.unit;
    try {
      const evidence = { id: crypto.randomUUID(), organisation_id: org, enrolment_id: L.enrolment.id, course_id: L.enrolment.course_id, created_by_member_id: me.member_id,
        evidence_type: S.photos.some((p) => /^video\//.test(p.blob.type)) ? "video" : S.photos.length ? "photo" : "written", title: u.name,
        source_metadata: { collection: "observation", unit: u.name, text: S.text.trim(), ksbs: [...S.ticked], observedOn: S.on, observedBy: me.name, photoCount: S.photos.length, nvqUnit: u.sub ? u.sub.split(" ")[0] : null } };
      const assessment = { organisation_id: org, assessor_member_id: me.member_id, decision: "accepted", feedback: S.feedback.trim() || null, ksbs: [...S.ticked] };
      /* The PDF the learner gets in Evia: made here, so it works offline too. */
      let pdf = null;
      try {
        prog.textContent = "Making the PDF…";
        pdf = await evidencePdf({ L, C, e: { ...evidence, created_at: new Date(S.on + "T12:00:00").toISOString() }, item: { latest: { ...assessment, created_at: new Date().toISOString() } },
          college: L.row.org && L.row.org.organisation, claimed: [...S.ticked], asBlob: true,
          media: S.photos.filter((p) => /^image\//.test(p.blob.type)).map((p) => ({ url: p.url, mime_type: p.blob.type, storage_path: "photo" })) });
      } catch (x) { console.warn("Milos: observation PDF", x.message); }
      prog.textContent = navigator.onLine ? "Saving and sending…" : "Saving on this phone…";
      const sent = await saveObservation({ enrolmentId: L.enrolment.id, evidence, photos: S.photos.map((p) => p.blob), assessment, pdf });
      try { localStorage.removeItem(DRAFT); } catch (_) {}
      close(); onSaved(sent);
    } catch (x) { prog.textContent = ""; b.disabled = false; err.textContent = "Couldn’t save on this phone: " + (x.message || x); }
  }
  draw();
}
