document.addEventListener('DOMContentLoaded', () => {
    loadProject();
});

async function loadProject() {
    const root = document.getElementById('detail-root');
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        renderNotFound(root);
        return;
    }

    try {
        const response = await fetch(`/api/projects/${encodeURIComponent(id)}`);
        if (!response.ok) {
            renderNotFound(root);
            return;
        }
        const project = await response.json();
        renderProject(root, project);
    } catch (error) {
        console.error('Proje yüklenirken hata oluştu:', error);
        renderNotFound(root);
    }
}

function renderProject(root, project) {
    document.title = `${project.name} | Karahan's`;
    const isLive = project.status === 'Yayında';

    root.innerHTML = `
        <a class="back-link" href="/projeler.html">← Tüm projelere dön</a>
        <div class="detail-head">
            <span class="card-tag">${escapeHtml(project.category)}</span>
            <span class="card-status"><span class="status-dot ${isLive ? 'status-dot--live' : ''}"></span>${escapeHtml(project.status)}</span>
        </div>
        <h1>${escapeHtml(project.name)}</h1>
        <p class="lead">${escapeHtml(project.descLong || project.desc)}</p>
        <div class="detail-meta">
            <div>
                <span class="meta-label">Sürüm</span>
                <span class="meta-value">${escapeHtml(project.version)}</span>
            </div>
            <div>
                <span class="meta-label">Kategori</span>
                <span class="meta-value">${escapeHtml(project.category)}</span>
            </div>
            <div>
                <span class="meta-label">Yayın tarihi</span>
                <span class="meta-value">${escapeHtml(project.date)}</span>
            </div>
        </div>
    `;
}

function renderNotFound(root) {
    root.innerHTML = `
        <a class="back-link" href="/projeler.html">← Tüm projelere dön</a>
        <h1>Proje bulunamadı</h1>
        <p class="detail-empty">Aradığınız proje kaldırılmış veya taşınmış olabilir.</p>
    `;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
