const { escapeHtml } = require('./layout');

function renderCard(project) {
    const isLive = project.status === 'Yayında';
    return `
    <a class="card" href="/urun/${encodeURIComponent(project.id)}">
        <div class="card-top">
            <span class="card-tag">${escapeHtml(project.category)}</span>
            <span class="card-status"><span class="status-dot ${isLive ? 'status-dot--live' : ''}"></span>${escapeHtml(project.status)}</span>
        </div>
        <h3>${escapeHtml(project.name)}</h3>
        <p>${escapeHtml(project.summary)}</p>
        <div class="card-meta">
            <span>${escapeHtml(project.date)}</span>
            <span>${escapeHtml(project.version)}</span>
        </div>
        <span class="card-link">Detaylar <span class="arrow">→</span></span>
    </a>`;
}

function renderCardGrid(projectList, gridClass = 'grid') {
    if (!projectList.length) {
        return '<p class="grid-empty">Henüz proje eklenmedi.</p>';
    }
    return `<div class="${gridClass}">${projectList.map(renderCard).join('')}</div>`;
}

module.exports = { renderCard, renderCardGrid };
