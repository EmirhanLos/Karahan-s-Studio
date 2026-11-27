/* public/js/main.js — Lightweight page interactions. */
(function () {
    'use strict';

    document.querySelectorAll('[data-rating-form]').forEach(form => {
        const message = form.querySelector('[data-rating-message]');
        const value = document.querySelector('[data-rating-value]');
        const count = document.querySelector('[data-rating-count]');
        const stars = document.querySelector('[data-rating-stars]');
        const submit = form.querySelector('[type="submit"]');
        const hiddenRating = form.querySelector('input[name="rating"]');
        const btns = form.querySelectorAll('.star-btn');
        const reviewsList = document.querySelector('.reviews-list');
        if (!message || !value || !count || !stars || !submit || !hiddenRating) return;

        const hintText = document.getElementById('ratingHintText');
        const hints = { '1': '1 ★ - Geliştirilmeli', '2': '2 ★ - Yetersiz', '3': '3 ★ - Ortalama', '4': '4 ★ - Çok İyi', '5': '5 ★ - Harika!' };

        /* Yıldız düğmeleri: tıklamada gizli alanı güncelle ve doluluğu göster */
        function updateStarUI(selected) {
            btns.forEach((btn, index) => {
                const on = (index + 1) <= Number(selected);
                btn.style.color = on ? '#facc15' : '';
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            if (hintText && hints[String(selected)]) {
                hintText.textContent = hints[String(selected)];
                hintText.style.color = '#facc15';
            }
        }
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                hiddenRating.value = btn.dataset.value;
                updateStarUI(btn.dataset.value);
                message.hidden = true;
                message.textContent = '';
            });
        });

        form.addEventListener('submit', async event => {
            event.preventDefault();
            message.hidden = false;
            message.textContent = '';
            submit.disabled = true;

            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    headers: { Accept: 'application/json' },
                    body: new URLSearchParams(new FormData(form)),
                    credentials: 'same-origin'
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Puan gönderilemedi.');

                const rating = Math.max(0, Math.min(5, Number(result.rating) || 0));
                value.textContent = `${rating.toFixed(1)} / 5`;
                count.textContent = String(result.count);
                stars.textContent = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
                updateStarUI(rating);
                btns.forEach(b => { b.disabled = true; b.style.cursor = 'default'; });
                message.classList.remove('is-error');
                message.textContent = 'Puanınız kaydedildi. Teşekkür ederiz.';

                if (result.review && reviewsList) {
                    const item = document.createElement('article');
                    item.className = 'review-item surface';
                    item.style.padding = 'var(--sp-4)';
                    const head = document.createElement('div');
                    head.className = 'review-item-head';
                    head.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:var(--sp-3)';
                    const info = document.createElement('div');
                    const name = document.createElement('strong');
                    name.textContent = result.review.userName;
                    info.appendChild(name);
                    if (result.review.verified) {
                        const badge = document.createElement('span');
                        badge.className = 'badge badge--ok';
                        badge.style.cssText = 'font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em';
                        badge.textContent = 'doğrulanmış';
                        info.appendChild(badge);
                    }
                    const time = document.createElement('time');
                    time.className = 'text-subtle text-xs';
                    time.textContent = new Date(result.review.date).toLocaleDateString('tr-TR');
                    head.appendChild(info);
                    head.appendChild(time);
                    item.appendChild(head);
                    const itemStars = document.createElement('div');
                    itemStars.className = 'review-item-stars';
                    itemStars.style.cssText = 'font-size:1.25rem;margin:var(--sp-2) 0';
                    itemStars.textContent = '★'.repeat(result.review.rating) + '☆'.repeat(5 - result.review.rating);
                    item.appendChild(itemStars);
                    if (result.review.comment) {
                        const p = document.createElement('p');
                        p.textContent = result.review.comment;
                        item.appendChild(p);
                    }
                    reviewsList.prepend(item);
                    const heading = reviewsList.previousElementSibling;
                    if (!heading || !heading.classList.contains('review-list-head')) {
                        const h3 = document.createElement('h3');
                        h3.className = 'review-list-head';
                        h3.style.cssText = 'margin:var(--sp-5) 0 var(--sp-3)';
                        h3.textContent = 'Kullanıcı Yorumları';
                        reviewsList.before(h3);
                    }
                }
            } catch (error) {
                message.classList.add('is-error');
                message.textContent = error.message || 'Bağlantı kurulamadı. Lütfen tekrar deneyin.';
            } finally {
                submit.disabled = false;
            }
        });
    });
    /* ── Cookie & Privacy Banner ── */
    function initCookieBanner() {
        var banner = document.getElementById('cookieBanner');
        if (!banner) return;

        function getCookie(name) {
            var m = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
            return m ? decodeURIComponent(m[2]) : null;
        }

        var consent = null;
        try {
            var raw = getCookie('ks_consent') || localStorage.getItem('ks_consent');
            if (raw) consent = JSON.parse(raw);
        } catch (e) {}

        if (consent && consent.decision) {
            return;
        }

        banner.style.display = 'block';

        var btnAcceptAll = document.getElementById('cookieAcceptAll');
        var btnRejectAll = document.getElementById('cookieRejectAll');
        var btnToggleCustom = document.getElementById('cookieToggleCustom');
        var btnSaveCustom = document.getElementById('cookieSaveCustom');
        var customPanel = document.getElementById('cookieCustomPanel');
        var optAnalytics = document.getElementById('cookieAnalytics');
        var optMarketing = document.getElementById('cookieMarketing');

        function saveConsent(decision, permissions) {
            banner.style.opacity = '0';
            banner.style.transform = 'translateY(16px)';
            banner.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            setTimeout(function () { banner.style.display = 'none'; }, 260);

            try {
                localStorage.setItem('ks_consent', JSON.stringify({
                    decision: decision,
                    permissions: permissions,
                    at: new Date().toISOString()
                }));
            } catch (e) {}

            fetch('/api/cookie-consent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision: decision,
                    permissions: permissions
                })
            }).catch(function (err) {
                console.warn('Cookie consent kaydedilemedi:', err);
            });
        }

        if (btnAcceptAll) {
            btnAcceptAll.addEventListener('click', function () {
                saveConsent('all', { essential: true, analytics: true, marketing: true });
            });
        }

        if (btnRejectAll) {
            btnRejectAll.addEventListener('click', function () {
                saveConsent('reject', { essential: true, analytics: false, marketing: false });
            });
        }

        if (btnToggleCustom && customPanel) {
            btnToggleCustom.addEventListener('click', function () {
                var isHidden = customPanel.hidden;
                customPanel.hidden = !isHidden;
                btnToggleCustom.textContent = isHidden ? 'Kapat' : 'Özelleştir';
                if (btnSaveCustom) btnSaveCustom.style.display = isHidden ? 'inline-flex' : 'none';
            });
        }

        if (btnSaveCustom) {
            btnSaveCustom.addEventListener('click', function () {
                var analytics = optAnalytics ? optAnalytics.checked : false;
                var marketing = optMarketing ? optMarketing.checked : false;
                saveConsent('custom', { essential: true, analytics: analytics, marketing: marketing });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCookieBanner);
    } else {
        initCookieBanner();
    }
})();