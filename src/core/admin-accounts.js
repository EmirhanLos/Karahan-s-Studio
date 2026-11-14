/* ═══════════════════════════════════════════════════════════════
   core/admin-accounts.js — Yönetici hesapları.
   Site kullanıcılarından (users.json) tamamen bağımsızdır;
   yalnızca komut satırından (tools/admin.js) oluşturulur.
   Parola: scrypt, 2FA: TOTP + tek kullanımlık kurtarma kodları.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const crypto = require('node:crypto');
const store = require('../data/store');
const password = require('./password');
const totp = require('./totp');

const FILE = 'admins';
const RECOVERY_COUNT = 10;

function all() { return store.read(FILE, []); }
function saveAll(list) { return store.write(FILE, list); }
function byId(id) { return all().find(a => String(a.id) === String(id)) || null; }
function byUsername(username) {
    const key = normalizeUsername(username);
    return all().find(a => a.username === key) || null;
}
function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}
function save(admin) {
    const list = all();
    const i = list.findIndex(a => String(a.id) === String(admin.id));
    if (i === -1) list.push(admin); else list[i] = admin;
    saveAll(list);
    return admin;
}

function validateUsername(username) {
    const key = normalizeUsername(username);
    if (!/^[a-z0-9._-]{3,32}$/.test(key)) return 'Kullanıcı adı 3-32 karakter; harf, rakam, nokta, alt çizgi veya tire içerebilir.';
    return null;
}
function validatePassword(plain) {
    if (typeof plain !== 'string' || plain.length < 12) return 'Parola en az 12 karakter olmalı.';
    if (!/[a-z]/.test(plain) || !/[A-Z]/.test(plain) || !/[0-9]/.test(plain)) return 'Parola küçük harf, büyük harf ve rakam içermeli.';
    return null;
}

function create({ username, email = '', password: plain }) {
    const key = normalizeUsername(username);
    const usernameError = validateUsername(key);
    if (usernameError) throw new Error(usernameError);
    const passwordError = validatePassword(plain);
    if (passwordError) throw new Error(passwordError);
    if (byUsername(key)) throw new Error('Bu kullanıcı adı zaten kayıtlı.');
    const admin = {
        id: crypto.randomUUID(),
        username: key,
        email: String(email || '').trim().toLowerCase(),
        passwordHash: password.hash(plain),
        totp: { enabled: false, secret: null, recoveryHashes: [] },
        disabled: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: null
    };
    save(admin);
    return admin;
}

function verifyPassword(admin, plain) {
    if (!admin?.passwordHash || typeof plain !== 'string') return false;
    const ok = password.verify(plain, admin.passwordHash);
    if (ok && password.needsRehash(admin.passwordHash)) {
        admin.passwordHash = password.hash(plain);
        save(admin);
    }
    return ok;
}

function setPassword(admin, plain) {
    const err = validatePassword(plain);
    if (err) throw new Error(err);
    admin.passwordHash = password.hash(plain);
    admin.passwordChangedAt = new Date().toISOString();
    return save(admin);
}

/* ── TOTP ── */
function hashRecovery(code) {
    return crypto.createHash('sha256').update(String(code).toUpperCase().replace(/[\s-]/g, '')).digest('hex');
}
function generateRecoveryCodes() {
    const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const out = [];
    for (let i = 0; i < RECOVERY_COUNT; i++) {
        let s = '';
        for (let j = 0; j < 10; j++) s += alpha[crypto.randomInt(alpha.length)];
        out.push(s.slice(0, 5) + '-' + s.slice(5));
    }
    return out;
}
function is2faEnabled(admin) {
    return !!(admin?.totp?.enabled && admin.totp.secret);
}
function beginEnrollment(admin) {
    if (!admin.totp) admin.totp = { enabled: false, secret: null, recoveryHashes: [] };
    if (!admin.totp.pendingSecret) {
        admin.totp.pendingSecret = totp.generateSecret();
        save(admin);
    }
    return {
        secret: admin.totp.pendingSecret,
        uri: totp.otpauthUri(admin.totp.pendingSecret, admin.username + '@karahans')
    };
}
function completeEnrollment(admin, token) {
    const secret = admin.totp?.pendingSecret;
    if (!secret || !totp.verify(secret, token)) return null;
    const codes = generateRecoveryCodes();
    admin.totp = {
        enabled: true,
        secret,
        recoveryHashes: codes.map(hashRecovery),
        enabledAt: new Date().toISOString()
    };
    save(admin);
    return codes;
}
function verifyTotp(admin, token) {
    return is2faEnabled(admin) && totp.verify(admin.totp.secret, token);
}
function consumeRecoveryCode(admin, code) {
    const list = admin.totp?.recoveryHashes || [];
    const h = hashRecovery(code);
    const i = list.indexOf(h);
    if (i === -1) return false;
    list.splice(i, 1);
    save(admin);
    return true;
}
function regenerateRecoveryCodes(admin) {
    const codes = generateRecoveryCodes();
    admin.totp.recoveryHashes = codes.map(hashRecovery);
    save(admin);
    return codes;
}
function resetTotp(admin) {
    admin.totp = { enabled: false, secret: null, recoveryHashes: [] };
    return save(admin);
}

module.exports = {
    all, byId, byUsername, save, create, setPassword, verifyPassword,
    validateUsername, validatePassword,
    is2faEnabled, beginEnrollment, completeEnrollment, verifyTotp,
    consumeRecoveryCode, regenerateRecoveryCodes, resetTotp
};
