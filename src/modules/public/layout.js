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
    sun:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sys:  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
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

const NAV_ICONS = {
    home: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    projects: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5m8-5v5"/></svg>',
    updates: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/></svg>',
    studio: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.7c-1.1 1-1.9 1.3-1.9 3.3M12 17.5v.1"/></svg>',
    profile: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
    login: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>'
};

function navItem(href, label, active, current, icon) {
    const cls = `nav-link${active === current ? ' is-active' : ''}`;
    return `<li><a href="${esc(url(href))}" class="${cls}">${NAV_ICONS[icon]}<span class="nav-tab-label">${esc(label)}</span></a></li>`;
}

function projectsDropdown() {
    return data.projects()
        .filter(p => p.status === 'Yayında' || p.status === 'Beta')
        .slice(0, 8)
        .map(p => `<li><a href="/urun/${esc(p.id)}"><span>${esc(p.name)}</span><span class="badge badge--neutral">${esc(p.category || 'Araç')}</span></a></li>`)
        .join('');
}

function renderHeader(current = '', user = null) {
    return `
    <header class="navbar" role="banner">
        <a class="logo" href="/" aria-label="${esc(SITE.shortName)} anasayfa">
            <span class="logo-mark">K</span><span class="logo-name">karahan<span>’s</span></span>
        </a>
        <button type="button" class="nav-toggle" id="navToggle" aria-label="Menüyü aç" aria-expanded="false" aria-controls="navList">${ICONS.menu}</button>
        <nav class="nav-links" id="navList" aria-label="Birincil gezinme">
            <svg class="nav-lens-filter" aria-hidden="true" focusable="false">
                <filter id="nav-lens-refraction" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="0" y="0" width="104" height="62" color-interpolation-filters="sRGB">
                    <feImage class="nav-lens-map" x="0" y="0" width="104" height="62" preserveAspectRatio="none" result="map"/>
                    <feDisplacementMap in="SourceGraphic" in2="map" scale="32" xChannelSelector="R" yChannelSelector="G"/>
                </filter>
            </svg>
            <span class="nav-lens" aria-hidden="true"></span>
            <ul class="nav-links-inner" style="display:contents;list-style:none;margin:0;padding:0">
                ${navItem('/', 'Ana sayfa', current, 'home', 'home')}
                <li class="dropdown">
                    <a href="/projeler" class="nav-link${current === 'projeler' ? ' is-active' : ''}" aria-expanded="false" aria-controls="projectsDropdown">${NAV_ICONS.projects}<span class="nav-tab-label">Projeler</span></a>
                    <ul class="dropdown-content" id="projectsDropdown" style="list-style:none;margin:0;padding:0">${projectsDropdown()}</ul>
                </li>
                ${navItem('/guncellemeler', 'Güncellemeler', current, 'guncellemeler', 'updates')}
                ${navItem('/hakkinda', 'Stüdyo', current, 'hakkinda', 'studio')}
            ${user ? `
            <li><a href="/profil" class="nav-link nav-profile${current === 'profil' ? ' is-active' : ''}">${NAV_ICONS.profile}<span class="nav-tab-label">Profil</span></a></li>
            ` : `
            <li><a href="/giris" class="nav-link nav-login">${NAV_ICONS.login}<span class="nav-tab-label">Giriş Yap</span></a></li>
            `}
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

function clientScripts() {
    return `
    <script src="${esc(asset('/js/nav.js'))}" defer></script>
    <script src="${esc(asset('/js/reveal.js'))}" defer></script>
    <script src="${esc(asset('/js/motion.js'))}" defer></script>
    <script src="${esc(asset('/js/main.js'))}" defer></script>`;
}

function renderPage({ title, description, body, current = '', user = null, og = {}, canonical = '', noindex = false, schema = null }) {
    const desc = description || SITE.description;
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
    <title>${esc(fullTitle)}</title>
    <link rel="canonical" href="${esc(canonicalUrl)}">

    <!-- Open Graph (Facebook / WhatsApp / LinkedIn) -->
    <meta property="og:site_name" content="${esc(SITE.name)}">
    <meta property="og:title" content="${esc(fullTitle)}">
    <meta property="og:description" content="${esc(desc)}">
    <meta property="og:url" content="${esc(canonicalUrl)}">
    <meta property="og:type" content="${esc(ogType)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <meta property="og:locale" content="tr_TR">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@karahans">
    <meta name="twitter:creator" content="@karahans">
    <meta name="twitter:title" content="${esc(fullTitle)}">
    <meta name="twitter:description" content="${esc(desc)}">
    <meta name="twitter:image" content="${esc(ogImage)}">

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
    <link rel="stylesheet" href="${esc(asset('/css/nav-lens.css'))}">
    <link rel="stylesheet" href="${esc(asset('/css/mobile.css'))}">
    <script src="${esc(asset('/js/boot.js'))}"></script>

    <!-- Schema.org JSON-LD Yapısal Veri (SEO) -->
    <script type="application/ld+json">${JSON.stringify(baseSchema)}</script>
</head>
<body class="site-shell">
    <div class="scroll-progress" aria-hidden="true"></div>
    <div class="page-transition" aria-hidden="true"></div>
    <a class="skip-link" href="#main">İçeriğe atla</a>
    ${renderHeader(current, user)}
    <main id="main" tabindex="-1">
    ${body}
    </main>
    ${renderFooter()}
    ${clientScripts()}
</body>
</html>`;
}

module.exports = { renderPage, renderHeader, renderFooter, SITE, ICONS, esc, json, money, date, url };
