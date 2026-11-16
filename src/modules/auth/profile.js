/* ═══════════════════════════════════════════════════════════════
   modules/auth/profile.js — Profil sayfaları.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, date } = require('../../core/views');
const password = require('../../core/password');

function initials(user) {
    if (!user) return '?';
    return (user.firstName || 'K').charAt(0).toUpperCase() + (user.lastName || '').charAt(0).toUpperCase();
}

function renderProfile({ user, csrf = '', tfaOn = false, messages = [] }) {
    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>Profilim</h1>
            <p class="lead">Hesap bilgilerini ve güvenlik ayarlarını yönet.</p>
        </header>

        <div class="profile-shell">
            <article class="profile-head" data-reveal>
                <div class="profile-avatar">${user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : esc(initials(user))}</div>
                <div style="flex:1">
                    <h1 class="profile-name">${esc(user.firstName || '')} ${esc(user.lastName || '')}</h1>
                    <p class="profile-role">${esc(user.email)}</p>
                    <p class="profile-joined">Kayıt: ${date(user.createdAt)}${user.isAdmin ? ' · <span class="badge badge--brand">Yönetici</span>' : ''}</p>
                </div>
                <a class="btn btn-secondary" href="/profil/duzenle">Düzenle</a>
            </article>

            <div class="grid-2">
                <article class="surface" style="padding:var(--sp-6)" data-reveal>
                    <h3 style="margin-bottom:var(--sp-3)">İletişim</h3>
                    <dl style="display:grid;gap:var(--sp-3);margin:0">
                        <div><dt class="form-label">Telefon</dt><dd>${esc(user.phone || '—')}</dd></div>
                        <div><dt class="form-label">Adres</dt><dd>${esc((user.address?.line1 || '') + (user.address?.city ? ', ' + user.address.city : '') || '—')}</dd></div>
                    </dl>
                </article>
                <article class="surface" style="padding:var(--sp-6)" data-reveal>
                    <h3 style="margin-bottom:var(--sp-3)">Güvenlik</h3>
                    <dl style="display:grid;gap:var(--sp-3);margin:0">
                        <div>
                            <dt class="form-label">İki faktörlü doğrulama</dt>
                            <dd>
                                ${tfaOn
                                    ? '<span class="badge badge--ok">Etkin</span>'
                                    : '<span class="badge badge--warn">Kapalı</span>'}
                            </dd>
                        </div>
                        <div>
                            <dt class="form-label">Hesap durumu</dt>
                            <dd>${user.banned ? '<span class="badge badge--bad">Yasaklı</span>' : '<span class="badge badge--ok">Aktif</span>'}</dd>
                        </div>
                    </dl>
                    <a class="btn btn-primary" href="/profil/2fa" style="margin-top:var(--sp-4)">2FA Ayarları</a>
                </article>
            </div>

            <section class="profile-messages surface" data-reveal>
                <header class="profile-messages-head">
                    <div>
                        <h2>İletişim Formlarım</h2>
                        <p class="text-muted">Gönderdiğin iletişim mesajları burada saklanır.</p>
                    </div>
                    <span class="badge badge--neutral">${messages.length} kayıt</span>
                </header>
                ${messages.length
                    ? `<div class="profile-message-list">
                        ${messages.map(message => `
                            <article class="profile-message${message.read ? ' profile-message--read' : ''}">
                                <div class="profile-message-meta">
                                    <div class="profile-message-title">
                                        <h3>${esc(message.subject || 'Konu belirtilmedi')}</h3>
                                        <span class="profile-message-status${message.read ? ' is-read' : ''}">
                                            ${message.read ? 'Okundu' : 'Gönderildi'}
                                        </span>
                                    </div>
                                    <time datetime="${esc(message.date || '')}">${date(message.date)}</time>
                                </div>
                                <p>${esc(message.message || '')}</p>
                                ${message.phone ? `<span class="profile-message-phone">Telefon: ${esc(message.phone)}</span>` : ''}
                            </article>`).join('')}
                    </div>`
                    : `<p class="profile-messages-empty">Henüz gönderilmiş bir iletişim formun yok.</p>`}
            </section>

            <article class="surface danger-zone" style="padding:var(--sp-6);border-color:var(--c-bad)" data-reveal>
                <h3 style="color:var(--c-bad);margin-bottom:var(--sp-3)">Tehlikeli Bölge</h3>
                <p class="text-muted" style="margin-bottom:var(--sp-4)">Hesabınızı silmek geri alınamaz. Tüm verileriniz silinir.</p>
                <form method="POST" action="/profil/sil" data-confirm="Hesabınızı silmek istediğinizden emin misiniz? Bu geri alınamaz.">
                    <input type="hidden" name="_csrf" value="${esc(csrf)}">
                    <button class="btn btn-danger" type="submit">Hesabımı Sil</button>
                </form>
            </article>
        </div>
    </section>`;
}

function renderProfileEdit({ user, csrf = '', flash = null } = {}) {
    const a = user.address || {};
    return `
    <section class="container-narrow" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>Profili Düzenle</h1>
            <p class="lead">Bilgilerini güncelle.</p>
        </header>

        ${flash ? `<div class="alert alert--ok">${esc(flash)}</div>` : ''}

        <article class="surface" style="padding:var(--sp-6)" data-reveal>
            <form method="POST" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="firstName">Ad</label>
                        <input id="firstName" name="firstName" type="text" class="form-input" value="${esc(user.firstName || '')}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="lastName">Soyad</label>
                        <input id="lastName" name="lastName" type="text" class="form-input" value="${esc(user.lastName || '')}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="phone">Telefon</label>
                    <input id="phone" name="phone" type="tel" class="form-input" value="${esc(user.phone || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="addressLine">Adres</label>
                    <input id="addressLine" name="addressLine" type="text" class="form-input" value="${esc(a.line1 || '')}" placeholder="Mahalle, Sokak, No">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="city">Şehir</label>
                        <input id="city" name="city" type="text" class="form-input" value="${esc(a.city || '')}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="zip">Posta Kodu</label>
                        <input id="zip" name="zip" type="text" class="form-input" value="${esc(a.zip || '')}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="country">Ülke</label>
                    <input id="country" name="country" type="text" class="form-input" value="${esc(a.country || 'Türkiye')}">
                </div>
                <div class="row" style="gap:var(--sp-3)">
                    <button class="btn btn-primary" type="submit">Kaydet</button>
                    <a class="btn btn-ghost" href="/profil">İptal</a>
                </div>
            </form>
        </article>
    </section>`;
}

module.exports = { renderProfile, renderProfileEdit };
