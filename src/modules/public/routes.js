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
const audit = require('../../core/audit');
const path = require('path');

function send(res, status, html) { res.status(status).type('html').send(html); }

function bannedHtml(req, reason = '') {
    const { renderBanned } = require('./misc');
    return renderPage({ title: 'Erişim engellendi', body: renderBanned(reason), user: req.user });
}

function viewProduct(req, id) {
    const p = data.projectById(id);
    const body = renderProduct(p);
    return renderPage({ title: p?.name || 'Proje bulunamadı', body, current: 'projeler', user: req.user });
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
        send(res, 200, renderPage({ body: renderHome(), current: 'home', user: req.user }));
    });

    /* ── Projeler ── */
    app.get('/projeler', (req, res) => {
        send(res, 200, renderPage({ body: renderProjects(), current: 'projeler', user: req.user }));
    });

    /* ── Tek proje ── */
    app.get('/urun/:id', async (req, res) => {
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
        send(res, 200, renderPage({ body: renderUpdates(), current: 'guncellemeler', user: req.user }));
    });
    app.get('/guncellemeler/:productId', (req, res) => {
        const product = data.projectById(req.params.productId);
        if (!product) {
            return send(res, 404, renderPage({ body: renderNotFound(), current: 'guncellemeler', user: req.user }));
        }
        send(res, 200, renderPage({
            title: `${product.name} Güncellemeleri`,
            body: renderUpdates(product),
            current: 'guncellemeler',
            user: req.user
        }));
    });
    app.get('/guncellemeler/:productId/:updateId', (req, res) => {
        const product = data.projectById(req.params.productId);
        const update = product && getProductUpdates(product)
            .find(item => String(item.id) === String(req.params.updateId));
        if (!product || !update) {
            return send(res, 404, renderPage({ body: renderNotFound(), current: 'guncellemeler', user: req.user }));
        }
        send(res, 200, renderPage({
            title: update.title || 'Güncelleme',
            body: renderUpdateDetail(update, product),
            current: 'guncellemeler',
            user: req.user
        }));
    });

    /* ── Yakında ── */
    app.get('/yakinda', (req, res) => {
        send(res, 200, renderPage({ body: renderUpcoming(), current: 'projeler', user: req.user }));
    });

    /* ── Hakkında ── */
    app.get('/hakkinda', (req, res) => {
        send(res, 200, renderPage({ body: renderAbout(), current: 'hakkinda', user: req.user }));
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

    /* ── API: puanlama ── */
    app.post('/api/rate/:id', (req, res) => {
        const p = data.projectById(req.params.id);
        if (!p) return res.status(404).json({ error: 'Proje bulunamadı' });
        const r = Number(req.body.rating);
        if (!Number.isInteger(r) || r < 1 || r > 5) {
            return res.status(400).json({ error: '1 ile 5 arasında bir puan seçin.' });
        }
        const cur = p.rating || 0, n = p.reviewCount || 0;
        p.rating = (cur * n + r) / (n + 1);
        p.reviewCount = n + 1;
        data.saveProject(p);
        res.json({ ok: true, rating: p.rating, count: p.reviewCount });
    });

    /* ── Yasal sayfalar ── */
    const legalMap = { 'kullanim-sartlari': 'kullanim', 'gizlilik-sozlesmesi': 'gizlilik', 'teslimat-iade': 'teslimat', 'mesafeli-satis': 'mesafeli', 'kvkk': 'kvkk' };
    for (const [slug, key] of Object.entries(legalMap)) {
        app.get('/' + slug, (req, res) => {
            const { renderLegal } = require('./misc');
            send(res, 200, renderPage({ title: key.toUpperCase(), body: renderLegal(key), current: '', user: req.user }));
        });
    }

    /* ── Site haritası (arama motorları için) ── */
    app.get('/sitemap.xml', (req, res) => {
        const base = `${req.protocol}://${req.get('host')}`;
        const urls = ['/', '/projeler', '/hakkinda', '/iletisim', '/guncellemeler', '/yakinda',
            ...data.projects().map(p => `/urun/${p.id}`)];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${base}${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}
</urlset>`;
        res.type('application/xml').send(xml);
    });
    app.get('/robots.txt', (req, res) => {
        res.type('text/plain').send(`User-agent: *\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`);
    });
};
