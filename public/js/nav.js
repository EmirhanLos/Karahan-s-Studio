/* ═══════════════════════════════════════════════════════════════
   public/js/nav.js — Mobil menü, parola göstergesi, küçük etkileşimler
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    const watchMediaQuery = (mediaQuery, callback) => {
        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', callback);
        } else if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(callback);
        }
    };

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
    const navbar = toggle && toggle.closest('.navbar');
    if (toggle && list && navbar) {
        const closeMenu = () => {
            list.classList.remove('open');
            list.querySelectorAll('.dropdown.open').forEach(dropdown => {
                dropdown.classList.remove('open');
                const disclosure = dropdown.querySelector(':scope > .nav-link');
                if (disclosure) disclosure.setAttribute('aria-expanded', 'false');
            });
            sync();
        };
        const sync = () => {
            const open = list.classList.contains('open');
            document.body.classList.toggle('nav-open', open);
            navbar.classList.toggle('menu-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
        };
        toggle.addEventListener('click', () => {
            list.classList.toggle('open');
            sync();
        });
        list.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
            if (a.parentElement.classList.contains('dropdown')) return;
            if (list.classList.contains('open')) {
                closeMenu();
            }
        }));
        document.addEventListener('click', e => {
            if (list.classList.contains('open') && !navbar.contains(e.target)) closeMenu();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && list.classList.contains('open')) {
                closeMenu();
                toggle.focus();
            }
        });
        watchMediaQuery(window.matchMedia('(min-width: 901px)'), e => {
            if (e.matches) {
                closeMenu();
            }
        });
    }

    /* Dropdown: mobilde dokunmayla aç */
    document.querySelectorAll('.dropdown > .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.matchMedia('(max-width: 900px)').matches) {
                const dropdown = link.parentElement;
                if (!dropdown.classList.contains('open')) {
                    e.preventDefault();
                    dropdown.classList.add('open');
                    link.setAttribute('aria-expanded', 'true');
                } else {
                    link.setAttribute('aria-expanded', 'false');
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

    /* ── Site Kapanış ve Aktiflik Takibi ── */
    let isInternalNavigation = false;

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;
        const href = link.getAttribute('href') || '';
        if (href.startsWith('/') || href.startsWith(location.origin)) {
            isInternalNavigation = true;
        }
    }, true);

    document.addEventListener('submit', () => {
        isInternalNavigation = true;
    }, true);

    fetch('/api/track/active', { method: 'POST', credentials: 'same-origin' }).catch(() => {});

    window.addEventListener('pagehide', () => {
        if (isInternalNavigation) return;
        navigator.sendBeacon('/api/track/exit');
    });
})();