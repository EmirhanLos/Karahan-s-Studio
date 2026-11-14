/* ═══════════════════════════════════════════════════════════════
   public/js/motion.js — Gelişmiş hareket motoru
   Kaydırma ilerlemesi · navbar davranışı · sayfa geçişi ·
   split-text · manyetik hover · 3D eğim · parallaks · sayaçlar ·
   özel imleç · yumuşak çapa kaydırması · hero blob takibi
   Tümü reduced-motion + özellik tespiti ile korunur; öğe
   yoksa sessizce atlanır.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    var doc = document;
    var w = window;
    var raf = w.requestAnimationFrame || function (cb) { return w.setTimeout(cb, 16); };
    var reduceMotion = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = w.matchMedia('(pointer: fine)').matches;
    var smallScreen = w.matchMedia('(max-width: 900px)').matches;

    function onReady(fn) {
        if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn);
        else fn();
    }

    /* ── Kaydırma ilerleme çubuğu ── */
    function scrollProgress() {
        var bar = doc.querySelector('.scroll-progress');
        if (!bar) return;
        var ticking = false;
        var paint = function () {
            ticking = false;
            var h = doc.documentElement;
            var max = h.scrollHeight - w.innerHeight;
            var y = h.scrollTop || doc.body.scrollTop || 0;
            var v = max > 0 ? (y / max) * 100 : 0;
            bar.style.setProperty('--progress', v.toFixed(2) + '%');
        };
        var schedulePaint = function () {
            if (!ticking) { ticking = true; raf(paint); }
        };
        w.addEventListener('scroll', schedulePaint, { passive: true });
        w.addEventListener('resize', schedulePaint, { passive: true });
        w.addEventListener('load', schedulePaint);
        paint();
    }

    /* ── Navbar: kaydırmada sabit kalır, yalnızca durum sınıfı güncellenir ── */
    function navbarScroll() {
        var nav = doc.querySelector('.navbar');
        if (!nav) return;
        var ticking = false;
        var update = function () {
            ticking = false;
            var y = w.pageYOffset || doc.documentElement.scrollTop || 0;
            nav.classList.toggle('is-scrolled', y > 12);
            nav.classList.remove('is-hidden');
        };
        var onScroll = function () {
            if (!ticking) { ticking = true; raf(update); }
        };
        w.addEventListener('scroll', onScroll, { passive: true });
        w.addEventListener('resize', onScroll);
        update();
    }

    /* ── Sayfa geçişi: yüklemede açılır, iç bağlantıda kapanıp gider ── */
    function pageTransition() {
        var overlay = doc.querySelector('.page-transition');
        if (!overlay) return;
        if (reduceMotion || smallScreen) return;
        /* Görünmez güvenlik çubuğu: geri/ileri gezintisinde çift animasyonu önler */
        try { sessionStorage.removeItem('ks-transitioning'); } catch (e) {}
        w.setTimeout(function () { overlay.classList.add('is-done'); }, 800);
        w.addEventListener('pageshow', function (e) {
            if (e.persisted) overlay.classList.add('is-done');
        });

        doc.addEventListener('click', function (e) {
            if (e.defaultPrevented || e.button !== 0) return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            if (a.target && a.target !== '_self') return; /* yeni sekme */
            if (a.hasAttribute('download')) return;
            var href = a.getAttribute('href') || '';
            if (href.charAt(0) === '#') return;
            if (/^(mailto:|tel:|sms:|javascript:)/i.test(href)) return;
            try {
                var u = new URL(a.href, w.location.href);
                if (u.origin !== w.location.origin) return;
                if (u.hash && u.pathname === w.location.pathname) return;
            } catch (err) { return; }
            try {
                if (sessionStorage.getItem('ks-transitioning') === '1') {
                    w.location.href = a.href;
                    return;
                }
            } catch (err) {}
            e.preventDefault();
            try { sessionStorage.setItem('ks-transitioning', '1'); } catch (err) {}
            overlay.classList.remove('is-done');
            overlay.classList.add('is-leaving');
            w.setTimeout(function () { w.location.href = a.href; }, 200);
        });
    }

    /* ── Split-text: sözcük/harf aralıklı açılım ── */
    function splitText() {
        if (reduceMotion) return; /* metin olduğu gibi kalır */
        doc.querySelectorAll('[data-split]').forEach(function (el) {
            if (el.getAttribute('data-split-done') === '1') return;
            el.setAttribute('data-split-done', '1');
            var idx = 0;
            var walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
            var nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(function (node) {
                var text = node.nodeValue;
                if (!text || !text.trim()) return;
                var parts = text.split(/(\s+)/);
                var frag = doc.createDocumentFragment();
                parts.forEach(function (part) {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
                    var word = doc.createElement('span');
                    word.className = 'split-word';
                    Array.prototype.forEach.call(part, function (ch) {
                        if (ch === ' ') { word.appendChild(doc.createTextNode(' ')); return; }
                        var c = doc.createElement('span');
                        c.className = 'split-char';
                        c.style.setProperty('--i', String(idx++));
                        c.textContent = ch;
                        word.appendChild(c);
                    });
                    frag.appendChild(word);
                });
                node.parentNode.replaceChild(frag, node);
            });
            el.classList.add('is-split');
        });
    }

    /* ── Manyetik hover (data-magnetic + .btn-primary) ── */
    function magnetic() {
        if (reduceMotion || !finePointer || smallScreen) return;
        doc.querySelectorAll('[data-magnetic], .btn-primary').forEach(function (el) {
            if (el.getAttribute('data-magnetic-done') === '1') return;
            el.setAttribute('data-magnetic-done', '1');
            var power = 0.12;
            var mx = 0, my = 0, mq = false;
            el.addEventListener('pointerenter', function () { el.classList.add('is-magnetic'); });
            el.addEventListener('pointermove', function (e) {
                /* Her olayda ölçüm/yazma yerine tek rAF karesi */
                mx = e.clientX; my = e.clientY;
                if (mq) return;
                mq = true;
                raf(function () {
                    mq = false;
                    var r = el.getBoundingClientRect();
                    var tx = (mx - (r.left + r.width / 2)) * power;
                    var ty = (my - (r.top + r.height / 2)) * power;
                    el.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
                });
            });
            /* İmleçten ayrılınca yay gibi geri döner (CSS transition) */
            el.addEventListener('pointerleave', function () {
                el.classList.remove('is-magnetic');
                el.style.transform = '';
            });
        });
    }

    /* ── 3D eğim + parıltı (kartlar) ── */
    function tilt3d() {
        if (reduceMotion || !finePointer || smallScreen) return;
        var selector = '.project-card, .home-feature, .product-hero, .update-card, ' +
            '.upcoming-card, .feature-item, .admin-grid .stat-card';
        var active = null;
        var qx = 0, qy = 0, queued = false;
        var clear = function () {
            if (!active) return;
            active.classList.remove('is-tilting');
            active.style.transform = '';
            active = null;
        };
        doc.addEventListener('pointerover', function (e) {
            var target = e.target && e.target.closest ? e.target.closest(selector) : null;
            if (!target || target === active) return;
            clear();
            active = target;
            active.classList.add('is-tilting');
        });
        doc.addEventListener('pointerout', function (e) {
            if (active && !active.contains(e.relatedTarget)) clear();
        });
        doc.addEventListener('pointermove', function (e) {
            if (!active) return;
            qx = e.clientX;
            qy = e.clientY;
            if (queued) return;
            queued = true;
            raf(function () {
                queued = false;
                if (!active) return;
                var r = active.getBoundingClientRect();
                if (!r.width || !r.height) return;
                var px = (qx - r.left) / r.width;
                var py = (qy - r.top) / r.height;
                var rx = (0.5 - py) * 3;
                var ry = (px - 0.5) * 3;
                active.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)';
                active.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
                active.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
            });
        });
    }

    /* ── Paralaks (hero görseli + soyut şekiller) ── */
    function parallax() {
        if (reduceMotion) return;
        var targets = doc.querySelectorAll('.hero-visual, .feature-art-shape, .studio-art-top, .studio-art-bottom, .studio-art-mark');
        if (!targets.length) return;
        var ticking = false;
        var paint = function () {
            ticking = false;
            var vh = w.innerHeight;
            targets.forEach(function (el) {
                var r = el.getBoundingClientRect();
                if (r.bottom < 0 || r.top > vh) return;
                var rel = (r.top + r.height / 2 - vh / 2) / vh; /* -0.5 … 0.5 */
                var speed = el.classList.contains('hero-visual') ? 0.07 : 0.13;
                el.style.transform = 'translateY(' + (rel * -speed * 100).toFixed(1) + 'px)';
            });
        };
        var onScroll = function () {
            if (!ticking) { ticking = true; raf(paint); }
        };
        w.addEventListener('scroll', onScroll, { passive: true });
        w.addEventListener('resize', onScroll);
        paint();
    }

    /* ── Animasyonlu sayaçlar (data-count ve .stat-number) ── */
    function counters() {
        var els = doc.querySelectorAll('[data-count], .stat-number');
        if (!els.length) return;
        if (!('IntersectionObserver' in w)) {
            els.forEach(function (el) { el.textContent = el.getAttribute('data-count') || el.textContent; });
            return;
        }
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                obs.unobserve(el);
                var raw = el.hasAttribute('data-count')
                    ? el.getAttribute('data-count')
                    : (el.textContent || '').replace(/[^0-9.,]/g, '');
                var target = parseFloat(raw) || 0;
                var dec = (raw.split('.')[1] || '').length;
                var out = function (v) {
                    el.textContent = dec ? v.toFixed(dec) : String(Math.round(v));
                };
                if (reduceMotion) { out(target); return; }
                var t0 = null;
                var dur = 1100;
                var step = function (ts) {
                    if (t0 === null) t0 = ts;
                    var p = Math.min(1, (ts - t0) / dur);
                    var eased = 1 - Math.pow(1 - p, 3);
                    out(target * eased);
                    if (p < 1) raf(step);
                };
                raf(step);
            });
        }, { threshold: 0.4 });
        els.forEach(function (el) { obs.observe(el); });
    }

    /* ── Yumuşak çapa kaydırması ── */
    function smoothAnchors() {
        if (!doc.querySelectorAll('a[href^="#"]').length) return;
        doc.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
            if (!a) return;
            var id = a.getAttribute('href');
            if (!id || id.length < 2) return;
            var target = doc.querySelector(id);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        });
    }

    /* ── Hero gradyan bloblarının fareyi hafifçe takibi ── */
    function heroMouse() {
        if (reduceMotion || !finePointer) return;
        var hero = doc.querySelector('.hero');
        if (!hero) return;
        var hx = 0, hy = 0, hq = false;
        hero.addEventListener('pointermove', function (e) {
            hx = e.clientX; hy = e.clientY;
            if (hq) return;
            hq = true;
            raf(function () {
                hq = false;
                var r = hero.getBoundingClientRect();
                hero.style.setProperty('--mx', (hx - r.left).toFixed(1) + 'px');
                hero.style.setProperty('--my', (hy - r.top).toFixed(1) + 'px');
            });
        }, { passive: true });
    }

    /* ── Ekranda olmayan sürekli animasyonları duraklat ── */
    function pauseOffscreen() {
        if (!('IntersectionObserver' in w)) return;
        var sel = '.art-orbit, .art-core, .hero-sticker, .feature-art-shape, .feature-art-star, .marquee-track, .hero';
        var obs = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                var t = en.target;
                if (t.classList.contains('hero')) {
                    t.classList.toggle('ks-anim-off', !en.isIntersecting);
                    t.style.animationPlayState = en.isIntersecting ? '' : 'paused';
                } else {
                    t.style.animationPlayState = en.isIntersecting ? 'running' : 'paused';
                }
            });
        }, { rootMargin: '80px' });
        doc.querySelectorAll(sel).forEach(function (el) { obs.observe(el); });
    }

    /* ── Başlat ── */
    onReady(function () {
        scrollProgress();
        navbarScroll();
        pageTransition();
        splitText();
        magnetic();
        tilt3d();
        parallax();
        counters();
        smoothAnchors();
        heroMouse();
        pauseOffscreen();
    });

    /* İsteğe bağlı dışarı açılan API */
    w.KSMotion = {
        reinit: function () { /* yer tutucu: modüller hazırda çalışır */ }
    };
})();
