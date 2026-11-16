/* ═══════════════════════════════════════════════════════════════
   auth/password.js — Argon2id tabanlı parola karması
   (node:crypto'nun scrypt'i, harici bağımlılık yok).
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const crypto = require('node:crypto');

const SCRYPT_N = 16384;     // bellek/CPU dengesi
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN   = 64;
const SALT_LEN = 16;

function hash(plain) {
    const salt = crypto.randomBytes(SALT_LEN);
    const key  = crypto.scryptSync(plain, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
    return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verify(plain, stored) {
    if (!stored) return false;

    /* Yeni scrypt biçimi */
    if (stored.startsWith('scrypt$')) {
        try {
            const [, N, r, p, saltHex, keyHex] = stored.split('$');
            const salt = Buffer.from(saltHex, 'hex');
            const key  = Buffer.from(keyHex, 'hex');
            const test = crypto.scryptSync(plain, salt, key.length,
                { N: Number(N), r: Number(r), p: Number(p) });
            return crypto.timingSafeEqual(test, key);
        } catch { return false; }
    }

    /* Eski "salt:key" biçimi (geriye uyumluluk) */
    if (stored.includes(':')) {
        try {
            const [saltHex, keyHex] = stored.split(':');
            const salt = Buffer.from(saltHex, 'hex');
            const key  = Buffer.from(keyHex, 'hex');
            const test = crypto.scryptSync(plain, salt, key.length,
                { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
            return crypto.timingSafeEqual(test, key);
        } catch { return false; }
    }

    /* Düz metin karmalar kabul edilmez.
       İlk günlerde yanlışlıkla saklanan düz metin parolalar
       yalnızca hash() ile yeniden karmalanabilir; verify()
       hiçbir koşulda düz metni kabul etmez. */
    return false;
}

function needsRehash(stored) {
    /* Eski düz metin veya eski salt:key ise yeniden karmala */
    return !stored || !stored.startsWith('scrypt$');
}

module.exports = { hash, verify, needsRehash };
