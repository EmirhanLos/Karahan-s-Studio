/* ═══════════════════════════════════════════════════════════════
   modules/auth/profile.js — Modern, Sade ve Şık Profil Sayfası.
   Backend mantığı, parametreleri ve API form rotaları birebir
   korunmuştur.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, date, money } = require('../../core/views');
const data = require('../../data');

const ICONS = {
    user:    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    package: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    shield:  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    message: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    clock:   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    download:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    external:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    edit:    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    check:   '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    trash:   '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

function initials(user) {
    if (!user) return '?';
    const first = (user.firstName || user.name || 'K').trim().charAt(0).toUpperCase();
    const last = (user.lastName || '').trim().charAt(0).toUpperCase();
    return first + (last || '');
}

function messageStatusHtml(message) {
    const status = String(message.status || 'Yeni');
    return status === 'İşlendi' || status === 'Tamamlandı'
        ? '<span class="badge badge--ok">İşlendi</span>'
        : '<span class="badge badge--warn">İncelemede</span>';
}

function downloadable(project) {
    return Boolean(project && project.status === 'Yayında' && (project.file || project.deviceFile));
}

function libraryCard(item, kind) {
    const proj = item.productId ? data.projectById(item.productId) : null;
    const name = esc(proj ? proj.name : (item.productName || 'Ürün'));
    const category = esc(proj ? proj.category : (item.description || 'Yazılım'));
    const when = kind === 'download' ? item.downloadedAt : item.date;
    const price = kind === 'purchase' ? money(item.amount || 0) : '';
    const canDownload = downloadable(proj);

    return `
    <article class="profile-item-card surface">
        <div class="profile-item-visual">
            ${proj && proj.image
                ? `<img src="${esc(proj.image)}" alt="${name}" loading="lazy">`
                : `<div class="profile-item-placeholder">${ICONS.package}</div>`}
        </div>
        <div class="profile-item-main">
            <div class="profile-item-header">
                <h4>${name}</h4>
                <div class="profile-item-tags">
                    <span class="badge badge--neutral">${category}</span>
                    ${price ? `<span class="badge badge--brand">${price}</span>` : ''}
                    ${proj && proj.version ? `<span class="badge badge--neutral">v${esc(proj.version)}</span>` : ''}
                </div>
            </div>
            <p class="text-subtle text-xs" style="margin:4px 0 0">
                ${kind === 'purchase' ? 'Satın alma' : 'İndirme'} tarihi: ${date(when)}
            </p>
        </div>
        <div class="profile-item-actions">
            ${canDownload
                ? `<a href="/indir/${esc(proj.id)}" class="btn btn-primary btn-sm">${ICONS.download} İndir</a>`
                : `<span class="badge badge--warn" style="font-size:0.75rem">Yayında Değil</span>`}
            ${proj ? `<a href="/urun/${esc(proj.id)}" class="btn btn-secondary btn-sm">${ICONS.external} Detay</a>` : ''}
        </div>
    </article>`;
}

function renderProfile({ user, csrf = '', tfaOn = false, messages = [], purchases = [], downloads = [], viewed = [] }) {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Kullanıcı';
    const initialText = initials(user);

    return `
    <div class="profile-page-wrapper container" style="padding-top:var(--sp-6);padding-bottom:var(--sp-12)">
        <!-- Üst Profil Başlığı & Özet Bilgiler -->
        <header class="profile-hero-card surface">
            <div class="profile-hero-left">
                <div class="profile-hero-avatar">
                    ${user.avatar ? `<img src="${esc(user.avatar)}" alt="${esc(fullName)}">` : `<span>${esc(initialText)}</span>`}
                </div>
                <div class="profile-hero-info">
                    <div class="profile-hero-title-row">
                        <h1>${esc(fullName)}</h1>
                        ${user.isAdmin ? '<span class="badge badge--brand">Yönetici</span>' : '<span class="badge badge--neutral">Üye</span>'}
                        ${user.banned ? '<span class="badge badge--bad">Yasaklı</span>' : '<span class="badge badge--ok">Aktif Hesap</span>'}
                    </div>
                    <p class="profile-hero-email">${esc(user.email)}</p>
                    <p class="profile-hero-meta">
                        <span>${ICONS.clock} Kayıt: ${date(user.createdAt)}</span>
                        ${user.phone ? `<span>· Tel: ${esc(user.phone)}</span>` : ''}
                    </p>
                </div>
            </div>
            <div class="profile-hero-actions">
                <a class="btn btn-secondary btn-sm" href="/profil/duzenle">${ICONS.edit} Profili Düzenle</a>
                <a class="btn btn-ghost btn-sm" href="/cikis">Çıkış Yap</a>
            </div>
        </header>

        <!-- Hızlı Metrik Kartları -->
        <div class="profile-stats-grid">
            <div class="profile-stat-box surface">
                <span class="profile-stat-icon">${ICONS.package}</span>
                <div>
                    <span class="profile-stat-val">${purchases.length}</span>
                    <span class="profile-stat-lbl">Satın Alınan</span>
                </div>
            </div>
            <div class="profile-stat-box surface">
                <span class="profile-stat-icon">${ICONS.download}</span>
                <div>
                    <span class="profile-stat-val">${downloads.length}</span>
                    <span class="profile-stat-lbl">İndirilen</span>
                </div>
            </div>
            <div class="profile-stat-box surface">
                <span class="profile-stat-icon">${ICONS.message}</span>
                <div>
                    <span class="profile-stat-val">${messages.length}</span>
                    <span class="profile-stat-lbl">İletişim Formu</span>
                </div>
            </div>
            <div class="profile-stat-box surface">
                <span class="profile-stat-icon">${ICONS.shield}</span>
                <div>
                    <span class="profile-stat-val" style="font-size:1.1rem;margin-top:4px">${tfaOn ? '2FA Aktif' : '2FA Pasif'}</span>
                    <span class="profile-stat-lbl">Hesap Güvenliği</span>
                </div>
            </div>
        </div>

        <!-- Sekmeler / Navigasyon -->
        <nav class="profile-nav-pills" aria-label="Profil bölümleri">
            <a class="profile-nav-pill is-active" href="#kutuphanem">${ICONS.package} Kütüphanem (${purchases.length + downloads.length})</a>
            <a class="profile-nav-pill" href="#guvenlik">${ICONS.shield} Güvenlik & 2FA</a>
            <a class="profile-nav-pill" href="#mesajlar">${ICONS.message} Taleplerim (${messages.length})</a>
            <a class="profile-nav-pill" href="#gecmis">${ICONS.clock} Gezinme Geçmişi</a>
            <a class="profile-nav-pill" href="#hesap-ayarlari">${ICONS.user} Hesap Ayarları</a>
        </nav>

        <!-- 1. Kütüphanem Bölümü -->
        <section id="kutuphanem" class="profile-content-section">
            <div class="profile-section-heading">
                <h2>Yazılım Kütüphanem</h2>
                <p class="text-muted">Satın aldığınız lisanslı ürünlere ve indirme bağlantılarınıza dilediğiniz an erişebilirsiniz.</p>
            </div>

            <!-- Satın Alınanlar -->
            <div class="profile-block surface">
                <h3 class="profile-block-title">Satın Aldığım Ürünler</h3>
                ${purchases.length
                    ? `<div class="profile-items-list">${purchases.map(item => libraryCard(item, 'purchase')).join('')}</div>`
                    : `<div class="profile-empty-state">
                        <span class="profile-empty-icon">${ICONS.package}</span>
                        <p>Henüz satın aldığınız bir yazılım veya ürün bulunmuyor.</p>
                        <a href="/projeler" class="btn btn-secondary btn-sm">Projeleri Keşfet</a>
                    </div>`}
            </div>

            <!-- İndirme Geçmişi -->
            <div class="profile-block surface" style="margin-top:var(--sp-6)">
                <h3 class="profile-block-title">İndirme Geçmişim</h3>
                ${downloads.length
                    ? `<div class="profile-items-list">${downloads.map(item => libraryCard(item, 'download')).join('')}</div>`
                    : `<div class="profile-empty-state">
                        <span class="profile-empty-icon">${ICONS.download}</span>
                        <p>Henüz indirilmiş bir dosyanız bulunmuyor.</p>
                    </div>`}
            </div>
        </section>

        <!-- 2. Güvenlik & 2FA Bölümü -->
        <section id="guvenlik" class="profile-content-section" style="margin-top:var(--sp-8)">
            <div class="profile-section-heading">
                <h2>Güvenlik & İki Adımlı Doğrulama</h2>
                <p class="text-muted">Hesabınızın güvenliğini artırın ve oturum açma tercihlerini yönetin.</p>
            </div>

            <div class="profile-block surface">
                <div class="profile-security-row">
                    <div>
                        <h4 style="margin:0 0 6px 0;font-size:1.05rem">İki Adımlı Doğrulama (2FA - TOTP)</h4>
                        <p class="text-muted text-sm" style="margin:0">
                            Giriş yaparken Google Authenticator veya Authy gibi bir uygulama ile ek güvenlik kodu isteyin.
                        </p>
                    </div>
                    <div>
                        ${tfaOn
                            ? '<span class="badge badge--ok" style="font-size:0.85rem;padding:6px 12px">✓ Etkinleştirildi</span>'
                            : '<span class="badge badge--warn" style="font-size:0.85rem;padding:6px 12px">Kapalı (Önerilir)</span>'}
                    </div>
                </div>

                <div class="profile-security-actions" style="margin-top:var(--sp-5);padding-top:var(--sp-4);border-top:1px solid var(--c-border-soft);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
                    <span class="text-subtle text-xs">Durum: ${tfaOn ? 'Hesabınız iki aşamalı şifreleme ile korunuyor.' : 'Hesabınızı yetkisiz erişimlere karşı korumak için 2FA açın.'}</span>
                    <a class="btn btn-primary btn-sm" href="/profil/2fa">${tfaOn ? '2FA Ayarlarını Yönet' : '2FA Etkinleştir'}</a>
                </div>
            </div>
        </section>

        <!-- 3. İletişim Formlarım / Destek Talepleri -->
        <section id="mesajlar" class="profile-content-section" style="margin-top:var(--sp-8)">
            <div class="profile-section-heading">
                <h2>İletişim & Destek Formlarım</h2>
                <p class="text-muted">Stüdyomuza gönderdiğiniz iletişim ve geri bildirim formları burada saklanır.</p>
            </div>

            <div class="profile-block surface">
                ${messages.length
                    ? `<div class="profile-message-cards">
                        ${messages.map(m => `
                            <article class="profile-msg-card ${m.read ? 'is-read' : 'is-unread'}">
                                <div class="profile-msg-head">
                                    <div>
                                        <h4 class="profile-msg-subj">${esc(m.subject || 'Konu belirtilmedi')}</h4>
                                        <span class="profile-msg-date">${date(m.date)}</span>
                                    </div>
                                    <div>${messageStatusHtml(m)}</div>
                                </div>
                                <div class="profile-msg-body">
                                    <p>${esc(m.message || '')}</p>
                                    ${m.phone ? `<span class="profile-msg-phone">İletişim Tel: ${esc(m.phone)}</span>` : ''}
                                </div>
                            </article>
                        `).join('')}
                    </div>`
                    : `<div class="profile-empty-state">
                        <span class="profile-empty-icon">${ICONS.message}</span>
                        <p>Henüz bize ilettiğiniz bir mesaj veya form kaydı bulunmuyor.</p>
                        <a href="/iletisim" class="btn btn-secondary btn-sm">Bize Yazın</a>
                    </div>`}
            </div>
        </section>

        <!-- 4. Görüntüleme Geçmişi -->
        <section id="gecmis" class="profile-content-section" style="margin-top:var(--sp-8)">
            <div class="profile-section-heading">
                <h2>Son Gezilen Projeler</h2>
                <p class="text-muted">Yakın zamanda incelediğiniz stüdyo ürünleri ve araçlar.</p>
            </div>

            <div class="profile-block surface">
                ${viewed.length
                    ? `<div class="profile-history-grid">
                        ${viewed.map(item => `
                            <a class="profile-history-item" href="/urun/${esc(item.productId)}">
                                <div>
                                    <span class="profile-history-name">${esc(item.productName || 'Ürün')}</span>
                                    <span class="profile-history-date">${date(item.viewedAt)}</span>
                                </div>
                                <span class="profile-history-arrow">→</span>
                            </a>
                        `).join('')}
                    </div>`
                    : `<div class="profile-empty-state">
                        <span class="profile-empty-icon">${ICONS.clock}</span>
                        <p>Henüz bir ürün görüntüleme geçmişiniz bulunmuyor.</p>
                    </div>`}
            </div>
        </section>

        <!-- 5. Hesap Ayarları & Tehlikeli Bölge -->
        <section id="hesap-ayarlari" class="profile-content-section" style="margin-top:var(--sp-8)">
            <div class="profile-section-heading">
                <h2>Hesap Yönetimi & Tehlikeli Bölge</h2>
                <p class="text-muted">Hesap bilgilerinizi güncelleyebilir veya üyeliğinizi sonlandırabilirsiniz.</p>
            </div>

            <div class="profile-block surface" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
                <div>
                    <h4 style="margin:0 0 4px 0">Profil Bilgilerini Güncelle</h4>
                    <p class="text-muted text-sm" style="margin:0">Ad, soyad, telefon ve adres bilgilerinizi düzenleyin.</p>
                </div>
                <a class="btn btn-secondary" href="/profil/duzenle">${ICONS.edit} Düzenleme Sayfası</a>
            </div>

            <div class="profile-block surface profile-danger-box" style="margin-top:var(--sp-5)">
                <div>
                    <h4 style="margin:0 0 6px 0;color:var(--c-bad)">Hesabımı Kalıcı Olarak Sil</h4>
                    <p class="text-muted text-sm" style="margin:0">
                        Hesabınızı sildiğinizde satın alma geçmişiniz, indirme haklarınız ve profil verileriniz geri döndürülemez şekilde silinir.
                    </p>
                </div>
                <form method="POST" action="/profil/sil" data-confirm="Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!">
                    <input type="hidden" name="_csrf" value="${esc(csrf)}">
                    <button class="btn btn-danger btn-sm" type="submit">${ICONS.trash} Hesabı Sil</button>
                </form>
            </div>
        </section>
    </div>`;
}

function renderProfileEdit({ user, csrf = '', flash = null } = {}) {
    const a = user.address || {};
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Kullanıcı';

    return `
    <section class="container-narrow" style="padding-top:var(--sp-6);padding-bottom:var(--sp-12)">
        <header class="page-header" style="margin-bottom:var(--sp-5)">
            <a href="/profil" class="text-subtle text-xs" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;margin-bottom:8px">← Profile Dön</a>
            <h1>Profili Düzenle</h1>
            <p class="lead">${esc(fullName)} (${esc(user.email)}) için hesap bilgileri.</p>
        </header>

        ${flash ? `<div class="alert alert--ok" style="margin-bottom:var(--sp-4)">${esc(flash)}</div>` : ''}

        <article class="surface" style="padding:var(--sp-6);border-radius:14px">
            <form method="POST" class="auth-form" novalidate style="display:flex;flex-direction:column;gap:18px">
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="firstName">Ad</label>
                        <input id="firstName" name="firstName" type="text" class="form-input" value="${esc(user.firstName || '')}" required placeholder="Adınız">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="lastName">Soyad</label>
                        <input id="lastName" name="lastName" type="text" class="form-input" value="${esc(user.lastName || '')}" required placeholder="Soyadınız">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="phone">Telefon Numarası</label>
                    <input id="phone" name="phone" type="tel" class="form-input" value="${esc(user.phone || '')}" placeholder="05XXXXXXXXX">
                </div>

                <div class="form-group">
                    <label class="form-label" for="addressLine">Adres Satırı</label>
                    <input id="addressLine" name="addressLine" type="text" class="form-input" value="${esc(a.line1 || '')}" placeholder="Mahalle, Cadde, Bina No, Daire">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="city">Şehir</label>
                        <input id="city" name="city" type="text" class="form-input" value="${esc(a.city || '')}" placeholder="Örn. Ankara">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="zip">Posta Kodu</label>
                        <input id="zip" name="zip" type="text" class="form-input" value="${esc(a.zip || '')}" placeholder="06000">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="country">Ülke</label>
                    <input id="country" name="country" type="text" class="form-input" value="${esc(a.country || 'Türkiye')}">
                </div>

                <div class="row" style="gap:var(--sp-3);margin-top:10px;justify-content:flex-end">
                    <a class="btn btn-ghost" href="/profil">İptal</a>
                    <button class="btn btn-primary" type="submit">Değişiklikleri Kaydet</button>
                </div>
            </form>
        </article>
    </section>`;
}

module.exports = { renderProfile, renderProfileEdit };
