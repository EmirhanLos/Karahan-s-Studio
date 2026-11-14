/* ═══════════════════════════════════════════════════════════════
   public/js/reveal.js — Kaydırmada beliren bölümler
   data-reveal="up|left|right|scale|clip" varyantları
   data-stagger: ebeveynin alt öğelerine kademeli gecikme
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var VARIANTS = ['up', 'left', 'right', 'scale', 'clip'];
    var RM = window.matchMedia('(prefers-reduced-motion: reduce)');

    function show(el) {
        el.classList.add('is-visible');
        el.removeAttribute('hidden');
    }

    /* IntersectionObserver yok ya da hareket azaltılmış → her şey anında görünür */
    if (!('IntersectionObserver' in window) || RM.matches) {
        document.querySelectorAll('.reveal, [data-reveal]').forEach(show);
        return;
    }

    var items = document.querySelectorAll('.reveal, [data-reveal]');

    items.forEach(function (el) {
        el.classList.add('reveal');

        /* Varyant sınıfı: reveal--up / --left / --right / --scale / --clip */
        var variant = el.getAttribute('data-reveal');
        if (variant && VARIANTS.indexOf(variant) !== -1) {
            el.classList.add('reveal--' + variant);
        }

        /* Varsayılan kademe: kardeşler arasındaki sıraya göre 1–6 */
        if (!el.hasAttribute('data-delay')) {
            var siblings = el.parentElement ? Array.prototype.slice.call(el.parentElement.children) : [];
            var i = Math.max(0, siblings.indexOf(el)) % 6;
            el.setAttribute('data-delay', String(i + 1));
        }

        /* data-delay değerini CSS gecikmesine çevir (0–350ms) */
        var d = parseInt(el.getAttribute('data-delay'), 10) || 0;
        el.style.setProperty('--reveal-delay', Math.max(0, (d - 1) * 70) + 'ms');
    });

    /* data-stagger: ebeveynin reveal öğelerine art arda gecikme ver */
    document.querySelectorAll('[data-stagger]').forEach(function (parent) {
        var step = parseInt(parent.getAttribute('data-stagger'), 10) || 90;
        var children = Array.prototype.slice.call(parent.children).filter(function (c) {
            return c.classList.contains('reveal') || c.hasAttribute('data-reveal');
        });
        children.forEach(function (c, i) {
            /* Ebeveyn varyantı alt öğeye miras kalır */
            if (!c.getAttribute('data-reveal') && parent.getAttribute('data-reveal')) {
                c.setAttribute('data-reveal', parent.getAttribute('data-reveal'));
                c.classList.add('reveal--' + parent.getAttribute('data-reveal'));
            }
            c.style.setProperty('--reveal-delay', (i * step) + 'ms');
        });
    });

    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            show(entry.target);
            obs.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    items.forEach(function (el) { obs.observe(el); });
})();
