/* ══════════════════════════════════════════
   admin-2fa.js — Doğrulama ekranı davranışı

   · Sayac 30 sn'de bir yenilenir
   · OTP alanına otomatik odaklanır
   · Kurtarma kodunu yapıştırma kolaylığı
   · Parola göster/gizle düğmeleri
   ══════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

    /* ── Parola göster / gizle ── */
    document.querySelectorAll('[data-pw-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.pwToggle);
            if (!input) return;
            const shown = input.type === 'text';
            input.type = shown ? 'password' : 'text';
            btn.classList.toggle('revealed', !shown);
            btn.setAttribute('aria-label', shown ? 'Parolayı göster' : 'Parolayı gizle');
        });
    });

    /* ── Kurulum ekranı: otpauth bağlantısı ──
       Bazı tarayıcılar özel şema bağlantılarını engelleyebilir;
       bu durumda kullanıcı anahtarı elle girebilir. */
    document.querySelectorAll('[data-otpauth]').forEach(link => {
        link.addEventListener('click', (e) => {
            const uri = link.getAttribute('href') || '';
            if (!uri.startsWith('otpauth://')) return;
            e.preventDefault();
            location.href = uri;
        });
    });

    /* ── Kurtarma kodlarını kopyala ── */
    document.querySelectorAll('[data-copy-codes]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const codes = [...document.querySelectorAll('.recovery-codes code')]
                .map(el => el.textContent.trim());
            if (!codes.length) return;
            try {
                await navigator.clipboard.writeText(codes.join('\n'));
                btn.textContent = 'Kopyalandı ✓';
            } catch {
                /* Eski tarayıcılar / izin yok — kullanıcı elle kopyalasın */
                btn.textContent = 'Kopyalanamadı — elle seçin';
            }
            setTimeout(() => { btn.textContent = 'Kodu kopyala'; }, 2400);
        });
    });

    /* ── Doğrulama kodu alanı ── */
    const token = document.getElementById('tf-token');

    if (token) {
        token.focus();

        /* Yalnızca rakam kabul et */
        token.addEventListener('input', () => {
            token.value = token.value.replace(/\D/g, '').slice(0, 6);
        });

        /* Altı hane girilince otomatik gönder */
        token.addEventListener('input', () => {
            if (token.value.length === 6) {
                token.form?.submit();
            }
        });

        /* Geri sayım */
        const timer = document.querySelector('[data-twofa-timer]');
        if (timer) {
            let left = 30;
            const paint = () => { timer.textContent = `Kodun süresi: ${left} sn`; };
            paint();
            setInterval(() => {
                left = left <= 1 ? 30 : left - 1;
                paint();
            }, 1000);
        }
    }

    /* ── Kurtarma kodu alanı ── */
    const recovery = document.getElementById('tf-recovery');

    if (recovery) {
        recovery.focus();
        /* Büyük harfe çevir, tire ve boşluk normalleştir */
        recovery.addEventListener('input', () => {
            const raw = recovery.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
            recovery.value = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
        });
    }

    /* ── Kurulum kodu ── */
    const setupToken = document.getElementById('setup-token');
    if (setupToken) {
        setupToken.focus();
        setupToken.addEventListener('input', () => {
            setupToken.value = setupToken.value.replace(/\D/g, '').slice(0, 6);
        });
        setupToken.addEventListener('input', () => {
            if (setupToken.value.length === 6) setupToken.form?.submit();
        });
    }
});