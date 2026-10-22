/* The test Evia Portal shared by the end-to-end tests: a real Postgres with Evia Portal's own tables, rules and functions (in the
   order they went live), the apps served as they're published, and a pretend sign-in (any password; the code 123456
   is the authenticator app). Each test file gets its own fresh database. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
const globalRoot = execSync("npm root -g").toString().trim();
const need = (m) => { try { return require(m); } catch { return require(globalRoot + "/" + m); } };
const pw = need("playwright"), { Pool } = need("pg");

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../.."), evia = path.resolve(root, "apps/evia");
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + String(detail).slice(0, 600))); };

/* ---------- A fresh Evia Portal ---------- */
/* One database per test file (registers.e2e.mjs → nisia_registers), so the tests can run side by side. */
const DB = "nisia_" + path.basename(process.argv[1] || "e2e").split(".")[0].replace(/[^a-z0-9]+/gi, "_").toLowerCase();
const sh = (cmd) => execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString();
try { sh("pg_ctlcluster 16 main start"); } catch (_) { /* already running */ }
sh(`su postgres -c "psql -X -q -c \\"alter user postgres password 'e2e'\\""`);
sh(`su postgres -c "dropdb --if-exists ${DB} && createdb ${DB}"`);
for (const f of ["tests/e2e/schema.sql", "tests/sql/live-helpers.sql", "tests/e2e/live-functions.sql", "services/supabase/symi-paros.sql", "services/supabase/registers.sql",
  "services/supabase/classes-rls-fix.sql", "services/supabase/actions-registers.sql", "services/supabase/classes-lock.sql", "services/supabase/actions-feedback.sql",
  /* Everything since, in the order it went live, so the test runs the same functions as the real Evia Portal. */
  "services/supabase/visits.sql", "services/supabase/timetable.sql", "services/supabase/classes-nisia.sql", "services/supabase/today.sql", "services/supabase/college-taught.sql",
  "services/supabase/class-quiz.sql", "services/supabase/college-resources.sql", "services/supabase/password-reset.sql", "services/supabase/battles.sql", "services/supabase/coin-grants.sql", "services/supabase/run-2026-10-13-live-registers.sql", "services/supabase/run-2026-10-13-paros-week.sql", "services/supabase/run-2026-10-13-meeting-guests.sql", "services/supabase/messages.sql", "services/supabase/leavers.sql", "services/supabase/messages-group.sql", "services/supabase/careers.sql",
  "tests/e2e/seed.sql"])
  { const out = sh(`su postgres -c "psql -X -q -v ON_ERROR_STOP=1 -d ${DB} -f ${path.join(root, f)}" 2>&1 | grep -v skipping || true`).trim(); if (/ERROR/.test(out)) throw new Error(f + ": " + out); }
const pool = new Pool({ host: "127.0.0.1", user: "postgres", password: "e2e", database: DB, max: 4 });
const q = async (sql, args) => (await pool.query(sql, args)).rows;

/* ---------- Pretend sign-in: a token that says who you are and whether you used the authenticator app ---------- */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (sub, aal) => b64({ alg: "HS256" }) + "." + b64({ sub, aal, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, session_id: "s-" + sub }) + ".sig";
const whoIs = (h) => { try { const p = JSON.parse(Buffer.from(String(h || "").replace(/^Bearer /, "").split(".")[1], "base64url").toString()); return p.sub ? p : null; } catch { return null; } };
const session = (sub, aal, email) => ({ access_token: token(sub, aal), token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: b64({ sub, aal, email }), user: { id: sub, aud: "authenticated", role: "authenticated", email, factors: [{ id: "f1", factor_type: "totp", status: "verified" }] } });

/* ---------- Evia Portal's functions, called as the signed-in person ---------- */
const procs = new Map();
async function proc(name) {
  if (procs.has(name)) return procs.get(name);
  const [p] = await q(`select p.proretset retset, format_type(p.prorettype, null) rettype, coalesce(p.proargnames, '{}') names, coalesce(p.proargmodes::text[], '{}') modes,
      array(select format_type(t, null) from unnest(p.proargtypes) t) intypes
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`, [name]);
  if (!p) { procs.set(name, null); return null; }
  const inNames = p.names.filter((_, i) => !p.modes.length || ["i", "b"].includes(p.modes[i])), types = {};
  inNames.forEach((n, i) => { types[n] = p.intypes[i]; });
  const v = { retset: p.retset, rettype: p.rettype, types }; procs.set(name, v); return v;
}
const tableTouches = [];
async function rpc(name, args, who) {
  const p = await proc(name);
  if (!p) return { status: 404, body: { message: "Could not find the function public." + name } };
  const vals = [], parts = [];
  for (const [k, v] of Object.entries(args || {})) {
    const t = p.types[k]; if (!t) return { status: 400, body: { message: "Unknown argument " + k + " for " + name } };
    vals.push(t === "jsonb" || t === "json" ? JSON.stringify(v) : v); parts.push(k + " => $" + vals.length + "::" + t);
  }
  const call = "public." + name + "(" + parts.join(", ") + ")";
  const sql = p.retset ? `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) r from ${call} t` : p.rettype === "void" ? `select null::jsonb r from (select ${call}) x` : `select to_jsonb(${call}) r`;
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query("select set_config('test.uid', $1, true), set_config('test.aal', $2, true)", [who ? who.sub : "", who ? who.aal : "aal1"]);
    await c.query("set local role " + (who ? "authenticated" : "anon"));
    const r = await c.query(sql, vals);
    await c.query("commit");
    return { status: 200, body: r.rows[0] ? r.rows[0].r : null };
  } catch (e) { await c.query("rollback").catch(() => {}); return { status: 400, body: { message: e.message, code: e.code } }; }
  finally { c.release(); }
}

async function nisia(route) {
  const r = route.request(), u = new URL(r.url()), p = u.pathname; let body = {}; try { body = r.postData() ? JSON.parse(r.postData()) : {}; } catch (_) {}
  const json = (d, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(d) });
  if (r.method() === "OPTIONS") return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  const who = whoIs(r.headers()["authorization"]);
  if (p === "/auth/v1/token") {
    if (u.searchParams.get("grant_type") === "refresh_token") { const t = JSON.parse(Buffer.from(body.refresh_token, "base64url").toString()); return json(session(t.sub, t.aal, t.email)); }
    const [user] = await q("select id from auth.users where email = $1", [String(body.email || "").toLowerCase()]);
    return user ? json(session(user.id, "aal1", body.email)) : json({ error: "invalid_grant", error_description: "Invalid login credentials" }, 400);
  }
  if (p === "/auth/v1/user") return who ? json({ id: who.sub, aud: "authenticated", role: "authenticated", factors: [{ id: "f1", factor_type: "totp", status: "verified" }] }) : json({ message: "no user" }, 401);
  if (/\/challenge$/.test(p)) return json({ id: "c1", expires_at: Math.floor(Date.now() / 1000) + 300 });
  if (/\/verify$/.test(p)) return body.code === "123456" && who ? json(session(who.sub, "aal2")) : json({ message: "Invalid TOTP code" }, 400);
  if (p === "/auth/v1/logout") return route.fulfill({ status: 204 });
  if (p.startsWith("/rest/v1/rpc/")) { const out = await rpc(p.slice(13), body, who); return json(out.body, out.status); }
  if (p.startsWith("/rest/v1/")) {
    /* The apps' other syncing (Evia's records, targets…) isn't part of registers: accepted and ignored here. */
    if (/^\/rest\/v1\/class/.test(p)) tableTouches.push(r.method() + " " + p);
    return r.method() === "GET" ? json([]) : route.fulfill({ status: 201, headers: { "access-control-allow-origin": "*" }, body: "" });
  }
  if (p.startsWith("/storage/") || p.startsWith("/functions/")) return json({});
  return json({ message: "not in the test Evia Portal: " + p }, 404);
}

/* ---------- The apps, served as they are published (Evia beside the others) ---------- */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); const base = p.startsWith("/evia/") ? evia : root; if (base === evia) p = p.slice(5);
  const f = path.join(base, p.endsWith("/") ? p + "index.html" : p);
  if (!f.startsWith(base) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
}).listen(0);
const site = "http://localhost:" + server.address().port;
const TEE = "0e2e0000-0000-0000-0000-0000000000a1", LEE = "0e2e0000-0000-0000-0000-0000000000a2", EM = "0e2e0000-0000-0000-0000-0000000000a3", ENROL = "0e2e0000-0000-0000-0000-0000000000e1";

const browser = await pw.chromium.launch();
const errors = [], warnings = [];
async function app(device) {
  const ctx = await browser.newContext({ viewport: device || { width: 1280, height: 860 }, locale: "en-GB", serviceWorkers: "block" }), page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message + " @ " + String(e.stack).split("\n").slice(1,4).join(" < "))); page.on("dialog", (d) => d.accept());
  page.on("console", (m) => { if (m.type() === "warning" && /Evia Portal/.test(m.text())) warnings.push(m.text()); });
  await page.route(/supabase\.co/, nisia);
  return { ctx, page };
}
async function signIn(page, email, scope = "") {
  await page.fill(scope + "#email", email); await page.fill(scope + "#pw", "Str0ng-pass!"); await page.click(scope + "button[type=submit]");
  await page.waitForSelector(scope + "#c"); await page.fill(scope + "#c", "123456");
}
async function finish() {
  await browser.close(); server.close(); await pool.end();
  const failed = results.filter((x) => !x).length;
  console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
  process.exit(failed ? 1 : 0);
}
export { pw, root, check, results, q, session, rpc, tableTouches, site, TEE, LEE, EM, ENROL, browser, errors, warnings, app, signIn, finish };
