/* ═══════════════════════════════════════════════════════════════
   public/js/nav.js — Mobil menü, parola göstergesi, küçük etkileşimler
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* Parola göstergesi */
    document.querySelectorAll('[data-pw-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.pwToggle);
            if (!input) return;
            const shown = input.type === 'text';
            input.type = shown ? 'password' : 'text';
            btn.classList.toggle('revealed', !shown);
        });
    });

    /* Mobil menü */
    const toggle = document.getElementById('navToggle');
    const list   = document.getElementById('navList');
    if (toggle && list) {
        const sync = () => {
            const open = list.classList.contains('open');
            document.documentElement.classList.toggle('nav-open', open);
            toggle.setAttribute('aria-expanded', String(open));
        };
        toggle.addEventListener('click', () => {
            list.classList.toggle('open');
            sync();
        });
        list.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
            if (list.classList.contains('open')) {
                list.classList.remove('open');
                sync();
            }
        }));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && list.classList.contains('open')) {
                list.classList.remove('open');
                sync();
                toggle.focus();
            }
        });
        window.matchMedia('(min-width: 901px)').addEventListener('change', e => {
            if (e.matches) {
                list.classList.remove('open');
                sync();
            }
        });
    }

    /* Dropdown: mobilde dokunmayla aç */
    document.querySelectorAll('.dropdown > .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.matchMedia('(max-width: 900px)').matches) {
                e.preventDefault();
                const dropdown = link.parentElement;
                if (!dropdown.classList.contains('open')) {
                    e.preventDefault();
                    dropdown.classList.add('open');
                }
            }
        });
    });

    /* Slider otomatik kaydırma — salt istemcide etkileşim için */
    document.querySelectorAll('[data-slider]').forEach(slider => {
        const track = slider.querySelector('.slider-track');
        const slides = slider.querySelectorAll('.slider-slide');
        const prev = slider.querySelector('.slider-arrow-prev');
        const next = slider.querySelector('.slider-arrow-next');
        const dots = slider.querySelector('.slider-dots');
        if (!track || !slides.length) return;
        let idx = 0;
        const setDots = () => {
            if (!dots) return;
            [...dots.children].forEach((d, i) => d.classList.toggle('slider-dot--active', i === idx));
        };
        const go = (i) => { idx = (i + slides.length) % slides.length; track.style.transform = `translateX(-${idx * 100}%)`; setDots(); };
        if (dots) {
            [...dots.children].forEach((d, i) => d.addEventListener('click', () => go(i)));
        }
        if (prev) prev.addEventListener('click', () => go(idx - 1));
        if (next) next.addEventListener('click', () => go(idx + 1));
        if (slides.length > 1) {
            setInterval(() => go(idx + 1), 6000);
        }
        setDots();
    });

    /* Tema kartı seçim butonları (profil sayfası) */
    document.querySelectorAll('[data-set-theme]').forEach(el => {
        el.addEventListener('click', () => {
            try { localStorage.setItem('ks-theme', el.dataset.setTheme); } catch {}
            location.reload();
        });
    });

    /* 2FA OTP alanı: filtreleme ve 6 hane → otomatik submit */
    const otp = document.getElementById('token') || document.getElementById('setup-token') || document.getElementById('recovery');
    if (otp) {
        otp.addEventListener('input', () => {
            if (otp.id === 'recovery') {
                let v = otp.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                otp.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
            } else {
                otp.value = otp.value.replace(/\D/g, '').slice(0, 6);
                if (otp.value.length === 6) setTimeout(() => otp.form?.submit(), 80);
            }
        });
        otp.focus();
    }

    /* Kurtarma kodu kopyalama */
    document.querySelectorAll('[data-copy-codes]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const target = document.querySelector('[data-copy-target]');
            if (!target) return;
            const codes = [...target.querySelectorAll('code')].map(c => c.textContent).join('\n');
            try {
                await navigator.clipboard.writeText(codes);
                btn.textContent = 'Kopyalandı ✓';
            } catch {
                btn.textContent = 'Elle seçip kopyalayın';
            }
            setTimeout(() => { btn.textContent = 'Kodları Kopyala'; }, 2400);
        });
    });

    /* 2FA geri sayım */
    const timer = document.querySelector('[data-twofa-timer]');
    if (timer) {
        let left = parseInt(timer.dataset.twofaTimer || '30', 10) || 30;
        const paint = () => { timer.textContent = `Kod ${left} saniye sonra yenilenir.`; };
        paint();
        setInterval(() => { left = left <= 1 ? 30 : left - 1; paint(); }, 1000);
    }

    /* Resim önizleme */
    document.querySelectorAll('[data-preview]').forEach(input => {
        const target = document.querySelector(input.dataset.preview);
        if (!target) return;
        input.addEventListener('change', () => {
            const file = input.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            target.src = url;
            target.classList.remove('img-preview--empty');
        });
    });

    /* Tema bilgi anahtarı bağlantıları (authenticator uygulaması) */
    document.querySelectorAll('[data-otpauth]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href') || '';
            if (!href.startsWith('otpauth://')) return;
            e.preventDefault();
            location.href = href;
        });
    });
})();
