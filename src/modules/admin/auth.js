/* ═══════════════════════════════════════════════════════════════
   modules/admin/auth.js — Yönetici kimlik doğrulama sistemi.

   · Yönetici hesapları site kullanıcılarından bağımsızdır
     (data/admins.json, yalnızca tools/admin.js ile oluşturulur).
   · Giriş adresi gizlidir (ADMIN_LOGIN_PATH, varsayılan
     /panel-giris). /admin altındaki her şey, doğrulanmış bir
     yönetici oturumu yoksa sıradan bir 404 döner.
   · Akış: parola → TOTP (ilk girişte zorunlu kurulum) → panel.
   · Oturum: parola sonrası session yenilenir, 2FA sonrası tekrar
     yenilenir; 2 saat hareketsizlik / 12 saat mutlak süre.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const crypto = require('node:crypto');
const config = require('../../config');
const audit = require('../../core/audit');
const admins = require('../../core/admin-accounts');
const totp = require('../../core/totp');
const { createLockout } = require('../../core/login-lockout');
const views = require('./views');

const LOGIN = config.admin.loginPath;
const STEP = {
    login:    LOGIN,
    verify:   LOGIN + '/dogrula',
    enroll:   LOGIN + '/kurulum',
    recovery: LOGIN + '/kurtarma',
    logout:   LOGIN + '/cikis'
};

/* ── Brute-force (SQLite, IP + kullanıcı adı) ──
   Sayaç bellekte tutulursa süreç yeniden başladığında sıfırlanır
   ve çoklu instance'lar arasında paylaşılmaz. Bu yüzden sayılar
   data/store.js üzerinden SQLite'ta saklanır. */
const LOCK_AFTER = 8;
const LOCK_MS = 15 * 60 * 1000;
const lockout = createLockout({
    storeKey: 'admin-login-fails',
    maxFails: LOCK_AFTER,
    windowMs: LOCK_MS
});

function failKey(req, username) { return `${req.ip}|${username}`; }
function noteFail(key) { return lockout.noteFail(key); }
function isLocked(key) { return lockout.isLocked(key); }
function clearFail(key) { return lockout.clear(key); }

/* ── Oturum yardımcıları ── */
function fingerprint(req) {
    return crypto.createHash('sha256').update(String(req.headers['user-agent'] || '')).digest('hex').slice(0, 16);
}
function ipAllowed(req) {
    const list = config.admin.ipAllowlist;
    return list.length === 0 || list.includes(req.ip);
}
function currentAdmin(req) {
    const s = req.session?.admin;
    if (!s || !s.id || s.verified !== true) return null;
    const now = Date.now();
    if (now - s.lastSeenAt > config.admin.idleMs || now - s.loginAt > config.admin.absoluteMs) return null;
    if (s.fp !== fingerprint(req)) return null;
    const admin = admins.byId(s.id);
    if (!admin || admin.disabled || !admins.is2faEnabled(admin)) return null;
    if (admin.passwordChangedAt && new Date(admin.passwordChangedAt).getTime() > s.loginAt) return null;
    s.lastSeenAt = now;
    return admin;
}
function pendingAdmin(req) {
    const p = req.session?.adminPending;
    if (!p || Date.now() > p.expiresAt || p.fp !== fingerprint(req)) return null;
    const admin = admins.byId(p.id);
    if (!admin || admin.disabled) return null;
    return admin;
}
/* Oturumu döndürürken site kullanıcısının oturumunu korur:
   panel girişi site oturumunu sonlandırmamalı. */
function regenerate(req) {
    const keep = {
        userId: req.session.userId,
        authenticatedBy: req.session.authenticatedBy,
        email: req.session.email,
        csrf: req.session.csrf
    };
    return new Promise((resolve, reject) => req.session.regenerate(e => {
        if (e) return reject(e);
        Object.assign(req.session, keep);
        resolve();
    }));
}
function clearPending(req) { delete req.session.adminPending; }

/* ── Dışarıya sıradan 404 görünür ── */
function notFound(req, res) {
    const { renderNotFound } = require('../public/misc');
    const { renderPage } = require('../public/layout');
    res.status(404).send(renderPage({ title: 'Sayfa bulunamadı', body: renderNotFound(), current: '' }));
}

/* ── Koruyucular ── */
function requireAdminPage(req, res, next) {
    const admin = ipAllowed(req) ? currentAdmin(req) : null;
    if (!admin) {
        if (req.session?.admin) delete req.session.admin;
        return notFound(req, res);
    }
    req.admin = admin;
    res.set('Cache-Control', 'no-store');
    next();
}
function requireAdminApi(req, res, next) {
    const admin = ipAllowed(req) ? currentAdmin(req) : null;
    if (!admin) {
        if (req.session?.admin) delete req.session.admin;
        return res.status(404).json({ error: 'Bulunamadı' });
    }
    req.admin = admin;
    res.set('Cache-Control', 'no-store');
    next();
}

/* ── Giriş sayfaları ── */
function page(res, title, body, status = 200) {
    res.status(status).set('Cache-Control', 'no-store').type('html').send(views.renderAdminAuth({ title, body }));
}
function takeFlash(req) {
    const f = req.session?.adminFlash || null;
    if (req.session) delete req.session.adminFlash;
    return f;
}

module.exports = function registerAdminAuth(app, { generateCsrf, requireCsrf }) {
    const csrf = (req) => generateCsrf(req);

    app.use(LOGIN, (req, res, next) => {
        if (!ipAllowed(req)) return notFound(req, res);
        res.set('Cache-Control', 'no-store');
        res.set('X-Robots-Tag', 'noindex, nofollow');
        next();
    });

    /* 1) Parola */
    app.get(STEP.login, (req, res) => {
        if (currentAdmin(req)) return res.redirect('/admin');
        page(res, 'Yönetici Girişi', views.renderAdminGate({ csrf: csrf(req), error: takeFlash(req), paths: STEP }));
    });

    app.post(STEP.login, requireCsrf, async (req, res) => {
        const username = String(req.body?.username || '').trim().toLowerCase();
        const pwd = req.body?.password;
        const key = failKey(req, username);
        const fail = (msg) => { req.session.adminFlash = msg; res.redirect(STEP.login); };

        if (!username || typeof pwd !== 'string' || !pwd) return fail('Kullanıcı adı ve parola gerekli.');
        if (isLocked(key)) {
            audit.log({ type: 'admin-login-locked', req, severity: 'warn', detail: username });
            return fail('Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin.');
        }
        const admin = admins.byUsername(username);
        const ok = admin && !admin.disabled && admins.verifyPassword(admin, pwd);
        if (!ok) {
            noteFail(key);
            audit.log({ type: 'admin-login-bad', req, severity: 'warn', detail: username });
            return fail('Kullanıcı adı veya parola hatalı.');
        }

        try { await regenerate(req); } catch (e) {
            console.error('Admin oturumu yenilenemedi:', e);
            return res.status(500).send('Güvenli oturum başlatılamadı.');
        }
        req.session.adminPending = {
            id: admin.id, fp: fingerprint(req), failKey: key,
            expiresAt: Date.now() + config.admin.pendingMs
        };
        audit.log({ type: 'admin-login-password-ok', req, actorId: 'admin:' + admin.id });
        res.redirect(admins.is2faEnabled(admin) ? STEP.verify : STEP.enroll);
    });

    /* 2a) İlk girişte zorunlu TOTP kurulumu */
    app.get(STEP.enroll, (req, res) => {
        const admin = pendingAdmin(req);
        if (!admin) return res.redirect(STEP.login);
        if (admins.is2faEnabled(admin)) return res.redirect(STEP.verify);
        const { secret, uri } = admins.beginEnrollment(admin);
        page(res, 'Authenticator kurulumu', views.renderAdminSetupGate({
            username: admin.username, secret, uri, csrf: csrf(req), paths: STEP, error: req.query.error || null
        }));
    });

    app.post(STEP.enroll, requireCsrf, async (req, res) => {
        const admin = pendingAdmin(req);
        if (!admin) return res.redirect(STEP.login);
        if (admins.is2faEnabled(admin)) return res.redirect(STEP.verify);
        const codes = admins.completeEnrollment(admin, String(req.body?.token || ''));
        if (!codes) {
            audit.log({ type: 'admin-2fa-setup-failed', req, severity: 'warn', actorId: 'admin:' + admin.id });
            return res.redirect(STEP.enroll + '?error=' + encodeURIComponent('Kod hatalı veya süresi dolmuş.'));
        }
        audit.log({ type: 'admin-2fa-enabled', req, actorId: 'admin:' + admin.id });
        await finishLogin(req, res, admin, codes);
    });

    /* 2b) TOTP veya kurtarma kodu */
    app.get(STEP.verify, (req, res) => {
        const admin = pendingAdmin(req);
        if (!admin) return res.redirect(STEP.login);
        if (!admins.is2faEnabled(admin)) return res.redirect(STEP.enroll);
        const mode = req.query.mode === 'recovery' ? 'recovery' : 'totp';
        page(res, 'Doğrulama', views.renderAdmin2FAGate({
            username: admin.username, mode, csrf: csrf(req), paths: STEP,
            remaining: totp.secondsRemaining(), error: req.query.error || null
        }));
    });

    app.post(STEP.verify, requireCsrf, async (req, res) => {
        const admin = pendingAdmin(req);
        if (!admin) return res.redirect(STEP.login);
        const p = req.session.adminPending;
        if (isLocked(p.failKey)) { clearPending(req); return res.redirect(STEP.login); }

        let ok = false;
        if (req.body?.recovery) ok = admins.consumeRecoveryCode(admin, String(req.body.recovery));
        else if (req.body?.token) ok = admins.verifyTotp(admin, String(req.body.token));

        if (!ok) {
            noteFail(p.failKey);
            audit.log({ type: 'admin-2fa-failed', req, severity: 'warn', actorId: 'admin:' + admin.id });
            const mode = req.body?.recovery ? '&mode=recovery' : '';
            return res.redirect(STEP.verify + '?error=' + encodeURIComponent('Kod hatalı.') + mode);
        }
        clearFail(p.failKey);
        audit.log({ type: 'admin-2fa-ok', req, actorId: 'admin:' + admin.id });
        await finishLogin(req, res, admin);
    });

    async function finishLogin(req, res, admin, recoveryCodes = null) {
        try { await regenerate(req); } catch (e) {
            console.error('Admin oturumu yenilenemedi:', e);
            return res.status(500).send('Güvenli oturum başlatılamadı.');
        }
        const now = Date.now();
        req.session.admin = { id: admin.id, verified: true, loginAt: now, lastSeenAt: now, fp: fingerprint(req) };
        admin.lastLoginAt = new Date(now).toISOString();
        admins.save(admin);
        audit.log({ type: 'admin-login-ok', req, actorId: 'admin:' + admin.id });
        if (recoveryCodes) {
            return page(res, 'Kurtarma kodları', views.renderAdminSetupComplete({ recoveryCodes }));
        }
        res.redirect('/admin');
    }

    /* Kurtarma kodlarını yenile (panel içinden) */
    app.post(STEP.recovery, requireAdminPage, requireCsrf, (req, res) => {
        const codes = admins.regenerateRecoveryCodes(req.admin);
        audit.log({ type: 'admin-recovery-regenerated', req, actorId: 'admin:' + req.admin.id });
        page(res, 'Kurtarma kodları', views.renderAdminSetupComplete({ recoveryCodes: codes }));
    });

    /* Çıkış (GET /admin/logout eski bağlantılar için de çalışır) */
    const logout = (req, res) => {
        const id = req.session?.admin?.id;
        if (id) audit.log({ type: 'admin-logout', req, actorId: 'admin:' + id });
        req.session.destroy(() => res.redirect(STEP.login));
    };
    app.get(STEP.logout, logout);
    app.get('/admin/logout', (req, res) => currentAdmin(req) ? logout(req, res) : notFound(req, res));
};

module.exports.requireAdminPage = requireAdminPage;
module.exports.requireAdminApi = requireAdminApi;
module.exports.currentAdmin = currentAdmin;
module.exports.STEP = STEP;
