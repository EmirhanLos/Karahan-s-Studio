const { escapeHtml } = require('./layout');

function renderUpcomingCard(item) {
    const imgHtml = item.image
        ? `<div class="uc-img"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy"></div>`
        : `<div class="uc-img uc-img--placeholder"><span>${escapeHtml(item.name.charAt(0))}</span></div>`;

    return `
    <article class="uc-card">
        ${imgHtml}
        <div class="uc-body">
            <span class="uc-badge">YAKINDA</span>
            <h2 class="uc-title">${escapeHtml(item.name)}</h2>
            <p class="uc-desc">${escapeHtml(item.description)}</p>
            <div class="uc-footer">
                ${item.showPrice && item.price ? `<span class="uc-price">${Number(item.price).toLocaleString('tr-TR')}₺'den başlayan fiyatlarla</span>` : ''}
                <a href="/yakinda/${encodeURIComponent(item.id)}" class="btn-update-see">Duyuruyu Gör <span class="arrow">→</span></a>
            </div>
        </div>
    </article>`;
}

function renderUpdateCard(update) {
    const imgHtml = update.image
        ? `<div class="uc-img"><img src="${escapeHtml(update.image)}" alt="${escapeHtml(update.title)}" loading="lazy"></div>`
        : `<div class="uc-img uc-img--placeholder"><span>${escapeHtml(update.projectName?.charAt(0) || 'G')}</span></div>`;

    return `
    <article class="uc-card">
        ${imgHtml}
        <div class="uc-body">
            <span class="uc-badge" style="background:var(--blue-soft);color:var(--blue);border-color:var(--blue-border)">GÜNCELLEME</span>
            <h2 class="uc-title">${escapeHtml(update.title)}</h2>
            <p class="uc-desc">${escapeHtml(update.description)}</p>
            <div class="uc-footer">
                <span class="uc-price" style="color:var(--text-dim)">${escapeHtml(update.projectName)} — ${escapeHtml(update.version)}</span>
                <span class="uc-price" style="color:var(--text-faint)">${escapeHtml(update.dateDisplay)}</span>
            </div>
        </div>
    </article>`;
}

function renderUpcomingPage(items) {
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Yakında</span>
            <h1>Yakında Eklenecek</h1>
            <p>Geliştirme sürecindeki projeler ve yakında yayınlanacak ürünler.</p>
        </div>
        <div class="container uc-list">
            ${items.length
                ? items.map(renderUpcomingCard).join('')
                : '<p class="grid-empty">Henüz duyurulan bir ürün yok.</p>'
            }
        </div>
    </main>`;
}

function renderAnnouncementsPage(items, updates = []) {
    // Only show upcoming items, not updates
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Duyurular</span>
            <h1>Tüm Duyurular</h1>
            <p>Yakında çıkacak ürünler.</p>
        </div>
        <div class="container uc-list">
            ${items.length
                ? items.map(renderUpcomingCard).join('')
                : '<p class="grid-empty">Henüz duyuru yok.</p>'
            }
        </div>
    </main>`;
}

function renderUpcomingDetail(item) {
    const imgHtml = item.image
        ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="uc-detail-img" loading="lazy">`
        : `<div class="uc-detail-img uc-detail-img--placeholder"><span>${escapeHtml(item.name.charAt(0))}</span></div>`;

    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Yakında</span>
            <h1>${escapeHtml(item.name)}</h1>
        </div>
        <div class="container">
            <div class="uc-detail">
                <div class="uc-detail-visual">${imgHtml}</div>
                <div class="uc-detail-content">
                    <span class="uc-badge">YAKINDA</span>
                    <h2 class="uc-detail-title">${escapeHtml(item.name)}</h2>
                    <p class="uc-detail-desc">${escapeHtml(item.description)}</p>
                    <div class="uc-detail-footer">
                        ${item.showPrice && item.price 
                            ? `<span class="uc-price">${Number(item.price).toLocaleString('tr-TR')}₺'den başlayan fiyatlarla</span>` 
                            : ''}
                        <a href="/yakinda" class="btn-update-see">← Tüm Duyurulara Dön</a>
                    </div>
                </div>
            </div>
        </div>
    </main>`;
}

module.exports = { renderUpcomingPage, renderUpcomingCard, renderAnnouncementsPage, renderUpcomingDetail };
