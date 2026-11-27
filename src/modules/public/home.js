/* ═══════════════════════════════════════════════════════════════
   modules/public/home.js — Ana sayfa.
   Admin panelindeki tüm değişikliklerle (ürünler, öne çıkarılanlar,
   yakında projeleri, son güncellemeler) tam senkronizedir.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, money } = require('../../core/views');
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
    const price = p.isFree || Number(p.price || 0) <= 0
        ? `<span class="project-price project-price--free">Ücretsiz</span>`
        : p.discount > 0
        ? `<span class="project-price">${money(p.price * (100 - p.discount) / 100)}</span>`
        : `<span class="project-price">${money(p.price)}</span>`;

    return `
    <article class="project-card" data-reveal>
        <div class="project-card-top">
            <span class="icon-tile" aria-hidden="true">${ICONS.layers}</span>
            <span class="badge ${p.featured ? 'badge--brand' : 'badge--neutral'}">
                <span class="status-dot ${p.status === 'Yayında' ? 'status-dot--live' : 'status-dot--beta'}"></span>
                ${esc(p.featured ? 'Öne Çıkan' : (p.status || 'Yayında'))}
            </span>
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

function renderUpcomingFeaturedCard(u) {
    const launchText = u.launchDate
        ? new Date(u.launchDate).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Çok yakında';

    return `
    <article class="project-card project-card--upcoming" data-reveal>
        <div class="project-card-top">
            <span class="icon-tile" aria-hidden="true">${ICONS.zap}</span>
            <span class="badge badge--brand"><span class="status-dot status-dot--beta"></span>${esc(u.status || 'Geliştirmede')}</span>
        </div>
        ${u.image ? `<img class="project-card-image" src="${esc(u.image)}" alt="${esc(u.name)}" loading="lazy">` : ''}
        <h3 class="project-card-name">${esc(u.name)}</h3>
        <p class="project-card-desc">${esc(u.description || '')}</p>
        <div class="project-card-foot">
            <span class="project-price" style="font-size:0.85rem;color:var(--c-muted)"><span class="text-subtle">Hedef:</span> ${esc(launchText)}</span>
            <a class="btn btn-primary btn-sm" href="/yakinda">İncele & Takip Et ${ICONS.arrow}</a>
        </div>
    </article>`;
}

function renderHome() {
    // 1) Normal Ürünler: Önce admin tarafından 'featured' (Öne Çıkarılanlar), sonra en yeni tarihliler
    const projects = data.projects()
        .filter(p => p.status === 'Yayında' || p.status === 'Beta')
        .sort((a, b) => {
            const featA = a.featured ? 1 : 0;
            const featB = b.featured ? 1 : 0;
            if (featB !== featA) return featB - featA;

            const dateA = a.createdAt || a.date || a.updatedAt || '';
            const dateB = b.createdAt || b.date || b.updatedAt || '';
            return dateB.localeCompare(dateA);
        });

    // 2) Yakında Projeler: Admin panelinde 'featured: true' seçilmiş ve henüz yayınlanmamış projeler
    const featuredUpcoming = (data.upcoming ? data.upcoming() : [])
        .filter(u => u && (u.featured === true || u.featured === 'true' || String(u.featured).toLowerCase() === 'true'))
        .filter(u => u.status !== 'Yayınlandı' && u.status !== 'Yayında');

    // 3) En Son Güncelleme: Admin panelinden yayınlanan en güncel sürüm
    const allUpdates = data.updates ? data.updates() : [];
    const latestUpdate = allUpdates.length > 0
        ? allUpdates.slice().sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''))[0]
        : null;

    return `
    <section class="hero hero--studio">
        <div class="container">
            <div class="hero-grid hero-grid--centered">
                <div class="hero-copy" data-reveal>
                    <span class="hero-eyebrow"><span class="eyebrow-dot"></span> Bağımsız yazılım stüdyosu · Ankara</span>
                    <h1 data-split>İyi fikirler,<br><span>iyi yazılımlara</span><br>dönüşür.</h1>
                    <p class="hero-sub">Günlük hayatı kolaylaştıran uygulamalar, sistem araçları ve oyunlar. Her fikri, özenle tasarlanmış gerçek bir ürüne dönüştürüyoruz.</p>
                    <div class="hero-actions">
                        <a class="btn btn-primary" href="#projeler">Projeleri keşfet ${ICONS.arrow}</a>
                        <a class="btn btn-secondary" href="/iletisim">Birlikte çalışalım</a>
                    </div>
                    <div class="hero-links" aria-label="Stüdyo alanları">
                        <span>Ürün tasarımı</span><span>Yazılım geliştirme</span><span>Oyun</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="hero-rule"><span>01</span><span>YAZILIMIN YENİ BİR YÜZÜ</span><span>↓</span></div>
    </section>

    ${latestUpdate ? `
    <div class="container" style="margin-top:-20px;margin-bottom:var(--sp-6)">
        <a class="surface" href="/guncellemeler/${esc(latestUpdate.productId || '')}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-radius:12px;text-decoration:none;border-color:rgba(59,130,246,0.3);background:rgba(59,130,246,0.06);transition:border-color 0.15s ease">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <span class="badge badge--brand" style="font-size:0.75rem">YENİ GÜNCELLEME</span>
                <span style="font-weight:600;color:var(--c-text);font-size:0.9rem">${esc(latestUpdate.title)}</span>
                ${latestUpdate.version ? `<span class="badge badge--neutral">v${esc(latestUpdate.version)}</span>` : ''}
                <span class="text-subtle text-xs">${esc(latestUpdate.projectName || '')}</span>
            </div>
            <span style="color:var(--c-accent);font-size:0.85rem;font-weight:600;display:flex;align-items:center;gap:4px">Yenilikleri gör ${ICONS.arrow}</span>
        </a>
    </div>` : ''}

    <section class="studio-intro container" data-reveal>
        <p class="section-kicker">Küçük bir stüdyo, büyük bir merak</p>
        <h2>Teknolojiyi sadece çalışsın diye değil,<br><em>iyi hissettirsin</em> diye yapıyoruz.</h2>
        <a class="text-link" href="/hakkinda">Stüdyoyu tanı ${ICONS.arrow}</a>
    </section>

    <section class="container latest-section" id="projeler">
        <div class="section-head" data-reveal>
            <div><p class="section-kicker">Stüdyodan çıkanlar</p><h2>Projelerimiz</h2></div>
            <a class="view-all" href="/projeler">Tüm projeler (${projects.length}) ${ICONS.arrow}</a>
        </div>
        ${projects.length === 0
            ? `<div class="projects-empty" data-reveal><span class="projects-empty-index">01 / YAKINDA</span><div><h3>Yeni projeler yolda.</h3><p>Üzerinde çalıştığımız ürünleri ve yeni sürümleri burada paylaşacağız.</p></div><a class="text-link" href="/yakinda">Yakında sayfasını gör ${ICONS.arrow}</a></div>`
            : `<div class="popular-grid latest-grid">${projects.slice(0, 6).map(renderProjectCard).join('')}</div>`}
    </section>

    ${featuredUpcoming.length > 0 ? `
    <section class="container latest-section" id="yakinda-onecikanlar" style="margin-top:var(--sp-10)">
        <div class="section-head" data-reveal>
            <div><p class="section-kicker">Mutfaktan haberler · Yakında</p><h2>Geliştirilmekte Olanlar</h2></div>
            <a class="view-all" href="/yakinda">Tüm yakında projeler ${ICONS.arrow}</a>
        </div>
        <div class="popular-grid latest-grid">${featuredUpcoming.map(renderUpcomingFeaturedCard).join('')}</div>
    </section>` : ''}

    <section class="studio-cta">
        <div class="container studio-cta-inner" data-reveal>
            <div><p class="section-kicker">Aklında bir fikir mi var?</p><h2>Birlikte hayata geçirelim.</h2></div>
            <a class="btn btn-light" href="/iletisim">Bize ulaş ${ICONS.arrow}</a>
        </div>
    </section>`;
}

module.exports = { renderHome, renderProjectCard, renderUpcomingFeaturedCard };
