/* ═══════════════════════════════════════════════════════════════
   js/urun-rating.js — Ürün puanlama bileşeni.

   Şablon içindeki satır içi <script> bloğu buraya taşındı; CSP
   "script-src" kuralında 'unsafe-inline' bulunmadığı için betikler
   yalnızca <script src="..."> ile yüklenebilir.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    function bindRating() {
        const container = document.getElementById('starInput');
        if (!container) return;

        const msg = document.getElementById('ratingMsg');
        const starsEl = document.getElementById('ratingStars');
        const valueEl = document.getElementById('ratingValue');
        const countEl = document.getElementById('ratingCount');
        const btns = container.querySelectorAll('.star-btn');
        const pid = container.dataset.projectId;

        /* Yıldızları güncelle */
        function updateStarsDisplay(rating, ratingCount) {
            const full = Math.floor(rating);
            const half = (rating - full) >= 0.5 ? 1 : 0;
            const empty = 5 - full - half;
            if (starsEl) starsEl.textContent = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
            if (valueEl) valueEl.textContent = rating.toFixed(1);
            if (countEl) countEl.textContent = '(' + ratingCount + ' değerlendirme)';
            btns.forEach((b, i) => {
                b.style.color = i < Math.round(rating) ? '#facc15' : '';
            });
        }

        /* Hover efekti */
        btns.forEach((btn, i) => {
            btn.addEventListener('mouseenter', () => {
                btns.forEach((b, j) => b.classList.toggle('hovered', j <= i));
            });
        });
        container.addEventListener('mouseleave', () => {
            btns.forEach(b => b.classList.remove('hovered'));
        });

        /* Tıklama → API → DOM güncelle */
        btns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const rating = Number(btn.dataset.value);
                try {
                    const res = await fetch('/api/projects/' + pid + '/rate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        updateStarsDisplay(data.rating, data.ratingCount);
                        msg.textContent = 'Puanın kaydedildi!';
                        msg.className = 'rating-msg rating-msg--ok';
                        btns.forEach(b => { b.disabled = true; b.style.cursor = 'default'; });
                    } else {
                        msg.textContent = data.error || 'Bir hata oluştu.';
                        msg.className = 'rating-msg rating-msg--err';
                    }
                } catch {
                    msg.textContent = 'Bağlantı hatası.';
                    msg.className = 'rating-msg rating-msg--err';
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindRating);
    } else {
        bindRating();
    }
})();
