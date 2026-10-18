/* ═══════════════════════════════════════════════════════════════
   auth/totp.js — RFC 6238 TOTP doğrulayıcı + üretici.
   SHA1 / 30 sn / 6 hane — tüm yaygın kimlik doğrulama
   uygulamalarıyla uyumlu (Google Authenticator, Authy,
   1Password, Bitwarden, Microsoft Authenticator).
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const crypto = require('node:crypto');

const STEP = 30;
const DIGITS = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/* ── Base32 (RFC 4648) ── */
function base32Encode(buf) {
    let bits = 0, value = 0, out = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
    return out;
}

function base32Decode(str) {
    const clean = String(str).toUpperCase().replace(/[\s-]/g, '').replace(/[^A-Z2-7]/g, '');
    let bits = 0, value = 0;
    const out = [];
    for (const ch of clean) {
        const idx = ALPHABET.indexOf(ch);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
            value &= (1 << bits) - 1;
        }
    }
    return Buffer.from(out);
}

/* ── HOTP / TOTP ── */
function hotp(secret, counter) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const bin = ((hmac[offset] & 0x7f) << 24)
              | ((hmac[offset + 1] & 0xff) << 16)
              | ((hmac[offset + 2] & 0xff) << 8)
              |  (hmac[offset + 3] & 0xff);
    return String(bin % 10 ** DIGITS).padStart(DIGITS, '0');
}

function verify(secretB32, token, window = 1) {
    const clean = String(token || '').replace(/\D/g, '');
    if (clean.length !== DIGITS) return false;
    let secret;
    try { secret = base32Decode(secretB32); } catch { return false; }
    if (!secret.length) return false;
    const counter = Math.floor(Date.now() / 1000 / STEP);
    for (let i = -window; i <= window; i++) {
        const candidate = hotp(secret, counter + i);
        if (candidate.length === clean.length && crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) return true;
    }
    return false;
}

function generateSecret() { return base32Encode(crypto.randomBytes(20)); }
function currentCode(secretB32) { return hotp(base32Decode(secretB32), Math.floor(Date.now() / 1000 / STEP)); }
function secondsRemaining() { return STEP - Math.floor((Date.now() / 1000) % STEP); }

function otpauthUri(secretB32, account, issuer = "Karahan's Studio") {
    const label = encodeURIComponent(`${issuer}:${account}`);
    return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`;
}

module.exports = { verify, generateSecret, currentCode, secondsRemaining, otpauthUri, base32Encode, base32Decode };
