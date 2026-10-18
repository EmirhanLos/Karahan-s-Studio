/* ═══════════════════════════════════════════════════════════════
   public/js/theme.js — Tema değiştirici + sağdan sola süpürme
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const STORAGE = 'ks-theme';
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const root  = document.documentElement;
    function resolve(mode) { return mode === 'system' ? (media.matches ? 'light' : 'dark') : mode; }

    function applyTheme(mode) { root.setAttribute('data-theme', resolve(mode)); }

    function setTheme(mode) {
        try { localStorage.setItem(STORAGE, mode); } catch {}
        applyTheme(mode);
    }

    function current() {
        try { return localStorage.getItem(STORAGE) || 'light'; } catch { return 'light'; }
    }

    function wireButton() {
        const btn = document.querySelector('.theme-btn');
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('themeMenu');
            if (!menu) return;
            const open = menu.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', String(open));
        });
        document.addEventListener('click', () => {
            const menu = document.getElementById('themeMenu');
            if (menu) {
                menu.classList.remove('is-open');
                btn.setAttribute('aria-expanded', 'false');
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const menu = document.getElementById('themeMenu');
                if (menu) {
                    menu.classList.remove('is-open');
                    btn.setAttribute('aria-expanded', 'false');
                }
            }
        });

        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => {
                setTheme(opt.dataset.theme);
                document.querySelectorAll('.theme-option').forEach(o => {
                    o.classList.toggle('is-active', o.dataset.theme === opt.dataset.theme);
                });
            });
        });
    }

    function init() {
        applyTheme(current());
        document.querySelectorAll('.theme-option').forEach(o => {
            o.classList.toggle('is-active', o.dataset.theme === current());
        });
        wireButton();
        media.addEventListener('change', () => {
            if (current() === 'system') applyTheme('system');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
