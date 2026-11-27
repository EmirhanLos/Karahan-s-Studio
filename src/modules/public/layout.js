/* ═══════════════════════════════════════════════════════════════
   modules/public/layout.js — Sayfa kabuğu.
   Üst kısım + navigasyon + ana içerik + alt kısım.
   Tüm sayfalar bu fonksiyon üzerinden render edilir; ortak
   bileşenler (konserveler, sosyal bağlantılar, yasal bağlantılar)
   tek kaynaktan yönetilir.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, attr, json, url, money, date } = require('../../core/views');
const data = require('../../data');
const { asset, fullAssetUrl, CDN_URL } = require('./assets');

const SITE = {
    name: "Karahan's Studio",
    shortName: "karahan's",
    domain: 'karahans.com',
    description: 'Yazılım ve oyun platformu — masaüstü uygulamalar, sistem araçları, oyunlar.',
    contact: {
        email: 'iletisim@karahans.com',
        phone: '+90 533 661 97 49',
        location: 'Ankara, Türkiye'
    }
};

const ICONS = {
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    ig: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    yt: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
    dc: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.32 4.37A19.79 19.79 0 0 0 16.56 3a13.66 13.66 0 0 0-.66 1.35 18.27 18.27 0 0 0-5.8 0A13.66 13.66 0 0 0 9.44 3 19.86 19.86 0 0 0 5.67 4.37C2.5 9.4 1.68 14.31 2.1 19.16A19.94 19.94 0 0 0 8 22a13.86 13.86 0 0 0 1.34-2.16 13.32 13.32 0 0 1-2.11-1 14.21 14.21 0 0 0 .5-.39 14.06 14.06 0 0 0 12 19.5a14.06 14.06 0 0 0 4.27-.55 14.21 14.21 0 0 0 .5.39 13.32 13.32 0 0 1-2.11 1A13.86 13.86 0 0 0 16 22a19.94 19.94 0 0 0 5.9-2.84c.5-5.5-.8-10.4-1.58-14.79z"/><circle cx="9.07" cy="12" r="1.58"/><circle cx="14.93" cy="12" r="1.58"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    shield: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    pin:  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
};

const NAV_CHEVRON = '<span class="nav-chevron" aria-hidden="true">▾</span>';

/* Tek bir menü bağlantısı. Aktif sayfa aria-current ile işaretlenir. */
function navLink({ href, label, active, current, suffix = '', attrs = '' }) {
    const isActive = active === current;
    const cls = `nav-link${isActive ? ' is-active' : ''}`;
    const currentAttr = isActive ? ' aria-current="page"' : '';
    return `<a href="${esc(url(href))}" class="${cls}"${currentAttr}${attrs}>${esc(label)}${suffix}</a>`;
}

function navItem(opts) {
    return `<li>${navLink(opts)}</li>`;
}

function projectsDropdown() {
    return data.projects()
        .filter(p => p.status === 'Yayında' || p.status === 'Beta')
        .slice(0, 8)
        .map(p => `<li><a href="/urun/${esc(p.id)}"><span>${esc(p.name)}</span><span class="badge badge--neutral">${esc(p.category || 'Araç')}</span></a></li>`)
        .join('');
}

function renderHeader(current = '', user = null) {
    const projectLink = navLink({
        href: '/projeler',
        label: 'Projeler',
        suffix: NAV_CHEVRON,
        active: current,
        current: 'projeler',
        attrs: ' aria-expanded="false" aria-controls="projectsDropdown"'
    });

    return `
    <header class="navbar" role="banner">
        <a class="logo" href="/" aria-label="${esc(SITE.shortName)} anasayfa">
            <span class="logo-mark">K</span><span class="logo-name">karahan<span>’s</span></span>
        </a>
        <button type="button" class="nav-toggle" id="navToggle" aria-label="Menüyü aç" aria-expanded="false" aria-controls="navList">${ICONS.menu}</button>
        <nav class="nav-links" id="navList" aria-label="Birincil gezinme">
            <ul class="nav-links-inner">
                ${navItem({ href: '/', label: 'Ana sayfa', active: current, current: 'home' })}
                <li class="dropdown">
                    ${projectLink}
                    <ul class="dropdown-content" id="projectsDropdown">${projectsDropdown()}</ul>
                </li>
                ${navItem({ href: '/guncellemeler', label: 'Güncellemeler', active: current, current: 'guncellemeler' })}
                ${navItem({ href: '/hakkinda', label: 'Stüdyo', active: current, current: 'hakkinda' })}
                ${user
                    ? navItem({ href: '/profil', label: 'Profil', active: current, current: 'profil' })
                    : '<li class="nav-actions"><a href="/giris" class="nav-cta">Giriş Yap</a></li>'}
            </ul>
        </nav>
    </header>`;
}

function renderFooter() {
    const projects = data.projects().filter(p => p.status === 'Yayında').slice(0, 5);
    return `
    <footer class="footer" role="contentinfo">
        <div class="footer-inner">
            <div class="footer-brand-row">
                <a class="logo footer-logo" href="/" aria-label="${esc(SITE.shortName)} anasayfa">
                    <span class="logo-mark">K</span><span class="logo-name">karahan<span>’s</span></span>
                </a>
                <p>Fikirleri, özenle tasarlanmış dijital ürünlere dönüştürüyoruz.</p>
                <a class="footer-contact" href="/iletisim">Bir fikrin mi var? <span>Konuşalım ↗</span></a>
            </div>
            <div class="footer-grid">
                <div class="footer-col">
                    <h4>Stüdyo</h4>
                    <ul>
                        <li><a href="/hakkinda">Hakkında</a></li>
                        <li><a href="/iletisim">İletişim</a></li>
                        <li><a href="/kvkk">KVKK</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Keşfet</h4>
                    <ul>
                        <li><a href="/projeler">Tüm Projeler</a></li>
                        <li><a href="/yakinda">Yakında</a></li>
                        <li><a href="/guncellemeler">Güncelleme Notları</a></li>
                        ${projects.map(p => `<li><a href="/urun/${esc(p.id)}">${esc(p.name)}</a></li>`).join('')}
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Bilgiler</h4>
                    <ul>
                        <li><a href="/kullanim-sartlari">Kullanım Şartları</a></li>
                        <li><a href="/gizlilik-sozlesmesi">Gizlilik Sözleşmesi</a></li>
                        <li><a href="/teslimat-iade">Teslimat ve İade</a></li>
                        <li><a href="/mesafeli-satis">Mesafeli Satış</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Takip et</h4>
                    <ul class="social-list">
                        <li><a href="https://instagram.com/karahans" target="_blank" rel="noopener noreferrer" class="social-link social-link--instagram">Instagram <span class="social-link-arrow" aria-hidden="true">↗</span></a></li>
                        <li><a href="https://youtube.com/@karahans" target="_blank" rel="noopener noreferrer" class="social-link social-link--youtube">YouTube <span class="social-link-arrow" aria-hidden="true">↗</span></a></li>
                        <li><a href="https://discord.gg/karahans" target="_blank" rel="noopener noreferrer" class="social-link social-link--discord">Discord <span class="social-link-arrow" aria-hidden="true">↗</span></a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <span>© ${new Date().getFullYear()} ${esc(SITE.name)}. Tüm hakları saklıdır.</span>
                <span>Ankara, Türkiye · Bağımsız üretim.</span>
            </div>
        </div>
    </footer>`;
}

function renderCookieBanner() {
    return `
    <aside id="cookieBanner" class="cookie-banner" role="dialog" aria-modal="true" aria-label="Çerez ve Gizlilik Tercihleri" style="display:none">
        <div class="cookie-banner-inner">
            <div class="cookie-banner-header">
                <span class="cookie-banner-icon" aria-hidden="true">🍪</span>
                <h3>Çerez ve Gizlilik Tercihleriniz</h3>
            </div>
            <p class="cookie-banner-text">
                Karahan's Studio olarak sitemizde temel işlevleri sunmak, güvenliği sağlamak, site performansını analiz etmek ve deneyiminizi kişiselleştirmek amacıyla çerezler kullanıyoruz. Detaylı bilgi için <a href="/gizlilik-sozlesmesi">Gizlilik Sözleşmesi</a> ve <a href="/kvkk">KVKK Aydınlatma Metni</a>'ni inceleyebilirsiniz.
            </p>
            
            <div class="cookie-custom-panel" id="cookieCustomPanel" hidden>
                <div class="cookie-option">
                    <div class="cookie-option-info">
                        <strong>Zorunlu Çerezler</strong>
                        <p>Oturum yönetimi, güvenlik ve temel web sitesi fonksiyonları için gereklidir. Kapatılamaz.</p>
                    </div>
                    <label class="cookie-switch">
                        <input type="checkbox" checked disabled>
                        <span class="cookie-slider"></span>
                    </label>
                </div>
                <div class="cookie-option">
                    <div class="cookie-option-info">
                        <strong>Analitik ve İstatistik Çerezleri</strong>
                        <p>Sayfa ziyaretlerini, popüler projeleri ve hata durumlarını anonim olarak ölçümlememize yarar.</p>
                    </div>
                    <label class="cookie-switch">
                        <input type="checkbox" id="cookieAnalytics" checked>
                        <span class="cookie-slider"></span>
                    </label>
                </div>
                <div class="cookie-option">
                    <div class="cookie-option-info">
                        <strong>Pazarlama ve Tercih Çerezleri</strong>
                        <p>Size ilgi duyabileceğiniz projeleri ve duyuruları hatırlatmak için kullanılır.</p>
                    </div>
                    <label class="cookie-switch">
                        <input type="checkbox" id="cookieMarketing">
                        <span class="cookie-slider"></span>
                    </label>
                </div>
            </div>

            <div class="cookie-banner-actions">
                <button type="button" class="btn btn-primary btn-sm" id="cookieAcceptAll">Tümünü Kabul Et</button>
                <button type="button" class="btn btn-secondary btn-sm" id="cookieRejectAll">Reddet</button>
                <button type="button" class="btn btn-ghost btn-sm" id="cookieToggleCustom">Özelleştir</button>
                <button type="button" class="btn btn-primary btn-sm" id="cookieSaveCustom" style="display:none">Tercihleri Kaydet</button>
            </div>
        </div>
    </aside>`;
}

function clientScripts() {
    return `
    <script src="${esc(asset('/js/nav.js'))}" defer></script>
    <script src="${esc(asset('/js/reveal.js'))}" defer></script>
    <script src="${esc(asset('/js/motion.js'))}" defer></script>
    <script src="${esc(asset('/js/main.js'))}" defer></script>`;
}

function renderPage({ title, description, keywords, body, current = '', user = null, og = {}, canonical = '', noindex = false, schema = null }) {
    const desc = description || SITE.description;
    const defaultKeywords = "karahans, karahan's studio, yazılım stüdyosu, bağımsız yazılım, ankara yazılım, masaüstü uygulamaları, oyun geliştirme, sistem araçları, indie software, indie developer";
    const kw = keywords || defaultKeywords;
    const fullTitle = title ? `${title} | ${SITE.name}` : `${SITE.name} — Bağımsız Yazılım ve Oyun Stüdyosu`;
    const origin = 'https://' + SITE.domain;
    const canonicalUrl = canonical || (current === 'home' || !current ? origin : `${origin}/${current.replace(/^\/+/, '')}`);
    const ogImage = fullAssetUrl(og.image || '/images/ai.png', origin);
    const ogType = og.type || 'website';

    const baseSchema = [
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": SITE.name,
            "url": origin,
            "description": SITE.description,
            "potentialAction": {
                "@type": "SearchAction",
                "target": `${origin}/projeler?q={search_term_string}`,
                "query-input": "required name=search_term_string"
            },
            "publisher": {
                "@type": "Organization",
                "name": SITE.name,
                "url": origin,
                "logo": {
                    "@type": "ImageObject",
                    "url": fullAssetUrl('/images/ai.png', origin)
                }
            }
        },
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": SITE.name,
            "url": origin,
            "logo": fullAssetUrl('/images/ai.png', origin),
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": SITE.contact.phone,
                "contactType": "customer service",
                "areaServed": "TR",
                "availableLanguage": "Turkish"
            },
            "sameAs": [
                "https://instagram.com/karahans",
                "https://youtube.com/@karahans",
                "https://discord.gg/karahans"
            ]
        }
    ];

    if (schema) {
        if (Array.isArray(schema)) baseSchema.push(...schema);
        else baseSchema.push(schema);
    }

    return `<!doctype html>
<html lang="tr" class="no-js" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#020203">
    <meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'}">
    <meta name="description" content="${esc(desc)}">
    <meta name="keywords" content="${esc(kw)}">
    <meta name="author" content="Karahan's Studio">
    <meta name="publisher" content="Karahan's Studio">
    <meta name="application-name" content="Karahan's Studio">
    <meta name="format-detection" content="telephone=no">
    <title>${esc(fullTitle)}</title>
    <link rel="canonical" href="${esc(canonicalUrl)}">
    <link rel="alternate" hreflang="tr" href="${esc(canonicalUrl)}">
    <link rel="alternate" hreflang="x-default" href="${esc(canonicalUrl)}">
    <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml">

    <!-- Open Graph (Facebook / WhatsApp / LinkedIn) -->
    <meta property="og:site_name" content="${esc(SITE.name)}">
    <meta property="og:title" content="${esc(fullTitle)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${esc(canonicalUrl)}">
    <meta property="og:type" content="${esc(ogType)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${esc(fullTitle)}">
    <meta property="og:locale" content="tr_TR">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@karahans">
    <meta name="twitter:creator" content="@karahans">
    <meta name="twitter:title" content="${esc(fullTitle)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${esc(ogImage)}">
    <meta name="twitter:image:alt" content="${esc(fullTitle)}">

    <!-- CDN & DNS Ön Hazırlık -->
    <link rel="icon" type="image/svg+xml" href="${esc(asset('/assets/favicon.svg'))}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="dns-prefetch" href="https://fonts.googleapis.com">
    <link rel="dns-prefetch" href="https://fonts.gstatic.com">
    ${CDN_URL ? `<link rel="preconnect" href="${esc(CDN_URL)}"><link rel="dns-prefetch" href="${esc(CDN_URL)}">` : ''}

    <!-- Optimize Edilmiş Yazı Tipi ve Biçemler -->
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"></noscript>
    <link rel="stylesheet" href="${esc(asset('/css/style.css'))}">
    <link rel="stylesheet" href="${esc(asset('/css/liquid-glass.css'))}">
    <link rel="stylesheet" href="${esc(asset('/css/mobile.css'))}">
    <script src="${esc(asset('/js/boot.js'))}"></script>

    <!-- Schema.org JSON-LD Yapısal Veri (SEO) -->
    <script type="application/ld+json">${JSON.stringify(baseSchema)}</script>
</head>
<body class="site-shell">
    <div class="scroll-progress" aria-hidden="true"></div>

    <a class="skip-link" href="#main">İçeriğe atla</a>
    ${renderHeader(current, user)}
    <main id="main" tabindex="-1">
    ${body}
    </main>
    ${renderFooter()}
    ${renderCookieBanner()}
    ${clientScripts()}
</body>
</html>`;
}

module.exports = { renderPage, renderHeader, renderFooter, SITE, ICONS, esc, json, money, date, url };
