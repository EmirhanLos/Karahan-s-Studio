const fs   = require('fs');
const path = require('path');

// data/projects.json boş — gerçek veri projects.js'de
const projectsData = require('./projects');

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sortedProjects() {
    return [...projectsData].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}

function navDropdownItems() {
    return sortedProjects().map((p) => `
        <li>
            <a href="/urun/${encodeURIComponent(p.id)}">
                <span>${escapeHtml(p.name)}</span>
                <span class="item-tag">${escapeHtml(p.category)}</span>
            </a>
        </li>
    `).join('');
}

function navLink(href, label, isActive) {
    return `<a href="${href}"${isActive ? ' class="active"' : ''}>${label}</a>`;
}

/* Profil fotoğrafını canlı oku */
function getProfileAvatar() {
    try {
        const USERS_FILE = path.join(__dirname, '../../data/users.json');
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        // Admin kullanıcısının avatarını al
        const admin = users.find(u => u.isAdmin) || users[0];
        if (admin && admin.avatar) return admin.avatar;
        // Baş harfler
        const initials = ((admin?.firstName || 'K').charAt(0) + (admin?.lastName || '').charAt(0)).toUpperCase();
        return null; // null = initials göster
    } catch { return null; }
}

function getProfileInitials() {
    try {
        const USERS_FILE = path.join(__dirname, '../../data/users.json');
        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const admin = users.find(u => u.isAdmin) || users[0];
        return ((admin?.firstName || 'K').charAt(0) + (admin?.lastName || '').charAt(0)).toUpperCase();
    } catch { return 'K'; }
}

function renderNav(active, user) {
    const avatar   = user?.avatar || null;
    const initials = user
        ? ((user.firstName || 'K').charAt(0) + (user.lastName || '').charAt(0)).toUpperCase()
        : 'K';
    const avatarHtml = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="Profil" class="nav-avatar-img">`
        : `<span class="nav-avatar-initials">${initials}</span>`;

    const isLoggedIn = !!user;

    return `
    <nav class="navbar">
        <a class="logo" href="/">karahan<span>'s</span></a>
        <button class="nav-toggle" id="navToggle" aria-label="Menüyü aç" aria-expanded="false">
            <span></span><span></span><span></span>
        </button>
        <ul class="nav-links" id="navLinks">
            <li>${navLink('/', 'Ana Sayfa', active === 'home')}</li>
            <li class="dropdown">
                <a href="/projeler" class="dropbtn${active === 'projeler' ? ' active' : ''}">Projeler</a>
                <ul class="dropdown-content" id="projectsDropdown">
                    ${navDropdownItems()}
                </ul>
            </li>
            <li>${navLink('/guncellemeler', 'Güncelleme Notları', active === 'guncellemeler')}</li>
            <li>${navLink('/hakkinda', 'Hakkında', active === 'hakkinda')}</li>
            <li class="nav-theme-wrap">
                <button class="nav-theme-btn" id="navThemeBtn" aria-label="Tema değiştir" aria-expanded="false">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                </button>
                <div class="nav-theme-menu" id="navThemeMenu">
                    <button class="nav-theme-option" data-theme="dark">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                        Siyah Tema
                    </button>
                    <button class="nav-theme-option" data-theme="light">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                        Beyaz Tema
                    </button>
                    <button class="nav-theme-option" data-theme="system">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                        </svg>
                        Cihaz Teması
                    </button>
                </div>
            </li>
            <li class="nav-profile-dropdown">
                <a href="/profil" class="nav-avatar-link${active === 'profil' ? ' active' : ''}" title="Profil" aria-label="Profil">
                    <div class="nav-avatar">${avatarHtml}</div>
                </a>
                ${isLoggedIn ? `
                <div class="nav-profile-dropdown-menu">
                    <a href="/profil" class="nav-profile-dropdown-item">Profil</a>
                    <a href="/profil/duzenle" class="nav-profile-dropdown-item">Profili Düzenle</a>
                    <a href="/cikis" class="nav-profile-dropdown-item nav-profile-dropdown-item--danger">Çıkış Yap</a>
                </div>
                ` : ''}
            </li>
        </ul>
    </nav>`;
}

function renderFooter() {
    return `
    <footer class="site-footer">
        <div class="footer-container">
            <div class="footer-columns">
                <div class="footer-col">
                    <h4>Şirket</h4>
                    <ul>
                        <li><a href="/iletisim">İletişim</a></li>
                        <li><a href="/hakkinda">Hakkında</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Ürün</h4>
                    <ul>
                        <li><a href="/projeler">Tüm Projeler</a></li>
                        <li><a href="/yakinda">Yakında</a></li>
                        <li><a href="/guncellemeler">Güncelleme Notları</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Yasal</h4>
                    <ul>
                        <li><a href="/kullanim-sartlari">Kullanım Şartları</a></li>
                        <li><a href="/gizlilik-sozlesmesi">Gizlilik Sözleşmesi</a></li>
                        <li><a href="/teslimat-iade">Teslimat ve İade Şartları</a></li>
                        <li><a href="/mesafeli-satis">Mesafeli Satış Sözleşmesi</a></li>
                        <li><a href="/kvkk">KVKK Aydınlatma Metni</a></li>
                    </ul>
                </div>
                <div class="footer-col">
                    <h4>Sosyal</h4>
                    <ul class="social-list">
                        <li><a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="social-link social-link--instagram">Instagram <span class="social-link-arrow" aria-hidden="true">↗</span></a></li>
                        <li><a href="https://youtube.com" target="_blank" rel="noopener noreferrer" class="social-link social-link--youtube">YouTube <span class="social-link-arrow" aria-hidden="true">↗</span></a></li>
                        <li><a href="https://discord.com" target="_blank" rel="noopener noreferrer" class="social-link social-link--discord">Discord <span class="social-link-arrow" aria-hidden="true">↗</span></a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2026 Karahan's Studio. Tüm hakları saklıdır.</p>
            </div>
        </div>
    </footer>`;
}

/* ── Statik varlık sürümleme ──────────────────────────────────────
   CSS/JS dosyaları uzun süreli önbelleklenir (immutable gibi).
   Bu, dosya adında sürüm yoksa kullanıcıların 30 gün boyunca
   eski sürümü görmesine yol açar. Bu yüzden içerikten kısa bir
   hash üretip URL'ye ekliyoruz: içerik değişince adres de
   değişir, önbellek güvenle uzun kalır. */
const crypto = require('crypto');
const assetVersionCache = new Map();

function assetVersion(relPath) {
    if (assetVersionCache.has(relPath)) return assetVersionCache.get(relPath);
    let v = '1';
    try {
        /* __dirname = public/js ; kök = public */
        const rel = relPath.replace(/^\/+/, '');
        const buf = fs.readFileSync(path.join(__dirname, '..', rel));
        v = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
    } catch {
        /* Dosya yoksa sürüm etiketi olmadan sun */
    }
    assetVersionCache.set(relPath, v);
    return v;
}

/* v= yoksa sadece yol döndürür */
function asset(relPath) {
    return `${relPath}?v=${assetVersion(relPath)}`;
}

function renderPage({ title, description = '', active = '', bodyHtml, statusCode = 200, extraCss = '', extraJs = '', user = null }) {
    return {
        statusCode,
        html: `<!DOCTYPE html>
<html lang="tr" class="no-js">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    ${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="dns-prefetch" href="https://fonts.gstatic.com">

    <!-- Yazı tipleri render'ı bloklamasın.
         Varsayılan (media="all") bağlantı, indirilene kadar
         ilk boyamayı bekletir. media="print" + onload deseni
         stil sayfasını önceliksiz yapar; font-display:swap
         sayesinde yazılar sistem yazı tipiyle anında görünür. -->
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap"></noscript>

    <link rel="stylesheet" href="${asset('/css/style.css')}">
    ${extraCss ? `<link rel="stylesheet" href="${escapeHtml(extraCss.startsWith('/') ? asset(extraCss) : extraCss)}">` : ''}
    <script>
    /* Tema, stil sayfası yüklenmeden ÖNCE uygulanmalı.
       Aksi halde sayfa koyu temayla boyanıp ardından beyaza
       döner (FOUC) ve tema değişiminde ekranın sağından
       soluna süpürme efekti bozulur. */
    (function () {
        try {
            var saved = localStorage.getItem('ks-theme') || 'system';
            var resolved = saved === 'system'
                ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
                : saved;
            document.documentElement.setAttribute('data-theme', resolved);
        } catch (e) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    })();
    </script>
</head>
<body>
    <a class="skip-link" href="#main">İçeriğe atla</a>
    ${renderNav(active, user)}
    <div id="main" tabindex="-1">
    ${bodyHtml}
    </div>
    ${renderFooter()}
    <script src="${asset('/js/nav.js')}" defer></script>
    <script src="${asset('/js/reveal.js')}" defer></script>
    ${extraJs ? `<script src="${escapeHtml(extraJs.startsWith('/') ? asset(extraJs) : extraJs)}" defer></script>` : ''}
</body>
</html>`
    };
}

module.exports = { renderPage, escapeHtml, sortedProjects, asset, assetVersion };
