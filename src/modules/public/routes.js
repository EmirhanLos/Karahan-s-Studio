/* ═══════════════════════════════════════════════════════════════
   modules/public/routes.js — Genel site rotaları.
   Sayfa render'ları misc / product / home'dan gelir; auth ve
   admin kendi modüllerinde tanımlanır.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { renderPage } = require('./layout');
const { renderHome, renderProjectCard } = require('./home');
const { renderProjects } = require('./projects');
const { renderProduct, renderCheckout, getProductUpdates } = require('./product');
const { renderAbout, renderUpdates, renderUpdateDetail, renderUpcoming, renderContact, renderCustomerForm, renderLegal, renderNotFound } = require('./misc');
const data = require('../../data');
const firestoreAdmin = require('../../core/firestore-admin');
const waitlist = require('../../core/waitlist');
const audit = require('../../core/audit');
const path = require('path');

function send(res, status, html) { res.status(status).type('html').send(html); }

function applyCdnCache(req, res, maxAge = 0, sMaxAge = 300) {
    res.setHeader('Vary', 'Cookie, Accept-Encoding');
    if (!req.session?.userId && !req.user) {
        res.setHeader('Cache-Control', `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=600`);
    } else {
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    }
}

function bannedHtml(req, reason = '') {
    const { renderBanned } = require('./misc');
    return renderPage({ title: 'Erişim engellendi', body: renderBanned(reason), user: req.user, noindex: true });
}

function viewProduct(req, id) {
    const p = data.projectById(id);
    const body = renderProduct(p, req.user);
    if (!p) {
        return renderPage({ title: 'Proje bulunamadı', body, current: 'projeler', user: req.user, noindex: true });
    }

    const finalPrice = p.isFree ? 0 : (p.discount > 0 ? p.price * (100 - p.discount) / 100 : p.price);
    const origin = `${req.protocol}://${req.get('host')}`;
    const canonical = `${origin}/urun/${encodeURIComponent(p.id)}`;
    const productSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": p.name,
        "description": p.summary || p.tagline || p.description || `${p.name} - Karahan's Studio`,
        "applicationCategory": p.category || "Utility",
        "operatingSystem": Array.isArray(p.platforms) && p.platforms.length ? p.platforms.join(', ') : "Windows, macOS, Linux",
        "image": p.image ? (p.image.startsWith('http') ? p.image : `${origin}${p.image}`) : `${origin}/images/ai.png`,
        "offers": {
            "@type": "Offer",
            "price": p.isFree ? "0" : String(finalPrice),
            "priceCurrency": "TRY",
            "availability": (p.status === 'Yayında' || p.status === 'Beta') ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
            "url": canonical
        },
        ...(p.rating ? {
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": p.rating,
                "reviewCount": p.reviewCount || 1,
                "bestRating": "5",
                "worstRating": "1"
            }
        } : {})
    };

    const breadcrumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Ana Sayfa", "item": origin },
            { "@type": "ListItem", "position": 2, "name": "Projeler", "item": `${origin}/projeler` },
            { "@type": "ListItem", "position": 3, "name": p.name, "item": canonical }
        ]
    };

    return renderPage({
        title: `${p.name} — Özellikler ve İndir`,
        description: p.summary || p.tagline || p.description,
        body,
        current: `urun/${p.id}`,
        canonical,
        og: {
            title: `${p.name} · Karahan's Studio`,
            description: p.summary || p.tagline || p.description,
            type: 'product',
            image: p.image || '/images/ai.png'
        },
        schema: [productSchema, breadcrumbs],
        user: req.user
    });
}

function viewContact(req, { error, success, values }, generateCsrf) {
    const csrf = generateCsrf(req);
    const body = renderContact({ error, success, csrf, values: values || {} });
    return renderPage({ title: 'İletişim', body, current: 'iletisim', user: req.user });
}

function viewCustomerForm(req, projectId, { error, success, values } = {}, generateCsrf) {
    const project = projectId ? data.projectById(projectId) : null;
    const csrf = generateCsrf(req);
    const body = renderCustomerForm({ project, error, success, csrf, values: values || {} });
    return renderPage({ title: 'Müşteri Formu', body, current: 'iletisim', user: req.user });
}

module.exports = function (app, { generateCsrf, requireCsrf }) {
    /* ── Ana sayfa ── */
    app.get('/', (req, res) => {
        applyCdnCache(req, res, 0, 15);
        send(res, 200, renderPage({
            title: 'Bağımsız Yazılım ve Oyun Stüdyosu',
            description: 'Günlük hayatı kolaylaştıran masaüstü uygulamalar, sistem araçları ve oyunlar geliştiren bağımsız stüdyo.',
            body: renderHome(),
            current: 'home',
            user: req.user
        }));
    });

    /* ── Projeler (arama ve filtreleme) ── */
    app.get('/projeler', (req, res) => {
        applyCdnCache(req, res, 0, 300);
        send(res, 200, renderPage({
            title: 'Projeler — Masaüstü Uygulamalar ve Araçlar',
            description: 'Karahan\'s Studio tarafından geliştirilen masaüstü yazılımları, sistem araçlarını ve oyunları keşfedin.',
            body: renderProjects(req),
            current: 'projeler',
            user: req.user
        }));
    });

    /* ── Tek proje ── */
    app.get('/urun/:id', async (req, res) => {
        applyCdnCache(req, res, 0, 300);
        const html = viewProduct(req, req.params.id);
        const p = data.projectById(req.params.id);
        if (p && req.session?.authenticatedBy === 'firebase' && req.session.userId) {
            const user = data.userById(req.session.userId);
            if (user) {
                const viewed = Array.isArray(user.viewedProducts) ? user.viewedProducts : [];
                user.viewedProducts = [
                    { productId: p.id, productName: p.name, viewedAt: new Date().toISOString() },
                    ...viewed.filter(item => String(item.productId) !== String(p.id))
                ].slice(0, 50);
                try {
                    if (user.firebaseUid) await firestoreAdmin.syncUserProfile(user, user.firebaseUid);
                    data.saveUser(user);
                } catch (error) {
                    console.error('Ürün görüntüleme kaydı Firebase ile eşitlenemedi:', error.code || error.message);
                }
            }
        }
        send(res, p ? 200 : 404, html);
    });

    /* ── Sepet / karta ekleme ── */
    app.post('/api/cart/track', requireCsrf, async (req, res) => {
        try {
            const { projectId, productId, action = 'add' } = req.body || {};
            if (!projectId && !productId) {
                return res.status(400).json({ error: 'projectId veya productId gerekli.' });
            }
            const user = req.session?.userId ? data.userById(req.session.userId) : null;
            if (!user) {
                return res.status(401).json({ error: 'Oturum gerekli.' });
            }
            const now = new Date().toISOString();
            const existing = data.cartTrackings().filter(t => String(t.userId) === String(user.id));
            const item = {
                id: crypto.randomUUID(),
                userId: user.id,
                userIdStr: user.id,
                projectId: String(projectId || productId),
                productId: String(productId || projectId),
                action,
                createdAt: now,
                updatedAt: now
            };
            data.saveCartTracking(item);
            res.json({ success: true, item });
        } catch (err) {
            console.error('Cart tracking hatası:', err);
            res.status(500).json({ error: 'Sunucu hatası.' });
        }
    });

    /* ── Kullanıcı çıkış/bekleme → bıraktı ── */
    app.post('/api/cart/leave', requireCsrf, async (req, res) => {
        try {
            const { projectId, productId } = req.body || {};
            const user = req.session?.userId ? data.userById(req.session.userId) : null;
            if (!user) {
                return res.status(401).json({ error: 'Oturum gerekli.' });
            }
            const now = new Date().toISOString();
            const existing = data.cartTrackings().filter(t => String(t.userId) === String(user.id));
            const item = {
                id: crypto.randomUUID(),
                userId: user.id,
                projectId: String(projectId || ''),
                productId: String(productId || ''),
                leftAt: now,
                reason: 'browser_close',
                createdAt: now,
                updatedAt: now
            };
            data.saveCartTracking(item);
            res.json({ success: true });
        } catch (err) {
            console.error('Leave tracking hatası:', err);
            res.status(500).json({ error: 'Sunucu hatası.' });
        }
    });

    /* ── Satın alma bilgisi ── */
    app.get('/satin-al/:id', (req, res) => {
        const product = data.projectById(req.params.id);
        if (!product || product.status === 'Yakında' || product.status === 'Geliştirmede') {
            return send(res, 404, renderPage({
                title: 'Ürün bulunamadı',
                body: renderNotFound(),
                current: '',
                user: req.user
            }));
        }
        if (product.isFree || Number(product.price) <= 0) {
            return res.redirect(`/urun/${encodeURIComponent(product.id)}`);
        }
        send(res, 200, renderPage({
            title: `Satın Al · ${product.name}`,
            body: renderCheckout(product),
            current: 'projeler',
            user: req.user
        }));
    });

    /* ── Güncellemeler ── */
    app.get('/guncellemeler', (req, res) => {
        applyCdnCache(req, res, 0, 300);
        send(res, 200, renderPage({
            title: 'Güncelleme Notları ve Yenilikler',
            description: 'Projelerimize ait son güncellemeler, sürüm notları ve değişiklik günlükleri.',
            body: renderUpdates(),
            current: 'guncellemeler',
            user: req.user
        }));
    });
    app.get('/guncellemeler/:productId', (req, res) => {
        applyCdnCache(req, res, 0, 300);
        const product = data.projectById(req.params.productId);
        if (!product) {
            return send(res, 404, renderPage({ body: renderNotFound(), current: 'guncellemeler', user: req.user, noindex: true }));
        }
        send(res, 200, renderPage({
            title: `${product.name} Güncellemeleri`,
            description: `${product.name} projesine ait son sürümler, hata düzeltmeleri ve yeni özellikler.`,
            body: renderUpdates(product),
            current: 'guncellemeler',
            user: req.user
        }));
    });
    app.get('/guncellemeler/:productId/:updateId', (req, res) => {
        applyCdnCache(req, res, 0, 300);
        const product = data.projectById(req.params.productId);
        const update = product && getProductUpdates(product)
            .find(item => String(item.id) === String(req.params.updateId));
        if (!product || !update) {
            return send(res, 404, renderPage({ body: renderNotFound(), current: 'guncellemeler', user: req.user, noindex: true }));
        }
        send(res, 200, renderPage({
            title: `${update.title || 'Güncelleme'} — ${product.name}`,
            description: update.summary || `${product.name} sürüm güncelleme ayrıntıları.`,
            body: renderUpdateDetail(update, product),
            current: 'guncellemeler',
            user: req.user
        }));
    });

    /* ── Yakında ── */
    app.get('/yakinda', (req, res) => {
        applyCdnCache(req, res, 0, 10);
        send(res, 200, renderPage({
            title: 'Yakında Gelecek Projeler',
            description: 'Karahan\'s Studio mutfağında hazırlanan yeni ürünler, deneysel araçlar ve erken erişim projeleri.',
            body: renderUpcoming(req.user),
            current: 'projeler',
            user: req.user
        }));
    });

    /* ── Hakkında ── */
    app.get('/hakkinda', (req, res) => {
        applyCdnCache(req, res, 0, 600);
        send(res, 200, renderPage({
            title: 'Stüdyo Hakkında — Vizyon ve Felsefe',
            description: 'Karahan\'s Studio: Ankara merkezli bağımsız yazılım ve oyun stüdyosu. Fikirleri özenle dijital ürünlere dönüştürüyoruz.',
            body: renderAbout(),
            current: 'hakkinda',
            user: req.user
        }));
    });

    /* ── İletişim ── */
    app.get('/iletisim', (req, res) => {
        const msg = req.session?.flash;
        delete req.session?.flash;
        const html = viewContact(req, msg || {}, generateCsrf);
        send(res, 200, html);
    });
    app.post('/iletisim', requireCsrf, (req, res) => {
        const { name, email, phone, subject, message, consent } = req.body || {};
        if (!name || !email || !subject || !message || !consent) {
            req.session.flash = { error: 'Lütfen tüm zorunlu alanları doldurun.', values: req.body };
            return res.redirect('/iletisim');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            req.session.flash = { error: 'Geçerli bir e-posta girin.', values: req.body };
            return res.redirect('/iletisim');
        }
        try {
            data.saveMessage({
                id: data.nextId(data.messages()),
                ...(req.user?.id ? { userId: req.user.id } : {}),
                name, email, phone, subject, message,
                consent: true,
                status: 'Yeni',
                date: new Date().toISOString(),
                read: false
            });
            audit.log({ type: 'contact-form', req, detail: `email=${email}` });
            req.session.flash = { success: 'En kısa sürede dönüş yapacağız.' };
            res.redirect('/iletisim');
        } catch (e) {
            console.error(e);
            req.session.flash = { error: 'Mesaj gönderilemedi, lütfen tekrar deneyin.' };
            res.redirect('/iletisim');
        }
    });

    /* ── Müşteri formu ── */
    app.get('/musteri-formu', (req, res) => {
        const html = viewCustomerForm(req, null, {}, generateCsrf);
        send(res, 200, html);
    });
    app.get('/musteri-formu/:projectId', (req, res) => {
        const html = viewCustomerForm(req, req.params.projectId, {}, generateCsrf);
        send(res, 200, html);
    });
    app.post('/musteri-formu', requireCsrf, (req, res) => {
        const { firstName, lastName, email, phone, age, budget, projectGoal, additionalInfo, projectId, consent } = req.body || {};
        if (!firstName || !lastName || !email || !phone || !projectGoal || !consent) {
            req.session.flash = { error: 'Lütfen tüm zorunlu alanları doldurun.', values: req.body };
            return res.redirect(projectId ? `/musteri-formu/${projectId}` : '/musteri-formu');
        }
        try {
            data.saveForm({
                id: data.nextId(data.forms()),
                firstName, lastName, email, phone,
                age, budget, projectGoal, additionalInfo,
                projectId, projectName: projectId ? data.projectById(projectId)?.name : null,
                date: new Date().toISOString(),
                status: 'Yeni'
            });
            audit.log({ type: 'customer-form', req, detail: `project=${projectId || '-'}` });
            req.session.flash = { success: 'Talebiniz iletildi, teşekkür ederiz.' };
            res.redirect('/musteri-formu');
        } catch (e) {
            console.error(e);
            req.session.flash = { error: 'Form gönderilemedi.' };
            res.redirect('/musteri-formu');
        }
    });

    /* ── İndirme (dosyalı ürünler) ── */
    app.get('/indir/:id', (req, res) => {
        const p = data.projectById(req.params.id);
        if (!p) return res.status(404).send('Bulunamadı');
        if (p.status === 'Yakında' || p.status === 'Geliştirmede') return res.status(404).send('Bu ürün henüz yayınlanmadı.');

        // Kimliği doğrulanmış kullanıcılar için indirme geçmişini kaydet (kütüphanem / doğrulanmış yorum)
        if (req.session?.userId) {
            try {
                const downloads = data.downloads();
                const already = downloads.find(d =>
                    String(d.userId) === String(req.session.userId) &&
                    String(d.productId) === String(p.id)
                );
                if (!already) {
                    data.saveDownload({
                        id: data.nextId(data.downloads()),
                        userId: req.session.userId,
                        productId: p.id,
                        productName: p.name,
                        downloadedAt: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('İndirme geçmişi kaydı eklenemedi:', error.message);
            }
        }

        const legacy = (typeof p.file === 'string' && p.file) ? p.file : p.deviceFile;
        if (legacy) {
            audit.log({ type: 'download', req, detail: `product=${p.id}` });
            return res.redirect(legacy);
        }
        const f = (p.file && typeof p.file === 'object') ? p.file : null;
        if (f && f.stored && /^[A-Za-z0-9._-]+$/.test(f.stored)) {
            const full = path.join(__dirname, '..', '..', '..', 'data', 'uploads', 'products', path.basename(f.stored));
            audit.log({ type: 'download', req, detail: `product=${p.id}` });
            return res.download(full, f.name || f.stored, (err) => {
                if (err && !res.headersSent) res.status(404).send('Dosya bulunamadı.');
            });
        }
        return res.status(404).send('Bu ürün için henüz dosya eklenmedi.');
    });

    /* ── API: puanlama ve doğrulanmış yorum ── */
    app.post('/api/rate/:id', (req, res) => {
        const p = data.projectById(req.params.id);
        if (!p) return res.status(404).json({ error: 'Proje bulunamadı' });

        const userId = req.session?.userId;
        if (!userId) return res.status(401).json({ error: 'Değerlendirme yapmak için giriş yapmalısınız.' });
        const user = data.userById(userId);
        if (!user) return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });

        // Doğrulama: ürünü satın almış veya indirmiş olmalı
        const purchased = data.transactions().some(t =>
            t.type === 'income' &&
            String(t.userId) === String(userId) &&
            String(t.productId) === String(p.id)
        );
        const downloaded = data.downloads().some(d =>
            String(d.userId) === String(userId) &&
            String(d.productId) === String(p.id)
        );
        if (!purchased && !downloaded) {
            return res.status(403).json({ error: 'Yorum yapmak için ürünü satın almış veya indirmiş olmalısınız.' });
        }

        const r = Number(req.body.rating);
        if (!Number.isInteger(r) || r < 1 || r > 5) {
            return res.status(400).json({ error: '1 ile 5 arasında bir puan seçin.' });
        }
        const comment = String(req.body.comment || '').trim();
        if (comment.length > 1000) {
            return res.status(400).json({ error: 'Yorum en fazla 1000 karakter olabilir.' });
        }

        const review = {
            id: data.nextId(data.reviews()),
            productId: p.id,
            userId,
            userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
            rating: r,
            comment,
            date: new Date().toISOString(),
            verified: true
        };
        data.saveReview(review);

        const all = data.reviews().filter(x => String(x.productId) === String(p.id));
        const avg = all.reduce((sum, x) => sum + Number(x.rating || 0), 0) / all.length;
        p.rating = Math.round(avg * 10) / 10;
        p.reviewCount = all.length;
        data.saveProject(p);

        res.json({ ok: true, rating: p.rating, count: p.reviewCount, review });
    });

    /* ── API: yayınlanınca haber ver (bekleme listesi) ── */
    app.post('/api/bekleme-listesi/:id', (req, res) => {
        const p = data.projectById(req.params.id);
        if (!p) return res.status(404).json({ error: 'Proje bulunamadı' });
        const user = req.session?.userId ? data.userById(req.session.userId) : null;
        const email = String((req.body && req.body.email) || (user ? user.email : '')).trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Geçerli bir e-posta adresi gerekli.' });
        }
        try {
            const entry = waitlist.signup({ productId: p.id, email, userId: user ? user.id : null });
            audit.log({ type: 'waitlist-signup', req, detail: `product=${p.id},email=${email}` });
            res.json({ ok: true, entry });
        } catch (error) {
            console.error('Bekleme listesi kaydı başarısız:', error.message);
            res.status(500).json({ error: 'Kayıt edilemedi.' });
        }
    });

    /* ── API: Çerez ve Gizlilik Tercihleri ── */
    app.post('/api/cookie-consent', (req, res) => {
        try {
            const body = req.body || {};
            const decision = ['all', 'reject', 'custom'].includes(body.decision) ? body.decision : 'custom';
            const user = req.user || (req.session?.userId ? data.userById(req.session.userId) : null);
            const permissions = {
                essential: true,
                analytics: decision === 'all' ? true : (decision === 'reject' ? false : Boolean(body.permissions?.analytics)),
                marketing: decision === 'all' ? true : (decision === 'reject' ? false : Boolean(body.permissions?.marketing))
            };

            const record = {
                id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
                userId: user ? user.id : null,
                userEmail: user ? user.email : null,
                userName: user ? user.name : null,
                ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
                userAgent: req.headers['user-agent'] || '',
                decision,
                permissions,
                timestamp: new Date().toISOString()
            };

            data.saveConsent(record);

            res.cookie('ks_consent', JSON.stringify({ decision, permissions, at: record.timestamp }), {
                maxAge: 365 * 24 * 60 * 60 * 1000,
                httpOnly: false,
                sameSite: 'lax',
                path: '/'
            });

            return res.json({ ok: true, record });
        } catch (err) {
            console.error('Çerez tercihi kaydetme hatası:', err.message);
            return res.status(500).json({ error: 'İzin kaydedilemedi.' });
        }
    });

    app.get('/api/cookie-consent', (req, res) => {
        const user = req.user || (req.session?.userId ? data.userById(req.session.userId) : null);
        if (!user) return res.json({ consents: [] });
        const userConsents = data.consents().filter(c => c.userId === user.id || c.userEmail === user.email);
        res.json({ ok: true, consents: userConsents });
    });

    /* ── Yasal sayfalar ── */
    const legalMap = { 'kullanim-sartlari': 'kullanim', 'gizlilik-sozlesmesi': 'gizlilik', 'teslimat-iade': 'teslimat', 'mesafeli-satis': 'mesafeli', 'kvkk': 'kvkk' };
    for (const [slug, key] of Object.entries(legalMap)) {
        app.get('/' + slug, (req, res) => {
            const { renderLegal } = require('./misc');
            send(res, 200, renderPage({ title: key.toUpperCase(), body: renderLegal(key), current: '', user: req.user }));
        });
    }

    /* ── Hata Sayfaları Doğrudan Erişim Rotaları ── */
    app.get('/hata/404', (req, res) => {
        const { renderNotFound } = require('./misc');
        send(res, 404, renderPage({ title: 'Sayfa Bulunamadı (404)', body: renderNotFound(), user: req.user, noindex: true }));
    });
    app.get('/hata/403', (req, res) => {
        const { render403 } = require('./misc');
        send(res, 403, renderPage({ title: 'Erişim Engellendi (403)', body: render403(), user: req.user, noindex: true }));
    });
    app.get('/hata/500', (req, res) => {
        const { render500 } = require('./misc');
        send(res, 500, renderPage({ title: 'Sunucu Hatası (500)', body: render500(), user: req.user, noindex: true }));
    });
    app.get('/hata/429', (req, res) => {
        const { render429 } = require('./misc');
        send(res, 429, renderPage({ title: 'Çok Fazla İstek (429)', body: render429(), user: req.user, noindex: true }));
    });
    app.get('/hata/400', (req, res) => {
        const { render400 } = require('./misc');
        send(res, 400, renderPage({ title: 'Geçersiz İstek (400)', body: render400(), user: req.user, noindex: true }));
    });
    app.get('/hata/503', (req, res) => {
        const { render503 } = require('./misc');
        send(res, 503, renderPage({ title: 'Bakım Modu (503)', body: render503(), user: req.user, noindex: true }));
    });

    /* ── Site haritası (arama motorları & CDN için optimize edilmiş) ── */
    app.get('/sitemap.xml', (req, res) => {
        res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
        const base = `${req.protocol}://${req.get('host')}`;
        const now = new Date().toISOString().split('T')[0];

        const staticPages = [
            { path: '/', priority: '1.0', changefreq: 'daily' },
            { path: '/projeler', priority: '0.9', changefreq: 'daily' },
            { path: '/guncellemeler', priority: '0.8', changefreq: 'weekly' },
            { path: '/yakinda', priority: '0.7', changefreq: 'weekly' },
            { path: '/hakkinda', priority: '0.7', changefreq: 'monthly' },
            { path: '/iletisim', priority: '0.7', changefreq: 'monthly' },
            { path: '/musteri-formu', priority: '0.6', changefreq: 'monthly' },
            { path: '/kullanim-sartlari', priority: '0.3', changefreq: 'yearly' },
            { path: '/gizlilik-sozlesmesi', priority: '0.3', changefreq: 'yearly' },
            { path: '/teslimat-iade', priority: '0.3', changefreq: 'yearly' },
            { path: '/mesafeli-satis', priority: '0.3', changefreq: 'yearly' },
            { path: '/kvkk', priority: '0.3', changefreq: 'yearly' }
        ];

        const projectPages = data.projects().map(p => ({
            path: `/urun/${encodeURIComponent(p.id)}`,
            priority: '0.8',
            changefreq: 'weekly',
            lastmod: p.updatedAt ? new Date(p.updatedAt).toISOString().split('T')[0] : now
        }));

        const allUrls = [...staticPages, ...projectPages];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${base}${u.path}</loc>
    <lastmod>${u.lastmod || now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
        res.type('application/xml').send(xml);
    });

    app.get('/robots.txt', (req, res) => {
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
        const base = `${req.protocol}://${req.get('host')}`;
        res.type('text/plain').send(
`User-agent: *
Allow: /
Disallow: /admin/
Disallow: /panel-giris/
Disallow: /api/
Disallow: /profil/
Disallow: /2fa/
Disallow: /cikis

Sitemap: ${base}/sitemap.xml
`
        );
    });

    return {
        /* Sunucu başlatıldığında yayında olan projelerin bekleme listesine
           eklenenleri e-posta ile bilgilendirir. */
        notifyPendingLaunches: () => waitlist.notifyAllLaunched()
    };
};
