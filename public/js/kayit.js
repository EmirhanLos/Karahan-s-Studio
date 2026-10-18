const { escapeHtml } = require('./layout');

function renderKayit(error = '', csrfToken = '') {
    const csrfField = csrfToken ? `<input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">` : '';
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Hesap Oluştur</span>
            <h1>Kayıt Ol</h1>
        </div>
        <div class="auth-wrap container">
            <div class="auth-card">
                ${error ? `<div class="auth-error">${escapeHtml(error)}</div>` : ''}
                <form method="POST" action="/kayit" class="admin-form auth-form" autocomplete="off">
                    ${csrfField}
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Ad</label>
                            <input type="text" name="firstName" placeholder="Adın" required>
                        </div>
                        <div class="form-group">
                            <label>Soyad</label>
                            <input type="text" name="lastName" placeholder="Soyadın" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>E-posta</label>
                        <input type="email" name="email" placeholder="ornek@mail.com" required autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Telefon (opsiyonel)</label>
                        <input type="tel" name="phone" placeholder="+90 5XX XXX XX XX">
                    </div>
                    <div class="form-group">
                        <label>Şifre</label>
                        <input type="password" name="password" placeholder="En az 8 karakter (büyük/küçük harf, rakam, özel karakter)" minlength="8" required autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label>Şifre Tekrar</label>
                        <input type="password" name="password2" placeholder="Şifreni tekrar gir" minlength="8" required autocomplete="new-password">
                    </div>
                    <button type="submit" class="btn-auth">Kayıt Ol — Onay Kodu Gönder</button>
                </form>
                
                <div class="auth-divider">
                    <span>veya</span>
                </div>
                
                <a href="/auth/google" class="btn-google">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google ile Kayıt Ol
                </a>
                
                <p class="auth-alt">Zaten hesabın var mı? <a href="/giris">Giriş Yap</a></p>
            </div>
        </div>
    </main>`;
}

function renderKayitDogrula(email = '', error = '', channel = 'email') {
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Doğrulama</span>
            <h1>E-posta Doğrulama</h1>
            <p><strong>${escapeHtml(email)}</strong> adresine gönderilen 6 haneli kodu gir.</p>
        </div>
        <div class="auth-wrap container">
            <div class="auth-card">
                ${error ? `<div class="auth-error">${escapeHtml(error)}</div>` : ''}
                <div class="otp-info">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                    Onay kodu <strong>${escapeHtml(email)}</strong> adresine gönderildi.
                </div>
                <form method="POST" action="/kayit/dogrula" class="admin-form auth-form">
                    <input type="hidden" name="email" value="${escapeHtml(email)}">
                    <div class="form-group">
                        <label>6 Haneli Onay Kodu</label>
                        <input type="text" name="otp" placeholder="000000" maxlength="6"
                            pattern="[0-9]{6}" inputmode="numeric"
                            class="otp-input" required autofocus>
                    </div>
                    <button type="submit" class="btn-auth">Doğrula ve Kaydı Tamamla</button>
                </form>
                <p class="auth-alt"><a href="/kayit">← Kayıt formuna dön</a></p>
            </div>
        </div>
    </main>`;
}

function renderGiris(error = '', csrfToken = '') {
    const csrfField = csrfToken ? `<input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">` : '';
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Hesabım</span>
            <h1>Giriş Yap</h1>
        </div>
        <div class="auth-wrap container">
            <div class="auth-card">
                ${error ? `<div class="auth-error">${escapeHtml(error)}</div>` : ''}
                <form method="POST" action="/giris" class="admin-form auth-form" autocomplete="off">
                    ${csrfField}
                    <div class="form-group">
                        <label>E-posta</label>
                        <input type="email" name="email" placeholder="ornek@mail.com" required autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Şifre</label>
                        <input type="password" name="password" placeholder="••••••••" required autocomplete="new-password">
                    </div>
                    <label class="checkbox-label">
                        <input type="checkbox" name="rememberMe" checked>
                        Beni hatırla (30 gün)
                    </label>
                    <button type="submit" class="btn-auth">Giriş Yap</button>
                </form>
                
                <div class="auth-divider">
                    <span>veya</span>
                </div>
                
                <a href="/auth/google" class="btn-google">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google ile Giriş Yap
                </a>
                
                <p class="auth-alt" style="margin-top: 1rem;">
                    <a href="/sifremi-unuttum" style="color: var(--blue-light);">Şifremi Unuttum</a>
                </p>
                <p class="auth-alt">Hesabın yok mu? <a href="/kayit">Kayıt Ol</a></p>
            </div>
        </div>
    </main>`;
}

function renderSifremiUnuttum(error = '', success = '', csrfToken = '') {
    const csrfField = csrfToken ? `<input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">` : '';
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Şifre Sıfırla</span>
            <h1>Şifremi Unuttum</h1>
            <p>E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.</p>
        </div>
        <div class="auth-wrap container">
            <div class="auth-card">
                ${error ? `<div class="auth-error">${escapeHtml(error)}</div>` : ''}
                ${success ? `<div class="auth-success" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);color:#4ade80;padding:0.75rem 1rem;border-radius:8px;margin-bottom:1rem">${escapeHtml(success)}</div>` : ''}
                <form method="POST" action="/sifremi-unuttum" class="admin-form auth-form" autocomplete="off">
                    ${csrfField}
                    <div class="form-group">
                        <label>E-posta Adresi</label>
                        <input type="email" name="email" placeholder="ornek@mail.com" required autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label>Doğrulama Yöntemi</label>
                        <select name="channel" id="resetChannel" onchange="toggleResetChannel()">
                            <option value="email">E-posta ile sıfırlama linki gönder</option>
                            <option value="sms">SMS ile kod gönder (kayıtlı numara varsa)</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-auth">Sıfırlama Bağlantısı / Kodu Gönder</button>
                </form>
                
                <div class="auth-divider" style="margin-top: 1.5rem;">
                    <span>veya</span>
                </div>
                
                <a href="/auth/google" class="btn-google">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google ile Giriş Yap
                </a>
                
                <p class="auth-alt" style="margin-top: 1rem;"><a href="/giris">← Giriş sayfasına dön</a></p>
            </div>
        </div>
        <script>
        function toggleResetChannel() {
            const channel = document.getElementById('resetChannel').value;
        }
        </script>
    </main>`;
}

function renderSifreSifirla(email = '', error = '', channel = 'email', csrfToken = '') {
    const csrfField = csrfToken ? `<input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">` : '';
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Şifre Sıfırla</span>
            <h1>Şifre Sıfırlama</h1>
            <p><strong>${escapeHtml(email)}</strong> adresine gönderilen yönergeleri takip edin.</p>
        </div>
        <div class="auth-wrap container">
            <div class="auth-card">
                ${error ? `<div class="auth-error">${escapeHtml(error)}</div>` : ''}
                <div class="otp-info">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                    ${channel === 'sms' 
                        ? `Telefon numaranıza gönderilen 6 haneli kodu girin.` 
                        : `E-posta adresinize gönderilen şifre sıfırlama bağlantısını kontrol edin. Eğer bağlantıyı tıkladıysanız, aşağıya yeni şifrenizi girin.`}
                </div>
                <form method="POST" action="/sifre-sifirla" class="admin-form auth-form" autocomplete="off">
                    ${csrfField}
                    <input type="hidden" name="email" value="${escapeHtml(email)}">
                    <input type="hidden" name="channel" value="${escapeHtml(channel)}">
                    ${channel === 'sms' ? `
                    <div class="form-group">
                        <label>6 Haneli Kod</label>
                        <input type="text" name="otp" placeholder="000000" maxlength="6"
                            pattern="[0-9]{6}" inputmode="numeric"
                            class="otp-input" required autofocus>
                    </div>
                    ` : `
                    <div class="form-group">
                        <label>Yeni Şifre</label>
                        <input type="password" name="newPassword" placeholder="En az 8 karakter" minlength="8" required autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label>Yeni Şifre Tekrar</label>
                        <input type="password" name="newPassword2" placeholder="Şifreyi tekrar gir" minlength="8" required autocomplete="new-password">
                    </div>
                    `}
                    <button type="submit" class="btn-auth">${channel === 'sms' ? 'Kodu Doğrula' : 'Şifreyi Sıfırla'}</button>
                </form>
                <p class="auth-alt"><a href="/sifremi-unuttum">← Geri dön</a></p>
            </div>
        </div>
    </main>`;
}

function renderSifreSifirlaForm(email = '', error = '', csrfToken = '') {
    const csrfField = csrfToken ? `<input type="hidden" name="csrfToken" value="${escapeHtml(csrfToken)}">` : '';
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Şifre Sıfırla</span>
            <h1>Yeni Şifre Belirle</h1>
            <p><strong>${escapeHtml(email)}</strong> için yeni şifre girin.</p>
        </div>
        <div class="auth-wrap container">
            <div class="auth-card">
                ${error ? `<div class="auth-error">${escapeHtml(error)}</div>` : ''}
                <form method="POST" action="/sifre-sifirla" class="admin-form auth-form" autocomplete="off">
                    ${csrfField}
                    <input type="hidden" name="email" value="${escapeHtml(email)}">
                    <input type="hidden" name="channel" value="email_link">
                    <div class="form-group">
                        <label>Yeni Şifre</label>
                        <input type="password" name="newPassword" placeholder="En az 8 karakter (büyük/küçük harf, rakam, özel karakter)" minlength="8" required autocomplete="new-password">
                    </div>
                    <div class="form-group">
                        <label>Yeni Şifre Tekrar</label>
                        <input type="password" name="newPassword2" placeholder="Şifreyi tekrar gir" minlength="8" required autocomplete="new-password">
                    </div>
                    <button type="submit" class="btn-auth">Şifreyi Kaydet</button>
                </form>
                <p class="auth-alt"><a href="/sifremi-unuttum">← Geri dön</a></p>
            </div>
        </div>
    </main>`;
}

module.exports = { renderKayit, renderKayitDogrula, renderGiris, renderSifremiUnuttum, renderSifreSifirla, renderSifreSifirlaForm };