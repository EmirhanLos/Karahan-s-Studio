/* ═══════════════════════════════════════════════════════════════
   modules/auth/routes.js — Giriş, kayıt, 2FA, profil, çıkış.
   Oturum yönetimi burada yapılır; parolalar scrypt ile karmalanır.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const crypto = require('node:crypto');
const { renderPage, renderHeader, renderFooter } = require('../public/layout');
const { renderLogin, renderRegister, renderForgot, renderReset, render2FAGate, render2FASetup, renderRecoveryCodes } = require('./views');
const { renderProfile, renderProfileEdit } = require('./profile');
const firebaseAuth = require('../../core/firebase-auth');
const firestoreAdmin = require('../../core/firestore-admin');
const totp = require('../../core/totp');
const audit = require('../../core/audit');
const { createLockout } = require('../../core/login-lockout');
const data = require('../../data');

const RECOVERY_COUNT = 10;

/* ── Oturum yardımcıları ── */
function isAuthed(req) {
    return !!req.session?.userId && req.session.authenticatedBy === 'firebase';
}
function requireAuth(req, res, next) {
    if (!isAuthed(req)) return res.redirect('/giris');
    const user = loadUser(req);
    if (!user || user.banned) return res.redirect('/giris');
    next();
}
function loadUser(req) { return isAuthed(req) ? data.userById(req.session.userId) : null; }
function loginAs(req, user) {
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.authenticatedBy = 'firebase';
    req.session.createdAt = Date.now();
}
function recordLogin(user) {
    user.lastLoginAt = new Date().toISOString();
    data.saveUser(user);
}
function isRestrictedCredential(req, email, pwd) {
    const banned = data.banned();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return (banned.emails || []).some(x => String(x).toLowerCase() === normalizedEmail)
        || (banned.passwords || []).some(x => x === pwd)
        || (banned.ips || []).includes(req.ip);
}
function isRestrictedLogin(req, email) {
    const banned = data.banned();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    return (banned.emails || []).some(x => String(x).toLowerCase() === normalizedEmail)
        || (banned.ips || []).includes(req.ip);
}

/* ── 2FA depolama (kullanıcıya özel) ── */
function tfaStore(userId) {
    return data._raw.read('tfa-' + userId, null);
}
function saveTfa(userId, rec) {
    data._raw.write('tfa-' + userId, rec);
}
function clearTfa(userId) {
    try { data._raw.write('tfa-' + userId, null); } catch {}
}
function is2faEnabled(userId) {
    const r = tfaStore(userId);
    return !!(r && r.enabled && r.secret);
}
function has2faSetup(userId) {
    return !!tfaStore(userId);
}
function generateRecoveryCodes() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const out = [];
    for (let i = 0; i < RECOVERY_COUNT; i++) {
        let s = '';
        for (let j = 0; j < 10; j++) s += alphabet[crypto.randomInt(alphabet.length)];
        out.push(s.slice(0, 5) + '-' + s.slice(5));
    }
    return out;
}
function consumeRecoveryCode(userId, code) {
    const r = tfaStore(userId);
    if (!r || !r.recoveryHashes) return false;
    const hash = crypto.createHash('sha256').update(String(code).toUpperCase().replace(/\s/g, '')).digest('hex');
    const i = r.recoveryHashes.indexOf(hash);
    if (i === -1) return false;
    r.recoveryHashes.splice(i, 1);
    saveTfa(userId, r);
    return true;
}

/* ── Brute-force için sayaç ──
   Yönetici girişi ile aynı gerekçe: sayaç bellekte tutulursa
   yeniden başlatma ile sıfırlanır. SQLite'ta saklanır. */
const lockout = createLockout({
    storeKey: 'login-fails',
    maxFails: 10,
    windowMs: 15 * 60 * 1000
});
function noteFail(key) { return lockout.noteFail(key); }
function isLocked(key) { return lockout.isLocked(key); }
function clearFail(key) { return lockout.clear(key); }

module.exports = function (app, { generateCsrf, requireCsrf }) {
    const csrf = () => generateCsrf(app.request?._session) || null; // fall-through; csrf from session
    function getCsrf(req) { return generateCsrf(req); }

    /* ── Giriş ── */
    app.get('/giris', (req, res) => {
        if (isAuthed(req)) return res.redirect('/profil');
        const html = renderPage({
            title: 'Giriş Yap',
            body: renderLogin({
                csrf: getCsrf(req),
                twoFactorOn: false,
                error: req.session?.flash || null,
                notice: req.session?.notice || null
            })
        });
        delete req.session?.flash;
        delete req.session?.notice;
        res.type('html').send(html);
    });

    app.post('/giris', requireCsrf, async (req, res) => {
        const { email, password: pwd } = req.body || {};
        if (!email || !pwd) {
            req.session.flash = 'E-posta ve parola gerekli.';
            return res.redirect('/giris');
        }
        if (isRestrictedLogin(req, email)) {
            audit.log({ type: 'login-restricted', req, detail: 'blocked credentials or IP' });
            req.session.flash = 'Bu hesap bilgileriyle giriş yapılamıyor.';
            return res.redirect('/giris');
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        const key = (req.ip || '') + '|' + normalizedEmail;
        if (isLocked(key)) {
            audit.log({ type: 'login-locked', req, detail: email });
            req.session.flash = 'Çok fazla hatalı deneme. Lütfen 15 dakika sonra tekrar deneyin.';
            return res.redirect('/giris');
        }
        const user = data.userByEmail(normalizedEmail);
        if (!user || user.banned) {
            noteFail(key);
            audit.log({ type: 'login-failed', req, detail: normalizedEmail });
            req.session.flash = 'E-posta veya parola hatalı.';
            return res.redirect('/giris');
        }

        let authUser;
        try {
            authUser = await firebaseAuth.signInWithPassword(normalizedEmail, pwd, user);
        } catch (error) {
            noteFail(key);
            if (firebaseAuth.isCredentialError(error)) {
                audit.log({ type: 'login-bad-password', req, detail: normalizedEmail });
                req.session.flash = 'E-posta veya parola hatalı.';
                return res.redirect('/giris');
            }
            console.error('Firebase Authentication giriş isteği başarısız:', error.code || error.message);
            audit.log({ type: 'login-auth-service-error', req, actorId: user.id });
            return res.status(503).send('Kimlik doğrulama hizmeti şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
        }

        if (user.firebaseUid && user.firebaseUid !== authUser.uid) {
            audit.log({ type: 'login-account-mismatch', req, actorId: user.id });
            return res.status(403).send('Bu hesap Firebase Authentication ile eşleşmiyor. Destek ekibiyle iletişime geçin.');
        }
        clearFail(key);
        user.firebaseUid = authUser.uid;
        delete user.password;
        try {
            recordLogin(user);
            await firestoreAdmin.syncUserProfile(user, authUser.uid);
        } catch (error) {
            console.error('Kullanıcı girişi Firebase ile eşitlenemedi:', error.code || error.message);
            return res.status(500).send('Güvenli giriş tamamlanamadı. Lütfen tekrar deneyin.');
        }
        audit.log({ type: 'login-ok', req, actorId: user.id, detail: normalizedEmail });

        if (is2faEnabled(user.id)) {
            req.session.pending2fa = user.id;
            return res.redirect('/2fa');
        }
        loginAs(req, user);
        req.session.notice = 'İki faktörlü doğrulamayı etkinleştirmeniz önerilir.';
        res.redirect('/profil');
    });

    /* ── Kayıt ── */
    app.get('/kayit', (req, res) => {
        const html = renderPage({ title: 'Kayıt Ol', body: renderRegister({ csrf: getCsrf(req) }) });
        res.type('html').send(html);
    });

    app.post('/kayit', requireCsrf, async (req, res) => {
        const { firstName, lastName, email, phone, password: pwd, password2, consent } = req.body || {};
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const renderError = (msg) => {
            const html = renderPage({ title: 'Kayıt Ol', body: renderRegister({ csrf: getCsrf(req), error: msg, values: req.body }) });
            res.type('html').send(html);
        };
        if (!firstName || !lastName || !email || !phone || !pwd || !pwd) return renderError('Tüm zorunlu alanları doldurun.');
        if (isRestrictedCredential(req, email, pwd)) return renderError('Bu e-posta, parola veya IP adresiyle kayıt yapılamıyor.');
        if (!consent) return renderError('Kullanım koşullarını onaylamalısınız.');
        if (pwd.length < 8) return renderError('Parola en az 8 karakter olmalı.');
        if (pwd !== password2) return renderError('Parolalar eşleşmiyor.');
        if (data.userByEmail(normalizedEmail)) return renderError('Bu e-posta zaten kayıtlı.');
        const user = {
            id: data.nextId(data.users()),
            firstName, lastName, email: normalizedEmail, phone,
            isAdmin: false, banned: false,
            createdAt: new Date().toISOString(),
            address: {}, card: { brand: '—' }
        };
        let authUser;
        let userSaved = false;
        try {
            authUser = await firebaseAuth.createUser(normalizedEmail, pwd, `${firstName} ${lastName}`.trim());
            user.firebaseUid = authUser.uid;
            await firestoreAdmin.syncUserProfile(user, authUser.uid);
            data.saveUser(user);
            userSaved = true;
            recordLogin(user);
            loginAs(req, user);
            audit.log({ type: 'register', req, actorId: user.id, detail: user.email });
            req.session.notice = 'Hoş geldiniz!';
            res.redirect('/profil');
        } catch (e) {
            if (userSaved) {
                try {
                    data.removeUser(user.id);
                } catch (cleanupError) {
                    console.error('Başarısız kayıt sonrası yerel hesap temizlenemedi:', cleanupError);
                }
            }
            if (authUser) {
                try {
                    await firebaseAuth.deleteUser(authUser.uid);
                } catch (cleanupError) {
                    console.error('Başarısız kayıt sonrası Firebase Auth hesabı temizlenemedi:', cleanupError.code || cleanupError.message);
                }
            }
            if (e.code === 'auth/email-already-exists') return renderError('Bu e-posta Firebase Authentication’da zaten kayıtlı. Giriş yapın veya parola sıfırlayın.');
            console.error('Firebase Authentication kayıt isteği başarısız:', e.code || e.message);
            renderError('Kayıt sırasında bir hata oluştu.');
        }
    });

    /* ── Şifremi unuttum ── */
    app.get('/sifremi-unuttum', (req, res) => {
        const html = renderPage({ title: 'Şifremi Unuttum', body: renderForgot({ csrf: getCsrf(req), error: req.session?.flash, notice: req.session?.notice }) });
        delete req.session?.flash;
        delete req.session?.notice;
        res.type('html').send(html);
    });
    app.post('/sifremi-unuttum', requireCsrf, async (req, res) => {
        const { email } = req.body || {};
        if (!email) {
            req.session.flash = 'E-posta gerekli.';
            return res.redirect('/sifremi-unuttum');
        }
        const normalizedEmail = String(email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            req.session.flash = 'Geçerli bir e-posta girin.';
            return res.redirect('/sifremi-unuttum');
        }
        try {
            const result = await firebaseAuth.sendPasswordResetEmail(normalizedEmail);
            const user = data.userByEmail(normalizedEmail);
            if (result && user) audit.log({ type: 'password-reset-request', req, actorId: user.id });
            req.session.notice = 'E-posta adresiniz kayıtlıysa Firebase parola sıfırlama bağlantısı gönderildi.';
            res.redirect('/sifremi-unuttum');
        } catch (error) {
            console.error('Firebase parola sıfırlama isteği başarısız:', error.code || error.message);
            res.status(503).send('Parola sıfırlama şu anda başlatılamıyor. Lütfen daha sonra tekrar deneyin.');
        }
    });

    app.get('/sifre-sifirla', (req, res) => {
        const { token, oobCode } = req.query;
        const html = renderPage({
            title: 'Parola Sıfırla',
            body: renderReset({ csrf: getCsrf(req), token, oobCode, error: req.session?.flash || null })
        });
        delete req.session?.flash;
        res.type('html').send(html);
    });
    app.post('/sifre-sifirla', requireCsrf, async (req, res) => {
        const { token, oobCode, password: pwd, password2 } = req.body || {};
        const redirectUrl = oobCode
            ? `/sifre-sifirla?oobCode=${encodeURIComponent(oobCode)}`
            : `/sifre-sifirla?token=${encodeURIComponent(token || '')}`;
        if (!pwd || pwd.length < 8) {
            req.session.flash = 'Yeni parola en az 8 karakter olmalı.';
            return res.redirect(redirectUrl);
        }
        if (pwd !== password2) {
            req.session.flash = 'Parolalar eşleşmiyor.';
            return res.redirect(redirectUrl);
        }

        if (oobCode) {
            try {
                const result = await firebaseAuth.resetPassword(oobCode, pwd);
                const user = data.userByEmail(String(result.email || '').trim().toLowerCase());
                if (user) {
                    const authUser = await firebaseAuth.getUserByEmail(user.email);
                    user.firebaseUid = authUser.uid;
                    delete user.password;
                    await firestoreAdmin.syncUserProfile(user, authUser.uid);
                    data.saveUser(user);
                    audit.log({ type: 'password-reset', req, actorId: user.id });
                }
                req.session.notice = 'Parolanız güncellendi.';
                return res.redirect('/giris');
            } catch (error) {
                if (!['INVALID_OOB_CODE', 'EXPIRED_OOB_CODE', 'USER_DISABLED'].includes(error.code)) {
                    console.error('Firebase parola sıfırlama başarısız:', error.code || error.message);
                    return res.status(503).send('Parola sıfırlama şu anda tamamlanamıyor. Lütfen daha sonra tekrar deneyin.');
                }
                req.session.flash = 'Bağlantı geçersiz veya süresi dolmuş.';
                return res.redirect('/sifremi-unuttum');
            }
        }

        let entry = null, userId = null;
        for (const u of data.users()) {
            const e = data._raw.read('pwreset-' + u.id, null);
            if (e && e.token === token && e.exp > Date.now()) { entry = e; userId = u.id; break; }
        }
        if (!entry) {
            req.session.flash = 'Bağlantı geçersiz veya süresi dolmuş.';
            return res.redirect('/sifremi-unuttum');
        }
        const user = data.userById(userId);
        try {
            let authUser;
            try {
                authUser = await firebaseAuth.updateUserByEmail(user.email, { password: pwd });
            } catch (error) {
                if (error.code !== 'auth/user-not-found') throw error;
                authUser = await firebaseAuth.createUser(user.email, pwd, `${user.firstName} ${user.lastName}`.trim());
            }
            user.firebaseUid = authUser.uid;
            delete user.password;
            await firestoreAdmin.syncUserProfile(user, authUser.uid);
            data.saveUser(user);
        } catch (error) {
            console.error('Firebase parola güncellemesi başarısız:', error.code || error.message);
            return res.status(503).send('Parola güncellenemedi. Lütfen daha sonra tekrar deneyin.');
        }
        data._raw.write('pwreset-' + user.id, null);
        audit.log({ type: 'password-reset', req, actorId: user.id });
        req.session.notice = 'Parolanız güncellendi.';
        res.redirect('/giris');
    });

    /* ── 2FA doğrulama ── */
    app.get('/2fa', (req, res) => {
        if (!req.session?.pending2fa) return res.redirect('/giris');
        if (isAuthed(req)) return res.redirect('/profil');
        const userId = req.session.pending2fa;
        const user = data.userById(userId);
        if (!user || user.banned) { delete req.session.pending2fa; return res.redirect('/giris'); }
        const mode = req.query.mode === 'recovery' ? 'recovery' : 'totp';
        const html = renderPage({
            title: 'Doğrulama',
            body: render2FAGate({ email: user.email, mode, csrf: getCsrf(req), remaining: totp.secondsRemaining() })
        });
        res.type('html').send(html);
    });

    app.post('/2fa', requireCsrf, (req, res) => {
        if (!req.session?.pending2fa) return res.redirect('/giris');
        const userId = req.session.pending2fa;
        const user = data.userById(userId);
        if (!user || user.banned) { delete req.session.pending2fa; return res.redirect('/giris'); }

        let ok = false;
        if (req.body.recovery) {
            ok = consumeRecoveryCode(userId, req.body.recovery);
            if (ok) audit.log({ type: '2fa-recovery', req, actorId: userId });
        } else if (req.body.token) {
            const rec = tfaStore(userId);
            if (rec && rec.enabled && totp.verify(rec.secret, req.body.token)) ok = true;
        }
        if (!ok) {
            audit.log({ type: '2fa-failed', req, actorId: userId });
            return res.redirect('/2fa?error=Kod%20hatal%C4%B1%20veya%20s%C3%BCresi%20dolmu%C5%9F');
        }
        delete req.session.pending2fa;
        recordLogin(user);
        loginAs(req, user);
        audit.log({ type: '2fa-ok', req, actorId: userId });
        res.redirect('/profil');
    });

    /* ── Profil ── */
    app.get('/profil', requireAuth, (req, res) => {
        const user = loadUser(req);
        const tfaOn = is2faEnabled(user.id);
        const email = String(user.email || '').trim().toLowerCase();
        const messages = data.messages()
            .filter(message => message.userId
                ? String(message.userId) === String(user.id)
                : String(message.email || '').trim().toLowerCase() === email)
            .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        const html = renderPage({ title: 'Profil', body: renderProfile({ user, csrf: getCsrf(req), tfaOn, messages }), current: 'profil', user });
        res.type('html').send(html);
    });

    app.get('/profil/duzenle', requireAuth, (req, res) => {
        const user = loadUser(req);
        const html = renderPage({ title: 'Profili Düzenle', body: renderProfileEdit({ user, csrf: getCsrf(req), flash: req.session?.flash }), current: 'profil', user });
        delete req.session?.flash;
        res.type('html').send(html);
    });

    app.post('/profil/duzenle', requireAuth, requireCsrf, async (req, res) => {
        const user = loadUser(req);
        if (!user) return res.redirect('/giris');
        const { firstName, lastName, phone, addressLine, city, zip, country } = req.body || {};
        if (firstName) user.firstName = firstName;
        if (lastName)  user.lastName = lastName;
        if (phone)     user.phone = phone;
        user.address = { line1: addressLine || '', city: city || '', zip: zip || '', country: country || 'Türkiye' };
        try {
            if (user.firebaseUid) await firestoreAdmin.syncUserProfile(user, user.firebaseUid);
            data.saveUser(user);
        } catch (error) {
            console.error('Profil Firebase ile eşitlenemedi:', error.code || error.message);
            return res.status(503).send('Profiliniz Firebase ile eşitlenemedi. Lütfen tekrar deneyin.');
        }
        audit.log({ type: 'profile-update', req, actorId: user.id });
        req.session.notice = 'Profil güncellendi.';
        res.redirect('/profil/duzenle');
    });

    /* ── 2FA kurulum ── */
    app.get('/profil/2fa', requireAuth, (req, res) => {
        const user = loadUser(req);
        if (!user) return res.redirect('/giris');
        let rec = tfaStore(user.id);
        if (!rec || !rec.pendingSecret) {
            rec = { pendingSecret: totp.generateSecret(), pendingEmail: user.email };
            saveTfa(user.id, rec);
        }
        const html = renderPage({
            title: '2FA Kurulumu',
            body: render2FASetup({
                email: user.email,
                secret: rec.pendingSecret,
                uri: totp.otpauthUri(rec.pendingSecret, user.email),
                alreadyOn: is2faEnabled(user.id),
                csrf: getCsrf(req)
            }),
            current: 'profil', user
        });
        res.type('html').send(html);
    });

    app.post('/profil/2fa', requireAuth, requireCsrf, (req, res) => {
        const user = loadUser(req);
        if (!user) return res.redirect('/giris');
        const rec = tfaStore(user.id);
        if (!rec || !rec.pendingSecret) return res.redirect('/profil/2fa');
        if (!totp.verify(rec.pendingSecret, req.body.token)) {
            audit.log({ type: '2fa-setup-failed', req, actorId: user.id });
            return res.redirect('/profil/2fa?error=Kod%20hatal%C4%B1');
        }
        const codes = generateRecoveryCodes();
        saveTfa(user.id, {
            enabled: true,
            secret: rec.pendingSecret,
            email: user.email,
            recoveryHashes: codes.map(c => crypto.createHash('sha256').update(c).digest('hex')),
            enabledAt: new Date().toISOString()
        });
        audit.log({ type: '2fa-enabled', req, actorId: user.id });
        const html = renderPage({
            title: 'Kurtarma Kodları',
            body: renderRecoveryCodes({ codes }),
            current: 'profil', user
        });
        res.type('html').send(html);
    });

    app.post('/profil/2fa/kapat', requireAuth, requireCsrf, async (req, res) => {
        const user = loadUser(req);
        if (!user) return res.redirect('/giris');
        try {
            await firebaseAuth.signInWithPassword(user.email, req.body.password || '');
        } catch (error) {
            if (firebaseAuth.isCredentialError(error)) {
                audit.log({ type: '2fa-disable-failed', req, actorId: user.id });
                return res.redirect('/profil/2fa?error=Parola%20hatal%C4%B1');
            }
            console.error('Firebase parolası doğrulanamadı:', error.code || error.message);
            return res.status(503).send('Parola şu anda doğrulanamıyor. Lütfen daha sonra tekrar deneyin.');
        }
        clearTfa(user.id);
        audit.log({ type: '2fa-disabled', req, actorId: user.id });
        req.session.notice = 'İki faktörlü doğrulama kapatıldı.';
        res.redirect('/profil');
    });

    /* ── Çıkış ── */
    app.get('/cikis', (req, res) => {
        const userId = req.session?.userId;
        if (userId) audit.log({ type: 'logout', req, actorId: userId });
        req.session.destroy(() => res.redirect('/'));
    });
};
