/* ═══════════════════════════════════════════════════════════════
   src/server.js — Giriş noktası.
   Tüm modüller (public, auth, admin, API) burada yüklenir
   ve route'lar yönlendirilir. Tek bir Express uygulaması,
   yapılandırılmış middleware sırası.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const path    = require('node:path');
const crypto  = require('node:crypto');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet  = require('helmet');
const compression = require('compression');
const SQLiteStore = require('connect-sqlite3')(session);
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { esc } = require('./core/views');
const { asset } = require('./modules/public/assets');
const audit = require('./core/audit');

/* ── Uygulama ────────────────────────────────────────────────── */
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ── Güvenlik başlıkları ────────────────────────────────────── */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
            styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
            fontSrc:    ["'self'", 'https://fonts.gstatic.com', 'data:'],
            imgSrc:     ["'self'", 'data:', 'https:'],
            connectSrc:  ["'self'"],
            frameAncestors: ["'none'"],
            baseUri:     ["'self'"],
            formAction:  ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

/* ── Sıkıştırma (Brotli, gzip otomatik) ─────────────────────── */
app.use(compression());

/* ── İstek ayrıştırma ───────────────────────────────────────── */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

/* ── Oturum ─────────────────────────────────────────────────── */
app.use(session({
    store: new SQLiteStore({ db: 'sessions.sqlite', dir: config.isProd ? path.join(__dirname, '..', 'data') : './data' }),
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    name: config.session.cookieName,
    rolling: config.session.rolling,
    cookie: {
        secure: config.isProd,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: config.session.maxAgeMs,
        path: '/'
    }
}));

/* ── Statik varlıklar (sürümlü URL'lerle) ────────────────────── */
app.use(express.static(path.join(__dirname, '..', 'public'), {
    maxAge: config.isProd ? '30d' : 0,
    etag: true,
    setHeaders(res, file) {
        if (/\.(?:css|js|woff2?|png|jpe?g|svg|webp|avif|ico|webmanifest)$/i.test(file)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        }
    }
}));

/* ── Hız sınırlama ──────────────────────────────────────────── */
app.use('/api/',  rateLimit({ windowMs: 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false }));
app.use('/giris', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: 'Çok fazla deneme. Lütfen bekleyin.' }));
app.use('/kayit', rateLimit({ windowMs: 60 * 60 * 1000, max: 5,  standardHeaders: true, legacyHeaders: false, message: 'Çok fazla kayıt denemesi.' }));
app.use('/sifremi-unuttum', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: 'Çok fazla istek.' }));
app.use('/2fa',    rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: 'Çok fazla deneme.' }));
app.use(config.admin.loginPath, rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: 'Çok fazla yönetici giriş denemesi.' }));

/* ── CSRF ────────────────────────────────────────────────────── */
function generateCsrf(req) {
    if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
    return req.session.csrf;
}
function requireCsrf(req, res, next) {
    const sent = req.body?._csrf || req.headers['x-csrf-token'];
    if (!req.session.csrf || sent !== req.session.csrf) {
        return res.status(403).send('Geçersiz istek. Lütfen sayfayı yenileyin.');
    }
    next();
}

/* ── Oturum bilgisi (tüm şablonlara aktarılır) ─────────────── */
const data = require('./data');
app.use((req, res, next) => {
    res.locals = res.locals || {};
    res.locals.path   = req.path;
    res.locals.origin = `${req.protocol}://${req.get('host')}`;
    res.locals.user   = req.session?.authenticatedBy === 'firebase' && req.session.userId ? data.userById(req.session.userId) : null;
    req.user          = res.locals.user;
    res.locals.admin  = null;
    next();
});

app.use((req, res, next) => {
    const banned = data.banned();
    const ip = req.ip || req.socket?.remoteAddress;
    const user = req.session?.userId ? data.userById(req.session.userId) : null;
    if (banned.ips?.includes(ip) || user?.banned) {
        const { renderBanned } = require('./modules/public/misc');
        const { renderPage } = require('./modules/public/layout');
        const reason = user?.banned ? 'Hesabınızın siteye erişimi engellenmiştir.' : '';
        return res.status(403).send(renderPage({
            title: 'Erişim engellendi',
            body: renderBanned(reason),
            current: '',
            user
        }));
    }
    next();
});

/* ═══════════════════════════════════════════════════════════════
   ROTALAR — her modül kendi dosyasında tanımlı, burada bağlanır
   ═══════════════════════════════════════════════════════════════ */

require('./modules/public/routes')(app, { generateCsrf, requireCsrf });
require('./modules/auth/routes')(app, { generateCsrf, requireCsrf });
require('./modules/admin/routes')(app, { generateCsrf, requireCsrf });

/* ── Hata yakalama ──────────────────────────────────────────── */
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err);
    if (res.headersSent) return next(err);
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({ error: 'Sunucu hatası.' });
    }
    res.status(500).send('Sunucu hatası.');
});

/* ═══ 404 ve yasak sayfası ═══ */
app.use((req, res) => {
    const { renderNotFound } = require('./modules/public/misc');
    const { renderPage } = require('./modules/public/layout');
    const body = renderNotFound();
    res.status(404).send(renderPage({ title: 'Sayfa bulunamadı', body, current: '', user: req.user }));
});

/* ── Sunucu ─────────────────────────────────────────────────── */
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`╭─ Karahan's Studio v2`);
    console.log(`│ Ortam: ${config.env}  |  Port: ${PORT}`);
    console.log(`│ http://localhost:${PORT}`);
    console.log(`╰─ Sıkıştırma, helmet, rate limit aktif`);
});
