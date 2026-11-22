/* ═══════════════════════════════════════════════════════════════
   modules/admin/routes.js — Yönetim rotaları.
   Kimlik doğrulama ./auth.js içindedir (gizli giriş adresi,
   parola + TOTP). Burada yalnızca panel kabuğu ve /admin/api/*
   uçları tanımlanır. Doğrulanmamış istekler 404 alır.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const audit = require('../../core/audit');
const firebaseAuth = require('../../core/firebase-auth');
const firestoreAdmin = require('../../core/firestore-admin');
const admins = require('../../core/admin-accounts');
const data = require('../../data');
const waitlist = require('../../core/waitlist');
const registerAdminAuth = require('./auth');
const { requireAdminPage, requireAdminApi, STEP } = registerAdminAuth;
const { renderAdminShell, renderAdminDashboardHTML, renderAdminAuth, renderAdminSecurity } = require('./views');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

module.exports = function (app, { generateCsrf, requireCsrf }) {
    const csrf = (req) => generateCsrf(req);
    const actor = (req) => 'admin:' + req.admin.id;

    registerAdminAuth(app, { generateCsrf, requireCsrf });

    /* ── Panel kabuğu ── */
    app.get('/admin', requireAdminPage, (req, res) => {
        const allTxns = data.transactions();
        const recent = audit.recent(10);
        const today = new Date().toDateString();
        const sumToday = (type) => allTxns
            .filter(t => t.type === type && new Date(t.date || t.createdAt).toDateString() === today)
            .reduce((a, t) => a + Number(t.amount || 0), 0);

        const initData = {
            stats: {
                totalUsers: data.users().length,
                totalProducts: data.projects().length,
                totalUpdates: data.updates().length,
                totalUpcoming: data.upcoming().length,
                pendingMessages: data.messages().filter(m => !m.read).length,
                pendingForms: data.forms().filter(f => f.status === 'Yeni').length,
                todayIncome: sumToday('income'),
                todayExpense: sumToday('expense')
            },
            recent, transactions: allTxns
        };

        const html = renderAdminDashboardHTML(initData);
        res.type('html').send(renderAdminShell({ admin: req.admin, csrf: csrf(req), content: html }));
    });

    app.get('/admin/guvenlik', requireAdminPage, (req, res) => {
        res.type('html').send(renderAdminAuth({
            title: 'Güvenlik',
            body: renderAdminSecurity({
                admin: req.admin, csrf: csrf(req), paths: STEP,
                recoveryLeft: (req.admin.totp?.recoveryHashes || []).length
            })
        }));
    });

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
            audit.log({ type: `admin-${name}-create`, req, actorId: actor(req), detail: item.id });
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
            audit.log({ type: `admin-${name}-update`, req, actorId: actor(req), detail: req.params.id });
            res.json({ item: items[idx] });
        });
        app.delete(get(name), requireAdminApi, requireCsrf, (req, res) => {
            const items = store();
            const next = items.filter(x => String(x.id) !== req.params.id);
            if (next.length === items.length) return res.status(404).json({ error: 'Bulunamadı' });
            data._raw.write(name === 'products' ? 'projects' : (name === 'upcoming' ? 'upcoming-projects' : name), next);
            audit.log({ type: `admin-${name}-delete`, req, actorId: actor(req), detail: req.params.id });
            res.json({ ok: true });
        });
    }

    const { productValidate, upcomingValidate, isSafeImageUrl, requiredString } = require('./validation');
    /* Güncelleme doğrulayıcısı ürün kaydına erişmesi gerektiği için
       burada kalır; görsel şeması kontrolü validation.js ile ortak. */
    const updateValidate = (b) => {
        if (!requiredString(b.title)) return { ok: false, error: 'Güncelleme başlığı zorunlu' };
        if (!b.productId) return { ok: false, error: 'Bir ürün seçin' };
        const project = data.projectById(b.productId);
        if (!project) return { ok: false, error: 'Ürün bulunamadı' };
        if (b.image && !isSafeImageUrl(b.image)) return { ok: false, error: 'Görsel adresi geçersiz' };
        return { ok: true, value: {
            title: b.title.trim(), version: b.version || '', date: b.date || '',
            description: b.description || '', productId: project.id,
            projectName: project.name, image: b.image || ''
        } };
    };
    const messageValidate = (b) => b.id ? { ok: true, value: b } : { ok: false, error: 'ID eksik' };

    makeResource({ name: 'products',  store: () => data.projects(),       validate: productValidate });
    makeResource({ name: 'updates',   store: () => data.updates(),        validate: updateValidate });
    makeResource({ name: 'upcoming',  store: () => data.upcoming(),       validate: upcomingValidate });

    /* ── Ürün dosyası yükleme (cihazdan) ── */
    const UPLOAD_DIR = path.join(__dirname, '..', '..', '..', 'data', 'uploads', 'products');

    /* Yalnızca beyaz listedeki uzantı ve MIME türleri kabul edilir.
       Arayüz dışından gelen bir dosya adı (.html, .js, .php …)
       sunucuya yazılırsa uzaktan kod çalıştırma riski doğar. */
    const {
        ALLOWED_UPLOAD_EXTENSIONS,
        isAllowedUpload,
        uploadRejectedMessage
    } = require('./upload-policy');

    const productUpload = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                fs.mkdirSync(UPLOAD_DIR, { recursive: true });
                cb(null, UPLOAD_DIR);
            },
            filename: (req, file, cb) => {
                const ext = (path.extname(file.originalname || '') || '').slice(0, 16).replace(/[^A-Za-z0-9_.-]/g, '');
                cb(null, crypto.randomBytes(8).toString('hex') + ext);
            }
        }),
        limits: { fileSize: 500 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!isAllowedUpload(file.originalname, file.mimetype)) {
                return cb(new Error(uploadRejectedMessage()));
            }
            cb(null, true);
        }
    });

    app.post('/admin/api/products/upload', requireAdminApi, requireCsrf, (req, res) => {
        productUpload.single('file')(req, res, (err) => {
            if (err) {
                const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Dosya 500 MB sınırını aşıyor.' : (err.message || 'Dosya yüklenemedi.');
                return res.status(400).json({ error: msg });
            }
            if (!req.file) return res.status(400).json({ error: 'Dosya seçilmedi.' });
            audit.log({ type: 'admin-product-upload', req, actorId: actor(req), detail: `${req.file.originalname} -> ${req.file.filename}` });
            res.status(201).json({ ok: true, file: {
                name: String(req.file.originalname || 'urun-dosyasi').slice(0, 255),
                stored: req.file.filename,
                size: req.file.size,
                type: req.file.mimetype || 'application/octet-stream',
                uploadedAt: new Date().toISOString()
            } });
        });
    });

    /* Mesajlar: yalnızca okuma ve read-toggle */
    app.get('/admin/api/messages', requireAdminApi, (req, res) => res.json({ items: data.messages() }));
    app.post('/admin/api/messages/:id/read', requireAdminApi, requireCsrf, (req, res) => {
        const m = data.messages().find(x => String(x.id) === req.params.id);
        if (!m) return res.status(404).json({ error: 'Bulunamadı' });
        m.read = true;
        data.saveMessage(m);
        audit.log({ type: 'admin-message-read', req, actorId: actor(req), detail: m.id });
        res.json({ ok: true });
    });

    app.post('/admin/api/messages/:id/status', requireAdminApi, requireCsrf, (req, res) => {
        const m = data.messages().find(x => String(x.id) === req.params.id);
        if (!m) return res.status(404).json({ error: 'Bulunamadı' });
        const status = req.body.status || 'İşlendi';
        if (!['Yeni', 'İşlendi'].includes(status)) {
            return res.status(400).json({ error: 'Geçersiz durum.' });
        }
        m.status = status;
        data.saveMessage(m);
        audit.log({ type: 'admin-message-status', req, actorId: actor(req), detail: `${m.id}->${status}` });
        res.json({ ok: true, item: m });
    });
    app.delete('/admin/api/messages/:id', requireAdminApi, requireCsrf, (req, res) => {
        const ok = data.removeMessage(req.params.id);
        if (!ok) return res.status(404).json({ error: 'Bulunamadı' });
        audit.log({ type: 'admin-message-delete', req, actorId: actor(req), detail: req.params.id });
        res.json({ ok: true });
    });

    /* Müşteri formları */
    app.get('/admin/api/forms', requireAdminApi, (req, res) => res.json({ items: data.forms() }));
    app.post('/admin/api/forms/:id/status', requireAdminApi, requireCsrf, (req, res) => {
        const f = data.forms().find(x => String(x.id) === req.params.id);
        if (!f) return res.status(404).json({ error: 'Bulunamadı' });
        f.status = req.body.status || 'İşlendi';
        data.saveForm(f);
        audit.log({ type: 'admin-form-status', req, actorId: actor(req), detail: `${f.id}->${f.status}` });
        res.json({ ok: true, item: f });
    });

    app.post('/admin/api/waitlist/:id/notify', requireAdminApi, requireCsrf, async (req, res) => {
        try {
            const result = await waitlist.notifyFor(req.params.id);
            audit.log({ type: 'admin-waitlist-notify', req, actorId: actor(req), detail: `product=${req.params.id},sent=${result.sent}` });
            res.json({ ok: true, ...result });
        } catch (error) {
            res.status(500).json({ error: 'Bildirim gönderilemedi.' });
        }
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
        audit.log({ type: 'admin-user-update', req, actorId: actor(req), detail: `user=${u.id}; passwordChanged=${Boolean(newPassword)}` });
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
        audit.log({ type: 'admin-user-ban', req, actorId: actor(req), detail: `${u.id}->${u.banned}` });
        res.json({ ok: true });
    });
    app.post('/admin/api/users/:id/admin', requireAdminApi, requireCsrf, async (req, res) => {
        const u = data.userById(req.params.id);
        if (!u) return res.status(404).json({ error: 'Bulunamadı' });
        const nextIsAdmin = !u.isAdmin;
        try {
            await firestoreAdmin.setAdminEnabled(u.email, nextIsAdmin);
            u.isAdmin = nextIsAdmin;
            data.saveUser(u);
        } catch (error) {
            console.error('Kullanıcı admin yetkisi güncellenemedi:', error);
            return res.status(503).json({ error: 'Admin yetkisi Firestore ile eşitlenemedi; rol değiştirilmedi.' });
        }
        audit.log({ type: 'admin-user-admin', req, actorId: actor(req), detail: `${u.id}->${u.isAdmin}` });
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
        audit.log({ type: 'admin-banned-add', req, actorId: actor(req), detail: type === 'passwords' ? 'password rule added' : `${type}=${normalized}` });
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
            type: 'admin-banned-remove', req, actorId: actor(req),
            detail: type === 'passwords' ? 'password rule removed' : `${type}=${value}`
        });
        res.json({ ok: true });
    });

    /* Denetim günlüğü */
    app.get('/admin/api/audit', requireAdminApi, (req, res) => res.json({ items: audit.recent(100) }));
};
