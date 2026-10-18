/* ═══════════════════════════════════════════════════════════════
   modules/admin/views.js — Yönetim paneli: giriş ekranı ve
   kimlik doğrulama adımları. İç paneller admin-client.js
   tarafından istemcide çizilir (SPA mimarisi).
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc } = require('../../core/views');
const { SITE } = require('../public/layout');
const { asset } = require('../public/assets');

const ICONS = {
    sun:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    sys:  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    shield: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    key:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4M18 5l3 3M15 8l3 3"/></svg>',
    log:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>'
};

function renderAdminGate({ csrf = '', error = null, notice = null, twoFactorOn = false } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="auth-head">
                <span class="auth-logo">${SITE.shortName}</span>
                <span class="auth-badge">Yönetici</span>
            </div>
            <h1>Yönetim Girişi</h1>
            <p class="auth-sub">Bu alan yalnızca yetkili hesaplar içindir.</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            ${notice ? `<div class="alert alert--ok" role="alert">${esc(notice)}</div>` : ''}
            <form method="POST" action="/admin/login" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="email">E-posta</label>
                    <input id="email" name="email" type="email" required class="form-input" autocomplete="username" autocapitalize="none" spellcheck="false" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="password">Parola</label>
                    <div class="password-wrap">
                        <input id="password" name="password" type="password" required class="form-input" autocomplete="current-password" required>
                        <button type="button" class="password-toggle" data-pw-toggle="password" aria-label="Parolayı göster">
                            <svg class="icon-eye" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
                            <svg class="icon-eye-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l18 18M10.6 10.7a3 3 0 004.2 4.2"/><path d="M9.4 5.2A9.8 9.8 0 0112 5c6.5 0 10.5 7 10.5 7a17 17 0 01-2.4 3.2M6.6 6.6A17 17 0 001.5 12S5.5 19 12 19c1 0 2-.2 2.9-.5"/></svg>
                        </button>
                    </div>
                </div>
                <button class="btn btn-primary" type="submit">Giriş Yap</button>
            </form>
            <div class="auth-foot">
                <a href="/">← Siteye dön</a>
            </div>
        </div>
    </main>`;
}

function renderAdmin2FAGate({ email, error = null, mode = 'totp', remaining = 30, csrf = '' } = {}) {
    const isRecovery = mode === 'recovery';
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="steps"><span class="step-dot is-done"></span><span class="step-dot is-done"></span></div>
            <span class="auth-badge">Yönetici · Adım 2 / 2</span>
            <h1>Doğrulama</h1>
            <p class="auth-sub"><strong>${esc(email)}</strong> için ${isRecovery ? 'kurtarma kodunuzu girin.' : 'uygulamadaki 6 haneli kodu girin.'}</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            <form method="POST" action="/admin/2fa" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                ${isRecovery ? `
                <div class="form-group">
                    <label class="form-label" for="recovery">Kurtarma kodu</label>
                    <input id="recovery" name="recovery" type="text" required class="form-input otp-input" placeholder="XXXXX-XXXXX" maxlength="11">
                </div>
                ` : `
                <div class="form-group">
                    <label class="form-label" for="token">6 haneli kod</label>
                    <input id="token" name="token" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*" required class="form-input otp-input" placeholder="000000" autofocus>
                    <p class="form-hint" data-twofa-timer>Kod ${esc(remaining)} saniye sonra yenilenir.</p>
                </div>
                `}
                <button class="btn btn-primary" type="submit">Doğrula</button>
            </form>
            <div class="auth-foot">
                ${isRecovery ? '<a href="/admin/2fa">← Kod ile devam et</a>' : '<a href="/admin/2fa?mode=recovery">Kurtarma kodu kullan</a>'}
            </div>
        </div>
    </main>`;
}

function renderAdminEmailOtpGate({ email, error = null, csrf = '' } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="steps"><span class="step-dot is-done"></span><span class="step-dot is-done"></span></div>
            <span class="auth-badge">Yönetici · Adım 2 / 2</span>
            <h1>E-posta doğrulaması</h1>
            <p class="auth-sub"><strong>${esc(email)}</strong> adresine gönderilen 6 haneli kodu girin. Kod 10 dakika geçerlidir.</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            <form method="POST" action="/admin/2fa" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="token">6 haneli kod</label>
                    <input id="token" name="token" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required class="form-input otp-input" placeholder="000000" autofocus>
                </div>
                <button class="btn btn-primary" type="submit">Doğrula</button>
            </form>
            <form method="POST" action="/admin/2fa/resend" class="auth-form">
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <button class="btn btn-secondary" type="submit">Yeni kod gönder</button>
            </form>
            <div class="auth-foot"><a href="/admin/logout">İptal et ve çıkış yap</a></div>
        </div>
    </main>`;
}

function renderAdminSetupGate({ email, secret, uri, error = null, csrf = '', action = '/admin/2fa/enroll' } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="steps"><span class="step-dot is-done"></span><span class="step-dot is-done"></span></div>
            <span class="auth-badge">Yönetici · Güvenlik kurulumu</span>
            <h1>Authenticator kurulumu</h1>
            <p class="auth-sub">${esc(email)} hesabında yönetim panelini kullanmadan önce Authenticator doğrulaması etkinleştirilmelidir.</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            <ol class="auth-sub">
                <li>Authenticator uygulamasında bu hesabı ekleyin. <a href="${esc(uri)}">Uygulamada aç</a></li>
                <li>Uygulama desteklemiyorsa bu gizli anahtarı elle girin:</li>
            </ol>
            <p><code>${esc(secret)}</code></p>
            <form method="POST" action="${esc(action)}" class="auth-form">
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="setup-token">Authenticator kodu</label>
                    <input id="setup-token" name="token" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" required class="form-input otp-input" autocomplete="one-time-code" placeholder="000000">
                </div>
                <button class="btn btn-primary" type="submit">Kurulumu doğrula</button>
            </form>
            <div class="auth-foot"><a href="/admin/logout">İptal et ve çıkış yap</a></div>
        </div>
    </main>`;
}

function renderAdminSetupComplete({ recoveryCodes = [] } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <span class="auth-badge">Yönetici · Kurulum tamamlandı</span>
            <h1>Kurtarma kodlarınız</h1>
            <p class="auth-sub">Bu kodlar yalnızca şimdi gösterilir. Güvenli bir yerde saklayın; her biri bir kez kullanılabilir.</p>
            <ul class="recovery-codes">${recoveryCodes.map(code => `<li><code>${esc(code)}</code></li>`).join('')}</ul>
            <a class="btn btn-primary" href="/admin">Yönetim paneline devam et</a>
        </div>
    </main>`;
}

/* ── Yönetim paneli kabuğu (SPA host) ── */
function renderAdminShell({ user, csrf = '', themeBtn = '' } = {}) {
    return `<!doctype html>
<html lang="tr" class="no-js" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="color-scheme" content="light dark">
    <title>Yönetim Paneli | ${esc(SITE.name)}</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap">
    <link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600&display=swap">
    <link rel="stylesheet" href="${esc(asset('/css/style.css'))}">
    <link rel="stylesheet" href="${esc(asset('/css/admin.css'))}">
    <script>
    (function(){
        try {
            var s = localStorage.getItem('ks-theme') || 'light';
            var r = s === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : s;
            document.documentElement.setAttribute('data-theme', r);
        } catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
        document.documentElement.classList.remove('no-js');
    })();
    </script>
    <script>window.KS_ADMIN = { csrf: ${esc(JSON.stringify(csrf))}, user: ${esc(JSON.stringify({ email: user?.email, isAdmin: !!user?.isAdmin }))} };</script>
</head>
<body class="admin-body site-shell">
    <a class="skip-link" href="#main">İçeriğe atla</a>
    <div id="admin-root" data-view="dashboard"></div>
    <script src="/js/theme.js" defer></script>
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
                <a class="btn btn-ghost btn-sm" href="/admin/2fa/setup" data-nav>2FA</a>
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
                            <a class="btn btn-secondary" href="/admin/2fa/setup">2FA Kur</a>
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

module.exports = {
    renderAdminGate, renderAdmin2FAGate, renderAdminEmailOtpGate, renderAdminSetupGate, renderAdminSetupComplete,
    renderAdminShell, renderAdminDashboardHTML, ICONS
};
