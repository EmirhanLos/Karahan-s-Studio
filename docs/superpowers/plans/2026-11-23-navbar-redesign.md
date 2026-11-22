# Navbar Yeniden Tasarımı ("Cam Şerit") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Herkese açık sayfaların üst navigasyonunu; ikon, "lens" kırılma efekti ve yüzen kapsül kalabalığından arındırıp tam genişlik, yalnızca metin linklerden oluşan sade bir cam şerite dönüştürmek.

**Architecture:** Navbar sunucu tarafında `src/modules/public/layout.js` içindeki `renderHeader()` ile HTML olarak üretilir; görsel katman `public/css/style.css` §8'de tanımlanır, `public/css/liquid-glass.css` ve `public/css/mobile.css` yalnızca mobil/erişilebilirlik katkıları verir. Etkileşim `public/js/nav.js` ile yönetilir; sayfa kaydırma durumu `public/js/motion.js` tarafından `.is-scrolled` sınıfıyla bildirilir.

**Tech Stack:** Node.js 22 (CommonJS), Express 4, sunucu tarafı HTML şablonlama, sade CSS (değişken tabanlı), bağımlılıksız vanilla JS, `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-11-23-navbar-redesign-design.md`

## Global Constraints

- Tüm metinler Türkçe; kod yorumları da Türkçe olmaya devam eder.
- Renkler mevcut tokenlardan gelir: `--c-canvas #020203`, `--c-text #f4f4f5`, `--c-muted #d4d4d8`, `--c-subtle #a1a1aa`, `--c-accent-soft rgba(255,255,255,.08)`.
- Menü ikonu, `nav-icon`, `nav-tab-label`, `nav-lens` sınıfları projede **tamamen yok olmalı**.
- Admin panelinin `admin-nav` / `admin-nav-link` sınıfları bu işin kapsamı dışındadır, değiştirilmez.
- Yeni bağımlılık eklenmez. Build adımı yoktur — CSS/JS doğrudan `public/` altından servis edilir.
- Mevcut çalışma ağacındaki kullanıcı değişiklikleri (`git status`'teki `M` dosyalar) bu iş kapsamında değildir; yalnızca bu planın adı geçen dosyalara dokunulur ve commit edilir.
- `public/assets/css/style.css` silinmez (kapsam dışı, hiçbir sayfada yüklenmiyor).
- Test komutu: `node --test` (proje kökünde). Mevcut 4 test dosyası (`data-store`, `firebase-auth`, `product-checkout`, `security`) yeşil kalmalıdır.
- Dosya satır sonu: CRLF (Windows). Düzenleme araçları korur; `write`/`edit` ile yazarken mevcut dosyanın satır sonunu değiştirme.

---

## Dosya Haritası

| Dosya | Sorumluluk | Bu işteki durum |
|---|---|---|
| `src/modules/public/layout.js` | Sayfa kabuğu: `<header>` markup'ı, SEO meta, footer | `renderHeader()` yeniden yazılır; `NAV_ICONS` ve lens SVG'si silinir; `nav-lens.css` `<link>`i kaldırılır |
| `public/css/style.css` | Sitenin temel stil katmanı | §8 Navigasyon bloğu yeni tasarımla değiştirilir; `--nav-h` 72px → 70px; §26/§27/§29b navbar parçaları güncellenir |
| `public/css/liquid-glass.css` | Tüm site için "cam" skin override'ları | Navbar'a ait ~20 blok kaldırılır; kart/buton/tablo cam yüzeyleri **korunur** |
| `public/css/mobile.css` | Küçük ekran + iOS uyumluluk katmanı | Navbar mobil bloğu yeniden yazılır |
| `public/css/nav-lens.css` | Yalnızca lens kırılma filtresi | **Dosya silinir** |
| `public/js/nav.js` | Mobil menü, dropdown, 2FA, slider | Lens yay animasyonu (~180 satır) silinir; `nav-open` sınıfı `body`'ye taşınır |
| `public/js/motion.js` | Scroll/sayfa geçişi animasyonları | `is-hidden` yönetimi kaldırılır |
| `public/js/layout.js` | **Ölü** legacy kabuk (`renderNav`/`renderFooter`/`renderPage`) | Ölü navbar silinir; `escapeHtml`/`asset`/`assetVersion`/`sortedProjects` korunur |
| `tests/navbar.test.js` | Navbar markup + kalıntı sözleşmesi testleri | **Yeni dosya** |

---

### Task 1: Navbar markup sözleşmesi + `renderHeader` yeniden yazımı

**Files:**
- Create: `tests/navbar.test.js`
- Modify: `src/modules/public/layout.js` (satır 26-96: `ICONS`, `NAV_ICONS`, `navItem`, `renderHeader`; satır 258: `nav-lens.css` `<link>`i)

**Interfaces:**
- Consumes: `data.projects()` (mevcut `src/data`), `url()`, `esc()` (`src/core/views`)
- Produces: `renderHeader(current = '', user = null) -> string` — değişmeyen imza, yeni markup. Sınıf adları: `.navbar`, `.logo`, `.logo-mark`, `.logo-name`, `.nav-toggle`, `.nav-links`, `.nav-links-inner`, `.nav-link`, `.nav-link.is-active`, `.nav-chevron`, `.dropdown`, `.dropdown-content`, `.nav-actions`, `.nav-cta`. `user` nesne ise profil linki, değilse giriş butonu basılır.

- [ ] **Step 1: Başarısız test dosyasını yaz**

`tests/navbar.test.js` olarak oluştur:

```js
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { renderHeader } = require('../src/modules/public/layout');

test('navbar menü ikonu ve lens katmanı içermez', () => {
    const html = renderHeader('home', null);
    for (const needle of ['nav-lens', 'nav-icon', 'nav-tab-label', 'nav-lens-filter']) {
        assert.equal(html.includes(needle), false, `beklenmeyen: ${needle}`);
    }
});

test('navbar yalnızca metin linkleri içerir', () => {
    const html = renderHeader('home', null);
    for (const label of ['Ana sayfa', 'Projeler', 'Güncellemeler', 'Stüdyo']) {
        assert.match(html, new RegExp('>' + label + '<'), `eksik link: ${label}`);
    }
});

test('aktif link aria-current="page" taşır ve tek tanedir', () => {
    const html = renderHeader('guncellemeler', null);
    assert.match(html, /class="nav-link is-active" aria-current="page">Güncellemeler/);
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
});

test('giriş yapmamış kullanıcıya giriş butonu gösterilir', () => {
    const html = renderHeader('home', null);
    assert.match(html, /class="nav-cta"[^>]*>Giriş Yap/);
    assert.equal(html.includes('/profil'), false);
});

test('giriş yapmış kullanıcıya profil linki gösterilir', () => {
    const html = renderHeader('home', { firstName: 'Emirhan' });
    assert.match(html, /href="\/profil"[^>]*>Profil/);
    assert.equal(html.includes('nav-cta'), false);
});

test('projeler açılır listesi aria öznitelikleriyle bağlı', () => {
    const html = renderHeader('home', null);
    assert.match(html, /aria-controls="projectsDropdown"/);
    assert.match(html, /id="projectsDropdown"/);
});
```

- [ ] **Step 2: Testin başarısız olduğunu doğrula**

Run: `node --test tests/navbar.test.js`
Expected: FAIL — "navbar menü ikonu ve lens katmanı içermez" testi `nav-lens` bulunduğu için başarısız olur; "yalnızca metin linkleri" testi de `>Ana sayfa<` bulamadığı için başarısız olur.

- [ ] **Step 3: `src/modules/public/layout.js` içinde `NAV_ICONS` ve `navItem` yerine yeni yardımcıları yaz**

`NAV_ICONS` sabitini (satır 43-50) ve `navItem` fonksiyonunu (satır 52-55) tamamen sil. Yerine şunları yaz:

```js
const NAV_CHEVRON = '<span class="nav-chevron" aria-hidden="true">▾</span>';

/* Tek bir menü bağlantısı. Aktif sayfa aria-current ile işaretlenir. */
function navLink({ href, label, active, current, suffix = '', attrs = '' }) {
    const isActive = active === current;
    const cls = `nav-link${isActive ? ' is-active' : ''}`;
    const currentAttr = isActive ? ' aria-current="page"' : '';
    return `<a href="${esc(url(href))}" class="${cls}"${currentAttr}${attrs}>${esc(label)}${suffix}</a>`;
}

function navItem(opts) {
    return `<li>${navLink(opts)}</li>`;
}
```

- [ ] **Step 4: `renderHeader` fonksiyonunu yeniden yaz**

`renderHeader` (satır 65-96) gövdesini şu hâle getir:

```js
function renderHeader(current = '', user = null) {
    const projectLink = navLink({
        href: '/projeler',
        label: 'Projeler',
        suffix: NAV_CHEVRON,
        active: current,
        current: 'projeler',
        attrs: ' aria-expanded="false" aria-controls="projectsDropdown"'
    });

    return `
    <header class="navbar" role="banner">
        <a class="logo" href="/" aria-label="${esc(SITE.shortName)} anasayfa">
            <span class="logo-mark">K</span><span class="logo-name">karahan<span>’s</span></span>
        </a>
        <button type="button" class="nav-toggle" id="navToggle" aria-label="Menüyü aç" aria-expanded="false" aria-controls="navList">${ICONS.menu}</button>
        <nav class="nav-links" id="navList" aria-label="Birincil gezinme">
            <ul class="nav-links-inner">
                ${navItem({ href: '/', label: 'Ana sayfa', active: current, current: 'home' })}
                <li class="dropdown">
                    ${projectLink}
                    <ul class="dropdown-content" id="projectsDropdown">${projectsDropdown()}</ul>
                </li>
                ${navItem({ href: '/guncellemeler', label: 'Güncellemeler', active: current, current: 'guncellemeler' })}
                ${navItem({ href: '/hakkinda', label: 'Stüdyo', active: current, current: 'hakkinda' })}
                ${user
                    ? navItem({ href: '/profil', label: 'Profil', active: current, current: 'profil' })
                    : '<li class="nav-actions"><a href="/giris" class="nav-cta">Giriş Yap</a></li>'}
            </ul>
        </nav>
    </header>`;
}
```

- [ ] **Step 5: Kullanılmayan tema ikonlarını `ICONS` içinden çıkar**

`ICONS` sabitinden `sun`, `moon` ve `sys` anahtarlarını sil (hiçbir yerde kullanılmıyor; navbar'da tema düğmesi yok).
Doğrulama: `grep -rn "ICONS\.\(sun\|moon\|sys\)" src public/js` → eşleşme olmamalı.

- [ ] **Step 6: `nav-lens.css` stil bağlantısını kaldır**

`renderPage` içindeki şu satırı sil:

```html
    <link rel="stylesheet" href="${esc(asset('/css/nav-lens.css'))}">
```

- [ ] **Step 7: Testin geçtiğini doğrula**

Run: `node --test tests/navbar.test.js`
Expected: PASS — 6 test de geçer.

- [ ] **Step 8: Tam test paketini çalıştır**

Run: `node --test`
Expected: PASS — 4 mevcut test dosyası + yeni `tests/navbar.test.js` yeşil.

- [ ] **Step 9: Commit**

```bash
git add tests/navbar.test.js src/modules/public/layout.js
git commit -m "feat(navbar): menüyü yalnızca metin linklere sadeleştir, lens markup'ını kaldır"
```

---

### Task 2: Çekirdek navbar CSS'i — `style.css` §8

**Files:**
- Modify: `public/css/style.css` — satır 91 (`--nav-h`), satır 710-859 (§8 navigasyon bloğunun navbar kısmı), satır 2269-2294 (§26 mobil çekmece), satır 2306-2320 (§26 dropdown), satır 2404 (§27), satır 2448-2453 (§29b)

**Interfaces:**
- Consumes: Task 1'in ürettiği sınıf adları (`.navbar`, `.logo`, `.nav-links-inner`, `.nav-link`, `.nav-chevron`, `.nav-cta`, `.nav-actions`, `.dropdown-content`)
- Produces: `.navbar.is-scrolled` durum sınıfı — `public/js/motion.js` bunu üretmeye devam eder.

- [ ] **Step 1: `--nav-h` değerini güncelle**

`public/css/style.css` satır 91'deki `--nav-h: 72px;` değerini `--nav-h: 70px;` yap.

- [ ] **Step 2: §8 Navigasyon bloğunu yeni tasarımla değiştir**

**Silinecek bloklar (içerikle eşleştir, satır numarasına güvenme):**
1. `/* ═══ 8. Navigasyon — cam, yapışkan, kaydırınca daralan ═══ */` başlığından `.nav-login:hover { … }` satırının sonuna kadar olan tüm bloklar (`.navbar`, `.navbar.is-scrolled`, `.navbar.is-hidden`, `.logo`, `.logo-mark`, `.logo-name`, `.nav-links`, `.nav-link`, `.nav-login` bloğu).
2. `/* Hamburger (mobil) */` yorumundan `.nav-toggle:hover { … }` satırına kadar olan blok.
3. `/* Açılır menü (Projeler) */` yorumundan `.dropdown-content .badge { font-size: 0.65rem; }` satırına kadar olan bloklar.

**Korunacak blok:** `.user-menu { position: relative; }` ve devamı (ayrı bir bileşen; navbar tasarımının parçası değil).

Silme sonrası başlığı `/* ═══ 8. Navigasyon — cam şerit ═══ */` olarak güncelle ve araya şu bloğu ekle:

```css
/* ═══ 8. Navigasyon — cam şerit ═══ */
.navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 960;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-5);
    height: var(--nav-h);
    padding-inline: max(24px, calc((100% - 1200px) / 2));
    background: transparent;
    border-bottom: 1px solid transparent;
    transition: height var(--dur-3) var(--ease-out),
                background var(--dur-2) var(--ease-out),
                border-color var(--dur-2) var(--ease-out);
}
/* Kaydırınca cam yüzey belirir; sayfa tepesinde bar saydam kalır. */
.navbar.is-scrolled {
    height: 64px;
    background: rgba(8, 8, 11, 0.72);
    -webkit-backdrop-filter: blur(24px) saturate(1.6);
    backdrop-filter: blur(24px) saturate(1.6);
    border-bottom-color: rgba(255, 255, 255, 0.07);
}

.logo {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--c-text);
    font-family: var(--ff-display);
    position: relative;
    z-index: 1;
    transition: transform var(--dur-3) var(--ease-spring);
}
.logo:hover { color: var(--c-text); }
.logo-mark {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: linear-gradient(145deg, #ffffff, #bfc0c6);
    color: #050507;
    font-weight: 800;
    font-size: 0.95rem;
    transition: transform var(--dur-3) var(--ease-spring);
}
.logo:hover .logo-mark { transform: translateY(-1px); }
.logo-name {
    font-weight: 700;
    font-size: 1.1rem;
    letter-spacing: -0.03em;
}
.logo-name span { color: var(--c-subtle); }

/* Ana menü */
.nav-links { display: flex; align-items: center; }
.nav-links-inner {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
}
.nav-links-inner > li { list-style: none; }

.nav-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--c-subtle);
    transition: color var(--dur-1), background var(--dur-1);
}
.nav-link:hover { color: var(--c-text); background: rgba(255, 255, 255, 0.05); }
.nav-link.is-active { color: var(--c-text); font-weight: 600; background: var(--c-accent-soft); }
.nav-chevron { font-size: 0.62em; opacity: 0.6; margin-left: -2px; }

/* Sağ taraf eylemi */
.nav-actions { margin-left: 8px; }
.nav-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 9px 20px;
    border-radius: 999px;
    background: #f4f4f5;
    color: #050507;
    font-size: 0.85rem;
    font-weight: 700;
    transition: background var(--dur-1), transform var(--dur-2) var(--ease-spring);
}
.nav-cta:hover { background: #d4d4d8; color: #050507; transform: translateY(-1px); }

/* Hamburger (mobil) */
.nav-toggle {
    display: none;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    color: var(--c-text);
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(255, 255, 255, 0.05);
    transition: border-color var(--dur-1), background var(--dur-1);
    z-index: 951;
}
.nav-toggle:hover { border-color: rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.09); }

/* Açılır menü (Projeler) */
.dropdown { position: relative; }
.dropdown-content {
    position: absolute;
    top: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%) translateY(8px);
    min-width: 280px;
    padding: 8px;
    background: rgba(20, 20, 24, 0.86);
    -webkit-backdrop-filter: blur(24px) saturate(1.5);
    backdrop-filter: blur(24px) saturate(1.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
    opacity: 0;
    visibility: hidden;
    transition: opacity var(--dur-2) var(--ease-out), transform var(--dur-2) var(--ease-out),
                visibility var(--dur-2);
    display: grid;
    gap: 2px;
    z-index: 902;
}
.dropdown-content.is-open, .dropdown.open > .dropdown-content {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}
/* Masaüstünde hover ile açılır; mobilde dokunma ile açılır (nav.js). */
.dropdown:hover > .dropdown-content {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}
.dropdown-content a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-2);
    padding: 10px 12px;
    border-radius: 10px;
    color: var(--c-text);
    font-size: 0.85rem;
    font-weight: 600;
    transition: background var(--dur-1), color var(--dur-1);
}
.dropdown-content a:hover { background: rgba(255, 255, 255, 0.07); color: var(--c-text); }
.dropdown-content .badge { font-size: 0.65rem; }

/* Klavye odağı */
.navbar a:focus-visible,
.navbar button:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.55);
    outline-offset: 2px;
}
```

- [ ] **Step 3: §26 responsive bloğundaki eski navbar kurallarını kaldır**

Önce `@media (max-width: 900px)` içindeki `:root { --nav-h: 64px; }` değerini `--nav-h: 60px;` yap.

Sonra satır 2269-2294 arasındaki blokları sil (`.nav-toggle { display: grid; }`, `.nav-links { … }`, `.nav-links.open`, `.nav-links li`, `.nav-links .nav-link`, `.nav-links .nav-link.is-active`, `.nav-logout`, `.nav-logout:hover`, `.nav-login`). `body.nav-open::before` karartma bloğunu (satır 2296-2304) **koru** — ancak `z-index: 945` değerini `z-index: 950` yap, çünkü navbar artık `z-index: 960` ile karartmanın üzerinde olmalı (aksi hâlde mobil menü karartmanın altında kalır).

Satır 2306-2320 arasındaki `.dropdown-content` bloklarını sil — mobil davranış `public/css/mobile.css` tarafından tanımlanacak. `.user-menu-list` bloğunu (satır 2322-2332) koru.

- [ ] **Step 4: §27 azaltılmış hareket bloğundan `.navbar.is-hidden` kuralını sil**

Satır 2404'teki `.navbar.is-hidden { transform: none; }` satırını sil.

- [ ] **Step 5: §29b mobil performans bloğunu yeni scroll davranışına uyarla**

Satır 2448-2453'teki `.navbar { … }` bloğunu şununla değiştir:

```css
    .navbar.is-scrolled {
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
        background: rgba(5, 5, 7, 0.92);
    }
```

- [ ] **Step 6: §27 azaltılmış hareket bloğuna navbar geçişlerini ekle**

§27'deki `@media (prefers-reduced-motion: reduce)` bloğuna şu kuralı ekle:

```css
    .navbar,
    .navbar .nav-links,
    .navbar .nav-link,
    .navbar .nav-cta {
        transition: none;
    }
    .navbar .nav-links { transform: none; }
    .navbar .nav-links.open { transform: none; }
```

- [ ] **Step 7: Sözdizimi kontrolü**

Run: `node -e "const fs=require('fs');const c=fs.readFileSync('public/css/style.css','utf8');let d=0;for(const ch of c){if(ch==='{')d++;if(ch==='}')d--;}console.log('brace balance',d)"`
Expected: `brace balance 0`

- [ ] **Step 8: Commit**

```bash
git add public/css/style.css
git commit -m "feat(navbar): cam şerit tasarımını style.css'e taşı"
```

---

### Task 3: Katman temizliği — `liquid-glass.css`, `mobile.css`, `nav-lens.css`

**Files:**
- Modify: `public/css/liquid-glass.css` — satır 37, 40-208, 335-349, 508-567, 588-601, 690-713, 817-883, 1088-1101, 1120-1128
- Modify: `public/css/mobile.css` — satır 73-277 (navbar bloğu), 436-452, 460-470
- Delete: `public/css/nav-lens.css`

**Interfaces:**
- Consumes: Task 2'nin tanımladığı navbar sınıfları
- Produces: `public/css/` içinde `.navbar` kurallarının **tek kaynağı** `style.css` olur; `mobile.css` yalnızca ≤900px ek kuralları taşır.

- [ ] **Step 1: `liquid-glass.css` içindeki navbar bloklarını sil**

Şu blokları tamamen sil:
- satır 40-59 `.navbar { … }`
- satır 61-75 `.navbar::after { … }`
- satır 93-102 `.navbar.is-scrolled { … }` ve `.navbar.is-hidden { … }`
- satır 104-114 `.logo`, `.logo-mark`, `.logo-name` kuralları
- satır 116-130 `.nav-links { … }`
- satır 131-138 `.nav-link, .nav-link.is-active { … }`
- satır 139-169 `.navbar .nav-links > ul > li`, `.navbar .nav-links > ul > li > .nav-link`, `.navbar .nav-icon`, `.nav-tab-label`
- satır 170-190 `.navbar .dropdown > .nav-link::after`, `.nav-link:hover`, `.nav-link.is-active`, `.nav-login` kuralları
- satır 191-196 `.nav-toggle { … }`
- satır 197-208 `.dropdown-content` / `.dropdown-content a` kuralları — **`.user-menu-list` ve `.user-menu-item` kuralları korunur**, `.dropdown-content` seçicileri listeden çıkarılır

Satır 77-91'deki ortak `::before` kuralında `.navbar::before,` seçicisini listeden çıkar (kural kalan seçicilerle devam eder).

- [ ] **Step 2: `liquid-glass.css` içindeki buton listesinden `.nav-login` çıkar**

Satır 335-341'deki `.btn-primary, .btn-light, .nav-login { … }` kuralından `.nav-login,` satırını sil; satır 342-349'daki `.btn-primary:hover, .btn-light:hover, .nav-login:hover { … }` kuralından `.nav-login:hover` satırını sil.

- [ ] **Step 3: `liquid-glass.css` §900 media query'sindeki navbar kurallarını sil**

Satır 508-567 bloğunda şunları sil: `.navbar { … }`, `.navbar.is-scrolled`, `.nav-links { … }`, `.navbar .nav-links > ul > li`, `.navbar .nav-links > ul > li > .nav-link`, `.navbar .nav-icon`, `.nav-tab-label`, `.navbar .dropdown > .nav-link::after`, `.nav-links .nav-link`, `.nav-links .nav-link.is-active`, `.nav-links .nav-login`, `.dropdown-content` bloğu.
`.site-shell > main { padding-top: 80px; }` satırını da sil (Task 3 Step 5'te ana boşluk yeniden tanımlanacak).
Kalan `.hero--studio { … }` kuralı korunur.

Satır 569-581'deki `@media (max-width: 640px)` bloğunda `.site-shell > main { padding-top: 76px; }` ve `.navbar .logo-name { font-size: 1.05rem; }` satırlarını sil.

- [ ] **Step 4: `liquid-glass.css` içindeki blur/gradyan listelerinden navbar'ı çıkar**

- Satır 588-601: `.navbar,` ve `.navbar.is-scrolled,` satırlarını listeden çıkar
- Satır 652-688 bloğundaki `.navbar,` ve `.navbar.is-scrolled,` satırlarını listeden çıkar
- Satır 690-694 bloğu (`… { background-color: rgba(5,5,7,0.12); }`) tamamen sil
- Satır 696-701 bloğundaki `.nav-links,` satırını listeden çıkar
- Satır 703-713 bloğundaki `.navbar::before,` satırını listeden çıkar
- Satır 817-826 bloğu (`… { transform: translateX(-50%) perspective(1200px) rotateX(1deg); … }` ve `.navbar.is-hidden`) tamamen sil
- Satır 832-842 bloğu (`.logo` / `.logo-name` hover kuralları) tamamen sil
- Satır 844-883 bloğu (lens ve `.nav-login` kuralları) tamamen sil
- Satır 1088-1101 bloğunda `.navbar .nav-link,`, `.navbar .nav-link::before,` ve `.logo-name,` seçicilerini listeden çıkar (`:is(…)` kapsayıcıları korunur)
- Satır 1120-1128 bloğunda `.navbar,` / `.navbar.is-scrolled { background-color: … }` ve `.nav-links { background-color: … }` kurallarını sil; `.dropdown-content` kurallarını sil

- [ ] **Step 5: Sabit bar için ana içeriğin üst boşluğunu tanımla**

`liquid-glass.css` satır 37'deki `.site-shell > main { padding-top: 88px; }` kuralını şununla değiştir:

```css
.site-shell > main { padding-top: var(--nav-h); }
```

- [ ] **Step 6: `mobile.css` navbar bloğunu yeniden yaz**

`mobile.css` satır 73-277 arasındaki navbar'a ait tüm kuralları sil (`.navbar, .navbar.is-scrolled`, `.navbar.is-hidden`, `.navbar .logo`, `.navbar .logo-name`, `.navbar .nav-toggle`, `.navbar .nav-links` bloğu, `.navbar .nav-links.open`, `.navbar .nav-links > ul > li`, `.navbar .nav-links > ul > li > .nav-link`, `:hover/:focus-visible`, `.is-active`, `.nav-login` kuralları, `.dropdown > .nav-link::after`, `.dropdown-content` bloğu, `.dropdown:not(.open)`, `.dropdown-content a`, `.badge`, `.nav-toggle svg line` morfları, `.user-menu-item`, `.nav-links .nav-login`, `.site-shell > main { padding-top: … }`).

`@media (max-width: 900px)` bloğunun içine şunları ekle:

```css
    html { scroll-padding-top: calc(var(--nav-h) + var(--safe-area-top)); }

    .site-shell > main { padding-top: calc(var(--nav-h) + var(--safe-area-top)); }

    .navbar,
    .navbar.is-scrolled {
        top: 0;
        right: 0;
        left: 0;
        width: auto;
        max-width: none;
        min-height: 60px;
        height: 60px;
        padding: 8px max(14px, var(--safe-area-left)) 8px max(14px, var(--safe-area-right));
        border-radius: 0;
    }

    .navbar.is-scrolled { height: 56px; }

    .navbar .logo { min-width: 0; gap: 9px; }
    .navbar .logo-name { font-size: 1rem; }

    .navbar .nav-toggle {
        display: grid;
        flex: none;
        width: 44px;
        height: 44px;
        min-width: 44px;
        min-height: 44px;
    }

    /* Menü paneli: bar'ın altından sağdan açılır */
    .navbar .nav-links {
        position: absolute;
        top: calc(100% + 10px);
        right: max(14px, var(--safe-area-right));
        bottom: auto;
        left: auto;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: min(340px, calc(100vw - 28px - var(--safe-area-left) - var(--safe-area-right)));
        height: auto;
        max-height: calc(100dvh - 92px - var(--safe-area-top) - var(--safe-area-bottom));
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 22px;
        background: rgba(9, 9, 12, 0.9);
        -webkit-backdrop-filter: blur(28px) saturate(1.6);
        backdrop-filter: blur(28px) saturate(1.6);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 24px 60px rgba(0, 0, 0, 0.58);
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transform: translateY(-8px);
        transition:
            opacity 180ms ease,
            transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
            visibility 180ms;
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain;
        touch-action: pan-y;
    }

    .navbar .nav-links.open {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: translateY(0);
    }

    .navbar .nav-links-inner {
        flex-direction: column;
        align-items: stretch;
        gap: 2px;
        width: 100%;
    }

    .navbar .nav-links-inner > li { width: 100%; }

    .navbar .nav-links-inner > li > .nav-link {
        width: 100%;
        min-height: 48px;
        justify-content: flex-start;
        padding: 12px 14px;
        border-radius: 14px;
        color: #d4d4d8;
        font-size: 0.95rem;
    }

    .navbar .nav-links-inner > li > .nav-link:hover,
    .navbar .nav-links-inner > li > .nav-link:focus-visible {
        color: #fff;
        background: rgba(255, 255, 255, 0.07);
    }

    .navbar .nav-links-inner > li > .nav-link.is-active {
        color: #fff;
        background: rgba(255, 255, 255, 0.09);
    }

    .navbar .nav-chevron { margin-left: auto; }

    .navbar .nav-actions {
        margin: 10px 0 0;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
    }

    .navbar .nav-cta {
        width: 100%;
        min-height: 46px;
        padding: 12px 16px;
    }

    /* Projeler listesi mobilde panel içinde açılır */
    .navbar .dropdown-content,
    .navbar .dropdown.open > .dropdown-content {
        position: static;
        display: grid;
        gap: 2px;
        width: auto;
        min-width: 0;
        margin: 3px 0 5px 12px;
        padding: 4px 0 4px 10px;
        border: 0;
        border-left: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 0;
        background: transparent;
        -webkit-backdrop-filter: none;
        backdrop-filter: none;
        box-shadow: none;
        opacity: 1;
        visibility: visible;
        transform: none;
    }

    .navbar .dropdown:not(.open) > .dropdown-content { display: none; }

    .navbar .dropdown-content a {
        min-height: 44px;
        padding: 9px 10px;
        color: #c4c4ca;
        border-radius: 12px;
    }

    .navbar .dropdown-content a:hover,
    .navbar .dropdown-content a:focus-visible {
        color: #fff;
        background: rgba(255, 255, 255, 0.07);
    }

    .navbar .dropdown-content .badge { display: none; }

    /* Hamburger → X dönüşümü */
    .navbar .nav-toggle svg line {
        transform-box: fill-box;
        transform-origin: center;
        transition: transform 180ms ease, opacity 140ms ease;
    }

    .navbar.menu-open .nav-toggle svg line:first-child { transform: translateY(6px) rotate(45deg); }
    .navbar.menu-open .nav-toggle svg line:nth-child(2) { opacity: 0; }
    .navbar.menu-open .nav-toggle svg line:last-child { transform: translateY(-6px) rotate(-45deg); }
```

Not: `.navbar` `position: fixed` olduğu için `top: calc(100% + 10px)` panel konumu bar'ın altına düşer.

- [ ] **Step 7: `mobile.css` §380 ve yatay mod kurallarını güncelle**

`mobile.css` satır 12'deki `html { scroll-padding-top: calc(76px + var(--safe-area-top)); }` değerini `calc(var(--nav-h) + 16px + var(--safe-area-top));` yap. Satır 68-71'deki `@media (max-width: 900px)` içindeki `scroll-padding-top: calc(72px + var(--safe-area-top));` değerini `calc(var(--nav-h) + var(--safe-area-top));` yap.

Satır 436-452'deki `@media (max-width: 380px)` bloğunda `.navbar, .navbar.is-scrolled { padding-inline: 8px; }` kuralını `padding-inline: 10px;` yap ve `.navbar .logo-mark { width: 34px; height: 34px; }` kuralını `width: 28px; height: 28px;` yap; `.navbar .nav-toggle` boyutunu `42px` yap.

Satır 460-470'deki yatay mod bloğunda `.navbar .nav-links { max-height: … }` değerini `calc(100dvh - 84px - var(--safe-area-top) - var(--safe-area-bottom))` yap.

- [ ] **Step 8: `nav-lens.css` dosyasını sil**

```bash
git rm public/css/nav-lens.css
```

- [ ] **Step 9: Sözdizimi kontrolü**

Run: `node -e "for (const f of ['public/css/style.css','public/css/liquid-glass.css','public/css/mobile.css']) { const c=require('fs').readFileSync(f,'utf8'); let d=0; for (const ch of c) { if(ch==='{')d++; if(ch==='}')d--; } console.log(f, d); }"`
Expected: her dosya için `0`

- [ ] **Step 10: Kalıntı taraması**

Run: `grep -rn "nav-lens\|nav-tab-label\|nav-icon\|nav-login" public/css/ src/`
Expected: eşleşme yok (public/assets/ altındaki ölü kopya hariç — tarama `public/css/` ve `src/` ile sınırlı).

- [ ] **Step 11: Commit**

```bash
git add public/css/liquid-glass.css public/css/mobile.css
git add -u public/css/nav-lens.css
git commit -m "refactor(navbar): katmanlardaki eski navbar kurallarını temizle, nav-lens.css'i sil"
```

---

### Task 4: JS temizliği — `nav.js` lens animasyonu, `motion.js` `is-hidden`

**Files:**
- Modify: `public/js/nav.js` — satır 26-71 (mobil menü bloğu), satır 73-251 (lens bloğu → silinir)
- Modify: `public/js/motion.js` — satır 46-63 (`navbarScroll`)

**Interfaces:**
- Consumes: Task 1'in ürettiği DOM (`#navToggle`, `#navList`, `.navbar`, `.dropdown > .nav-link`)
- Produces: `document.body.classList` üzerinde `nav-open` sınıfı (CSS'te `body.nav-open` ile eşleşir), `documentElement` üzerinde `nav-open` **kullanılmaz**.

- [ ] **Step 1: `nav.js` içindeki lens animasyonu bloğunu sil**

Satır 73'te başlayan `/* Spring-driven liquid-glass indicator for the fixed-width desktop tabs. */` yorumundan, satır 251'deki kapayan `}`'a kadar olan bloğu **tamamen** sil. Blok, `const navLinks = document.querySelector('.navbar .nav-links');` ile başlar ve `const lens = navLinks && navLinks.querySelector('.nav-lens');` satırını içerir.

Silme sonrası `nav.js` içinde `nav-lens`, `lens`, `canvas`, `feDisplacementMap` referansı kalmamalı.

- [ ] **Step 2: `nav.js` mobil menü bloğunda `nav-open` sınıfını `body`'ye taşı**

`sync` fonksiyonundaki şu satırı değiştir:

```js
        const sync = () => {
            const open = list.classList.contains('open');
            document.documentElement.classList.toggle('nav-open', open);
            navbar.classList.toggle('menu-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
        };
```

Yeni hâli:

```js
        const sync = () => {
            const open = list.classList.contains('open');
            document.body.classList.toggle('nav-open', open);
            navbar.classList.toggle('menu-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
        };
```

Gerekçe: CSS'te `body.nav-open { overflow: hidden; }` ve `body.nav-open::before` kuralları var; sınıf `html` üzerine konduğu için scroll kilidi hiç çalışmıyordu.

- [ ] **Step 3: `nav.js` dropdown bloğunu yeni markup ile eşleştir**

Mevcut dropdown bloğu `.dropdown > .nav-link` seçicisini kullanıyor ve yeni markup ile uyumlu. Değişiklik gerekmiyor.

Doğrulama: `grep -n "dropdown > .nav-link" public/js/nav.js` → eşleşme var.

Masaüstünde hover ile açılma **CSS ile** sağlanır (Task 2'de eklenen `.dropdown:hover > .dropdown-content` kuralı). Mobilde dokunma ile açılma mevcut JS mantığıyla korunur: `nav.js` yalnızca ≤900px genişlikte tıklamayı yakalar ve `preventDefault()` ile `.open` sınıfını değiştirir; masaüstünde tıklama normalde `/projeler` sayfasına gider.

Not: `public/js/nav.js` içindeki `watchMediaQuery(window.matchMedia('(min-width: 901px)'), …)` eşiği ile CSS'teki `@media (max-width: 900px)` eşiği aynı sınırı kullanır — değiştirilmez.

- [ ] **Step 4: `motion.js` içindeki `is-hidden` yönetimini kaldır**

`navbarScroll` fonksiyonundaki şu satırı sil:

```js
            nav.classList.remove('is-hidden');
```

Fonksiyonun kalan hâli:

```js
    function navbarScroll() {
        var nav = doc.querySelector('.navbar');
        if (!nav) return;
        var ticking = false;
        var update = function () {
            ticking = false;
            var y = w.pageYOffset || doc.documentElement.scrollTop || 0;
            nav.classList.toggle('is-scrolled', y > 12);
        };
        var onScroll = function () {
            if (!ticking) { ticking = true; raf(update); }
        };
        w.addEventListener('scroll', onScroll, { passive: true });
        w.addEventListener('resize', onScroll);
        update();
    }
```

- [ ] **Step 5: Sözdizimi kontrolü**

Run: `node --check public/js/nav.js && node --check public/js/motion.js`
Expected: çıktı yok, hata kodu 0.

- [ ] **Step 6: Commit**

```bash
git add public/js/nav.js public/js/motion.js
git commit -m "refactor(navbar): lens animasyonunu kaldır, mobil menü scroll kilidini düzelt"
```

---

### Task 5: Ölü ikinci navbar'ın silinmesi + kalıntı sözleşmesi testleri

**Files:**
- Modify: `public/js/layout.js` — `renderNav` (satır 58-144), `renderFooter` (146-190), `renderPage` (221-261), `navDropdownItems` (20-29), `navLink` (31-33), `getProfileAvatar` (36-47), `getProfileInitials` (49-56)
- Modify: `tests/navbar.test.js` — kalıntı taraması testlerini ekle

**Interfaces:**
- Consumes: `public/js/layout.js`'ten `escapeHtml`, `asset`, `assetVersion`, `sortedProjects` — bu dört export **korunur**; 11 dosya bunları kullanıyor (`admin.js`, `cards.js`, `home.js`, `iletisim.js`, `kayit.js`, `musteri.js`, `profile.js`, `satin-al.js`, `upcoming.js`, `updates.js`, `urun.js`).
- Produces: `public/js/layout.js` artık yalnızca yardımcı fonksiyonlar içerir.

- [ ] **Step 1: `public/js/layout.js` içindeki ölü fonksiyonları sil**

Şunları sil: `navDropdownItems`, `navLink`, `getProfileAvatar`, `getProfileInitials`, `renderNav`, `renderFooter`, `renderPage`.

Kalan dosya şu forma gelir:

```js
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// data/projects.json boş — gerçek veri projects.js'de
const projectsData = require('./projects');

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sortedProjects() {
    return [...projectsData].sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
}

/* ── Statik varlık sürümleme ──────────────────────────────────────
   CSS/JS dosyaları uzun süreli önbelleklenir (immutable gibi).
   Bu, dosya adında sürüm yoksa kullanıcıların 30 gün boyunca
   eski sürümü görmesine yol açar. Bu yüzden içerikten kısa bir
   hash üretip URL'ye ekliyoruz: içerik değişince adres de
   değişir, önbellek güvenle uzun kalır. */
const assetVersionCache = new Map();

function assetVersion(relPath) {
    if (assetVersionCache.has(relPath)) return assetVersionCache.get(relPath);
    let v = '1';
    try {
        /* __dirname = public/js ; kök = public */
        const rel = relPath.replace(/^\/+/, '');
        const buf = fs.readFileSync(path.join(__dirname, '..', rel));
        v = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
    } catch {
        /* Dosya yoksa sürüm etiketi olmadan sun */
    }
    assetVersionCache.set(relPath, v);
    return v;
}

/* v= yoksa sadece yol döndürür */
function asset(relPath) {
    return `${relPath}?v=${assetVersion(relPath)}`;
}

module.exports = { escapeHtml, sortedProjects, asset, assetVersion };
```

- [ ] **Step 2: Kalan çağıranların hâlâ çalıştığını doğrula**

Run: `node -e "['admin','cards','home','iletisim','kayit','musteri','profile','satin-al','upcoming','updates','urun'].forEach(m => require('./public/js/' + m + '.js')); console.log('all modules load')"`
Expected: `all modules load` (hata yok)

Not: `satin-al.js` `src/modules/public/product`'i gerektirir; bu modül DB'ye dokunmuyorsa sorun yoktur. Hata çıkarsa `sortedProjects`/`escapeHtml`/`asset` dışındaki bir importu silmemiş olup ilgili dosyayı hedefle.

- [ ] **Step 3: Kalıntı taraması testlerini ekle**

`tests/navbar.test.js` dosyasının başına şu iki import'u ekle:

```js
const fs = require('node:fs');
const path = require('node:path');
```

ve `const ROOT = path.join(__dirname, '..');` sabitini tanımla. Dosyanın sonuna şu testleri ekle:

```js
test('navbar katmanlarında eski süsleme kalıntısı yok', () => {
    const files = [
        'public/css/style.css',
        'public/css/liquid-glass.css',
        'public/css/mobile.css',
        'public/js/nav.js',
        'src/modules/public/layout.js'
    ];
    for (const file of files) {
        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
        for (const needle of ['nav-lens', 'nav-tab-label', 'nav-icon', 'NAV_ICONS', 'nav-login']) {
            assert.equal(content.includes(needle), false, `${file} içinde kalıntı: ${needle}`);
        }
    }
});

test('nav-lens.css silinmiş ve hiçbir yerden referans verilmiyor', () => {
    assert.equal(fs.existsSync(path.join(ROOT, 'public/css/nav-lens.css')), false);
    const layout = fs.readFileSync(path.join(ROOT, 'src/modules/public/layout.js'), 'utf8');
    assert.equal(layout.includes('nav-lens.css'), false);
});

test('eski ikinci navbar kaldırıldı', () => {
    const legacy = fs.readFileSync(path.join(ROOT, 'public/js/layout.js'), 'utf8');
    for (const needle of ['renderNav', 'renderFooter', 'nav-theme-btn', 'nav-profile-dropdown']) {
        assert.equal(legacy.includes(needle), false, `legacy layout.js içinde kalıntı: ${needle}`);
    }
    for (const needle of ['escapeHtml', 'asset', 'assetVersion', 'sortedProjects']) {
        assert.ok(legacy.includes(needle), `legacy layout.js exportu kayboldu: ${needle}`);
    }
});
```

- [ ] **Step 4: Testleri çalıştır**

Run: `node --test`
Expected: PASS — mevcut 4 dosya + `tests/navbar.test.js` (9 test) yeşil.

- [ ] **Step 5: Commit**

```bash
git add public/js/layout.js tests/navbar.test.js
git commit -m "refactor(navbar): ölü legacy kabuğu kaldır, kalıntı sözleşmesi testlerini ekle"
```

---

### Task 6: Görsel doğrulama ve geçici dosya temizliği

**Files:**
- Delete: `public/_nav-options.html`, `public/nav-directions.png`, `nav-directions.png` (repo kökü)
- Modify: yalnızca doğrulama sırasında tespit edilen CSS düzeltmeleri

**Interfaces:**
- Consumes: Task 1-5'in ürettiği navbar
- Produces: dört genişlikte doğrulanmış görünüm

- [ ] **Step 1: Testleri çalıştır**

Run: `node --test`
Expected: PASS — tüm testler yeşil.

- [ ] **Step 2: Sunucuyu başlat**

Run: `node src/server.js` (arka planda)
Expected: `http://localhost:3000` adresi çalışır durumda.

- [ ] **Step 3: Masaüstü 1440px kontrolü**

`http://localhost:3000` adresini 1440×900 pencerede aç ve ekran görüntüsü al.
Doğrulama noktaları:
- Bar tam genişlik, sayfa tepesinde saydam (hero arka planı bar'ın arkasında görünmeli)
- Menüde ikon yok; yalnızca "Ana sayfa / Projeler / Güncellemeler / Stüdyo" metinleri var
- Sağda tek bir dolu beyaz "Giriş Yap" butonu
- Sayfayı 200px kaydır → bar 64px'e küçülür, cam zemin + ince alt kenarlık belirir
- "Projeler" üzerine gel → açılır liste görünür

- [ ] **Step 4: Tablet 1024px kontrolü**

Pencereyi 1024×800 yap. Aynı masaüstü davranışı geçerli olmalı (kapsül yok, tam genişlik şerit).

- [ ] **Step 5: Mobil 390px kontrolü**

Pencereyi 390×844 yap. Doğrulama noktaları:
- Bar 60px, hamburger görünür, logoya marka görünür
- Hamburger'e bas → sağdan açılan cam panel açılır, linkler okunabilir, "Giriş Yap" panelin altında tam genişlik dolu beyaz
- Escape ile panel kapanır
- "Projeler"e bas → panel içinde ürün listesi açılır

- [ ] **Step 6: Giriş yapmış navbar kontrolü**

`/giris` sayfasından giriş yapılabiliyorsa giriş sonrası navbar'da "Giriş Yap" yerine "Profil" linki görünmeli. Giriş yapılamıyorsa `src/modules/public/layout.js` içindeki `renderHeader('home', { firstName: 'Emirhan' })` çağrısının çıktısını `node -e` ile incele ve "Profil" linkinin geldiğini doğrula.

- [ ] **Step 7: Tespit edilen düzeltmeleri yap**

Görsel kontrolde çıkan sorunları ilgili dosyada düzelt (çoğunlukla `public/css/style.css` ve `public/css/mobile.css` ölçü/hizalama değerleri). Her düzeltmeden sonra `node --test` çalıştır.

- [ ] **Step 8: Geçici mockup dosyalarını sil**

```bash
rm -- public/_nav-options.html public/nav-directions.png nav-directions.png
```

- [ ] **Step 9: Final doğrulama**

Run: `node --test`
Expected: PASS

Run: `grep -rn "nav-lens\|nav-tab-label\|nav-icon\|NAV_ICONS\|nav-login" public/css src public/js --include=*.css --include=*.js`
Expected: eşleşme yok

Run: `git status --short`
Expected: yalnızca plan kapsamındaki dosyalar; `docs/` altında spec + plan dosyaları.

- [ ] **Step 10: Son commit**

```bash
git add -A public/css public/js src/modules/public/layout.js tests/navbar.test.js
git commit -m "feat(navbar): cam şerit navbar'ı tamamla ve görsel doğrula"
```

---

## Doğrulama Özeti (tüm görevler sonunda)

| Kontrol | Komut | Beklenen |
|---|---|---|
| Test paketi | `node --test` | Tümü yeşil (4 mevcut dosya + 9 navbar testi) |
| CSS bütünlüğü | `node -e "... brace balance ..."` | Her dosya için `0` |
| JS söz dizimi | `node --check public/js/nav.js public/js/motion.js` | Hata yok |
| Eski süsleme kalıntısı | `grep -rn "nav-lens\|nav-tab-label\|nav-icon\|NAV_ICONS\|nav-login" public/css src public/js` | Eşleşme yok |
| Ölü dosya | `test ! -f public/css/nav-lens.css` | Başarılı |
| Görsel | 1440 / 1024 / 900 / 390 px ekran görüntüleri | Bar/menü/panel doğru görünür |
