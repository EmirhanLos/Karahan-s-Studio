/* ═══════════════════════════════════════════════════════════════
   js/theme-boot.js — Tema, stil sayfası yüklenmeden ÖNCE uygulanır.

   Aksi halde sayfa koyu temayla boyanıp ardından beyaza döner
   (FOUC) ve tema değişiminde ekranın sağından soluna süpürme
   efekti bozulur.

   Satır içi <script> bloğu yerine dış dosya kullanılır; CSP
   "script-src" kuralında 'unsafe-inline' bulunmaz.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    try {
        var saved = localStorage.getItem('ks-theme') || 'system';
        var resolved = saved === 'system'
            ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
            : saved;
        document.documentElement.setAttribute('data-theme', resolved);
    } catch (e) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();
