const { renderCardGrid } = require('./cards');

function renderProjeler(allProjects) {
    return `
    <div class="page-header">
        <span class="hero-eyebrow">Yazılım Stüdyosu</span>
        <h1>Tüm Projeler</h1>
        <p>Geliştirdiğim masaüstü uygulamaları, sistem araçları ve oyunların tamamı — en yeniden en eskiye.</p>
    </div>
    <main class="container">
        ${renderCardGrid(allProjects)}
    </main>`;
}

module.exports = { renderProjeler };
