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
const nodemailer = require('nodemailer');

const config = require('./config');
const { esc } = require('./core/views');
const { asset } = require('./modules/public/assets');
const audit = require('./core/audit');
const data = require('./data');
const store = require('./data/store');

/* ── Uygulama ────────────────────────────────────────────────── */
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ── Güvenlik başlıkları ────────────────────────────────────── */
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            /* 'unsafe-inline' kaldırıldı: şablon içi <script> blokları
               ve onclick/onsubmit gibi satır içi olay işleyicileri
               artık çalıştırılmaz. Tüm betikler public/js/ altından
               <script src="..."> ile yüklenir. */
            scriptSrc:  ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
            scriptSrcAttr: ["'none'"],
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
/* Uygulama genelinde tek bir uygulama: token üretimi ve doğrulama
   core/csrf.js içinde. Alan adı `_csrf` — tüm POST formları bu
   gizli alanı içermelidir. */
const { generateCsrf, requireCsrf } = require('./core/csrf');

/* ── Oturum bilgisi (tüm şablonlara aktarılır) ─────────────── */
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
   OTOMATİK PROJE HATIRLATMA (1 DK) VE AYLIK ANALİZ (30 GÜN)
   ═══════════════════════════════════════════════════════════════ */
const mailTransporter = config.smtp ? nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    requireTLS: config.smtp.requireTLS,
    auth: config.smtp.auth
}) : null;

function readTracking() {
    return store.read('tracking', { pendingProjects: [], monthlyLog: {} });
}

function writeTracking(state) {
    store.write('tracking', state);
}

async function sendWhatsAppMessage(phone, text) {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    if (!apiUrl || !apiToken) {
        console.log(`[WhatsApp Simülasyon -> ${phone}]: ${text}`);
        return;
    }
    const cleanPhone = String(phone).replace(/\D/g, '');
    await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({ to: cleanPhone, message: text })
    });
}

async function sendUserNotification(user, subject, text) {
    try {
        if (user.phone && String(user.phone).trim() !== '') {
            await sendWhatsAppMessage(user.phone, text);
        } else if (user.email) {
            if (mailTransporter) {
                await mailTransporter.sendMail({
                    from: config.smtp.from,
                    to: user.email,
                    subject,
                    text
                });
            } else {
                console.log(`[E-posta Simülasyon -> ${user.email}]: ${text}`);
            }
        }
    } catch (err) {
        console.error('Bildirim gönderim hatası:', err.message);
    }
}

function recordPendingProject(userId, projectId) {
    if (!userId || !projectId) return;
    const project = data.projectById(projectId);
    if (!project) return;

    const state = readTracking();
    const existing = state.pendingProjects.find(
        c => String(c.userId) === String(userId) && String(c.projectId) === String(project.id) && !c.completed
    );
    if (existing) {
        existing.leftAt = null;
        existing.notified = false;
        existing.updatedAt = Date.now();
    } else {
        state.pendingProjects.push({
            userId: String(userId),
            projectId: String(project.id),
            projectName: project.name,
            leftAt: null,
            notified: false,
            completed: false,
            updatedAt: Date.now()
        });
    }
    writeTracking(state);
}

function completePendingProject(userId, projectId) {
    if (!userId || !projectId) return;
    const state = readTracking();
    let changed = false;
    for (const item of state.pendingProjects) {
        if (String(item.userId) === String(userId) && String(item.projectId) === String(projectId) && !item.completed) {
            item.completed = true;
            changed = true;
        }
    }
    if (changed) writeTracking(state);
}

// Public rotalardan ÖNCE çalışır: incelenen ve yarım bırakılan projeleri yakalar
app.use((req, res, next) => {
    if (req.user) {
        const viewMatch = req.path.match(/^\/(?:urun|satin-al)\/([^/]+)$/);
        const doneMatch = req.path.match(/^\/(?:satin-al\/([^/]+)\/onayla|indir\/([^/]+))$/);
        if (viewMatch && req.method === 'GET') {
            recordPendingProject(req.user.id, decodeURIComponent(viewMatch[1]));
        } else if (doneMatch) {
            completePendingProject(req.user.id, decodeURIComponent(doneMatch[1] || doneMatch[2]));
        }
    }
    next();
});

app.post('/api/track/exit', (req, res) => {
    if (req.user) {
        const state = readTracking();
        const now = Date.now();
        let changed = false;
        for (const item of state.pendingProjects) {
            if (String(item.userId) === String(req.user.id) && !item.completed && !item.notified && !item.leftAt) {
                item.leftAt = now;
                changed = true;
            }
        }
        if (changed) writeTracking(state);
    }
    res.status(204).end();
});

app.post('/api/track/active', (req, res) => {
    if (req.user) {
        const state = readTracking();
        let changed = false;
        for (const item of state.pendingProjects) {
            if (String(item.userId) === String(req.user.id) && !item.completed && !item.notified && item.leftAt) {
                item.leftAt = null;
                changed = true;
            }
        }
        if (changed) writeTracking(state);
    }
    res.status(204).end();
});

setInterval(async () => {
    const now = Date.now();
    const state = readTracking();
    let changed = false;

    // 1) Site kapatıldıktan 1 dakika sonra yarım bırakılan proje hatırlatması
    const dueByUser = new Map();
    for (const item of state.pendingProjects) {
        if (!item.completed && !item.notified && item.leftAt && (now - item.leftAt >= 60 * 1000)) {
            if (!dueByUser.has(item.userId)) dueByUser.set(item.userId, []);
            dueByUser.get(item.userId).push(item);
        }
    }

    for (const [userId, items] of dueByUser.entries()) {
        const user = data.userById(userId);
        for (const item of items) {
            item.notified = true;
            changed = true;
        }
        if (!user || user.banned) continue;

        const names = items.map(i => i.projectName).join(', ');
        const msg = `Karahan's Studio: İncelediğin ${names} projesi seni bekliyor. İşlemini tamamlamak için siteye dönebilirsin.`;
        await sendUserNotification(user, 'İncelediğin Proje Seni Bekliyor', msg);
    }

    // 2) Her ay (30 günde bir) gezilen proje analizi ve öneri mesajı
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const allProjects = data.projects();

    for (const user of data.users()) {
        if (user.banned) continue;
        const lastSent = Number(state.monthlyLog[user.id]) || new Date(user.createdAt || now).getTime();
        if (now - lastSent < THIRTY_DAYS_MS) continue;

        const recentViews = (Array.isArray(user.viewedProducts) ? user.viewedProducts : [])
            .filter(v => now - new Date(v.viewedAt).getTime() <= THIRTY_DAYS_MS);

        if (recentViews.length === 0) {
            state.monthlyLog[user.id] = now;
            changed = true;
            continue;
        }

        const categoryCounts = {};
        const viewedIds = new Set();
        for (const v of recentViews) {
            viewedIds.add(String(v.productId));
            const proj = allProjects.find(p => String(p.id) === String(v.productId));
            const cat = proj?.category || 'Araç';
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }

        const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        let recommended = allProjects.filter(p => p.category === topCategory && !viewedIds.has(String(p.id))).slice(0, 3);
        if (recommended.length === 0) {
            recommended = allProjects.filter(p => p.category === topCategory).slice(0, 3);
        }

        if (recommended.length > 0) {
            const recNames = recommended.map(p => p.name).join(', ');
            const msg = `Senin için birkaç tane proje bulundu: ${recNames}. İncelemek için Karahan's Studio'yu ziyaret edebilirsin.`;
            await sendUserNotification(user, 'Senin İçin Yeni Projeler Bulundu', msg);
        }

        state.monthlyLog[user.id] = now;
        changed = true;
    }

    if (changed) writeTracking(state);
}, 15 * 1000);

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