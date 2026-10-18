/* ═══════════════════════════════════════════════════════════════
   public/js/reveal.js — Kaydırmada beliren bölümler
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.reveal, [data-reveal]').forEach(el => {
            el.classList.add('is-visible');
            el.removeAttribute('hidden');
        });
        return;
    }

    const items = document.querySelectorAll('.reveal, [data-reveal]');
    items.forEach(el => {
        el.classList.add('reveal');
        if (!el.hasAttribute('data-delay')) {
            const i = [...el.parentElement?.children || []].indexOf(el) % 6;
            el.setAttribute('data-delay', String(i + 1));
        }
    });

    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    items.forEach(el => obs.observe(el));
})();
