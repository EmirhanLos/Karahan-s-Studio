/* ═══════════════════════════════════════════════════════════════
   modules/public/routes.js — Genel site rotaları.
   Sayfa render'ları misc / product / home'dan gelir; auth ve
   admin kendi modüllerinde tanımlanır.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { renderPage } = require('./layout');
const { renderHome, renderProjectCard } = require('./home');
const { renderProjects } = require('./projects');
const { renderProduct } = require('./product');
const { renderAbout, renderUpdates, renderUpcoming, renderContact, renderCustomerForm, renderLegal, renderNotFound } = require('./misc');
const data = require('../../data');
const firestoreAdmin = require('../../core/firestore-admin');
const audit = require('../../core/audit');

function send(res, status, html) { res.status(status).type('html').send(html); }

function bannedHtml(reason = '') {
    const { renderBanned } = require('./misc');
    return renderPage({ title: 'Erişim engellendi', body: renderBanned(reason) });
}

function viewProduct(req, id) {
    const p = data.projectById(id);
    const body = renderProduct(p);
    return renderPage({ title: p?.name || 'Proje bulunamadı', body, current: 'projeler' });
}

function viewContact(req, { error, success, values }) {
    const { generateCsrf } = req.app.locals;
    const csrf = req.session?.csrf;
    const body = renderContact({ error, success, csrf, values: values || {} });
    return renderPage({ title: 'İletişim', body, current: 'iletisim' });
}

function viewCustomerForm(req, projectId, { error, success, values } = {}) {
    const project = projectId ? data.projectById(projectId) : null;
    const csrf = req.session?.csrf;
    const body = renderCustomerForm({ project, error, success, csrf, values: values || {} });
    return renderPage({ title: 'Müşteri Formu', body, current: 'iletisim' });
}

module.exports = function (app) {
    /* ── Ana sayfa ── */
    app.get('/', (req, res) => {
        send(res, 200, renderPage({ body: renderHome(), current: 'home' }));
    });

    /* ── Projeler ── */
    app.get('/projeler', (req, res) => {
        send(res, 200, renderPage({ body: renderProjects(), current: 'projeler' }));
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

    /* ── Güncellemeler ── */
    app.get('/guncellemeler', (req, res) => {
        send(res, 200, renderPage({ body: renderUpdates(), current: 'guncellemeler' }));
    });

    /* ── Yakında ── */
    app.get('/yakinda', (req, res) => {
        send(res, 200, renderPage({ body: renderUpcoming(), current: 'projeler' }));
    });

    /* ── Hakkında ── */
    app.get('/hakkinda', (req, res) => {
        send(res, 200, renderPage({ body: renderAbout(), current: 'hakkinda' }));
    });

    /* ── İletişim ── */
    app.get('/iletisim', (req, res) => {
        const msg = req.session?.flash;
        delete req.session?.flash;
        const html = viewContact(req, msg || {});
        send(res, 200, html);
    });
    app.post('/iletisim', (req, res) => {
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
        const html = viewCustomerForm(req, null, {});
        send(res, 200, html);
    });
    app.get('/musteri-formu/:projectId', (req, res) => {
        const html = viewCustomerForm(req, req.params.projectId, {});
        send(res, 200, html);
    });
    app.post('/musteri-formu', (req, res) => {
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

    /* ── İndirme (ücretsiz ürünler) ── */
    app.get('/indir/:id', (req, res) => {
        const p = data.projectById(req.params.id);
        if (!p || (!p.isFree && p.price > 0)) return res.status(404).send('Bulunamadı');
        const file = p.deviceFile || p.file;
        if (!file) return res.status(404).send('Dosya henüz eklenmemiş');
        audit.log({ type: 'download', req, detail: `product=${p.id}` });
        res.redirect(file);
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
            send(res, 200, renderPage({ title: key.toUpperCase(), body: renderLegal(key), current: '' }));
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
