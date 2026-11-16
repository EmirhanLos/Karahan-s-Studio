const fs = require('fs');
const path = require('path');
const { asset } = require('./layout');

function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}

function renderImageSlider(projects) {
    const sliderImages = projects.slice(0, 8).map(p => ({
        image: p.image,
        name: p.name,
        id: p.id
    }));

    if (!sliderImages.length) return '';

    const slides = sliderImages.map((item, index) => {
        const imgHtml = item.image
            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="slider-image" loading="lazy">`
            : `<div class="slider-image-placeholder"><span>${escapeHtml(item.name.charAt(0))}</span></div>`;

        return `
        <div class="slider-slide" data-index="${index}" aria-hidden="${index !== 0}">
            ${imgHtml}
            <div class="slider-caption">
                <h3>${escapeHtml(item.name)}</h3>
            </div>
        </div>`;
    }).join('');

    const dots = sliderImages.map((_, index) =>
        `<button class="slider-dot${index === 0 ? ' slider-dot--active' : ''}" data-dot="${index}" aria-label="Slayt ${index + 1}"></button>`
    ).join('');

    return `
    <section class="home-slider-section" aria-label="Proje Galerisi">
        <div class="home-slider-wrapper">
            <div class="slider-viewport">
                <div class="slider-track" id="sliderTrack">
                    ${slides}
                </div>
            </div>
            <button class="slider-arrow slider-arrow-prev" id="sliderPrev" aria-label="Önceki">&#8592;</button>
            <button class="slider-arrow slider-arrow-next" id="sliderNext" aria-label="Sonraki">&#8594;</button>
            <div class="slider-dots" id="sliderDots">
                ${dots}
            </div>
        </div>
    </section>
    <script src="${asset('/js/home-slider.js')}" defer></script>`;
}

function renderUpcomingSection(upcoming) {
    if (!upcoming || !upcoming.length) return '';

    // Show the featured item on the home page, or the first item if none is featured
    const item = upcoming.find(u => u.featured) || upcoming[0];

    const imgHtml = item.image
        ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="uc-home-img" loading="lazy">`
        : `<div class="uc-home-img uc-home-img--placeholder"><span>${escapeHtml(item.name.charAt(0))}</span></div>`;

    return `
    <section class="uc-home-full container">
        <div class="uc-home-card uc-home-card--wide">
            <div class="uc-home-body">
                <span class="uc-badge">YAKINDA</span>
                <h2 class="uc-home-title">${escapeHtml(item.name)}</h2>
                <p class="uc-home-desc">${escapeHtml(item.description)}</p>
                <div class="uc-home-footer">
                    ${item.showPrice && item.price
                        ? `<span class="uc-price">${Number(item.price).toLocaleString('tr-TR')}₺'den başlayan fiyatlarla</span>`
                        : ''}
                    <a class="btn-update-see" href="/yakinda/${encodeURIComponent(item.id)}">Duyuruyu Gör <span class="arrow">&rarr;</span></a>
                </div>
            </div>
            <div class="uc-home-visual">${imgHtml}</div>
        </div>
    </section>`;
}

function renderPopularProjects(projects) {
    if (!projects || !projects.length) return '';

    const sorted = [...projects]
        .sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.ratingCount - a.ratingCount;
        })
        .slice(0, 8);

    const cards = sorted.map(p => {
        const statusDot = p.status === 'Yayında' ? 'status-dot--live' : '';
        const iconMap = {
            shield: '<path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4z" stroke="currentColor" stroke-width="1.6" fill="none"/>',
            grid: '<rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/>',
            bars: '<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
            circle: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" fill="none"/>',
            square: '<rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.6" fill="none"/>',
            star: '<path d="M12 2l3 6.5 7 1-5 5 1.5 7L12 18l-6.5 3.5L7 14.5l-5-5 7-1L12 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/>',
            hexagon: '<path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" stroke="currentColor" stroke-width="1.5" fill="none"/>',
            triangle: '<path d="M12 3l8 15H4l8-15z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/>'
        };
        const svgPath = iconMap[p.icon] || iconMap.square;
        const priceHtml = p.price > 0
            ? `<span class="pop-price">${Number(p.price).toLocaleString('tr-TR', {minimumFractionDigits:2})}₺</span>`
            : `<span class="pop-price pop-price--free">Ücretsiz</span>`;

        return `
        <a class="pop-card" href="/urun/${escapeHtml(p.id)}" id="pop-card-${escapeHtml(p.id)}">
            <div class="pop-card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${svgPath}</svg>
            </div>
            <div class="pop-card-body">
                <div class="pop-card-top">
                    <span class="card-tag">${escapeHtml(p.category)}</span>
                    <span class="card-status"><span class="status-dot ${statusDot}"></span>${escapeHtml(p.status)}</span>
                </div>
                <h3 class="pop-card-name">${escapeHtml(p.name)}</h3>
                <p class="pop-card-desc">${escapeHtml(p.summary || (p.description ? p.description.substring(0, 90) + '...' : ''))}</p>
                <div class="pop-card-foot">
                    ${priceHtml}
                    <span class="pop-card-link">İncele <span class="arrow">→</span></span>
                </div>
            </div>
        </a>`;
    }).join('');

    return `
    <section class="home-popular container" id="projects-section">
        <div class="section-head">
            <h2>En Popüler Projeler</h2>
            <a href="/projeler" class="view-all-link">Tümünü Gör →</a>
        </div>
        <div class="pop-grid">${cards}</div>
    </section>`;
}

function renderHome(popularProjects) {
    let upcoming = [];
    try {
        const dbModule = require('../../db.js');
        upcoming = dbModule.getEncryptedData('upcoming') || [];
    } catch (e) {
        console.error('Error reading upcoming:', e);
    }

    const heroHtml = `
        <header class="hero">
            <div class="hero-grid">
                <div class="hero-copy">
                    <span class="hero-eyebrow">Yazılım Stüdyosu</span>
                    <h1>Fikirden çalışan<br>yazılıma<span class="accent">.</span></h1>
                    <p class="hero-sub">Masaüstü uygulamaları, sistem araçları ve oyunlar — tasarımından koduna tek bir stüdyodan, uçtan uca geliştiriyorum.</p>
                    <div class="hero-actions">
                        <a class="btn-primary" href="#projects-section">Projeleri Gör</a>
                        <a class="btn-secondary" href="/hakkinda">Hakkında</a>
                    </div>
                    <div class="hero-nav-links">
                        <a href="/guncellemeler" class="hero-nav-link">Güncelleme Notları →</a>
                        <a href="/yakinda" class="hero-nav-link">Yakında →</a>
                        <a href="/duyurular" class="hero-nav-link">Tüm Duyurular →</a>
                        <a href="/profil" class="hero-nav-link">Profil →</a>
                    </div>
                </div>
                <div class="hero-visual" aria-hidden="true">
                    <div class="launcher-core">
                        <span></span><span></span><span></span><span></span>
                    </div>
                    <div class="orbit-tile t1"><svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="#7fa0ff" stroke-width="1.6"/></svg></div>
                    <div class="orbit-tile t2"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#7fa0ff" stroke-width="1.6"/></svg></div>
                    <div class="orbit-tile t3"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3l8 15H4l8-15z" stroke="#7fa0ff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>
                    <div class="orbit-tile t4"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2l3 6.5 7 1-5 5 1.5 7L12 18l-6.5 3.5L7 14.5l-5-5 7-1L12 2z" stroke="#7fa0ff" stroke-width="1.4" stroke-linejoin="round"/></svg></div>
                    <div class="orbit-tile t5"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12h16M4 6h16M4 18h16" stroke="#7fa0ff" stroke-width="1.6" stroke-linecap="round"/></svg></div>
                    <div class="orbit-tile t6"><svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="#7fa0ff" stroke-width="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5" stroke="#7fa0ff" stroke-width="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5" stroke="#7fa0ff" stroke-width="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5" stroke="#7fa0ff" stroke-width="1.5"/></svg></div>
                </div>
            </div>
        </header>`;

    const sliderSection = renderImageSlider(popularProjects);
    const upcomingSection = renderUpcomingSection(upcoming);
    const popularSection = renderPopularProjects(popularProjects);

    return `
        ${heroHtml}
        <main>
            ${sliderSection}
            ${upcomingSection}
            ${popularSection}
        </main>
    `;
}

module.exports = { renderHome };