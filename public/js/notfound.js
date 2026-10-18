
function renderNotFound(message) {
    return `
    <main class="notfound">
        <span class="notfound-code">404</span>
        <h1>${message || 'Sayfa bulunamadı'}</h1>
        <p>Aradığınız sayfa kaldırılmış, taşınmış veya hiç var olmamış olabilir.</p>
        <div class="hero-actions" style="justify-content:center;">
            <a class="btn-primary" href="/">Ana Sayfaya Dön</a>
            <a class="btn-secondary" href="/projeler">Tüm Projeler</a>
        </div>
    </main>`;
}

function renderBanPage(reason = '') {
    return `
    <main class="ban-page">
        <div class="ban-container">
            <div class="ban-icon">🚫</div>
            <h1>Hesabınız Yasaklandı</h1>
            <p class="ban-reason">${reason || 'Bu hesap site yöneticileri tarafından yasaklanmıştır.'}</p>
            <p class="ban-note">Bu karar hakkında itiraz etmek için <a href="/iletisim">iletişim formu</a> üzerinden bizimle iletişime geçebilirsiniz.</p>
        </div>
    </main>`;
}

module.exports = { renderNotFound, renderBanPage };
