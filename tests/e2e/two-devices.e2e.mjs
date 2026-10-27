/* A connected learner on two devices (a phone and a computer) sees the same work on both: what one saves comes down
   to the other by itself (on opening, coming back, and every 30 seconds), merged so nothing from either is lost, and
   is shown where the learner is, without Evia ever reloading. Evia Portal's evia_records is stood in for here (the test server has no
   tables), shared by both devices.   Run: node tests/e2e/two-devices.e2e.mjs */
import { check, site, LEE, errors, app, finish, session } from "./harness.mjs";
const ENR = "0e2e0000-0000-0000-0000-0000000000e1";
const rows = new Map(); let tick = 0;
const store = async (route) => {
  const r = route.request(), u = new URL(r.url()), h = { "access-control-allow-origin": "*", "content-type": "application/json" };
  if (r.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { ...h, "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (r.method() === "GET") {
    const p = u.searchParams, eq = (k) => (p.get(k) || "").replace(/^eq\./, ""), gt = (p.get("updated_at") || "").replace(/^gt\./, "");
    const out = [...rows.values()].filter((x) => (!p.get("enrolment_id") || x.enrolment_id === eq("enrolment_id")) && (!p.get("collection") || x.collection === eq("collection")) &&
      (!gt || x.updated_at > gt) && (p.get("deleted_at") !== "is.null" || !x.deleted_at)).sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    return route.fulfill({ status: 200, headers: h, body: JSON.stringify(out) });
  }
  const body = JSON.parse(r.postData() || "[]");
  for (const x of [].concat(body)) rows.set([x.enrolment_id, x.collection, x.record_id].join("|"), { ...x, updated_at: new Date(Date.UTC(2026, 9, 26, 12, 0, 0) + ++tick * 1000).toISOString() });
  return route.fulfill({ status: 201, headers: h, body: "" });
};
const device = async (name, evidence) => {
  const d = await app({ width: name === "laptop" ? 1440 : 412, height: 900 });
  await d.page.route(/rest\/v1\/evia_records/, store);
  await d.page.goto(site + "/evia/manifest.json");
  await d.page.evaluate(([ev, auth]) => { localStorage.clear(); sessionStorage.setItem("evia7-install-later", "1");
    ["evia7-theme-picked", "evia7-shape-picked"].forEach((x) => localStorage.setItem(x, "1"));
    localStorage.setItem("evia7-onboarding", '{"stage":"done"}'); localStorage.setItem("evia7-tips-seen", '["*"]');
    localStorage.setItem("evia7-profile", JSON.stringify({ name: "Lee Erna", start: "2026-01-05", end: "2027-12-01" }));
    localStorage.setItem("evia7-enrolment", JSON.stringify({ course: "bricklayer", live: true, college: "E2E College", learnerId: "0e2e0000-0000-0000-0000-0000000000c1", organisationId: "0e2e0000-0000-0000-0000-000000000001",
      enrolmentId: "0e2e0000-0000-0000-0000-0000000000e1", courseId: "0e2e0000-0000-0000-0000-0000000000d1", memberId: "0e2e0000-0000-0000-0000-0000000000b2", name: "Lee Erna", start: "2026-01-05", end: "2027-12-01", joinedAt: "2026-01-05T09:00:00Z" }));
    localStorage.setItem("evia7-nisia-auth", JSON.stringify(auth));
    localStorage.setItem("evia7-evidence", JSON.stringify(ev)); }, [evidence, session(LEE, "aal1", "lee@e2e.test")]);
  await d.page.goto(site + "/evia/"); await d.page.waitForTimeout(2500);
  await d.page.evaluate(() => { const w = document.getElementById("welcome-screen"); if (w) w.remove(); document.getElementById("app").classList.remove("welcome-app-hidden"); });
  return d.page;
};
const pack = (id, unit) => ({ id, c: "bricklayer", u: unit, w: "Did the job", k: [], p: [], savedAt: "2026-10-2" + id.length + "T10:00:00Z" });
const count = (pg) => pg.evaluate(() => evidence.filter((e) => e.c === "bricklayer").length);
const ids = (pg) => pg.evaluate(() => evidence.map((e) => e.id).sort().join());
const stored = () => { const r = rows.get(ENR + "|store|evia7-evidence"); return r ? JSON.parse(r.data.raw).map((e) => e.id).sort().join() : ""; };
const until = async (fn, ms = 20000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await Promise.resolve().then(fn).catch(() => false)) return true; await new Promise((r) => setTimeout(r, 400)); } return false; };
try {
  /* The computer was connected earlier, with one piece of evidence. */
  const laptop = await device("laptop", [pack("A", "Mixing mortar")]);
  const up1 = await until(() => stored() === "A");
  check("The computer's work goes up to Evia Portal", up1, stored());
  /* The phone has done more since (two pieces). */
  const phone = await device("phone", [pack("A", "Mixing mortar"), pack("BB", "Jointing Styles")]);
  const up2 = await until(() => stored() === "A,BB");
  check("The phone's newer work goes up, merged with what's there (nothing lost)", up2, stored());
  /* Neither device ever reloads: a mark left on each page must still be there at the end. */
  await laptop.evaluate(() => { window.__still = 1; }); await phone.evaluate(() => { window.__still = 1; });
  const nav = (pg) => pg.evaluate(() => { dispatchEvent(new Event("focus")); });
  /* The computer, on Review: the phone's work arrives and Review shows it, without a reload. */
  await laptop.evaluate(() => nav("learning")); await laptop.waitForTimeout(400);
  await nav(laptop);
  const got = await until(async () => (await count(laptop)) === 2);
  const where = await laptop.evaluate(() => screen);
  check("The phone's work shows on the computer by itself, without reloading, on the same page", got && (await ids(laptop)) === "A,BB" && where === "learning" && await laptop.evaluate(() => window.__still === 1), JSON.stringify({ ids: await ids(laptop), where }));
  /* The other way, on the 30-second check while the phone is just being looked at. */
  await laptop.evaluate(() => { window.eviaData.put("evidence", { id: "CCC", course: "bricklayer", unit: "Repair brick walling", text: "Replaced a brick" }); });
  const up3 = await until(() => stored() === "A,BB,CCC");
  const got2 = await until(async () => (await count(phone)) === 3, 40000);
  check("…and the computer's work shows on the phone by itself (the 30-second check), without reloading", up3 && got2 && await phone.evaluate(() => window.__still === 1), JSON.stringify({ up3, got2, phone: await ids(phone) }));
  /* With a sheet open: the work is kept, and the screen is redrawn once it's closed, never under the learner's fingers. */
  await phone.evaluate(() => { nav("learning"); const o = document.createElement("div"); o.className = "th-sheet-wrap"; o.id = "busy"; document.body.appendChild(o); window.__drawn = 0; const r = render; window.render = render = function () { window.__drawn++; window.__why = (window.__why || "") + " || " + new Error().stack.split("\n").slice(2, 5).join(" < "); return r.apply(this, arguments); }; });
  await phone.waitForTimeout(1200); await phone.evaluate(() => { window.__drawn = 0; window.__why = ""; });
  await laptop.evaluate(() => { window.eviaData.put("evidence", { id: "DDDD", course: "bricklayer", unit: "Basic Brick wall", text: "A wall" }); });
  await until(() => stored().includes("DDDD"));
  await nav(phone); await until(async () => (await count(phone)) === 4); await phone.waitForTimeout(2000);
  const held = await phone.evaluate(() => ({ kept: evidence.length === 4, drawn: window.__drawn, sheet: !!document.getElementById("busy"), why: window.__why }));
  await phone.evaluate(() => document.getElementById("busy").remove()); await phone.waitForTimeout(2500);
  const drawnAfter = await phone.evaluate(() => window.__drawn);
  check("With something open, the work is kept straight away but the screen waits, and is redrawn once it's closed", held.kept && held.drawn === 0 && held.sheet && drawnAfter >= 1, JSON.stringify({ held, drawnAfter }));
  /* The other device's counters and the college's data it fetched never come down. */
  await laptop.evaluate(() => { localStorage.setItem("evia7-usage", JSON.stringify({ n: Date.now() })); localStorage.setItem("evia7-nisia-attendance", JSON.stringify([{ id: "x", at: Date.now() }])); return window.eviaNisia.sync(); });
  await laptop.waitForTimeout(1500); await nav(phone); await phone.waitForTimeout(3000);
  const noise = await phone.evaluate(() => !/"n"/.test(localStorage.getItem("evia7-usage") || "") && !/"x"/.test(localStorage.getItem("evia7-nisia-attendance") || ""));
  check("The other device's counters and college data never come down", noise, String(noise));
  /* Deleted on one device: it goes from the other too, and doesn't come back. */
  await phone.evaluate(() => { window.eviaData.remove ? window.eviaData.remove("evidence", "BB") : (evidence.splice(evidence.findIndex((e) => e.id === "BB"), 1), persist()); });
  await until(() => !stored().includes("BB"));
  await nav(laptop);
  const gone = await until(async () => (await ids(laptop)) === "A,CCC,DDDD");
  await laptop.waitForTimeout(1500); await nav(phone); await phone.waitForTimeout(2500);
  check("Deleting a piece on one device removes it from the other, and it stays deleted", gone && stored() === "A,CCC,DDDD" && (await ids(phone)) === "A,CCC,DDDD", JSON.stringify({ stored: stored(), laptop: await ids(laptop), phone: await ids(phone) }));
  /* A save on the computer after the phone's work arrived keeps it (Evia's memory was brought up to date too). */
  await laptop.evaluate(() => { window.eviaData.put("hours", { minutes: 30, description: "Reading" }); });
  await laptop.waitForTimeout(2500);
  check("Saving on a device after the other's work arrived keeps that work (nothing is overwritten)", stored() === "A,CCC,DDDD" && (await ids(laptop)) === "A,CCC,DDDD", stored());
  check("Neither device ever reloaded", await laptop.evaluate(() => window.__still === 1) && await phone.evaluate(() => window.__still === 1));
  check("No script errors", !errors.length, errors.join(" | "));
} catch (e) { check("The test ran to the end", false, e.stack + "\nERRORS: " + errors.join(" | ")); }
await finish();
