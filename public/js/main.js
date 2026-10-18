/* public/js/main.js — Lightweight page interactions. */
(function () {
    'use strict';

    document.querySelectorAll('[data-rating-form]').forEach(form => {
        const message = form.querySelector('[data-rating-message]');
        const value = document.querySelector('[data-rating-value]');
        const count = document.querySelector('[data-rating-count]');
        const stars = document.querySelector('[data-rating-stars]');
        const submit = form.querySelector('[type="submit"]');
        if (!message || !value || !count || !stars || !submit) return;

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
                message.classList.remove('is-error');
                message.textContent = 'Puanınız kaydedildi. Teşekkür ederiz.';
            } catch (error) {
                message.classList.add('is-error');
                message.textContent = error.message || 'Bağlantı kurulamadı. Lütfen tekrar deneyin.';
            } finally {
                submit.disabled = false;
            }
        });
    });
})();
