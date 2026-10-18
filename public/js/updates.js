const { escapeHtml } = require('./layout');

function renderUpdateCard(u) {
    const imgHtml = u.image
        ? `<div class="update-img"><img src="${escapeHtml(u.image)}" alt="${escapeHtml(u.title)}" loading="lazy"></div>`
        : `<div class="update-img update-img--placeholder"><span>${escapeHtml(u.projectName.charAt(0))}</span></div>`;

    return `
    <article class="update-card">
        <div class="update-card-left">
            <div class="update-meta-top">
                <span class="update-project">${escapeHtml(u.projectName)}</span>
                <span class="update-version">${escapeHtml(u.version)}</span>
            </div>
            <h2 class="update-title">${escapeHtml(u.title)}</h2>
            <p class="update-desc">${escapeHtml(u.description)}</p>
            <div class="update-footer">
                <span class="update-date">${escapeHtml(u.dateDisplay)}</span>
                <a href="/urun/${encodeURIComponent(u.projectId)}" class="btn-update-see">
                    Güncellemeyi Gör <span class="arrow">→</span>
                </a>
            </div>
        </div>
        ${imgHtml}
    </article>`;
}

function renderUpdates(updates) {
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Sürüm Geçmişi</span>
            <h1>Güncelleme Notları</h1>
            <p>Tüm projelerin güncel sürüm notları ve değişiklik geçmişi.</p>
        </div>
        <div class="container updates-list">
            ${updates.length
                ? updates.map(renderUpdateCard).join('')
                : '<p class="grid-empty">Henüz güncelleme notu eklenmedi.</p>'
            }
        </div>
    </main>`;
}

module.exports = { renderUpdates };
