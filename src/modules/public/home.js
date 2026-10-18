/* ═══════════════════════════════════════════════════════════════
   modules/public/home.js — Ana sayfa.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, money, date } = require('../../core/views');
const data = require('../../data');

const ICONS = {
    shield:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    layers:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    cube:    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
    zap:     '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    code:    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    star:    '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    arrow:   '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
};

function renderProjectCard(p) {
    const price = p.isFree
        ? `<span class="project-price project-price--free">Ücretsiz</span>`
        : p.discount > 0
        ? `<span class="project-price">${money(p.price * (100 - p.discount) / 100)}</span>`
        : (p.price > 0
            ? `<span class="project-price">${money(p.price)}</span>`
            : `<span class="project-price project-price--free">Ücretsiz</span>`);

    return `
    <article class="project-card" data-reveal>
        <div class="project-card-top">
            <span class="icon-tile" aria-hidden="true">${ICONS.layers}</span>
            <span class="badge badge--neutral"><span class="status-dot ${p.status === 'Yayında' ? 'status-dot--live' : 'status-dot--beta'}"></span>${esc(p.status || 'Yayında')}</span>
        </div>
        ${p.image ? `<img class="project-card-image" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : ''}
        <h3 class="project-card-name">${esc(p.name)}</h3>
        <p class="project-card-desc">${esc(p.summary || p.description || '')}</p>
        <div class="project-card-foot">
            ${price}
            <a class="btn btn-ghost btn-sm" href="/urun/${esc(p.id)}">İncele ${ICONS.arrow}</a>
        </div>
    </article>`;
}

function renderHome() {
    const projects = data.projects()
        .filter(p => p.status === 'Yayında' || p.status === 'Beta')
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const upcoming = data.upcoming()
        .filter(u => u.featured)
        .sort((a, b) => (a.launchDate || '').localeCompare(b.launchDate || ''))[0]
        || data.upcoming()[0];

    return `
    <section class="hero hero--studio">
        <div class="container">
            <div class="hero-grid">
                <div class="hero-copy" data-reveal>
                    <span class="hero-eyebrow"><span class="eyebrow-dot"></span> Bağımsız yazılım stüdyosu · Ankara</span>
                    <h1>İyi fikirler,<br><span>iyi yazılımlara</span><br>dönüşür.</h1>
                    <p class="hero-sub">Günlük hayatı kolaylaştıran uygulamalar, sistem araçları ve oyunlar. Her fikri, özenle tasarlanmış gerçek bir ürüne dönüştürüyoruz.</p>
                    <div class="hero-actions">
                        <a class="btn btn-primary" href="#projeler">Projeleri keşfet ${ICONS.arrow}</a>
                        <a class="btn btn-secondary" href="/iletisim">Birlikte çalışalım</a>
                    </div>
                    <div class="hero-links" aria-label="Stüdyo alanları">
                        <span>Ürün tasarımı</span><span>Yazılım geliştirme</span><span>Oyun</span>
                    </div>
                </div>
                <div class="hero-visual" aria-hidden="true">
                    <div class="studio-art">
                        <div class="studio-art-top"><span>KS—01</span><span>DİJİTAL ATÖLYE</span></div>
                        <div class="studio-art-mark">
                            <span class="art-orbit art-orbit--one"></span>
                            <span class="art-orbit art-orbit--two"></span>
                            <span class="art-core">K</span>
                            <span class="art-index">FİKİR<br>→ ÜRÜN</span>
                        </div>
                        <div class="studio-art-bottom"><span>MERAKLA BAŞLAR</span><span>ÖZENLE BİTER ↗</span></div>
                    </div>
                    <span class="hero-sticker">TASARLA<br>İNŞA ET<br>İYİLEŞTİR<span>✳</span></span>
                </div>
            </div>
        </div>
        <div class="hero-rule"><span>01</span><span>YAZILIMIN YENİ BİR YÜZÜ</span><span>↓</span></div>
    </section>

    <section class="studio-intro container" data-reveal>
        <p class="section-kicker">Küçük bir stüdyo, büyük bir merak</p>
        <h2>Teknolojiyi sadece çalışsın diye değil,<br><em>iyi hissettirsin</em> diye yapıyoruz.</h2>
        <a class="text-link" href="/hakkinda">Stüdyoyu tanı ${ICONS.arrow}</a>
    </section>

    ${upcoming ? `
    <section class="container home-feature-section">
        <article class="home-feature" data-reveal>
            <div class="home-feature-art" aria-hidden="true">
                <span class="feature-art-label">YENİ FİKİR / 01</span>
                <span class="feature-art-shape feature-art-shape--one"></span>
                <span class="feature-art-shape feature-art-shape--two"></span>
                <span class="feature-art-star">✳</span>
                <span class="feature-art-caption">ÇOK YAKINDA</span>
            </div>
            <div class="home-feature-copy">
                <span class="section-kicker">Atölyeden çıkanlar · Yakında</span>
                <h2>${esc(upcoming.name)}</h2>
                <p>${esc(upcoming.description || 'Yeni bir fikir üzerinde çalışıyoruz. Detaylar için takipte kalın.')}</p>
                <div class="home-feature-meta">
                    <span>${upcoming.launchDate ? date(upcoming.launchDate) : 'Çıkış tarihi yakında'}</span>
                    <a class="text-link" href="/yakinda">Geliştirme sürecini gör ${ICONS.arrow}</a>
                </div>
            </div>
        </article>
    </section>
    ` : ''}

    <section class="container popular-section" id="projeler">
        <div class="section-head" data-reveal>
            <div><p class="section-kicker">Seçilmiş işler</p><h2>Fikirden ürüne.</h2></div>
            <a class="view-all" href="/projeler">Tüm projeler ${ICONS.arrow}</a>
        </div>
        ${projects.length === 0
            ? `<div class="projects-empty" data-reveal><span class="projects-empty-index">01 / YAKINDA</span><div><h3>Yeni projeler yolda.</h3><p>Üzerinde çalıştığımız ürünleri ve yeni sürümleri burada paylaşacağız.</p></div><a class="text-link" href="/guncellemeler">Güncellemeleri takip et ${ICONS.arrow}</a></div>`
            : `<div class="popular-grid">${projects.slice(0, 4).map(renderProjectCard).join('')}</div>`}
    </section>

    <section class="studio-cta">
        <div class="container studio-cta-inner" data-reveal>
            <div><p class="section-kicker">Aklında bir fikir mi var?</p><h2>Birlikte hayata geçirelim.</h2></div>
            <a class="btn btn-light" href="/iletisim">Bize ulaş ${ICONS.arrow}</a>
        </div>
    </section>`;
}

module.exports = { renderHome, renderProjectCard };
