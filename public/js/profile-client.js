/* ═══════════════════════════════════════════════════════════════
   js/profile-client.js — Profil sayfası istemci davranışları.

   Şablon içine <script> bloğu veya onclick/onsubmit satır içi olay
   işleyicisi yazılmaz (CSP "script-src" içinde 'unsafe-inline' yok).
   Bu dosya davranışları data-* öznitelikleri üzerinden bağlar:

     data-avatar-upload            → avatar dosyası yükleme
     data-avatar-preview-upload    → önizleme + avatar yükleme
     data-delete-account           → hesap silme onayı
     data-card-brand               → kart markası algılama

   Güvenlik notu: avatar URL'si asla innerHTML ile eklenmez; DOM
   düğümü oluşturulup .src özelliği atanır. Böylece sunucudan dönen
   değer HTML olarak yorumlanmaz.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── Yardımcılar ─────────────────────────────────────────── */

    /* Form içindeki gizli CSRF alanından tokenı okur. */
    function csrfToken() {
        const field = document.querySelector('input[name="_csrf"]');
        return field ? field.value : '';
    }

    /* Avatar URL'sini güvenli biçimde yerleştirir.
       innerHTML yerine createElement + .src kullanılır; sunucudan
       gelen değer hiçbir zaman HTML olarak ayrıştırılmaz. */
    function setAvatar(container, url, className, altText) {
        if (!container || !url) return;
        const img = document.createElement('img');
        img.src = url;
        img.alt = altText || 'Profil fotoğrafı';
        img.className = className || 'profile-avatar-img';
        container.textContent = '';
        container.appendChild(img);
    }

    /* ── Avatar yükleme ──────────────────────────────────────── */

    async function uploadAvatar(input) {
        const file = input.files && input.files[0];
        if (!file) return;
        const msg = document.getElementById('avatarMsg');
        const form = new FormData();
        form.append('avatar', file);
        if (msg) {
            msg.textContent = 'Yükleniyor...';
            msg.style.color = 'var(--text-faint)';
        }
        try {
            const res = await fetch('/api/upload/avatar', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Hata oluştu.');

            setAvatar(document.querySelector('.profile-avatar'), data.url, 'profile-avatar-img', 'Profil fotoğrafı');
            setAvatar(document.querySelector('.nav-avatar'), data.url, 'nav-avatar-img', 'Profil');

            if (msg) {
                msg.textContent = 'Fotoğraf güncellendi!';
                msg.style.color = '#4ade80';
            }
        } catch (err) {
            if (msg) {
                msg.textContent = (err && err.message) || 'Bağlantı hatası.';
                msg.style.color = '#f87171';
            }
        }
    }

    /* ── Avatar önizleme + yükleme ───────────────────────────── */

    function previewInto(previewId, dataUrl) {
        const el = document.getElementById(previewId);
        if (!el) return;
        if (el.tagName === 'IMG') {
            el.src = dataUrl;
            return;
        }
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = '';
        img.className = 'img-preview';
        img.id = previewId;
        el.replaceWith(img);
    }

    async function previewAndUploadAvatar(input) {
        const file = input.files && input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) { previewInto('imgPreview', e.target.result); };
        reader.readAsDataURL(file);

        const form = new FormData();
        form.append('avatarFile', file);
        const msgEl = document.getElementById('avatarMsg');
        if (msgEl) {
            msgEl.textContent = 'Yükleniyor...';
            msgEl.style.color = 'var(--text-faint)';
        }

        try {
            const res = await fetch('/api/upload/avatar', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Hata oluştu.');

            setAvatar(document.querySelector('.nav-avatar'), data.url, 'nav-avatar-img', 'Profil');

            if (msgEl) {
                msgEl.textContent = 'Fotoğraf güncellendi!';
                msgEl.style.color = '#4ade80';
            }
        } catch (err) {
            if (msgEl) {
                msgEl.textContent = (err && err.message) || 'Bağlantı hatası.';
                msgEl.style.color = '#f87171';
            }
        }
    }

    /* ── Hesap silme ─────────────────────────────────────────── */

    async function deleteAccount() {
        if (!window.confirm('Hesabınızı silmek istediğine emin misiniz? Bu işlem geri alınamaz.')) return;
        if (!window.confirm('Tüm verileriniz kalıcı olarak silinecek. Devam etmek istiyor musunuz?')) return;

        try {
            const res = await fetch('/profil/sil', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                /* Alan adı sunucu ile aynı: `_csrf` */
                body: JSON.stringify({ _csrf: csrfToken() })
            });
            if (res.redirected) {
                window.location.href = res.url;
                return;
            }
            const data = await res.json().catch(() => null);
            if (data && data.error) window.alert('Hata: ' + data.error);
        } catch (err) {
            console.error('Hesap silme hatası:', err);
            window.alert('Bir hata oluştu. Lütfen tekrar deneyin.');
        }
    }

    /* ── Kart markası algılama ───────────────────────────────── */

    const CARD_PATTERNS = {
        visa: /^4/,
        mastercard: /^5[1-5]/,
        amex: /^3[47]/,
        discover: /^6(?:011|5)/,
        diners: /^3(?:0[0-5]|[68])/,
        jcb: /^(?:2131|1800|35)/
    };

    function updateCardBrand(input) {
        const brandInput = document.getElementById('cardBrandInput');
        if (!brandInput) return;
        const number = String(input.value || '').replace(/\s/g, '');
        if (!number) {
            brandInput.value = '';
            return;
        }
        for (const [type, pattern] of Object.entries(CARD_PATTERNS)) {
            if (pattern.test(number)) {
                brandInput.value = type;
                return;
            }
        }
        brandInput.value = '';
    }

    /* ── Bağlantılar ─────────────────────────────────────────── */

    function bind() {
        document.querySelectorAll('[data-avatar-upload]').forEach(input => {
            input.addEventListener('change', () => uploadAvatar(input));
        });

        document.querySelectorAll('[data-avatar-preview-upload]').forEach(input => {
            input.addEventListener('change', () => previewAndUploadAvatar(input));
        });

        document.querySelectorAll('[data-delete-account]').forEach(button => {
            button.addEventListener('click', () => deleteAccount());
        });

        document.querySelectorAll('[data-card-brand]').forEach(input => {
            input.addEventListener('input', () => updateCardBrand(input));
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
