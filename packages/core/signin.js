/* Signing in, shared by the portal and Milos:
   an invite link (#invite=CODE) → name and password → sign in → add Nisia to an authenticator app (first time)
   or type its 6-digit code (every other time) → onReady(). */
import { db, call, state, signIn, startAuthenticator, verifyCode, esc } from "./nisia.js";

const PW_RULE = "At least 10 characters, with upper and lower case letters, a number and a symbol.";

export function inviteCode() {
  const m = /[#&]invite=([A-Za-z0-9-]+)/.exec(location.hash);
  return m ? m[1] : "";
}

export async function auth(root, o) {
  const code = inviteCode();
  if (code) return acceptInvite(root, o, code);
  const s = await state();
  if (s.step === "ready") return o.onReady();
  if (s.step === "needs-setup") return setupAuthenticator(root, o);
  if (s.step === "needs-code") return askCode(root, o, s.factorId);
  return signInForm(root, o);
}

const frame = (o, body, say) =>
  '<div class="auth"><div class="box"><div class="hello"><span class="av lg" aria-hidden="true"><i></i><i></i></span>' +
  '<div><h1>' + esc(o.title) + '</h1><p class="muted">' + esc(o.subtitle || "") + '</p></div>' + (say ? '<p class="say">' + say + '</p>' : "") + '</div>' + body + '</div></div>';

function signInForm(root, o, email, err) {
  root.innerHTML = frame(o,
    '<form class="box" id="f" novalidate>' +
    '<label class="field">Email<input id="email" type="email" autocomplete="username" value="' + esc(email || "") + '" required></label>' +
    '<label class="field">Password<input id="pw" type="password" autocomplete="current-password" required></label>' +
    '<p class="err" id="err" role="alert">' + esc(err || "") + '</p>' +
    '<button class="btn primary wide" type="submit">Sign in</button>' +
    '<button class="btn ghost" type="button" id="haveInvite">New here? I have an invite</button></form>');
  const f = root.querySelector("#f");
  f.onsubmit = async (e) => {
    e.preventDefault();
    const b = f.querySelector("button"); b.disabled = true; b.textContent = "Signing in…";
    try { await signIn(f.email.value, f.pw.value); await auth(root, o); }
    catch (x) { signInForm(root, o, f.email.value, x.message); }
  };
  root.querySelector("#haveInvite").onclick = () => pasteInvite(root, o);
  (email ? f.pw : f.email).focus();
}

/* For when the invite link opens without its code (some apps' browsers drop the part after #): paste it instead. */
function pasteInvite(root, o, err) {
  root.innerHTML = frame(o,
    '<form class="box" id="f" novalidate>' +
    '<label class="field">Your invite link or code<input id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Paste the link, or type the code"></label>' +
    '<p class="err" role="alert">' + esc(err || "") + '</p>' +
    '<button class="btn primary wide" type="submit">Continue</button>' +
    '<button class="btn ghost" type="button" id="back">Back to sign in</button></form>', "Paste the invite link you were sent, or just the code at the end of it.");
  const f = root.querySelector("#f");
  f.onsubmit = (e) => {
    e.preventDefault();
    const v = f.code.value.trim(), m = /invite=([A-Za-z0-9-]+)/.exec(v), code = (m ? m[1] : v).toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length < 12) return pasteInvite(root, o, "That doesn’t look like a whole invite code. It’s 16 letters and numbers.");
    acceptInvite(root, o, code);
  };
  root.querySelector("#back").onclick = () => signInForm(root, o);
  f.code.focus();
}

function acceptInvite(root, o, code, err) {
  root.innerHTML = frame(o,
    '<form class="box" id="f" novalidate>' +
    '<label class="field">Your name<input id="name" autocomplete="name" required></label>' +
    '<label class="field">Choose a password<input id="pw" type="password" autocomplete="new-password"><small>' + PW_RULE + ' If you already use Nisia, leave this empty and sign in as usual afterwards.</small></label>' +
    '<p class="err" id="err" role="alert">' + esc(err || "") + '</p>' +
    '<button class="btn primary wide" type="submit">Accept invite</button></form>', "You’ve been invited to " + esc(o.title) + ". Set up your sign-in.");
  const f = root.querySelector("#f");
  f.onsubmit = async (e) => {
    e.preventDefault();
    const b = f.querySelector("button"); b.disabled = true; b.textContent = "Setting up…";
    try {
      const r = await call("nisia-setup", { action: "accept", code, name: f.name.value, password: f.pw.value });
      history.replaceState(null, "", location.pathname + location.search);
      if (f.pw.value) { await signIn(r.email, f.pw.value); return auth(root, o); }
      signInForm(root, o, r.email);
    } catch (x) { acceptInvite(root, o, code, x.message); }
  };
  f.name.focus();
}

async function setupAuthenticator(root, o, err) {
  let a;
  try { a = await startAuthenticator(); } catch (x) { root.innerHTML = frame(o, '<p class="err">' + esc(x.message) + '</p>'); return; }
  root.innerHTML = frame(o,
    '<div class="qr">' + (a.qr.startsWith("data:") ? '<img alt="QR code for your authenticator app" src="' + a.qr + '">' : a.qr) + '</div>' +
    '<p class="secret">Can’t scan it? Type this key instead:<br>' + esc(a.secret) + '</p>' +
    '<form class="box" id="f"><label class="field">The 6-digit code it shows<input id="c" inputmode="numeric" autocomplete="one-time-code" maxlength="7"></label>' +
    '<p class="err" role="alert">' + esc(err || "") + '</p><button class="btn primary wide" type="submit">Turn on</button>' +
    '<button class="btn ghost" type="button" id="out">Use a different account</button></form>',
    "One more step, to keep learners’ records safe. Scan this with an authenticator app (Google Authenticator, Microsoft Authenticator or your phone’s passwords app).");
  const f = root.querySelector("#f");
  f.onsubmit = async (e) => {
    e.preventDefault();
    try { await verifyCode(a.factorId, f.c.value); o.onReady(); }
    catch (x) { f.querySelector(".err").textContent = x.message; f.c.value = ""; f.c.focus(); }
  };
  root.querySelector("#out").onclick = async () => { await db.auth.signOut(); auth(root, o); };
  f.c.focus();
}

function askCode(root, o, factorId) {
  root.innerHTML = frame(o,
    '<form class="box" id="f"><label class="field">Code from your authenticator app<input id="c" inputmode="numeric" autocomplete="one-time-code" maxlength="7"></label>' +
    '<p class="err" role="alert"></p><button class="btn primary wide" type="submit">Continue</button>' +
    '<button class="btn ghost" type="button" id="out">Use a different account</button></form>');
  const f = root.querySelector("#f");
  f.onsubmit = async (e) => {
    e.preventDefault();
    try { await verifyCode(factorId, f.c.value); o.onReady(); }
    catch (x) { f.querySelector(".err").textContent = x.message; f.c.value = ""; f.c.focus(); }
  };
  root.querySelector("#out").onclick = async () => { await db.auth.signOut(); auth(root, o); };
  f.c.focus();
}
