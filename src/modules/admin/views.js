/* ═══════════════════════════════════════════════════════════════
   modules/admin/views.js — Yönetim paneli: giriş ekranı ve
   kimlik doğrulama adımları. İç paneller admin-client.js
   tarafından istemcide çizilir (SPA mimarisi).
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, json } = require('../../core/views');
const { SITE } = require('../public/layout');
const { asset } = require('../public/assets');

const ICONS = {
    shield: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    key:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4M18 5l3 3M15 8l3 3"/></svg>',
    log:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>'
};

const EYE = `<svg class="icon-eye" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
<svg class="icon-eye-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l18 18M10.6 10.7a3 3 0 004.2 4.2"/><path d="M9.4 5.2A9.8 9.8 0 0112 5c6.5 0 10.5 7 10.5 7a17 17 0 01-2.4 3.2M6.6 6.6A17 17 0 001.5 12S5.5 19 12 19c1 0 2-.2 2.9-.5"/></svg>`;

function renderAdminGate({ csrf = '', error = null, paths } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="auth-head">
                <span class="auth-logo">${SITE.shortName}</span>
                <span class="auth-badge">Yönetici · Adım 1 / 2</span>
            </div>
            <h1>Yönetim Girişi</h1>
            <p class="auth-sub">Bu alan yalnızca yetkili yönetici hesapları içindir.</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            <form method="POST" action="${esc(paths.login)}" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="username">Kullanıcı adı</label>
                    <input id="username" name="username" type="text" required class="form-input" autocomplete="username" autocapitalize="none" spellcheck="false" autofocus>
                </div>
                <div class="form-group">
                    <label class="form-label" for="password">Parola</label>
                    <div class="password-wrap">
                        <input id="password" name="password" type="password" required class="form-input" autocomplete="current-password">
                        <button type="button" class="password-toggle" data-pw-toggle="password" aria-label="Parolayı göster">${EYE}</button>
                    </div>
                </div>
                <button class="btn btn-primary" type="submit">Devam et</button>
            </form>
            <div class="auth-foot">
                <a href="/">← Siteye dön</a>
            </div>
        </div>
    </main>`;
}

function renderAdmin2FAGate({ username, error = null, mode = 'totp', remaining = 30, csrf = '', paths } = {}) {
    const isRecovery = mode === 'recovery';
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="steps"><span class="step-dot is-done"></span><span class="step-dot is-done"></span></div>
            <span class="auth-badge">Yönetici · Adım 2 / 2</span>
            <h1>Doğrulama</h1>
            <p class="auth-sub"><strong>${esc(username)}</strong> için ${isRecovery ? 'kurtarma kodunuzu girin.' : 'Authenticator uygulamasındaki 6 haneli kodu girin.'}</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            <form method="POST" action="${esc(paths.verify)}" class="auth-form" novalidate data-twofa-form>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                ${isRecovery ? `
                <div class="form-group">
                    <label class="form-label" for="recovery">Kurtarma kodu</label>
                    <input id="recovery" name="recovery" type="text" required class="form-input otp-input" placeholder="XXXXX-XXXXX" maxlength="11" autofocus>
                </div>
                ` : `
                <div class="form-group">
                    <label class="form-label" for="token">6 haneli kod</label>
                    <input id="token" name="token" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*" required class="form-input otp-input" placeholder="000000" autocomplete="one-time-code" autofocus>
                    <p class="form-hint" data-twofa-timer>Kod ${esc(remaining)} saniye sonra yenilenir.</p>
                </div>
                `}
                <button class="btn btn-primary" type="submit">Doğrula</button>
            </form>
            <div class="auth-foot">
                ${isRecovery ? `<a href="${esc(paths.verify)}">← Kod ile devam et</a>` : `<a href="${esc(paths.verify)}?mode=recovery">Kurtarma kodu kullan</a>`}
                <a href="${esc(paths.logout)}">İptal et</a>
            </div>
        </div>
    </main>`;
}

function renderAdminSetupGate({ username, secret, uri, error = null, csrf = '', paths } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card auth-card--wide" data-reveal>
            <div class="steps"><span class="step-dot is-done"></span><span class="step-dot is-done"></span></div>
            <span class="auth-badge">Yönetici · Güvenlik kurulumu</span>
            <h1>Authenticator kurulumu</h1>
            <p class="auth-sub"><strong>${esc(username)}</strong> hesabı panele girmeden önce iki adımlı doğrulamayı etkinleştirmelidir.</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            <ol class="step-list">
                <li class="step-item"><span class="step-num">1</span><span>Authenticator uygulamanızda (Google Authenticator, Authy, 1Password…) yeni hesap ekleyin. <a href="${esc(uri)}" data-otpauth>Uygulamada aç</a></span></li>
                <li class="step-item"><span class="step-num">2</span><span>Uygulama bağlantıyı desteklemiyorsa gizli anahtarı elle girin:</span></li>
            </ol>
            <div class="secret-display"><code>${esc(secret)}</code><button type="button" class="btn btn-ghost btn-sm" data-copy-target="secret" data-copy="${esc(secret)}">Kopyala</button></div>
            <form method="POST" action="${esc(paths.enroll)}" class="auth-form" data-twofa-form>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="setup-token">Uygulamadaki 6 haneli kod</label>
                    <input id="setup-token" name="token" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required class="form-input otp-input" autocomplete="one-time-code" placeholder="000000">
                </div>
                <button class="btn btn-primary" type="submit">Kurulumu doğrula</button>
            </form>
            <div class="auth-foot"><a href="${esc(paths.logout)}">İptal et ve çıkış yap</a></div>
        </div>
    </main>`;
}

function renderAdminSetupComplete({ recoveryCodes = [] } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card auth-card--wide" data-reveal>
            <span class="auth-badge">Yönetici · Kurtarma kodları</span>
            <h1>Kurtarma kodlarınız</h1>
            <p class="auth-sub">Bu kodlar yalnızca şimdi gösterilir. Güvenli bir yerde saklayın; her biri bir kez kullanılabilir ve Authenticator'a erişemediğinizde giriş sağlar.</p>
            <ul class="recovery-codes">${recoveryCodes.map(code => `<li><code>${esc(code)}</code></li>`).join('')}</ul>
            <div class="hero-actions">
                <button type="button" class="btn btn-secondary" data-copy-codes>Kodları kopyala</button>
                <a class="btn btn-primary" href="/admin">Yönetim paneline devam et</a>
            </div>
        </div>
    </main>`;
}

/* ── Giriş/2FA sayfaları için bağımsız kabuk ── */
function renderAdminAuth({ title, body }) {
    return `<!doctype html>
<html lang="tr" class="no-js" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#020203">
    <meta name="robots" content="noindex, nofollow">
    <title>${esc(title)} | ${esc(SITE.name)}</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="${esc(asset('/css/style.css'))}">
    <link rel="stylesheet" href="${esc(asset('/css/admin.css'))}">

    <link rel="stylesheet" href="${esc(asset('/css/mobile.css'))}">
    <script src="${esc(asset('/js/boot.js'))}"></script>
</head>
<body class="admin-body admin-auth-body">
    ${body}
    <script src="${esc(asset('/js/admin-2fa.js'))}" defer></script>
</body>
</html>`;
}

/* ── Yönetim paneli kabuğu (SPA host) ── */
function renderAdminShell({ admin, csrf = '', content = '' } = {}) {
    return `<!doctype html>
<html lang="tr" class="no-js" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="color-scheme" content="dark">
    <meta name="theme-color" content="#020203">
    <title>Yönetim Paneli | ${esc(SITE.name)}</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" media="print" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="${esc(asset('/css/style.css'))}">
    <link rel="stylesheet" href="${esc(asset('/css/admin.css'))}">

    <link rel="stylesheet" href="${esc(asset('/css/mobile.css'))}">
    <script src="${esc(asset('/js/boot.js'))}"></script>
    <!-- Yönetici oturum verisi: çalıştırılmayan JSON veri bloğu.
         CSP "script-src" kuralı yalnızca çalışan betikleri etkiler,
         bu blok tarayıcı tarafından yürütülmez; admin-client.js
         içeriği JSON.parse ile okur. -->
    <script type="application/json" id="ks-admin-bootstrap">${json({ csrf, user: { username: admin?.username, email: admin?.email || '', isAdmin: true } })}</script>
</head>
<body class="admin-body site-shell">
    <a class="skip-link" href="#main">İçeriğe atla</a>
    <div id="admin-root" data-view="dashboard">${content}</div>
    <script src="${esc(asset('/js/admin-client.js'))}" defer></script>
</body>
</html>`;
}

/* ── Tüm paneli HTML'de prelode etmek için (SEO + ilk yükleme hızlı) ── */
function renderAdminDashboardHTML({ stats = {}, recent = [] } = {}) {
    return `
    <div class="admin-shell" id="main" tabindex="-1">
        <header class="admin-topbar">
            <div>
                <h1>Yönetim Paneli</h1>
                <p class="text-subtle text-xs" style="margin-top:4px">Karahan's Studio</p>
            </div>
            <div class="admin-topbar-right">
                <a class="btn btn-ghost btn-sm" href="/admin/guvenlik">Güvenlik</a>
                <a class="btn btn-ghost btn-sm" href="/" target="_blank">Site</a>
                <a class="btn btn-danger btn-sm" href="/admin/logout">Çıkış</a>
            </div>
        </header>

        <nav class="admin-nav" aria-label="Yönetim">
            <a href="#dashboard" class="admin-nav-link is-active" data-nav data-view="dashboard">Genel</a>
            <a href="#products"  class="admin-nav-link" data-nav data-view="products">Ürünler</a>
            <a href="#updates"   class="admin-nav-link" data-nav data-view="updates">Güncellemeler</a>
            <a href="#upcoming"  class="admin-nav-link" data-nav data-view="upcoming">Yakında</a>
            <a href="#users"     class="admin-nav-link" data-nav data-view="users">Kullanıcılar</a>
            <a href="#messages"  class="admin-nav-link" data-nav data-view="messages">Mesajlar</a>
            <a href="#forms"     class="admin-nav-link" data-nav data-view="forms">Formlar</a>
            <a href="#finance"   class="admin-nav-link" data-nav data-view="finance">Gelir/Gider</a>
            <a href="#banned"    class="admin-nav-link" data-nav data-view="banned">Yasaklılar</a>
            <a href="#audit"     class="admin-nav-link" data-nav data-view="audit">Denetim</a>
        </nav>

        <main class="admin-content">
            <!-- Dashboard -->
            <section class="admin-view" data-view="dashboard">
                <div class="admin-grid stats">
                    <article class="stat-card"><span class="stat-label">Toplam Kullanıcı</span><span class="stat-number">${stats.totalUsers || 0}</span></article>
                    <article class="stat-card"><span class="stat-label">Ürünler</span><span class="stat-number">${stats.totalProducts || 0}</span></article>
                    <article class="stat-card"><span class="stat-label">Güncellemeler</span><span class="stat-number">${stats.totalUpdates || 0}</span></article>
                    <article class="stat-card"><span class="stat-label">Yakında</span><span class="stat-number">${stats.totalUpcoming || 0}</span></article>
                    <article class="stat-card"><span class="stat-label">Bekleyen Mesaj</span><span class="stat-number">${stats.pendingMessages || 0}</span></article>
                    <article class="stat-card"><span class="stat-label">Yeni Form</span><span class="stat-number">${stats.pendingForms || 0}</span></article>
                </div>

                <div class="admin-grid two-col">
                    <article class="surface" style="padding:var(--sp-5)">
                        <h3 style="margin-bottom:var(--sp-3)">Son Olaylar</h3>
                        <ul class="admin-list">
                            ${(recent || []).slice(0, 10).map(r => `
                            <li>
                                <span class="admin-list-time">${new Date(r.at).toLocaleString('tr-TR')}</span>
                                <span class="admin-list-type">${esc(r.type)}</span>
                                <span class="admin-list-detail">${esc(r.detail || '')}</span>
                            </li>`).join('') || '<li class="text-subtle text-sm">Henüz olay yok.</li>'}
                        </ul>
                    </article>
                    <article class="surface" style="padding:var(--sp-5)">
                        <h3 style="margin-bottom:var(--sp-3)">Hızlı İşlemler</h3>
                        <div class="admin-quick">
                            <a class="btn btn-primary" data-nav data-view="products" href="#products">Yeni Ürün</a>
                            <a class="btn btn-secondary" data-nav data-view="updates" href="#updates">Güncelleme Yayınla</a>
                            <a class="btn btn-secondary" data-nav data-view="messages" href="#messages">Mesajları Oku</a>
                            <a class="btn btn-secondary" href="/admin/guvenlik">Güvenlik</a>
                        </div>
                    </article>
                </div>
            </section>

            <section class="admin-view" data-view="products" hidden>
                <div class="admin-toolbar">
                    <h2>Ürünler</h2>
                    <button class="btn btn-primary" data-action="product-new">Yeni Ürün</button>
                </div>
                <div data-list="products"></div>
            </section>

            <section class="admin-view" data-view="updates" hidden>
                <div class="admin-toolbar">
                    <h2>Güncelleme Notları</h2>
                    <button class="btn btn-primary" data-action="update-new">Yeni Güncelleme</button>
                </div>
                <div data-list="updates"></div>
            </section>

            <section class="admin-view" data-view="upcoming" hidden>
                <div class="admin-toolbar">
                    <h2>Yakında</h2>
                    <button class="btn btn-primary" data-action="upcoming-new">Yeni Ürün</button>
                </div>
                <div data-list="upcoming"></div>
            </section>

            <section class="admin-view" data-view="users" hidden>
                <div class="admin-toolbar">
                    <h2>Kullanıcılar</h2>
                </div>
                <div data-list="users"></div>
            </section>

            <section class="admin-view" data-view="messages" hidden>
                <div class="admin-toolbar">
                    <h2>Mesajlar</h2>
                </div>
                <div data-list="messages"></div>
            </section>

            <section class="admin-view" data-view="forms" hidden>
                <div class="admin-toolbar">
                    <h2>Müşteri Formları</h2>
                </div>
                <div data-list="forms"></div>
            </section>

            <section class="admin-view" data-view="finance" hidden>
                <div class="admin-toolbar">
                    <h2>Gelir / Gider</h2>
                    <button class="btn btn-primary" data-action="txn-new">Yeni İşlem</button>
                </div>
                <div data-list="finance"></div>
            </section>

            <section class="admin-view" data-view="banned" hidden>
                <div class="admin-toolbar">
                    <h2>Yasaklılar</h2>
                    <button class="btn btn-primary" data-action="banned-new">Yeni Ekle</button>
                </div>
                <div data-list="banned"></div>
            </section>

            <section class="admin-view" data-view="audit" hidden>
                <div class="admin-toolbar">
                    <h2>Denetim Günlüğü</h2>
                    <button class="btn btn-secondary" data-action="audit-refresh">Yenile</button>
                </div>
                <div data-list="audit"></div>
            </section>
        </main>

        <!-- Modal: form alanı -->
        <div class="modal-overlay" id="modalOverlay" data-modal hidden>
            <div class="modal" role="dialog" aria-modal="true">
                <button class="modal-close" data-action="modal-close" aria-label="Kapat">✕</button>
                <div class="modal-body" data-modal-body></div>
            </div>
        </div>
    </div>`;
}

function renderAdminSecurity({ admin, csrf = '', paths, recoveryLeft = 0 } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card auth-card--wide" data-reveal>
            <span class="auth-badge">Yönetici · Güvenlik</span>
            <h1>Hesap güvenliği</h1>
            <p class="auth-sub"><strong>${esc(admin.username)}</strong> · Son giriş: ${esc(admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString('tr-TR') : '—')}</p>
            <ul class="step-list">
                <li class="step-item"><span class="step-num">✓</span><span>Authenticator doğrulaması etkin.</span></li>
                <li class="step-item"><span class="step-num">${esc(recoveryLeft)}</span><span>kullanılmamış kurtarma kodu kaldı.</span></li>
            </ul>
            <form method="POST" action="${esc(paths.recovery)}" class="auth-form">
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <button class="btn btn-secondary" type="submit">Kurtarma kodlarını yenile</button>
            </form>
            <p class="form-hint">Parola değiştirmek veya 2FA'yı sıfırlamak için sunucuda <code>node tools/admin.js</code> aracını kullanın.</p>
            <div class="auth-foot"><a href="/admin">← Panele dön</a></div>
        </div>
    </main>`;
}

module.exports = {
    renderAdminSecurity,
    renderAdminGate, renderAdmin2FAGate, renderAdminSetupGate, renderAdminSetupComplete, renderAdminAuth,
    renderAdminShell, renderAdminDashboardHTML, ICONS
};
