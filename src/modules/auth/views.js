/* ═══════════════════════════════════════════════════════════════
   modules/auth/views.js — Kimlik doğrulama sayfaları:
   giriş, kayıt, şifremi unuttum, şifre sıfırlama, 2FA doğrulama,
   2FA kurulum, kurtarma kodları, profil, güvenlik.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc } = require('../../core/views');
const { SITE } = require('../public/layout');

function renderLogin({ error = null, notice = null, csrf = '', twoFactorOn = false, values = {} } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="auth-head">
                <span class="auth-logo">${SITE.shortName}</span>
                <span class="auth-badge">Giriş</span>
            </div>
            <h1>Hesabınıza giriş yapın</h1>
            <p class="auth-sub">
                ${twoFactorOn
                    ? 'Parolanızın ardından iki faktörlü doğrulama kodu istenecek.'
                    : 'İlk girişten sonra iki faktörlü doğrulamayı etkinleştirmeniz önerilir.'}
            </p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            ${notice ? `<div class="alert alert--ok" role="alert">${esc(notice)}</div>` : ''}

            <form method="POST" action="/giris" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="email">E-posta</label>
                    <input id="email" name="email" type="email" required class="form-input" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="ornek@ornek.com" value="${esc(values.email || '')}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="password">Parola</label>
                    <div class="password-wrap">
                        <input id="password" name="password" type="password" required class="form-input" autocomplete="current-password" placeholder="••••••••" required>
                        <button type="button" class="password-toggle" data-pw-toggle="password" aria-label="Parolayı göster">
                            <svg class="icon-eye" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
                            <svg class="icon-eye-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l18 18M10.6 10.7a3 3 0 004.2 4.2"/><path d="M9.4 5.2A9.8 9.8 0 0112 5c6.5 0 10.5 7 10.5 7a17 17 0 01-2.4 3.2M6.6 6.6A17 17 0 001.5 12S5.5 19 12 19c1 0 2-.2 2.9-.5"/></svg>
                        </button>
                    </div>
                </div>
                <button class="btn btn-primary" type="submit">Giriş Yap</button>
            </form>

            <div class="auth-foot">
                <p><a href="/sifremi-unuttum">Şifremi unuttum</a></p>
                <p>Hesabınız yok mu? <a href="/kayit">Kayıt olun</a></p>
            </div>
        </div>
    </main>`;
}

function renderRegister({ error = null, csrf = '', values = {} } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="auth-head">
                <span class="auth-logo">${SITE.shortName}</span>
                <span class="auth-badge">Kayıt</span>
            </div>
            <h1>Hesap oluşturun</h1>
            <p class="auth-sub">Ücretsiz kayıt olun, yeni projelerden haberdar olun, indirimlerden yararlanın.</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}

            <form method="POST" action="/kayit" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="firstName">Ad</label>
                        <input id="firstName" name="firstName" type="text" required class="form-input" autocomplete="given-name" value="${esc(values.firstName || '')}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="lastName">Soyad</label>
                        <input id="lastName" name="lastName" type="text" required class="form-input" autocomplete="family-name" value="${esc(values.lastName || '')}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="email">E-posta</label>
                    <input id="email" name="email" type="email" required class="form-input" autocomplete="email" value="${esc(values.email || '')}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="phone">Telefon</label>
                    <input id="phone" name="phone" type="tel" required class="form-input" autocomplete="tel" inputmode="tel" value="${esc(values.phone || '')}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="password">Parola</label>
                        <input id="password" name="password" type="password" required class="form-input" autocomplete="new-password" minlength="8" required>
                        <p class="form-hint">En az 8 karakter, büyük/küçük harf, rakam ve özel karakter.</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="password2">Parola (tekrar)</label>
                        <input id="password2" name="password2" type="password" required class="form-input" autocomplete="new-password" minlength="8" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="checkbox-label" style="font-size:var(--fs-sm);font-weight:500;color:var(--c-muted);text-transform:none;letter-spacing:0">
                        <input type="checkbox" name="consent" required>
                        <span><a href="/kullanim-sartlari">Kullanım şartlarını</a> ve <a href="/gizlilik-sozlesmesi">gizlilik sözleşmesini</a> okudum.</span>
                    </label>
                </div>
                <button class="btn btn-primary" type="submit">Hesap Oluştur</button>
            </form>

            <div class="auth-foot">
                <p>Zaten hesabınız var mı? <a href="/giris">Giriş yapın</a></p>
            </div>
        </div>
    </main>`;
}

function renderForgot({ error = null, notice = null, csrf = '' } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="auth-head">
                <span class="auth-logo">${SITE.shortName}</span>
                <span class="auth-badge">Kurtarma</span>
            </div>
            <h1>Şifremi unuttum</h1>
            <p class="auth-sub">E-posta adresinizi girin; sıfırlama bağlantısı göndereceğiz.</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            ${notice ? `<div class="alert alert--ok" role="alert">${esc(notice)}</div>` : ''}
            <form method="POST" action="/sifremi-unuttum" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="email">E-posta</label>
                    <input id="email" name="email" type="email" required class="form-input" autocomplete="email" required>
                </div>
                <button class="btn btn-primary" type="submit">Sıfırlama Bağlantısı Gönder</button>
            </form>
            <div class="auth-foot">
                <p><a href="/giris">← Giriş sayfasına dön</a></p>
            </div>
        </div>
    </main>`;
}

function renderReset({ error = null, csrf = '', token = '', oobCode = '' } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="auth-head">
                <span class="auth-logo">${SITE.shortName}</span>
                <span class="auth-badge">Sıfırlama</span>
            </div>
            <h1>Yeni parola belirleyin</h1>
            <p class="auth-sub">Hesabınız için yeni ve güçlü bir parola seçin.</p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            <form method="POST" action="/sifre-sifirla" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <input type="hidden" name="token" value="${esc(token)}">
                <input type="hidden" name="oobCode" value="${esc(oobCode)}">
                <div class="form-group">
                    <label class="form-label" for="password">Yeni parola</label>
                    <input id="password" name="password" type="password" required class="form-input" autocomplete="new-password" minlength="8" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="password2">Yeni parola (tekrar)</label>
                    <input id="password2" name="password2" type="password" required class="form-input" autocomplete="new-password" minlength="8" required>
                </div>
                <button class="btn btn-primary" type="submit">Parolayı Güncelle</button>
            </form>
        </div>
    </main>`;
}

function render2FAGate({ email, error = null, mode = 'totp', remaining = 30, csrf = '' } = {}) {
    const isRecovery = mode === 'recovery';
    return `
    <main class="auth-shell">
        <div class="auth-card" data-reveal>
            <div class="steps" aria-hidden="true">
                <span class="step-dot is-done"></span>
                <span class="step-dot is-done"></span>
            </div>
            <span class="auth-badge">Adım 2 / 2</span>
            <h1>${isRecovery ? 'Kurtarma kodu' : 'Doğrulama kodu'}</h1>
            <p class="auth-sub">
                <strong>${esc(email)}</strong> için ${isRecovery ? 'kurtarma kodunuzu girin.' : 'uygulamadaki 6 haneli kodu girin.'}
            </p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}
            <form method="POST" action="/2fa" class="auth-form" novalidate data-twofa-form data-mode="${esc(mode)}">
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                ${isRecovery ? `
                <div class="form-group">
                    <label class="form-label" for="recovery">Kurtarma kodu</label>
                    <input id="recovery" name="recovery" type="text" required class="form-input otp-input" autocomplete="one-time-code" placeholder="XXXXX-XXXXX" autocapitalize="characters" spellcheck="false" maxlength="11">
                    <p class="form-hint">Her kod yalnızca bir kez kullanılabilir.</p>
                </div>
                ` : `
                <div class="form-group">
                    <label class="form-label" for="token">6 haneli kod</label>
                    <input id="token" name="token" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" required class="form-input otp-input" placeholder="000000" autofocus>
                    <p class="form-hint" data-twofa-timer>Kod ${esc(remaining)} saniye sonra yenilenir.</p>
                </div>
                `}
                <button class="btn btn-primary" type="submit">${isRecovery ? 'Kodu Onayla' : 'Doğrula'}</button>
            </form>
            <div class="auth-foot">
                ${isRecovery
                    ? '<a href="/2fa?mode=totp">← Kod ile devam et</a>'
                    : '<a href="/2fa?mode=recovery">Kurtarma kodu kullan</a>'}
            </div>
        </div>
    </main>`;
}

function render2FASetup({ email, secret, uri, error = null, csrf = '', alreadyOn = false } = {}) {
    const grouped = (secret || '').match(/.{1,4}/g)?.join(' ') || '';
    return `
    <main class="auth-shell">
        <div class="auth-card auth-card--wide" data-reveal>
            <span class="auth-badge">İki Faktörlü Doğrulama</span>
            <h1>${alreadyOn ? '2FA Yeniden Kurulumu' : '2FA Etkinleştir'}</h1>
            <p class="auth-sub">
                <strong>${esc(email)}</strong> hesabı için TOTP doğrulayıcı uygulaması (Google Authenticator, 1Password, Bitwarden, Authy).
            </p>
            ${error ? `<div class="alert alert--bad" role="alert">${esc(error)}</div>` : ''}

            <div class="step-list">
                <div class="step-item">
                    <span class="step-num">1</span>
                    <div>
                        <strong>Uygulamayı açın</strong>
                        <p class="text-muted" style="font-size:var(--fs-sm);margin-top:4px">Yeni bir TOTP hesabı ekleyin.</p>
                    </div>
                </div>
                <div class="step-item">
                    <span class="step-num">2</span>
                    <div style="flex:1">
                        <strong>Anahtarı elle girin veya bağlantıyı kullanın</strong>
                        <div class="secret-display" aria-label="Gizli anahtar">${esc(grouped)}</div>
                        <a class="btn btn-secondary btn-sm" href="${esc(uri || '#')}" data-otpauth style="margin-top:var(--sp-3)">Kimlik doğrulama uygulamasında aç</a>
                    </div>
                </div>
                <div class="step-item">
                    <span class="step-num">3</span>
                    <div>
                        <strong>Uygulamadaki kodu doğrulayın</strong>
                        <p class="text-muted" style="font-size:var(--fs-sm);margin-top:4px">Bu, anahtarı doğru girdiğinizi kanıtlar.</p>
                    </div>
                </div>
            </div>

            <form method="POST" action="/profil/2fa" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="token">Uygulamadaki 6 haneli kod</label>
                    <input id="token" name="token" type="text" inputmode="numeric" maxlength="6" pattern="[0-9]*" required class="form-input otp-input" placeholder="000000" autofocus>
                </div>
                <button class="btn btn-primary" type="submit">2FA'yı Etkinleştir</button>
            </form>

            ${alreadyOn ? `
            <hr class="divider">
            <h3 style="margin-bottom:var(--sp-3)">2FA'yı Kapat</h3>
            <form method="POST" action="/profil/2fa/kapat" class="auth-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <div class="form-group">
                    <label class="form-label" for="pwd">Mevcut parolanız</label>
                    <input id="pwd" name="password" type="password" required class="form-input" autocomplete="current-password">
                </div>
                <button class="btn btn-danger" type="submit">2FA'yı Kapat</button>
            </form>` : ''}
        </div>
    </main>`;
}

function renderRecoveryCodes({ codes = [], csrf = '' } = {}) {
    return `
    <main class="auth-shell">
        <div class="auth-card auth-card--wide" data-reveal>
            <span class="auth-badge">Kurtarma Kodları</span>
            <h1>2FA Etkinleştirildi</h1>
            <p class="auth-sub">Bu kodlar <strong>yalnızca şimdi</strong> gösterilir. Cihazınızı kaybederseniz bu kodlardan biriyle giriş yapabilirsiniz. Güvenli bir yere kaydedin.</p>
            <div class="callout callout--warn" style="margin-bottom:var(--sp-5)">
                <span aria-hidden="true">⚠</span>
                <span>Telefonunuz kaybolursa kurtarma kodlarının tek çareniz olduğunu unutmayın. Panele girişte yenisini üretebilirsiniz.</span>
            </div>
            <div class="recovery-codes" data-copy-target>
                ${codes.map(c => `<code>${esc(c)}</code>`).join('')}
            </div>
            <div class="row" style="margin-top:var(--sp-5);justify-content:center">
                <button class="btn btn-secondary" type="button" data-copy-codes>Kodları Kopyala</button>
                <a class="btn btn-primary" href="/profil">Profile Git</a>
            </div>
        </div>
    </main>`;
}

module.exports = { renderLogin, renderRegister, renderForgot, renderReset, render2FAGate, render2FASetup, renderRecoveryCodes };
