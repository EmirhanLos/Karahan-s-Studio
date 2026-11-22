/* ═══════════════════════════════════════════════════════════════════
   js/bekleme-listesi.js — Yayınlanınca Haber Ver (waitlist) client.
   — Upcoming sayfası “Yayınlanınca Haber Ver” butonunun davranışını
   yönetir; e-posta gönderildikten sonra buton devre dışı bırakılır.
   ══════════════════════════════════════════════════════════════════ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.btn-waitlist').forEach(btn => {
        btn.addEventListener('click', async () => {
            const productId = btn.dataset.id;
            const email = btn.dataset.email;
            const msg = btn.parentElement.querySelector('.waitlist-msg');
            if (!productId || !email) return;

            if (msg) {
                msg.textContent = 'Kayıt oluyor...';
                msg.style.color = 'var(--text-faint)';
            }

            try {
                const res = await fetch(`/api/bekleme-listesi/${productId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'Bekleme listesi kaydı başarısız.');

                if (msg) {
                    msg.textContent = 'Bildirim listesine eklendi!';
                    msg.style.color = '#4ade80';
                }

                // Butonu devre dışı bırak ve başarılı mesajı göster
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.textContent = 'Kayıt Olundu';
            } catch (error) {
                if (msg) {
                    msg.textContent = (error && error.message) || 'Bir hata oluştu.';
                    msg.style.color = '#f87171';
                }
                console.error('Bekleme listesi hatası:', error);
            }
        });
    });
});