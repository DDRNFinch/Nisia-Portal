/* Web Push (services/functions/_shared/webpush.ts): what Nisia sends can be opened by the phone it's for, and the
   VAPID signature checks out. Decrypted here with Node's own crypto (RFC 8291 worked through by hand), so this
   doesn't just test the code against itself. Run: node --experimental-strip-types tests/webpush.test.mjs */
import nc from "node:crypto";
import { encrypt, vapidHeader, b64u, unb64u } from "../services/functions/_shared/webpush.ts";

const results = [];
const check = (name, ok, detail) => { results.push(!!ok); console.log((ok ? "✓ " : "✗ ") + name + (ok || !detail ? "" : " — " + detail)); };

/* The phone's side. */
const phone = nc.createECDH("prime256v1"); phone.generateKeys();
const auth = nc.randomBytes(16);
const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: b64u(phone.getPublicKey()), auth: b64u(auth) } };
function open(body) {
  const salt = body.subarray(0, 16), rs = body.readUInt32BE(16), idlen = body[20], server = body.subarray(21, 21 + idlen), sealed = body.subarray(21 + idlen);
  const shared = phone.computeSecret(server);
  const ikm = Buffer.from(nc.hkdfSync("sha256", shared, auth, Buffer.concat([Buffer.from("WebPush: info\0"), phone.getPublicKey(), server]), 32));
  const cek = Buffer.from(nc.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(nc.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));
  const d = nc.createDecipheriv("aes-128-gcm", cek, nonce); d.setAuthTag(sealed.subarray(-16));
  const plain = Buffer.concat([d.update(sealed.subarray(0, -16)), d.final()]);
  return { rs, text: plain.subarray(0, plain.lastIndexOf(2)).toString() };
}
const msg = JSON.stringify({ title: "Signed off: Mixing mortar", body: "Your assessor accepted it. Nice work.", open: "feedback" });
const got = open(Buffer.from(await encrypt(sub, msg)));
check("The phone it's for can open the message (aes128gcm, RFC 8291)", got.text === msg && got.rs === 4096, JSON.stringify(got));
const other = nc.createECDH("prime256v1"); other.generateKeys();
let leaked = false; try { const o = { ...sub, keys: { p256dh: b64u(other.getPublicKey()), auth: sub.keys.auth } }; open(Buffer.from(await encrypt(o, msg))); leaked = true; } catch (_) {}
check("A message for another phone can't be opened", !leaked);

/* The VAPID signature. */
const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const publicKey = b64u(new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey)));
const h = await vapidHeader(sub.endpoint, { publicKey, privateJwk: await crypto.subtle.exportKey("jwk", kp.privateKey), subject: "https://ddrnfinch.github.io/nisia-app/" });
const [, t, k] = /^vapid t=([^,]+), k=(.+)$/.exec(h) || [];
const [a, b, s] = (t || "").split(".");
const claims = JSON.parse(Buffer.from(b, "base64url").toString());
const verified = nc.verify("sha256", Buffer.from(a + "." + b), { key: nc.createPublicKey({ key: { kty: "EC", crv: "P-256", x: b64u(unb64u(k).slice(1, 33)), y: b64u(unb64u(k).slice(33)) }, format: "jwk" }), dsaEncoding: "ieee-p1363" }, unb64u(s));
check("The VAPID token is signed with Nisia's key, for the push service, and expires within a day", verified && claims.aud === "https://fcm.googleapis.com" && claims.exp - Date.now() / 1000 <= 86400 && k === publicKey, JSON.stringify(claims));

const failed = results.filter((x) => !x).length;
console.log(failed ? "\n" + failed + " check(s) failed." : "\nAll " + results.length + " checks passed.");
process.exit(failed ? 1 : 0);
