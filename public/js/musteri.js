const { escapeHtml } = require('./layout');

function renderMusteriForm(error = '') {
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Müşteri Formu</span>
            <h1>Müşteri Talep Formu</h1>
            <p>Lütfen proje bilgilerini doldurun. Gönderilen formlar admin paneline iletilecektir.</p>
        </div>
        <div class="container">
            <div class="musteri-form-card">
                ${error ? `<div class="auth-error">${escapeHtml(error)}</div>` : ''}
                <form method="POST" action="/musteri-formu" class="admin-form" id="musteriForm">
                    <div class="form-grid">
                        <div class="form-group"><label>Ad</label><input type="text" name="firstName" id="firstName" required></div>
                        <div class="form-group"><label>Soyad</label><input type="text" name="lastName" id="lastName" required></div>
                        <div class="form-group"><label>Yaş</label><input type="number" name="age" id="age" min="0" required></div>
                        <div class="form-group"><label>Proje Adı</label><input type="text" name="projectName" id="projectName" required></div>
                    </div>
                    <div class="form-grid">
                        <div class="form-group"><label>E-posta</label><input type="email" name="email" id="email" required></div>
                        <div class="form-group"><label>Telefon</label><input type="tel" name="phone" id="phone" required placeholder="+90 5XX XXX XX XX"></div>
                    </div>
                    <div class="form-group"><label>Proje Amacı</label><textarea name="projectGoal" id="projectGoal" rows="4" required></textarea></div>
                    <div class="form-group"><label>Projeye Eklenmesini İstediğiniz Bilgiler</label><textarea name="additionalInfo" id="additionalInfo" rows="4" required></textarea></div>
                    <div style="display:flex;gap:.75rem;margin-top:.5rem">
                        <button type="submit" class="btn-admin btn-admin-primary" id="submitBtn" disabled>Gönder</button>
                        <a href="/" class="btn-admin btn-admin-secondary">İptal</a>
                    </div>
                </form>
            </div>
        </div>
    </main>
    <script>
    (function(){
        const requiredIds = ['firstName','lastName','age','projectName','email','phone','projectGoal','additionalInfo'];
        const btn = document.getElementById('submitBtn');
        const form = document.getElementById('musteriForm');
        function check() {
            const ok = requiredIds.every(id => {
                const el = document.getElementById(id);
                if (!el) return false;
                if (el.type === 'checkbox') return el.checked;
                return String(el.value || '').trim().length > 0;
            });
            btn.disabled = !ok;
        }
        requiredIds.forEach(id => document.getElementById(id).addEventListener('input', check));
        // initial
        check();
    })();
    </script>`;
}

function renderMusteriThanks() {
    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">Teşekkürler</span>
            <h1>Formunuz alındı</h1>
            <p>Talebiniz admin ekibine iletildi. En kısa sürede dönüş yapılacaktır.</p>
        </div>
    </main>`;
}

module.exports = { renderMusteriForm, renderMusteriThanks };
