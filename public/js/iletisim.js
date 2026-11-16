const { escapeHtml } = require('./layout');

function renderIletisim(sent = false, error = false, csrfToken = '') {
    const csrfField = csrfToken ? `<input type="hidden" name="_csrf" value="${escapeHtml(csrfToken)}">` : '';
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Bize Ulaşın</span>
            <h1>İletişim</h1>
            <p>Bir sorun mu var, öneriniz mi var ya da sadece merhaba mı demek istiyorsunuz?</p>
        </div>

        <div class="iletisim-wrap container">

            <!-- Üst bilgi kartları -->
            <div class="iletisim-cards">
                <div class="iletisim-info-card">
                    <div class="iletisim-icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                            <path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div>
                        <span class="iletisim-card-label">E-posta</span>
                        <a href="mailto:iletisim@karahans.com" class="iletisim-card-value">iletisim@karahans.com</a>
                    </div>
                </div>
                <div class="iletisim-info-card">
                    <div class="iletisim-icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"
                                stroke="currentColor" stroke-width="1.6"/>
                            <circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="1.6"/>
                        </svg>
                    </div>
                    <div>
                        <span class="iletisim-card-label">Konum</span>
                        <span class="iletisim-card-value">İstanbul, Türkiye</span>
                    </div>
                </div>
                <div class="iletisim-info-card">
                    <div class="iletisim-icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.6"/>
                            <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                    </div>
                    <div>
                        <span class="iletisim-card-label">Yanıt Süresi</span>
                        <span class="iletisim-card-value">Genellikle 24 saat içinde</span>
                    </div>
                </div>
                <div class="iletisim-info-card">
                    <div class="iletisim-icon">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                            <path d="M17 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V4a2 2 0 00-2-2z" stroke="currentColor" stroke-width="1.6"/>
                            <circle cx="12" cy="17" r="1" fill="currentColor"/>
                        </svg>
                    </div>
                    <div>
                        <span class="iletisim-card-label">Sosyal</span>
                        <div class="iletisim-socials-inline">
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
                            <a href="https://youtube.com"   target="_blank" rel="noopener noreferrer">YouTube ↗</a>
                            <a href="https://discord.com"   target="_blank" rel="noopener noreferrer">Discord ↗</a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Form -->
            <div class="iletisim-form-card">
                ${sent ? `
                <div class="iletisim-success">
                    <span class="iletisim-success-icon">✓</span>
                    <div>
                        <strong>Mesajın iletildi!</strong>
                        <p>En kısa sürede geri döneceğiz.</p>
                    </div>
                </div>` : ''}
                ${error ? `<div class="iletisim-error">Bir hata oluştu. Lütfen tekrar dene.</div>` : ''}

                <h2 class="iletisim-form-title">Mesaj Gönder</h2>

                <form method="POST" action="/iletisim" class="admin-form iletisim-form">
                    ${csrfField}
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Ad Soyad</label>
                            <div class="input-wrapper">
                                <input type="text" name="name" placeholder="Adın Soyadın" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>E-posta</label>
                            <div class="input-wrapper">
                                <input type="email" name="email" placeholder="ornek@mail.com" required>
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Konu</label>
                        <div class="input-wrapper">
                            <input type="text" name="subject" placeholder="Ne hakkında yazıyorsunuz?" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Mesaj</label>
                        <div class="input-wrapper">
                            <textarea name="message" rows="6" placeholder="Mesajınızı buraya yazın..." required></textarea>
                        </div>
                    </div>
                    <button type="submit" class="btn-iletisim">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"
                                stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Gönder
                    </button>
                </form>
            </div>

        </div>
    </main>`;
}

module.exports = { renderIletisim };