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
            document.documentElement.classList.toggle('nav-open', open);
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

    /* Spring-driven liquid-glass indicator for the fixed-width desktop tabs. */
    const navLinks = document.querySelector('.navbar .nav-links');
    const lens = navLinks && navLinks.querySelector('.nav-lens');
    if (navLinks && lens) {
        const W = 104;
        const H = 62;
        const R = 31;
        const BEZEL = 26;
        const lensMap = navLinks.querySelector('.nav-lens-map');
        const desktop = window.matchMedia('(min-width: 901px)');
        const tabs = [...navLinks.querySelectorAll(':scope > ul > li > .nav-link')];
        const selectedTab = tabs.find(tab => tab.classList.contains('is-active')) || tabs[0];
        let displayedTab = selectedTab;
        let targetX = 0;
        let x = 0;
        let velocity = 0;
        let press = 0;
        let pressTarget = 0;
        let animationFrame = 0;

        const mapCanvas = document.createElement('canvas');
        mapCanvas.width = W;
        mapCanvas.height = H;
        const mapContext = mapCanvas.getContext('2d');
        if (desktop.matches && mapContext && lensMap) {
            const image = mapContext.createImageData(W, H);
            const pixels = image.data;
            const halfW = W / 2;
            const halfH = H / 2;
            for (let py = 0; py < H; py++) {
                for (let px = 0; px < W; px++) {
                    const dx = px + 0.5 - halfW;
                    const dy = py + 0.5 - halfH;
                    const qx = Math.abs(dx) - (halfW - R);
                    const qy = Math.abs(dy) - (halfH - R);
                    const ox = Math.max(qx, 0);
                    const oy = Math.max(qy, 0);
                    const depth = -(Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - R);
                    const index = (py * W + px) * 4;
                    let red = 128;
                    let green = 128;
                    if (depth > 0 && depth < BEZEL) {
                        const strength = Math.pow(1 - depth / BEZEL, 2);
                        let nx;
                        let ny;
                        if (qx > 0 || qy > 0) {
                            const length = Math.hypot(ox, oy) || 1;
                            nx = Math.sign(dx) * ox / length;
                            ny = Math.sign(dy) * oy / length;
                        } else if (qx > qy) {
                            nx = Math.sign(dx);
                            ny = 0;
                        } else {
                            nx = 0;
                            ny = Math.sign(dy);
                        }
                        red = 128 - 127 * nx * strength;
                        green = 128 - 127 * ny * strength;
                    }
                    pixels[index] = red;
                    pixels[index + 1] = green;
                    pixels[index + 2] = 128;
                    pixels[index + 3] = 255;
                }
            }
            mapContext.putImageData(image, 0, 0);
            lensMap.setAttribute('href', mapCanvas.toDataURL());
        }

        const tabX = tab => {
            const navRect = navLinks.getBoundingClientRect();
            const tabRect = tab.getBoundingClientRect();
            return Math.max(0, Math.min(
                tabRect.left - navRect.left + (tabRect.width - W) / 2,
                navLinks.clientWidth - W
            ));
        };
        const moveMobileLens = tab => {
            if (!tab || desktop.matches) return;
            displayedTab = tab;
            const navRect = navLinks.getBoundingClientRect();
            const tabRect = tab.getBoundingClientRect();
            const left = Math.max(0, tabRect.left - navRect.left);
            const top = Math.max(0, tabRect.top - navRect.top);
            lens.style.width = `${Math.min(tabRect.width, navLinks.clientWidth)}px`;
            lens.style.height = `${tabRect.height}px`;
            lens.style.transform = `translate3d(${left}px, ${top}px, 0)`;
            lens.classList.add('is-visible');
        };
        const animate = () => {
            animationFrame = 0;
            velocity += (targetX - x) * 0.12;
            velocity *= 0.78;
            x += velocity;
            press += (pressTarget - press) * 0.2;
            const stretch = Math.min(Math.abs(velocity) / 55, 0.5);
            const scaleX = (1 + stretch) * (1 + press * 0.12);
            const scaleY = (1 - stretch * 0.45) * (1 + press * 0.12);
            const overflow = (W * scaleX - W) / 2;
            const renderX = Math.max(overflow, Math.min(x, navLinks.clientWidth - W - overflow));
            lens.style.transform = `translate3d(${renderX}px, 0, 0) scale(${scaleX}, ${scaleY})`;

            if (Math.abs(targetX - x) > 0.1 || Math.abs(velocity) > 0.1 || Math.abs(pressTarget - press) > 0.01) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                x = targetX;
                velocity = 0;
                lens.style.transform = `translate3d(${x}px, 0, 0)`;
            }
        };
        const requestAnimation = () => {
            if (!animationFrame && desktop.matches) animationFrame = requestAnimationFrame(animate);
        };
        const moveTo = tab => {
            if (!tab || tab === displayedTab || !desktop.matches) return;
            displayedTab = tab;
            targetX = tabX(tab);
            requestAnimation();
        };

        if (selectedTab) {
            if (desktop.matches) {
                x = tabX(selectedTab);
                targetX = x;
                lens.style.transform = `translate3d(${x}px, 0, 0)`;
                lens.classList.add('is-visible');
            } else {
                moveMobileLens(selectedTab);
            }
        }

        navLinks.addEventListener('pointerover', event => {
            if (event.pointerType !== 'touch') moveTo(event.target.closest('.nav-link'));
        });
        navLinks.addEventListener('focusin', event => {
            const tab = event.target.closest('.nav-link');
            if (desktop.matches) moveTo(tab);
            else moveMobileLens(tab);
        });
        navLinks.addEventListener('pointerdown', () => {
            if (!desktop.matches) return;
            pressTarget = 1;
            requestAnimation();
        });
        navLinks.addEventListener('pointerdown', event => {
            if (desktop.matches || event.pointerType === 'mouse') return;
            const tab = event.target.closest('.nav-link');
            if (tab && navLinks.contains(tab)) moveMobileLens(tab);
        });
        window.addEventListener('pointerup', () => {
            pressTarget = 0;
            requestAnimation();
        });
        navLinks.addEventListener('pointerleave', () => moveTo(selectedTab));
        navLinks.addEventListener('focusout', event => {
            if (!navLinks.contains(event.relatedTarget)) {
                if (desktop.matches) moveTo(selectedTab);
                else moveMobileLens(selectedTab);
            }
        });
        navLinks.addEventListener('scroll', () => {
            if (!desktop.matches) moveMobileLens(displayedTab || selectedTab);
        }, { passive: true });
        window.addEventListener('resize', () => {
            if (desktop.matches) {
                lens.classList.toggle('is-visible', Boolean(selectedTab));
                lens.style.width = '';
                lens.style.height = '';
                targetX = tabX(displayedTab || selectedTab);
                x = targetX;
                velocity = 0;
                lens.style.transform = `translate3d(${x}px, 0, 0)`;
            } else {
                if (animationFrame) cancelAnimationFrame(animationFrame);
                animationFrame = 0;
                moveMobileLens(displayedTab || selectedTab);
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
})();
