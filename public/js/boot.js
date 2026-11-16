/* ═══════════════════════════════════════════════════════════════
   js/boot.js — Sayfa açılış betiği.

   CSP uyumlu olması için şablon içine hiçbir <script> bloğu veya
   onclick/onsubmit satır içi olay işleyicisi yazılmaz. Bu dosya
   o görevleri üstlenir:

   1) <html class="no-js"> → "js" sınıfını kaldırır (CSS geçişi)
   2) media="print" ile ertelenen stil sayfalarını etkinleştirir
   3) data-confirm taşıyan form/bağlantılarda onay diyaloğu açar

   Betik <head> içinde defer olmadan yüklenir; böylece ilk boyamada
   tema kayması (FOUC) oluşmaz.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* 1) no-js sınıfını kaldır */
    document.documentElement.classList.remove('no-js');
    document.documentElement.classList.add('js');

    /* 2) Ertelenmiş stil sayfalarını etkinleştir (media="print" → "all") */
    function activateDeferredStyles() {
        var links = document.querySelectorAll('link[rel="stylesheet"][media="print"]');
        for (var i = 0; i < links.length; i++) {
            links[i].setAttribute('media', 'all');
        }
    }
    activateDeferredStyles();

    /* 3) data-confirm ile onay diyaloğu */
    function bindConfirm() {
        document.addEventListener('submit', function (event) {
            var form = event.target;
            if (!form || !form.getAttribute) return;
            var message = form.getAttribute('data-confirm');
            if (message && !window.confirm(message)) {
                event.preventDefault();
            }
        });

        document.addEventListener('click', function (event) {
            var target = event.target;
            if (!target || !target.closest) return;
            var holder = target.closest('[data-confirm]');
            if (!holder) return;
            /* Form içindeki butonlar submit olayıyla da ele alınır. */
            if (holder.tagName === 'FORM') return;
            if (!window.confirm(holder.getAttribute('data-confirm'))) {
                event.preventDefault();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            activateDeferredStyles();
            bindConfirm();
        });
    } else {
        activateDeferredStyles();
        bindConfirm();
    }
})();
