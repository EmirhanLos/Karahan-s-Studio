/* ═══════════════════════════════════════════════════════════════
   modules/auth/profile.js — Profil sayfaları.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, date, money } = require('../../core/views');
const password = require('../../core/password');
const data = require('../../data');

function initials(user) {
    if (!user) return '?';
    return (user.firstName || 'K').charAt(0).toUpperCase() + (user.lastName || '').charAt(0).toUpperCase();
}

function messageStatusHtml(message) {
    const status = String(message.status || 'Yeni');
    return status === 'İşlendi'
        ? '<span class="badge badge--ok">İşlendi</span>'
        : '<span class="badge badge--warn">Yeni</span>';
}

function downloadable(project) {
    return !!(project && project.status === 'Yayında' && (project.file || project.deviceFile));
}

function libraryCard(item, kind) {
    const proj = item.productId ? data.projectById(item.productId) : null;
    const name = esc(proj ? proj.name : (item.productName || 'Ürün'));
    const category = esc(proj ? proj.category : (item.description || ''));
    const when = kind === 'download' ? item.downloadedAt : item.date;
    const price = kind === 'purchase' ? money(item.amount || 0) : '';
    const canDownload = downloadable(proj);

    return `
    <article class="library-item surface" style="padding:var(--sp-5)">
        <div class="library-item-info">
            <h4 style="margin:0 0 var(--sp-1)">${name}</h4>
            <p class="text-muted" style="margin:0">${category}${price ? ` · ${price}` : ''} · ${date(when)}</p>
            ${proj ? `<p class="text-subtle text-xs" style="margin:var(--sp-1) 0 0">Sürüm: ${esc(proj.version || '')}</p>` : ''}
        </div>
        <div class="library-item-actions" style="display:flex;gap:var(--sp-2);flex-wrap:wrap;justify-content:flex-end">
            ${canDownload
                ? `<a href="/indir/${esc(proj.id)}" class="btn btn-primary btn-sm">Yeniden İndir</a>`
                : `<span class="badge badge--warn">Dosya yok</span>`}
            ${proj ? `<a href="/urun/${esc(proj.id)}" class="btn btn-ghost btn-sm">Ürüne Git</a>` : ''}
        </div>
    </article>`;
}

function renderProfile({ user, csrf = '', tfaOn = false, messages = [], purchases = [], downloads = [], viewed = [] }) {
    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>Profilim</h1>
            <p class="lead">Hesap bilgilerini, kütüphanenizi ve güvenlik ayarlarını yönet.</p>
        </header>

        <nav class="profile-tabs" aria-label="Profil bölümleri" style="display:flex;gap:var(--sp-1);margin-bottom:var(--sp-6);border-bottom:1px solid var(--c-border);overflow:auto">
            <a class="tab" href="#hesap">Hesap</a>
            <a class="tab" href="#kutuphanem">Kütüphanem</a>
            <a class="tab" href="#guvenlik">Güvenlik</a>
            <a class="tab" href="#mesajlar">İletişim Formlarım</a>
            <a class="tab" href="#gecmis">Görüntüleme Geçmişi</a>
        </nav>

        <section id="hesap" class="profile-section" data-reveal>
            <article class="profile-head" data-reveal>
                <div class="profile-avatar">${user.avatar ? `<img src="${esc(user.avatar)}" alt="">` : esc(initials(user))}</div>
                <div style="flex:1">
                    <h1 class="profile-name">${esc(user.firstName || '')} ${esc(user.lastName || '')}</h1>
                    <p class="profile-role">${esc(user.email)}</p>
                    <p class="profile-joined">Kayıt: ${date(user.createdAt)}${user.isAdmin ? ' · <span class="badge badge--brand">Yönetici</span>' : ''}</p>
                </div>
                <a class="btn btn-secondary" href="/profil/duzenle">Düzenle</a>
            </article>

                </article>
        </section>

        <section id="kutuphanem" class="profile-section" data-reveal>
            <header class="profile-section-head" style="margin-bottom:var(--sp-4)">
                <h2>Kütüphanem</h2>
                <p class="text-muted">Satın aldığınız ve indirdiğiniz yazılımları buradan tekrar indirebilirsiniz.</p>
            </header>

            <article class="surface" style="padding:var(--sp-6)" data-reveal>
                <h3 style="margin-bottom:var(--sp-3)">Satın Aldıklarım</h3>
                ${purchases.length
                    ? `<div class="library-list">${purchases.map(item => libraryCard(item, 'purchase')).join('')}</div>`
                    : `<p class="text-muted">Henüz satın alma işleminiz yok.</p>`}
            </article>

            <article class="surface" style="padding:var(--sp-6);margin-top:var(--sp-5)" data-reveal>
                <h3 style="margin-bottom:var(--sp-3)">İndirme Geçmişim</h3>
                ${downloads.length
                    ? `<div class="library-list">${downloads.map(item => libraryCard(item, 'download')).join('')}</div>`
                    : `<p class="text-muted">Henüz indirme yapmadınız.</p>`}
            </article>
        </section>

        <section id="guvenlik" class="profile-section" data-reveal>
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
        </section>

        <section id="mesajlar" class="profile-messages surface" data-reveal>
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
                                        <span class="profile-message-status">${messageStatusHtml(message)}</span>
                                    </div>
                                    <time datetime="${esc(message.date || '')}">${date(message.date)}</time>
                                </div>
                                <p>${esc(message.message || '')}</p>
                                ${message.phone ? `<span class="profile-message-phone">Telefon: ${esc(message.phone)}</span>` : ''}
                            </article>`).join('')}
                    </div>`
                    : `<p class="profile-messages-empty">Henüz gönderilmiş bir iletişim formun yok.</p>`}
            </section>

        <section id="gecmis" class="profile-section surface" data-reveal>
            <h2 style="margin-bottom:var(--sp-3)">Görüntüleme Geçmişi</h2>
            ${viewed.length
                ? `<div class="viewed-list">${viewed.map(item => `
                    <article class="viewed-item surface" style="padding:var(--sp-4);display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <a href="/urun/${esc(item.productId)}" style="text-decoration:none;color:inherit">${esc(item.productName || 'Ürün')}</a>
                            <div class="text-subtle text-xs">${date(item.viewedAt)}</div>
                        </div>
                    </article>`).join('')}</div>`
                : `<p class="text-muted">Henüz görüntüleme kaydınız yok.</p>`}
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
