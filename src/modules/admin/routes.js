/* ═══════════════════════════════════════════════════════════════
   modules/admin/routes.js — Yönetim rotaları.
   Giriş + 2FA + oturum. SPA iç panelleri admin-client.js
   tarafından yönetilir ve /admin/api/* uçlarından beslenir.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const crypto = require('node:crypto');
const audit = require('../../core/audit');
const firebaseAuth = require('../../core/firebase-auth');
const adminEmail = require('../../core/admin-email');
const adminEmailOtp = require('../../core/admin-email-otp');
const totp = require('../../core/totp');
const firestoreAdmin = require('../../core/firestore-admin');
const data = require('../../data');
const { esc } = require('../../core/views');
const {
    renderAdminGate, renderAdmin2FAGate, renderAdminEmailOtpGate, renderAdminSetupGate, renderAdminSetupComplete,
    renderAdminShell, renderAdminDashboardHTML
} = require('./views');
const { asset } = require('../public/assets');

const RECOVERY_COUNT = 10;

/* ── Yardımcılar ── */
function isAdmin(req) {
    return !!req.session?.userId
        && req.session.authenticatedBy === 'firebase'
        && req.session.isAdmin === true
        && req.session.admin2faVerified === true;
}
async function requireAdminApi(req, res, next) {
    if (!isAdmin(req)) {
        const user = req.session?.userId ? data.userById(req.session.userId) : null;
        if (user?.isAdmin) {
            return res.status(403).json({
                error: 'Bu oturum admin girişi ve 2FA ile doğrulanmamış. /admin/logout adresinden çıkış yapıp /admin/login üzerinden giriş yapın.'
            });
        }
        return res.status(403).json({
            error: 'Admin oturumunuz bulunamadı. /admin/login üzerinden admin e-posta ve parolanızla giriş yapın.'
        });
    }
    const user = data.userById(req.session.userId);
    if (!user?.isAdmin || user.banned) return res.status(403).json({ error: 'Bu hesapta admin yetkisi etkin değil.' });
    try {
        const authUser = await firebaseAuth.getUserByEmail(user.email);
        if (authUser.disabled || !await firestoreAdmin.verifyAdminIdentity(user, authUser)) {
            req.session.isAdmin = false;
            audit.log({ type: 'admin-access-denied', req, actorId: user.id, detail: 'Firestore admin kaydı etkin değil' });
            return res.status(403).json({ error: 'Yerel kullanıcı ve Firestore admin yetkileri eşleşmiyor.' });
        }
        next();
    } catch (error) {
        console.error('Admin API Firestore yetkilendirmesi başarısız:', error);
        res.status(503).json({ error: 'Yönetici yetkisi şu anda doğrulanamıyor.' });
    }
}
async function requireAdminPage(req, res, next) {
    if (req.session?.pendingAdminSetup) return res.redirect('/admin/2fa/enroll');
    if (req.session?.pendingAdmin2fa) return res.redirect('/admin/2fa');
    if (!isAdmin(req)) return res.redirect('/admin/login');

    const user = data.userById(req.session.userId);
    if (!user?.isAdmin || user.banned) {
        req.session.isAdmin = false;
        return res.redirect('/admin/login');
    }
    try {
        const authUser = await firebaseAuth.getUserByEmail(user.email);
        if (authUser.disabled || !await firestoreAdmin.verifyAdminIdentity(user, authUser)) {
            req.session.isAdmin = false;
            audit.log({ type: 'admin-access-denied', req, actorId: user.id, detail: 'Firestore admin kaydı etkin değil' });
            return res.redirect('/admin/login');
        }
        next();
    } catch (error) {
        console.error('Admin sayfası Firestore yetkilendirmesi başarısız:', error);
        res.status(503).send('Yönetici yetkisi şu anda doğrulanamıyor. Lütfen daha sonra tekrar deneyin.');
    }
}
const tfaStore = (uid) => data._raw.read('tfa-admin-' + uid, null);
const saveTfa  = (uid, rec) => data._raw.write('tfa-admin-' + uid, rec);
const is2faOn  = (uid) => { const r = tfaStore(uid); return !!(r && r.enabled && r.secret); };
const totpSecret = () => totp.generateSecret();
const totpUri = (s, e) => totp.otpauthUri(s, e);

function renderAuthError(res) {
    return res.status(503).send('Yönetici yetkisi şu anda doğrulanamıyor. Lütfen daha sonra tekrar deneyin.');
}

function finishAdminLogin(req, res, user, recoveryCodes = null) {
    req.session.regenerate(async (error) => {
        if (error) {
            console.error('Admin oturumu yenilenemedi:', error);
            return res.status(500).send('Güvenli oturum başlatılamadı.');
        }

        try {
            user.lastLoginAt = new Date().toISOString();
            await firestoreAdmin.syncUserProfile(user, user.firebaseUid);
            data.saveUser(user);
            req.session.userId = user.id;
            req.session.isAdmin = true;
            req.session.admin2faVerified = true;
            req.session.email = user.email;
            req.session.authenticatedBy = 'firebase';
            req.session.createdAt = Date.now();
            audit.log({ type: 'admin-login-ok', req, actorId: user.id });

            if (recoveryCodes) {
                const html = renderAdminAuth({
                    title: 'Kurtarma kodları',
                    body: renderAdminSetupComplete({ recoveryCodes })
                });
                return res.type('html').send(html);
            }
            res.redirect('/admin');
        } catch (saveError) {
            console.error('Admin giriş oturumu kaydedilemedi:', saveError);
            res.status(500).send('Güvenli oturum kaydedilemedi.');
        }
    });
}
function regenerateSession(req) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(error => error ? reject(error) : resolve());
    });
}
async function getVerifiedPendingAdmin(pending) {
    const user = pending?.userId ? data.userById(pending.userId) : null;
    if (!user || user.banned || user.isAdmin !== true || user.firebaseUid !== pending.firebaseUid) return null;
    const authUser = await firebaseAuth.getUserByEmail(user.email);
    if (authUser.disabled || authUser.uid !== pending.firebaseUid) return null;
    return await firestoreAdmin.verifyAdminIdentity(user, authUser) ? user : null;
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
function consumeRecoveryCode(uid, code) {
    const r = tfaStore(uid);
    if (!r?.recoveryHashes) return false;
    const hash = crypto.createHash('sha256').update(String(code).toUpperCase().replace(/\s/g, '')).digest('hex');
    const i = r.recoveryHashes.indexOf(hash);
    if (i === -1) return false;
    r.recoveryHashes.splice(i, 1);
    saveTfa(uid, r);
    return true;
}

/* ── Brute-force ── */
const failStore = new Map();
function noteFail(k) {
    const now = Date.now();
    const r = failStore.get(k) || { count: 0, resetAt: now + 15 * 60 * 1000 };
    if (now > r.resetAt) r.count = 0, r.resetAt = now + 15 * 60 * 1000;
    r.count++;
    failStore.set(k, r);
}
function isLocked(k) {
    const r = failStore.get(k);
    return r && Date.now() < r.resetAt && r.count >= 10;
}

/* ═══════════════════════════════════════════════════════════════
   Admin oturum sayfaları (giriş + 2FA) için ortak kabuk
   ═══════════════════════════════════════════════════════════════ */
function renderAdminAuth({ title, body }) {
    return `<!doctype html>
<html lang="tr" class="no-js" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" content="#05070f" media="(prefers-color-scheme: dark)">
    <meta name="theme-color" content="#eef2f9" media="(prefers-color-scheme: light)">
    <title>${esc(title)} | Karahan's Studio</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap">
    <link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap">
    <link rel="stylesheet" href="${esc(asset('/css/style.css'))}">
    <link rel="stylesheet" href="${esc(asset('/css/admin.css'))}">
    <script>
    (function(){
        try {
            var s = localStorage.getItem('ks-theme') || 'light';
            var r = s === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : s;
            document.documentElement.setAttribute('data-theme', r);
        } catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
        document.documentElement.classList.remove('no-js');
    })();
    </script>
</head>
<body>
    ${body}
    <script src="${esc(asset('/js/theme.js'))}" defer></script>
    <script src="${esc(asset('/js/nav.js'))}" defer></script>
</body>
</html>`;
}

module.exports = function (app, { generateCsrf, requireCsrf }) {
    const csrf = (req) => generateCsrf(req);

    /* ── 1) Giriş ekranı + parola adımı ── */
    app.get('/admin', requireAdminPage, (req, res) => {
        const allTxns = data.transactions();
        const recent = audit.recent(10);
        const totalProducts = data.projects().length;
        const totalUpdates = data.updates().length;
        const totalUpcoming = data.upcoming().length;
        const pendingMessages = data.messages().filter(m => !m.read).length;
        const pendingForms = data.forms().filter(f => f.status === 'Yeni').length;

        /* İlk yükleme verilerini doğrudan kabuğa göm.
           Bu, ilk boyamayı hızlandırır ve SPA'nın içeriği
           hazırlamasını beklemesini engeller. */
        const initData = {
            stats: {
                totalUsers: data.users().length,
                totalProducts, totalUpdates, totalUpcoming,
                pendingMessages, pendingForms,
                todayIncome: allTxns.filter(t => t.type === 'income' && new Date(t.date || t.createdAt).toDateString() === new Date().toDateString())
                    .reduce((a, t) => a + Number(t.amount || 0), 0),
                todayExpense: allTxns.filter(t => t.type === 'expense' && new Date(t.date || t.createdAt).toDateString() === new Date().toDateString())
                    .reduce((a, t) => a + Number(t.amount || 0), 0)
            },
            recent, transactions: allTxns
        };

        const shell = renderAdminShell({ user: req.session, csrf: csrf(req) });
        const html = renderAdminDashboardHTML(initData);
        res.type('html').send(shell.replace('id="admin-root" data-view="dashboard"', `id="admin-root" data-view="dashboard">${html}</div>`));
    });

    /* SPA tarafı fetch için başlangıç verisi */
    app.get('/admin/api/dashboard', requireAdminApi, (req, res) => {
        const tx = data.transactions();
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const sum = (arr) => arr.reduce((a, t) => a + Number(t.amount || 0), 0);
        const daily = tx.filter(t => new Date(t.date || t.createdAt) >= today);
        const monthly = tx.filter(t => {
            const d = new Date(t.date || t.createdAt);
            return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });
        res.json({
            stats: {
                totalUsers: data.users().length,
                totalProducts: data.projects().length,
                totalUpdates: data.updates().length,
                totalUpcoming: data.upcoming().length,
                pendingMessages: data.messages().filter(m => !m.read).length,
                pendingForms: data.forms().filter(f => f.status === 'Yeni').length,
                todayIncome: sum(daily.filter(t => t.type === 'income')),
                todayExpense: sum(daily.filter(t => t.type === 'expense')),
                monthIncome: sum(monthly.filter(t => t.type === 'income')),
                monthExpense: sum(monthly.filter(t => t.type === 'expense'))
            },
            recent: audit.recent(20),
            transactions: tx.slice(-30)
        });
    });

    app.get('/admin/login', (req, res) => {
        const html = renderAdminAuth({
            title: 'Yönetici Girişi',
            body: renderAdminGate({ csrf: csrf(req), error: req.session?.flash || null })
        });
        delete req.session?.flash;
        res.type('html').send(html);
    });

    app.post('/admin/login', requireCsrf, async (req, res) => {
        const { email, password: pwd } = req.body || {};
        if (typeof email !== 'string' || typeof pwd !== 'string' || !email.trim() || !pwd) {
            audit.log({ type: 'admin-login-invalid-input', req });
            req.session.flash = 'E-posta ve parola gerekli.';
            return res.redirect('/admin/login');
        }
        const normalizedEmail = email.trim().toLowerCase();
        const key = (req.ip || '') + '|' + normalizedEmail;
        if (isLocked(key)) {
            audit.log({ type: 'admin-login-locked', req });
            req.session.flash = 'Çok fazla hatalı deneme. 15 dakika bekleyin.';
            return res.redirect('/admin/login');
        }
        const user = data.userByEmail(normalizedEmail);
        if (!user || !user.isAdmin || user.banned) {
            noteFail(key);
            audit.log({ type: 'admin-login-bad', req });
            req.session.flash = 'E-posta veya parola hatalı ya da yönetici yetkiniz etkin değil.';
            return res.redirect('/admin/login');
        }

        let authUser;
        try {
            authUser = await firebaseAuth.signInWithPassword(normalizedEmail, pwd, user);
        } catch (error) {
            noteFail(key);
            if (firebaseAuth.isCredentialError(error)) {
                audit.log({ type: 'admin-login-bad-password', req, actorId: user.id });
                req.session.flash = 'E-posta veya parola hatalı ya da yönetici yetkiniz etkin değil.';
                return res.redirect('/admin/login');
            }
            console.error('Firebase Authentication admin girişi başarısız:', error.code || error.message);
            audit.log({ type: 'admin-login-auth-service-error', req, actorId: user.id });
            return renderAuthError(res);
        }

        let enabled;
        try {
            enabled = await firestoreAdmin.verifyAdminIdentity(user, authUser);
        } catch (error) {
            console.error('Admin girişinde Firestore yetkilendirmesi başarısız:', error);
            audit.log({ type: 'admin-login-auth-service-error', req, actorId: user.id });
            return renderAuthError(res);
        }
        if (!enabled) {
            noteFail(key);
            audit.log({ type: 'admin-login-not-authorized', req, actorId: user.id });
            req.session.flash = 'E-posta veya parola hatalı ya da yönetici yetkiniz etkin değil.';
            return res.redirect('/admin/login');
        }

        user.firebaseUid = authUser.uid;
        delete user.password;
        try {
            await firestoreAdmin.syncUserProfile(user, authUser.uid);
            data.saveUser(user);
        } catch (error) {
            console.error('Admin kullanıcı kaydı Firebase ile eşitlenemedi:', error.code || error.message);
            req.session.flash = 'Admin kullanıcı kaydı doğrulanamadı. Firestore ve yerel kullanıcı kaydını kontrol edin.';
            return res.redirect('/admin/login');
        }

        const issued = adminEmailOtp.issue();
        try {
            await adminEmail.sendLoginCode(user.email, issued.code);
        } catch (error) {
            console.error('Admin e-posta kodu gönderilemedi:', error.code || error.message);
            audit.log({ type: 'admin-login-otp-send-failed', req, actorId: user.id });
            req.session.flash = 'E-posta doğrulama kodu gönderilemedi. SMTP ayarlarını kontrol edin ve tekrar deneyin.';
            return res.redirect('/admin/login');
        }

        try {
            await regenerateSession(req);
        } catch (error) {
            console.error('Admin doğrulama oturumu yenilenemedi:', error);
            return res.status(500).send('Güvenli oturum başlatılamadı.');
        }
        req.session.pendingAdminEmailOtp = {
            userId: user.id,
            firebaseUid: authUser.uid,
            failKey: key,
            digest: issued.digest,
            expiresAt: issued.expiresAt,
            attempts: issued.attempts,
            lastSentAt: issued.lastSentAt
        };
        audit.log({ type: 'admin-login-otp-sent', req, actorId: user.id });
        return res.redirect('/admin/2fa');
    });

    /* Admin TOTP kurulumu olmadan panele giriş yapamaz. */
    app.get('/admin/2fa/enroll', async (req, res) => {
        const userId = req.session?.pendingAdminSetup;
        const user = userId ? data.userById(userId) : null;
        if (!user?.isAdmin || user.banned) {
            delete req.session?.pendingAdminSetup;
            return res.redirect('/admin/login');
        }
        try {
            if (!await firestoreAdmin.isEnabledAdmin(user.email)) {
                delete req.session.pendingAdminSetup;
                audit.log({ type: 'admin-access-denied', req, actorId: user.id, detail: 'Firestore admin kaydı etkin değil' });
                return res.redirect('/admin/login');
            }
            const rec = tfaStore(user.id);
            if (!rec?.pendingSecret || is2faOn(user.id)) return res.redirect('/admin/login');
            const html = renderAdminAuth({
                title: 'Authenticator kurulumu',
                body: renderAdminSetupGate({
                    email: user.email,
                    secret: rec.pendingSecret,
                    uri: totpUri(rec.pendingSecret, user.email),
                    csrf: csrf(req)
                })
            });
            res.type('html').send(html);
        } catch (error) {
            console.error('Admin TOTP kurulumu için Firestore doğrulaması başarısız:', error);
            renderAuthError(res);
        }
    });

    app.post('/admin/2fa/enroll', requireCsrf, async (req, res) => {
        const userId = req.session?.pendingAdminSetup;
        const user = userId ? data.userById(userId) : null;
        if (!user?.isAdmin || user.banned) {
            delete req.session?.pendingAdminSetup;
            return res.redirect('/admin/login');
        }
        try {
            if (!await firestoreAdmin.isEnabledAdmin(user.email)) {
                delete req.session.pendingAdminSetup;
                audit.log({ type: 'admin-access-denied', req, actorId: user.id, detail: 'Firestore admin kaydı etkin değil' });
                return res.redirect('/admin/login');
            }
        } catch (error) {
            console.error('Admin TOTP kaydında Firestore doğrulaması başarısız:', error);
            return renderAuthError(res);
        }

        const rec = tfaStore(user.id);
        if (!rec?.pendingSecret) {
            delete req.session.pendingAdminSetup;
            return res.redirect('/admin/login');
        }
        if (!totp.verify(rec.pendingSecret, req.body?.token)) {
            audit.log({ type: 'admin-2fa-setup-failed', req, actorId: user.id });
            const html = renderAdminAuth({
                title: 'Authenticator kurulumu',
                body: renderAdminSetupGate({
                    email: user.email,
                    secret: rec.pendingSecret,
                    uri: totpUri(rec.pendingSecret, user.email),
                    error: 'Kod hatalı veya süresi dolmuş.',
                    csrf: csrf(req)
                })
            });
            return res.status(400).type('html').send(html);
        }

        const recoveryCodes = generateRecoveryCodes();
        saveTfa(user.id, {
            enabled: true,
            secret: rec.pendingSecret,
            email: user.email,
            recoveryHashes: recoveryCodes.map(code => crypto.createHash('sha256').update(code).digest('hex')),
            enabledAt: new Date().toISOString()
        });
        delete req.session.pendingAdminSetup;
        audit.log({ type: 'admin-2fa-enabled', req, actorId: user.id });
        finishAdminLogin(req, res, user, recoveryCodes);
    });

    /* ── 2) 2FA adımı ── */
    app.get('/admin/2fa', async (req, res) => {
        if (isAdmin(req)) return res.redirect('/admin');
        const emailOtp = req.session?.pendingAdminEmailOtp;
        if (emailOtp) {
            if (Date.now() >= emailOtp.expiresAt) {
                delete req.session.pendingAdminEmailOtp;
                req.session.flash = 'Kodun süresi doldu. Lütfen yeniden giriş yapıp yeni kod isteyin.';
                return res.redirect('/admin/login');
            }
            let user;
            try {
                user = await getVerifiedPendingAdmin(emailOtp);
            } catch (error) {
                console.error('Admin e-posta kodu sayfasında yetki doğrulanamadı:', error.code || error.message);
                return renderAuthError(res);
            }
            if (!user) {
                delete req.session.pendingAdminEmailOtp;
                audit.log({ type: 'admin-access-denied', req, actorId: emailOtp.userId, detail: 'Admin doğrulama verileri uyuşmuyor' });
                return res.redirect('/admin/login');
            }
            const html = renderAdminAuth({
                title: 'E-posta doğrulaması',
                body: renderAdminEmailOtpGate({
                    email: user.email,
                    csrf: csrf(req),
                    error: req.query.error || null
                })
            });
            return res.type('html').send(html);
        }
        if (!req.session?.pendingAdmin2fa) return res.redirect('/admin/login');
        const user = data.userById(req.session.pendingAdmin2fa);
        if (!user || user.banned) { delete req.session.pendingAdmin2fa; return res.redirect('/admin/login'); }
        if (!user.isAdmin) { delete req.session.pendingAdmin2fa; return res.redirect('/admin/login'); }
        try {
            if (!await firestoreAdmin.isEnabledAdmin(user.email)) {
                delete req.session.pendingAdmin2fa;
                audit.log({ type: 'admin-access-denied', req, actorId: user.id, detail: 'Firestore admin kaydı etkin değil' });
                return res.redirect('/admin/login');
            }
        } catch (error) {
            console.error('Admin 2FA sayfası Firestore doğrulaması başarısız:', error);
            return renderAuthError(res);
        }
        const mode = req.query.mode === 'recovery' ? 'recovery' : 'totp';
        const html = renderAdminAuth({
            title: 'Doğrulama',
            body: renderAdmin2FAGate({
                email: user.email, mode, csrf: csrf(req),
                remaining: totp.secondsRemaining(),
                error: req.query.error || null
            })
        });
        res.type('html').send(html);
    });

    app.post('/admin/2fa', requireCsrf, async (req, res) => {
        const emailOtp = req.session?.pendingAdminEmailOtp;
        if (emailOtp) {
            if (Date.now() >= emailOtp.expiresAt) {
                delete req.session.pendingAdminEmailOtp;
                req.session.flash = 'Kodun süresi doldu. Lütfen yeniden giriş yapıp yeni kod isteyin.';
                return res.redirect('/admin/login');
            }
            let user;
            try {
                user = await getVerifiedPendingAdmin(emailOtp);
            } catch (error) {
                console.error('Admin e-posta kodu doğrulamasında yetki kontrolü başarısız:', error.code || error.message);
                return renderAuthError(res);
            }
            if (!user) {
                delete req.session.pendingAdminEmailOtp;
                audit.log({ type: 'admin-access-denied', req, actorId: emailOtp.userId, detail: 'Admin doğrulama verileri uyuşmuyor' });
                return res.redirect('/admin/login');
            }
            if (!adminEmailOtp.matches(emailOtp.digest, req.body?.token || '')) {
                emailOtp.attempts++;
                noteFail(emailOtp.failKey);
                audit.log({ type: 'admin-login-otp-failed', req, actorId: user.id });
                if (emailOtp.attempts >= adminEmailOtp.MAX_ATTEMPTS) {
                    delete req.session.pendingAdminEmailOtp;
                    req.session.flash = 'Çok fazla hatalı kod girildi. Lütfen yeniden giriş yapın.';
                    return res.redirect('/admin/login');
                }
                return res.redirect('/admin/2fa?error=Kod%20hatal%C4%B1');
            }
            failStore.delete(emailOtp.failKey);
            delete req.session.pendingAdminEmailOtp;
            audit.log({ type: 'admin-login-otp-ok', req, actorId: user.id });
            return finishAdminLogin(req, res, user);
        }
        if (!req.session?.pendingAdmin2fa) return res.redirect('/admin/login');
        const userId = req.session.pendingAdmin2fa;
        const user = data.userById(userId);
        if (!user || user.banned) { delete req.session.pendingAdmin2fa; return res.redirect('/admin/login'); }
        if (!user.isAdmin) { delete req.session.pendingAdmin2fa; return res.redirect('/admin/login'); }
        try {
            if (!await firestoreAdmin.isEnabledAdmin(user.email)) {
                delete req.session.pendingAdmin2fa;
                audit.log({ type: 'admin-access-denied', req, actorId: user.id, detail: 'Firestore admin kaydı etkin değil' });
                return res.redirect('/admin/login');
            }
        } catch (error) {
            console.error('Admin 2FA doğrulamasında Firestore kontrolü başarısız:', error);
            return renderAuthError(res);
        }

        let ok = false;
        if (req.body.recovery) {
            ok = consumeRecoveryCode(userId, req.body.recovery);
        } else if (req.body.token) {
            const rec = tfaStore(userId);
            if (rec?.enabled && totp.verify(rec.secret, req.body.token)) ok = true;
        }
        if (!ok) {
            audit.log({ type: 'admin-2fa-failed', req, actorId: userId });
            return res.redirect('/admin/2fa?error=Kod%20hatal%C4%B1');
        }
        delete req.session.pendingAdmin2fa;
        audit.log({ type: 'admin-2fa-ok', req, actorId: userId });
        finishAdminLogin(req, res, user);
    });

    app.post('/admin/2fa/resend', requireCsrf, async (req, res) => {
        const pending = req.session?.pendingAdminEmailOtp;
        if (!pending) return res.redirect('/admin/login');
        if (Date.now() - pending.lastSentAt < 60 * 1000) {
            return res.redirect('/admin/2fa?error=Yeni%20kod%20istemeden%20%C3%B6nce%20bir%20dakika%20bekleyin');
        }

        let user;
        try {
            user = await getVerifiedPendingAdmin(pending);
        } catch (error) {
            console.error('Admin e-posta kodu yeniden gönderilirken yetki kontrolü başarısız:', error.code || error.message);
            return renderAuthError(res);
        }
        if (!user) {
            delete req.session.pendingAdminEmailOtp;
            audit.log({ type: 'admin-access-denied', req, actorId: pending.userId, detail: 'Admin doğrulama verileri uyuşmuyor' });
            return res.redirect('/admin/login');
        }

        const issued = adminEmailOtp.issue();
        try {
            await adminEmail.sendLoginCode(user.email, issued.code);
        } catch (error) {
            console.error('Admin e-posta kodu yeniden gönderilemedi:', error.code || error.message);
            audit.log({ type: 'admin-login-otp-resend-failed', req, actorId: user.id });
            return res.redirect('/admin/2fa?error=E-posta%20g%C3%B6nderimi%20ba%C5%9Far%C4%B1s%C4%B1z.%20SMTP%20ayarlar%C4%B1n%C4%B1%20kontrol%20edin.');
        }
        req.session.pendingAdminEmailOtp = {
            userId: user.id,
            firebaseUid: pending.firebaseUid,
            failKey: pending.failKey,
            digest: issued.digest,
            expiresAt: issued.expiresAt,
            attempts: issued.attempts,
            lastSentAt: issued.lastSentAt
        };
        audit.log({ type: 'admin-login-otp-resent', req, actorId: user.id });
        return res.redirect('/admin/2fa');
    });

    app.get('/admin/logout', (req, res) => {
        const id = req.session?.userId;
        if (id) audit.log({ type: 'admin-logout', req, actorId: id });
        req.session.destroy(() => res.redirect('/admin/login'));
    });

    /* ── 2FA kurulum (admin için de aynı) ── */
    app.get('/admin/2fa/setup', requireAdminPage, (req, res) => {
        const user = data.userById(req.session.userId);
        let rec = tfaStore(user.id);
        if (!is2faOn(user.id) && !rec?.pendingSecret) {
            rec = { ...rec, pendingSecret: totpSecret(), pendingEmail: user.email };
            saveTfa(user.id, rec);
        }
        const body = is2faOn(user.id)
            ? '<main class="auth-shell"><div class="auth-card"><span class="auth-badge">Yönetici · Güvenlik</span><h1>2FA etkin</h1><p class="auth-sub">Authenticator doğrulaması bu hesapta etkin.</p><a class="btn btn-primary" href="/admin">Panele dön</a></div></main>'
            : renderAdminSetupGate({
                email: user.email,
                secret: rec.pendingSecret,
                uri: totpUri(rec.pendingSecret, user.email),
                csrf: csrf(req),
                action: '/admin/2fa/setup'
            });
        res.type('html').send(renderAdminAuth({ title: '2FA Ayarları', body }));
    });

    app.post('/admin/2fa/setup', requireAdminApi, requireCsrf, (req, res) => {
        const user = data.userById(req.session.userId);
        const rec = tfaStore(user.id);
        if (is2faOn(user.id)) return res.redirect('/admin/2fa/setup');
        if (!rec?.pendingSecret || !totp.verify(rec.pendingSecret, req.body?.token)) {
            audit.log({ type: 'admin-2fa-setup-failed', req, actorId: user.id });
            const body = renderAdminSetupGate({
                email: user.email,
                secret: rec?.pendingSecret || '',
                uri: rec?.pendingSecret ? totpUri(rec.pendingSecret, user.email) : '',
                error: 'Kod hatalı veya süresi dolmuş.',
                csrf: csrf(req),
                action: '/admin/2fa/setup'
            });
            return res.status(400).type('html').send(renderAdminAuth({ title: '2FA Ayarları', body }));
        }
        const codes = generateRecoveryCodes();
        saveTfa(user.id, {
            enabled: true,
            secret: rec.pendingSecret,
            email: user.email,
            recoveryHashes: codes.map(code => crypto.createHash('sha256').update(code).digest('hex')),
            enabledAt: new Date().toISOString()
        });
        audit.log({ type: 'admin-2fa-enabled', req, actorId: user.id });
        res.type('html').send(renderAdminAuth({
            title: 'Kurtarma kodları',
            body: renderAdminSetupComplete({ recoveryCodes: codes })
        }));
    });

    app.get('/admin/api/2fa/setup', requireAdminApi, (req, res) => {
        const user = data.userById(req.session.userId);
        let rec = tfaStore(user.id);
        if (!is2faOn(user.id) && !rec?.pendingSecret) {
            rec = { ...rec, pendingSecret: totpSecret(), pendingEmail: user.email };
            saveTfa(user.id, rec);
        }
        res.json({
            email: user.email,
            secret: rec?.pendingSecret || null,
            uri: rec?.pendingSecret ? totpUri(rec.pendingSecret, user.email) : null,
            enabled: is2faOn(user.id)
        });
    });

    app.post('/admin/api/2fa/setup', requireAdminApi, requireCsrf, (req, res) => {
        const user = data.userById(req.session.userId);
        const rec = tfaStore(user.id);
        if (!rec?.pendingSecret) return res.status(400).json({ error: 'Kurulum başlatılmamış' });
        if (!totp.verify(rec.pendingSecret, req.body.token)) {
            audit.log({ type: 'admin-2fa-setup-failed', req, actorId: user.id });
            return res.status(400).json({ error: 'Kod hatalı' });
        }
        const codes = generateRecoveryCodes();
        saveTfa(user.id, {
            enabled: true,
            secret: rec.pendingSecret,
            email: user.email,
            recoveryHashes: codes.map(c => crypto.createHash('sha256').update(c).digest('hex')),
            enabledAt: new Date().toISOString()
        });
        audit.log({ type: 'admin-2fa-enabled', req, actorId: user.id });
        res.json({ ok: true, recoveryCodes: codes });
    });

    /* ═══════════════════════════════════════════════════════════════
       REST API: kaynak CRUD
       ═══════════════════════════════════════════════════════════════ */
    function list(name) { return `/admin/api/${name}`; }
    function get(name) { return `/admin/api/${name}/:id`; }

    function makeResource({ name, store, validate }) {
        app.get(list(name), requireAdminApi, (req, res) => res.json({ items: store() }));
        app.get(get(name), requireAdminApi, (req, res) => {
            const item = store().find(x => String(x.id) === req.params.id);
            if (!item) return res.status(404).json({ error: 'Bulunamadı' });
            res.json({ item });
        });
        app.post(list(name), requireAdminApi, requireCsrf, (req, res) => {
            const validation = validate(req.body || {});
            if (!validation.ok) return res.status(400).json({ error: validation.error });
            const item = { id: data.nextId(store()), ...validation.value, createdAt: new Date().toISOString() };
            const saved = store().filter(x => x.id !== item.id).concat(item);
            data._raw.write(name === 'products' ? 'projects' : (name === 'upcoming' ? 'upcoming-projects' : name), saved);
            audit.log({ type: `admin-${name}-create`, req, actorId: req.session.userId, detail: item.id });
            res.status(201).json({ item });
        });
        app.put(get(name), requireAdminApi, requireCsrf, (req, res) => {
            const items = store();
            const idx = items.findIndex(x => String(x.id) === req.params.id);
            if (idx === -1) return res.status(404).json({ error: 'Bulunamadı' });
            const merged = { ...items[idx], ...req.body, id: items[idx].id, updatedAt: new Date().toISOString() };
            const validation = validate(merged);
            if (!validation.ok) return res.status(400).json({ error: validation.error });
            items[idx] = { ...items[idx], ...validation.value, id: items[idx].id, updatedAt: merged.updatedAt };
            data._raw.write(name === 'products' ? 'projects' : (name === 'upcoming' ? 'upcoming-projects' : name), items);
            audit.log({ type: `admin-${name}-update`, req, actorId: req.session.userId, detail: req.params.id });
            res.json({ item: items[idx] });
        });
        app.delete(get(name), requireAdminApi, requireCsrf, (req, res) => {
            const items = store();
            const next = items.filter(x => String(x.id) !== req.params.id);
            if (next.length === items.length) return res.status(404).json({ error: 'Bulunamadı' });
            data._raw.write(name === 'products' ? 'projects' : (name === 'upcoming' ? 'upcoming-projects' : name), next);
            audit.log({ type: `admin-${name}-delete`, req, actorId: req.session.userId, detail: req.params.id });
            res.json({ ok: true });
        });
    }

    function requiredString(v) { return typeof v === 'string' && v.trim().length > 0; }
    const productValidate = (b) => {
        if (!requiredString(b.name)) return { ok: false, error: 'Ürün adı zorunlu' };
        const price = Number(b.price ?? 0), discount = Number(b.discount ?? 0), couponDiscount = Number(b.couponDiscount ?? 0);
        if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Fiyat sıfır veya daha büyük olmalı' };
        if (!Number.isFinite(discount) || discount < 0 || discount > 100) return { ok: false, error: 'İndirim %0 ile %100 arasında olmalı' };
        if (!Number.isFinite(couponDiscount) || couponDiscount < 0 || couponDiscount > 100) return { ok: false, error: 'Kupon indirimi %0 ile %100 arasında olmalı' };
        if (b.image && (typeof b.image !== 'string' || b.image.length > 2048)) return { ok: false, error: 'Görsel adresi geçersiz' };
        return { ok: true, value: {
            name: b.name.trim(), category: b.category || 'Araç', status: b.status || 'Yayında',
            summary: b.summary || b.description || '', tagline: b.tagline || '', description: b.description || '',
            price, discount, image: b.image || '', couponCode: b.couponCode || '',
            couponDiscount, isFree: b.isFree === true || b.isFree === 'true', features: b.features || [], stack: b.stack || [],
            platforms: b.platforms || [], tags: b.tags || []
        } };
    };
    const updateValidate = (b) => {
        if (!requiredString(b.title)) return { ok: false, error: 'Güncelleme başlığı zorunlu' };
        if (!b.productId) return { ok: false, error: 'Bir ürün seçin' };
        const project = data.projectById(b.productId);
        if (!project) return { ok: false, error: 'Ürün bulunamadı' };
        if (b.image && (typeof b.image !== 'string' || b.image.length > 2048)) return { ok: false, error: 'Görsel adresi geçersiz' };
        return { ok: true, value: {
            title: b.title.trim(), version: b.version || '', date: b.date || '',
            description: b.description || '', productId: project.id,
            projectName: project.name, image: b.image || ''
        } };
    };
    const upcomingValidate = (b) => {
        if (!requiredString(b.name)) return { ok: false, error: 'Ad zorunlu' };
        if (!['Yayınlandı', 'Geliştirmede'].includes(b.status || 'Geliştirmede')) {
            return { ok: false, error: 'Durum Yayınlandı veya Geliştirmede olmalı' };
        }
        const price = Number(b.price ?? 0);
        if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Fiyat sıfır veya daha büyük olmalı' };
        if (b.image && (typeof b.image !== 'string' || b.image.length > 2048)) return { ok: false, error: 'Görsel adresi geçersiz' };
        return { ok: true, value: {
            name: b.name.trim(), status: b.status || 'Geliştirmede',
            description: b.description || '', launchDate: b.launchDate || '',
            price, image: b.image || '', featured: b.featured === true || b.featured === 'true'
        } };
    };
    const messageValidate = (b) => b.id ? { ok: true, value: b } : { ok: false, error: 'ID eksik' };

    makeResource({ name: 'products',  store: () => data.projects(),       validate: productValidate });
    makeResource({ name: 'updates',   store: () => data.updates(),        validate: updateValidate });
    makeResource({ name: 'upcoming',  store: () => data.upcoming(),       validate: upcomingValidate });

    /* Mesajlar: yalnızca okuma ve read-toggle */
    app.get('/admin/api/messages', requireAdminApi, (req, res) => res.json({ items: data.messages() }));
    app.post('/admin/api/messages/:id/read', requireAdminApi, requireCsrf, (req, res) => {
        const m = data.messages().find(x => String(x.id) === req.params.id);
        if (!m) return res.status(404).json({ error: 'Bulunamadı' });
        m.read = true;
        data.saveMessage(m);
        audit.log({ type: 'admin-message-read', req, actorId: req.session.userId, detail: m.id });
        res.json({ ok: true });
    });
    app.delete('/admin/api/messages/:id', requireAdminApi, requireCsrf, (req, res) => {
        const ok = data.removeMessage(req.params.id);
        if (!ok) return res.status(404).json({ error: 'Bulunamadı' });
        audit.log({ type: 'admin-message-delete', req, actorId: req.session.userId, detail: req.params.id });
        res.json({ ok: true });
    });

    /* Müşteri formları */
    app.get('/admin/api/forms', requireAdminApi, (req, res) => res.json({ items: data.forms() }));
    app.post('/admin/api/forms/:id/status', requireAdminApi, requireCsrf, (req, res) => {
        const f = data.forms().find(x => String(x.id) === req.params.id);
        if (!f) return res.status(404).json({ error: 'Bulunamadı' });
        f.status = req.body.status || 'İşlendi';
        data.saveForm(f);
        audit.log({ type: 'admin-form-status', req, actorId: req.session.userId, detail: `${f.id}->${f.status}` });
        res.json({ ok: true, item: f });
    });

    /* Kullanıcılar: yalnızca ban toggle + admin toggle */
    app.get('/admin/api/users', requireAdminApi, (req, res) => {
        const purchases = data.transactions().filter(t => t.type === 'income' && t.userId);
        const items = data.users().map(u => ({
            id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email,
            isAdmin: !!u.isAdmin, banned: !!u.banned, createdAt: u.createdAt,
            lastLoginAt: u.lastLoginAt || null,
            viewedProducts: Array.isArray(u.viewedProducts) ? u.viewedProducts : [],
            purchases: purchases.filter(t => String(t.userId) === String(u.id))
        }));
        res.json({ items });
    });
    app.put('/admin/api/users/:id', requireAdminApi, requireCsrf, async (req, res) => {
        const u = data.userById(req.params.id);
        if (!u) return res.status(404).json({ error: 'Bulunamadı' });
        const email = String(req.body.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Geçerli bir e-posta girin' });
        const banned = data.banned();
        if ((banned.emails || []).some(value => String(value).toLowerCase() === email)) {
            return res.status(400).json({ error: 'Bu e-posta yasaklılar listesinde' });
        }
        const existing = data.userByEmail(email);
        if (existing && String(existing.id) !== String(u.id)) return res.status(409).json({ error: 'Bu e-posta başka bir kullanıcıda kayıtlı' });
        const newPassword = req.body.password;
        if (newPassword && (typeof newPassword !== 'string' || newPassword.length < 8)) {
            return res.status(400).json({ error: 'Yeni parola en az 8 karakter olmalı' });
        }
        if (newPassword && (banned.passwords || []).includes(newPassword)) {
            return res.status(400).json({ error: 'Bu parola yasaklılar listesinde' });
        }
        const previousEmail = u.email;
        let authUser;
        let authCreated = false;
        let authUpdated = false;
        let firestoreRoleUpdateStarted = false;
        try {
            if (u.isAdmin && previousEmail.toLowerCase() !== email) {
                firestoreRoleUpdateStarted = true;
                await firestoreAdmin.setAdminEnabled(email, true);
                await firestoreAdmin.setAdminEnabled(previousEmail, false);
            }

            try {
                const authUpdates = { email };
                if (newPassword) authUpdates.password = newPassword;
                authUser = await firebaseAuth.updateUserByEmail(previousEmail, authUpdates);
                authUpdated = true;
            } catch (error) {
                if (error.code !== 'auth/user-not-found' || !newPassword) throw error;
                authUser = await firebaseAuth.createUser(email, newPassword, `${u.firstName} ${u.lastName}`.trim());
                authCreated = true;
            }

            u.email = email;
            u.firebaseUid = authUser.uid;
            delete u.password;
            await firestoreAdmin.syncUserProfile(u, authUser.uid);
            data.saveUser(u);
            if (String(u.id) === String(req.session.userId)) req.session.email = email;
        } catch (error) {
            if (firestoreRoleUpdateStarted) {
                try {
                    await firestoreAdmin.setAdminEnabled(previousEmail, true);
                    await firestoreAdmin.setAdminEnabled(email, false);
                } catch (rollbackError) {
                    console.error('Firestore admin rol güncellemesi geri alınamadı:', rollbackError);
                }
            }
            if (authUser && (authCreated || authUpdated)) {
                try {
                    if (authCreated) await firebaseAuth.deleteUser(authUser.uid);
                    else if (previousEmail.toLowerCase() !== email) {
                        await firebaseAuth.updateUserByEmail(email, { email: previousEmail });
                    }
                } catch (rollbackError) {
                    console.error('Firebase Authentication kullanıcı güncellemesi geri alınamadı:', rollbackError.code || rollbackError.message);
                }
            }
            if (error.code === 'auth/email-already-exists') {
                return res.status(409).json({ error: 'Bu e-posta Firebase Authentication’da zaten kayıtlı.' });
            }
            if (error.code === 'auth/user-not-found') {
                return res.status(409).json({ error: 'Bu kullanıcının Firebase Authentication hesabı yok. Önce Firebase Auth kaydı oluşturun veya yeni parola belirleyin.' });
            }
            console.error('Kullanıcı güncellenirken Firebase eşitlemesi başarısız:', error.code || error.message);
            return res.status(503).json({ error: 'Kullanıcı bilgileri Firebase Authentication ile eşitlenemedi.' });
        }
        audit.log({ type: 'admin-user-update', req, actorId: req.session.userId, detail: `user=${u.id}; passwordChanged=${Boolean(newPassword)}` });
        res.json({ ok: true });
    });
    app.post('/admin/api/users/:id/ban', requireAdminApi, requireCsrf, async (req, res) => {
        const u = data.userById(req.params.id);
        if (!u) return res.status(404).json({ error: 'Bulunamadı' });
        const nextBanned = !u.banned;
        try {
            await firebaseAuth.setDisabledByEmail(u.email, nextBanned);
            u.banned = nextBanned;
            if (u.firebaseUid) await firestoreAdmin.syncUserProfile(u, u.firebaseUid);
            data.saveUser(u);
        } catch (error) {
            console.error('Firebase Authentication hesap engellemesi başarısız:', error.code || error.message);
            return res.status(503).json({ error: 'Kullanıcı hesabı Firebase Authentication’da güncellenemedi.' });
        }
        audit.log({ type: 'admin-user-ban', req, actorId: req.session.userId, detail: `${u.id}->${u.banned}` });
        res.json({ ok: true });
    });
    app.post('/admin/api/users/:id/admin', requireAdminApi, requireCsrf, async (req, res) => {
        const u = data.userById(req.params.id);
        if (!u) return res.status(404).json({ error: 'Bulunamadı' });
        if (String(u.id) === String(req.session.userId)) return res.status(400).json({ error: 'Kendi rolünü değiştiremezsin' });
        const nextIsAdmin = !u.isAdmin;
        try {
            await firestoreAdmin.setAdminEnabled(u.email, nextIsAdmin);
            u.isAdmin = nextIsAdmin;
            data.saveUser(u);
        } catch (error) {
            console.error('Kullanıcı admin yetkisi güncellenemedi:', error);
            return res.status(503).json({ error: 'Admin yetkisi Firestore ile eşitlenemedi; rol değiştirilmedi.' });
        }
        audit.log({ type: 'admin-user-admin', req, actorId: req.session.userId, detail: `${u.id}->${u.isAdmin}` });
        res.json({ ok: true });
    });

    /* Gelir/Gider */
    app.get('/admin/api/finance', requireAdminApi, (req, res) => {
        res.json({ items: data.transactions() });
    });
    const txnValidate = (b) => {
        if (!['income', 'expense'].includes(b.type)) return { ok: false, error: 'Tür geçersiz' };
        const amt = Number(b.amount);
        if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: 'Tutar sıfırdan büyük olmalı' };
        const product = b.productId ? data.projectById(b.productId) : null;
        if (b.productId && !product) return { ok: false, error: 'Ürün bulunamadı' };
        const user = b.userId ? data.userById(b.userId) : null;
        if (b.userId && !user) return { ok: false, error: 'Kullanıcı bulunamadı' };
        return { ok: true, value: {
            type: b.type, amount: amt, description: b.description || '', recipient: b.recipient || '',
            date: b.date || new Date().toISOString(),
            productId: product ? product.id : '', productName: product ? product.name : '',
            userId: user ? user.id : ''
        } };
    };
    makeResource({ name: 'transactions', store: () => data.transactions(), validate: txnValidate });

    /* Yasaklılar */
    app.get('/admin/api/banned', requireAdminApi, (req, res) => res.json({ data: data.banned() }));
    app.post('/admin/api/banned', requireAdminApi, requireCsrf, (req, res) => {
        const b = data.banned();
        const { type, value } = req.body || {};
        if (!type || !value) return res.status(400).json({ error: 'Eksik alan' });
        if (!['ips', 'emails', 'passwords'].includes(type)) return res.status(400).json({ error: 'Geçersiz tür' });
        const normalized = type === 'emails'
            ? String(value).trim().toLowerCase()
            : (type === 'passwords' ? String(value) : String(value).trim());
        if (!normalized.trim()) return res.status(400).json({ error: 'Değer boş olamaz' });
        if (!b[type].includes(normalized)) b[type].push(normalized);
        data.saveBanned(b);
        audit.log({ type: 'admin-banned-add', req, actorId: req.session.userId, detail: type === 'passwords' ? 'password rule added' : `${type}=${normalized}` });
        res.json({ ok: true });
    });
    app.delete('/admin/api/banned', requireAdminApi, requireCsrf, (req, res) => {
        const b = data.banned();
        const { type, value } = req.body || {};
        if (!type || !value) return res.status(400).json({ error: 'Eksik alan' });
        if (!['ips', 'emails', 'passwords'].includes(type)) return res.status(400).json({ error: 'Geçersiz tür' });
        b[type] = (b[type] || []).filter(x => x !== value);
        data.saveBanned(b);
        audit.log({
            type: 'admin-banned-remove', req, actorId: req.session.userId,
            detail: type === 'passwords' ? 'password rule removed' : `${type}=${value}`
        });
        res.json({ ok: true });
    });

    /* Denetim günlüğü */
    app.get('/admin/api/audit', requireAdminApi, (req, res) => res.json({ items: audit.recent(100) }));
};
