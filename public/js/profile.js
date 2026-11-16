const { escapeHtml, asset } = require('./layout');

// Card detection function
function maskCardNumber(cardNumber) {
    if (!cardNumber) return '—';
    const cleaned = cardNumber.replace(/\s/g, '');
    if (cleaned.length < 4) return '•••• •••• •••• ••••';
    const last4 = cleaned.slice(-4);
    return `•••• •••• •••• ${last4}`;
}

function detectCardType(cardNumber) {
    // Return empty string when unknown so the UI doesn't show the literal 'unknown' text
    if (!cardNumber) return '';
    
    const cleaned = cardNumber.replace(/\s/g, '');
    const patterns = {
        visa: /^4/,
        mastercard: /^5[1-5]/,
        amex: /^3[47]/,
        discover: /^6(?:011|5)/,
        diners: /^3(?:0[0-5]|[68])/,
        jcb: /^(?:2131|1800|35)/,
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(cleaned)) return type;
    }
    
    return '';
}

function getCardIcon(cardType) {
    const icons = {
        visa: `<svg viewBox="0 0 24 24" width="32" height="24" fill="none"><rect width="24" height="24" rx="4" fill="#1A1F71"/><text x="12" y="15" text-anchor="middle" fill="white" font-size="8" font-weight="bold">VISA</text></svg>`,
        mastercard: `<svg viewBox="0 0 24 24" width="32" height="24" fill="none"><rect width="24" height="24" rx="4" fill="#1A1F71"/><circle cx="9" cy="12" r="5" fill="#EB001B"/><circle cx="15" cy="12" r="5" fill="#F79E1B"/></svg>`,
        amex: `<svg viewBox="0 0 24 24" width="32" height="24" fill="none"><rect width="24" height="24" rx="4" fill="#006FCF"/><text x="12" y="15" text-anchor="middle" fill="white" font-size="6" font-weight="bold">AMEX</text></svg>`,
        discover: `<svg viewBox="0 0 24 24" width="32" height="24" fill="none"><rect width="24" height="24" rx="4" fill="#FF6000"/><text x="12" y="15" text-anchor="middle" fill="white" font-size="5" font-weight="bold">DISCOVER</text></svg>`,
        diners: `<svg viewBox="0 0 24 24" width="32" height="24" fill="none"><rect width="24" height="24" rx="4" fill="#0079BE"/><text x="12" y="15" text-anchor="middle" fill="white" font-size="5" font-weight="bold">DINERS</text></svg>`,
        jcb: `<svg viewBox="0 0 24 24" width="32" height="24" fill="none"><rect width="24" height="24" rx="4" fill="#0E4C96"/><text x="12" y="15" text-anchor="middle" fill="white" font-size="6" font-weight="bold">JCB</text></svg>`,
        unknown: `<svg viewBox="0 0 24 24" width="32" height="24" fill="none"><rect width="24" height="24" rx="4" fill="#6B7280"/><text x="12" y="15" text-anchor="middle" fill="white" font-size="8">?</text></svg>`,
    };
    
    return icons[cardType] || icons.unknown;
}

function renderProfile(user, errorHtml = '', successHtml = '', csrfToken = '') {
    /* CSRF alan adı sunucu ile aynı olmalı: `_csrf` (core/csrf.js) */
    const csrfField = csrfToken ? `<input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}">` : '';
    if (!user) {
        return `
        <div class="page-header">
            <span class="hero-eyebrow">Profil</span>
            <h1>Giriş Yapılmadı</h1>
            <p>Profil sayfasını görüntülemek için <a href="/giris" style="color:var(--blue-light)">giriş yap</a> veya <a href="/kayit" style="color:var(--blue-light)">kayıt ol</a>.</p>
        </div>`;
    }

    const v          = s => escapeHtml(s || '');
    const fullName   = v([user.firstName, user.lastName].filter(Boolean).join(' ') || '—');
    const initials   = ((user.firstName || '?').charAt(0) + (user.lastName || '').charAt(0)).toUpperCase();
    const joined     = user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('tr-TR', { year:'numeric', month:'long', day:'numeric' })
        : '—';

    const avatarHtml = user.avatar
        ? `<img src="${v(user.avatar)}" alt="Profil fotoğrafı" class="profile-avatar-img">`
        : `<span class="profile-avatar-initials">${initials}</span>`;

    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Hesabım</span>
            <h1>Profil</h1>
        </div>
        ${errorHtml}
        ${successHtml}
        <div class="profile-wrap container">

            <!-- Avatar + kimlik -->
            <div class="profile-card">
                <div class="profile-avatar-wrap">
                    <div class="profile-avatar">${avatarHtml}</div>
                    <label class="avatar-upload-btn" title="Fotoğraf değiştir">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
                                stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                        </svg>
                        <input type="file" accept="image/*" id="avatarFileInput" style="display:none"
                            data-avatar-upload>
                    </label>
                    <p class="avatar-upload-msg" id="avatarMsg"></p>
                </div>
                <div class="profile-info">
                    <h2 class="profile-name">${fullName}</h2>
                    <span class="profile-role">Üye — ${v(user.isAdmin ? 'Yönetici' : 'Kullanıcı')}</span>
                    <span class="profile-joined">Üyelik tarihi: ${joined}</span>
                </div>
            </div>

            <div class="profile-sections-grid">

                <!-- Tema Seçici -->
                <section class="theme-selector-section" style="grid-column:1/-1">
                    <h3 class="theme-selector-title">Görünüm Teması</h3>
                    <div class="theme-cards">
                        <div class="theme-card" data-mode="dark" role="button" tabindex="0" aria-label="Siyah Tema">
                            <div class="theme-card-preview">
                                <div class="theme-card-preview-bar"></div>
                                <div class="theme-card-preview-bar" style="width:70%"></div>
                                <div class="theme-card-preview-dot"></div>
                            </div>
                            Siyah Tema
                        </div>
                        <div class="theme-card" data-mode="light" role="button" tabindex="0" aria-label="Beyaz Tema">
                            <div class="theme-card-preview">
                                <div class="theme-card-preview-bar"></div>
                                <div class="theme-card-preview-bar" style="width:70%"></div>
                                <div class="theme-card-preview-dot"></div>
                            </div>
                            Beyaz Tema
                        </div>
                        <div class="theme-card" data-mode="system" role="button" tabindex="0" aria-label="Cihaz Teması">
                            <div class="theme-card-preview">
                                <div class="theme-card-preview-bar"></div>
                                <div class="theme-card-preview-bar" style="width:70%"></div>
                                <div class="theme-card-preview-dot"></div>
                            </div>
                            Cihaz Teması
                        </div>
                    </div>
                </section>

                <!-- Kişisel bilgiler -->
                <section class="profile-section">
                    <h3 class="profile-section-title">Kişisel Bilgiler</h3>
                    <dl class="info-list">
                        <div class="info-row"><dt>Ad Soyad</dt><dd>${fullName}</dd></div>
                        <div class="info-row"><dt>E-posta</dt><dd>${v(user.email)}</dd></div>
                        <div class="info-row"><dt>Telefon</dt><dd>${v(user.phone) || '—'}</dd></div>
                        <div class="info-row">
                            <dt>Şifre</dt>
                            <dd>
                                <span class="masked-password">••••••••</span>
                                <span class="password-hint">Güvenlik nedeniyle şifre görüntülenemez</span>
                            </dd>
                        </div>
                    </dl>
                    <a href="/profil/duzenle" class="btn-admin btn-admin-secondary" style="margin-top:1rem;display:inline-flex">Düzenle</a>
                </section>

                <!-- Adres -->
                <section class="profile-section">
                    <h3 class="profile-section-title">Adres</h3>
                    <dl class="info-list">
                        <div class="info-row"><dt>Adres</dt><dd>${v(user.address?.line1) || '—'}</dd></div>
                        <div class="info-row"><dt>Şehir</dt><dd>${v(user.address?.city) || '—'}</dd></div>
                        <div class="info-row"><dt>Posta Kodu</dt><dd>${v(user.address?.zip) || '—'}</dd></div>
                        <div class="info-row"><dt>Ülke</dt><dd>${v(user.address?.country) || '—'}</dd></div>
                    </dl>
                </section>

                <!-- Kart bilgileri -->
                <section class="profile-section profile-section--card">
                    <h3 class="profile-section-title">Ödeme Kartı</h3>
                    <div class="credit-card">
                        <div class="credit-card-top">
                            <span class="cc-brand-icon">${getCardIcon(detectCardType(user.card?.number))}</span>
                            <span class="cc-brand">${!user.card?.number ? '—' : (detectCardType(user.card?.number) || 'Bilinmiyor')}</span>
                            <span class="cc-chip"></span>
                        </div>
                        <div class="cc-number">${v(maskCardNumber(user.card?.number))}</div>
                        <div class="credit-card-bottom">
                            <div>
                                <span class="cc-label">Kart Sahibi</span>
                                <span class="cc-value">${v(user.card?.holder ? '*'.repeat(user.card.holder.length) : '—')}</span>
                            </div>
                            <div>
                                <span class="cc-label">Son Kullanım</span>
                                <span class="cc-value">${v(user.card?.expiry ? '••/••' : '—')}</span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top: 1rem;">
                        <a href="/profil/duzenle" class="btn-admin btn-admin-secondary">Kart Bilgilerini Düzenle</a>
                    </div>
                </section>

                <!-- Güvenlik Ayarları -->
                <section class="profile-section">
                    <h3 class="security-section-title">Güvenlik Ayarları</h3>
                    
                    <div class="security-forms-grid">
                        <!-- E-posta Değiştir -->
                        <div class="security-card">
                            <div class="card-header">
                                <div class="icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                                        <path d="M22 7l-10 5L2 7"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h4 class="card-title">E-posta Değiştir</h4>
                                    <p class="card-subtitle">E-posta adresinizi güncelleyin.</p>
                                </div>
                            </div>
                            <form method="POST" action="/profil/email-degistir" class="security-form">
                                ${csrfField}
                                <div class="form-group">
                                    <label>MEVCUT E-POSTA</label>
                                    <div class="input-wrapper">
                                        <input type="email" name="currentEmail" placeholder="Mevcut e-postanızı girin" autocomplete="off">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>YENİ E-POSTA</label>
                                    <div class="input-wrapper">
                                        <input type="email" name="newEmail" placeholder="yeni@email.com" required autocomplete="email">
                                    </div>
                                </div>
                                <div class="form-group form-group--full">
                                    <label>MEVCUT ŞİFRE</label>
                                    <div class="input-wrapper">
                                        <input type="password" name="currentPassword" required autocomplete="current-password" id="emailCurrentPassword" placeholder="••••••••">
                                        <button type="button" class="password-toggle" data-pw-toggle="emailCurrentPassword" aria-label="Şifreyi göster/gizle">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" class="security-btn">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                    Kod Gönder
                                </button>
                            </form>
                            <div class="info-note">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                Doğrulama kodu yeni e-posta adresinize gönderilecektir.
                            </div>
                        </div>

                        <!-- Şifre Değiştir -->
                        <div class="security-card">
                            <div class="card-header">
                                <div class="icon-wrapper">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h4 class="card-title">Şifre Değiştir</h4>
                                    <p class="card-subtitle">Hesabınız için yeni bir şifre yazın.</p>
                                </div>
                            </div>
                            <form method="POST" action="/profil/sifre-degistir" class="security-form">
                                ${csrfField}
                                <div class="form-group">
                                    <label>MEVCUT ŞİFRE</label>
                                    <div class="input-wrapper">
                                        <input type="password" name="currentPassword" required autocomplete="current-password" id="currentPassword" placeholder="••••••••">
                                        <button type="button" class="password-toggle" data-pw-toggle="currentPassword" aria-label="Şifreyi göster/gizle">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>YENİ ŞİFRE</label>
                                    <div class="input-wrapper">
                                        <input type="password" name="newPassword" required autocomplete="new-password" minlength="8" id="newPassword" placeholder="En az 8 karakter">
                                        <button type="button" class="password-toggle" data-pw-toggle="newPassword" aria-label="Şifreyi göster/gizle">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="form-group form-group--full">
                                    <label>YENİ ŞİFRE TEKRAR</label>
                                    <div class="input-wrapper">
                                        <input type="password" name="newPassword2" required autocomplete="new-password" minlength="8" id="newPassword2" placeholder="Şifreyi tekrar girin">
                                        <button type="button" class="password-toggle" data-pw-toggle="newPassword2" aria-label="Şifreyi göster/gizle">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                <circle cx="12" cy="12" r="3"></circle>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                <button type="submit" class="security-btn">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    Şifreyi Güncelle
                                </button>
                            </form>
                            <div class="info-note">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                Şifreniz en az 8 karakter olmalı (büyük/küçük harf, rakam, özel karakter).
                            </div>
                        </div>
                    </div>
                </section>

            </div>

            <!-- Hesap İşlemleri - Altta küçük butonlar -->
            <div class="profile-account-actions">
                <a href="/cikis" class="profile-action-btn profile-action-btn--secondary">Çıkış Yap</a>
                <button data-delete-account class="profile-action-btn profile-action-btn--danger">Hesabı Sil</button>
            </div>
        </div>
    </main>

    <script src="${asset('/js/profile-client.js')}" defer></script>`;
}

function renderProfileEdit(user) {
    const v = s => escapeHtml(s || '');
    const avatarHtml = user?.avatar
        ? `<img src="${v(user.avatar)}" alt="" class="img-preview" id="imgPreview">`
        : `<div class="img-preview img-preview--empty" id="imgPreview">Fotoğraf yok</div>`;

    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Hesabım</span>
            <h1>Profili Düzenle</h1>
        </div>
        <div class="profile-wrap container">
            <div class="profile-section" style="max-width:680px">
                <form method="POST" action="/profil/duzenle" class="admin-form profile-edit-form" enctype="multipart/form-data">
                    <h4 class="form-section-label">Profil Fotoğrafı</h4>
                    <div class="img-upload-wrap">
                        ${avatarHtml}
                        <div class="img-upload-controls">
                            <label class="btn-admin btn-admin-secondary" style="cursor:pointer">
                                📁 Fotoğraf Seç
                                <input type="file" name="avatarFile" accept="image/*" style="display:none"
                                    id="avatarFileInput" data-avatar-preview-upload>
                            </label>
                        </div>
                        <p class="avatar-upload-msg" id="avatarMsg"></p>
                    </div>

                    <h4 class="form-section-label">Kişisel Bilgiler</h4>
                    <div class="form-grid">
                        <div class="form-group"><label>Ad</label><input type="text" name="firstName" value="${v(user?.firstName)}" required></div>
                        <div class="form-group"><label>Soyad</label><input type="text" name="lastName" value="${v(user?.lastName)}" required></div>
                    </div>
                    <div class="form-group"><label>E-posta</label><input type="email" name="email" value="${v(user?.email)}" placeholder="e-posta" required></div>
                    <div class="form-group"><label>Telefon</label><input type="text" name="phone" value="${v(user?.phone)}" placeholder="telefon"></div>

                    <h4 class="form-section-label">Adres</h4>
                    <div class="form-group"><label>Adres Satırı</label><input type="text" name="addrLine1" value="${v(user?.address?.line1)}"></div>
                    <div class="form-grid">
                        <div class="form-group"><label>Şehir</label><input type="text" name="addrCity" value="${v(user?.address?.city)}"></div>
                        <div class="form-group"><label>Posta Kodu</label><input type="text" name="addrZip" value="${v(user?.address?.zip)}"></div>
                        <div class="form-group"><label>Ülke</label><input type="text" name="addrCountry" value="${v(user?.address?.country)}"></div>
                    </div>

                    <h4 class="form-section-label">Kart Bilgileri</h4>
                    <div class="form-group"><label>Kart Numarası</label><input type="text" name="cardNumber" value="${v(user?.card?.number)}" id="cardNumberInput" data-card-brand placeholder="XXXX XXXX XXXX XXXX"></div>
                    <div class="form-grid">
                        <div class="form-group"><label>Kart Sahibi</label><input type="text" name="cardHolder" value="${v(user?.card?.holder)}"></div>
                        <div class="form-group"><label>Son Kullanım</label><input type="text" name="cardExpiry" value="${v(user?.card?.expiry)}" placeholder="MM/YY"></div>
                        <div class="form-group"><label>Kart Markası</label><input type="text" name="cardBrand" value="${v(detectCardType(user?.card?.number))}" id="cardBrandInput" readonly></div>
                    </div>

                    <div style="display:flex;gap:.75rem;margin-top:.5rem">
                        <button type="submit" class="btn-admin btn-admin-primary">Kaydet</button>
                        <a href="/profil" class="btn-admin btn-admin-secondary">İptal</a>
                    </div>
                </form>
            </div>
        </div>
    </main>
    <script src="${asset('/js/profile-client.js')}" defer></script>`;
}

function renderOtpForm(type, title, subtitle, action, email, error = '', csrfToken = '') {
    /* CSRF alan adı sunucu ile aynı olmalı: `_csrf` (core/csrf.js) */
    const csrfField = csrfToken ? `<input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}">` : '';
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Güvenlik</span>
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(subtitle)}</p>
        </div>
        <div class="auth-wrap container">
            <div class="auth-card">
                ${error ? `<div class="auth-error">${escapeHtml(error)}</div>` : ''}
                <div class="otp-info">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                    <strong>${escapeHtml(email)}</strong> adresine 6 haneli kod gönderildi.
                </div>
                <form method="POST" action="${escapeHtml(action)}" class="admin-form auth-form">
                    ${csrfField}
                    <input type="hidden" name="otpType" value="${escapeHtml(type)}">
                    <div class="form-group">
                        <label>6 Haneli Kod</label>
                        <input type="text" name="otp" maxlength="6" pattern="[0-9]{6}"
                            inputmode="numeric" class="otp-input" required autofocus placeholder="000000">
                    </div>
                    <button type="submit" class="btn-auth">Doğrula</button>
                </form>
                <p class="auth-alt"><a href="/profil">← Profile Dön</a></p>
            </div>
        </div>
    </main>`;
}

/* Kart markası algılama artık profile-client.js içinde yaşıyor
   (data-card-brand özniteliği ile bağlanır). Satır içi <script>
   bloğu kullanılmaz. */
const cardDetectionScript = `<script src="${asset('/js/profile-client.js')}" defer></script>`;

module.exports = { renderProfile, renderProfileEdit, renderOtpForm, cardDetectionScript };