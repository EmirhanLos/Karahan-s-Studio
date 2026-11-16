/* ═══════════════════════════════════════════════════════════════
   js/musteri-client.js — Müşteri talep formu istemci davranışları.

   Satır içi <script> bloğu yerine dış dosya kullanılır; böylece
   CSP "script-src" kuralında 'unsafe-inline' gerekmez.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const REQUIRED_IDS = [
        'firstName', 'lastName', 'age', 'projectName',
        'email', 'phone', 'projectGoal', 'additionalInfo'
    ];

    function bind() {
        const btn = document.getElementById('submitBtn');
        if (!btn) return;

        function check() {
            const ok = REQUIRED_IDS.every(function (id) {
                const el = document.getElementById(id);
                if (!el) return false;
                if (el.type === 'checkbox') return el.checked;
                return String(el.value || '').trim().length > 0;
            });
            btn.disabled = !ok;
        }

        REQUIRED_IDS.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', check);
        });
        check();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind);
    } else {
        bind();
    }
})();
