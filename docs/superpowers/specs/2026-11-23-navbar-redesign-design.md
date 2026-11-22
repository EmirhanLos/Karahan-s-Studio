# Navbar Yeniden Tasarımı — "Cam Şerit"

**Tarih:** 2026-11-23
**Durum:** Onaylandı (kullanıcı, 2026-11-23)
**Kapsam:** `karahans.com` herkese açık sayfalarının üst navigasyonu

---

## 1. Amaç

Mevcut navbar görsel olarak kalabalık: yüzen kapsül, beş menü ikonu, ikonların altında üçüncül büyük-harf etiketler ve bir "lens" kırılma filtresi. Bu katmanlar sayfanın siyah tonunu ve tipografisini bastırıyor.

Hedef: **daha sade ve daha şık** bir navbar. Cam yüzey hissi korunur, ama ikon ve kırılma efekti gibi süslemeler kaldırılır; geriye sadece isim, yol ve eylem kalır.

## 2. Kararlar

| Konu | Karar |
|---|---|
| Yön | **B — Cam Şerit**: tam genişlik şerit, ılımlı cam, aktif durum dolu hap |
| Sağ taraf eylemi | **Tek eylem**: giriş yokken dolu beyaz "Giriş Yap"; giriş varken "Profil" metin linki |
| Mobil | **Sağdan açılan cam panel** (mevcut davranışın sadeleştirilmiş hâli) |
| Scroll | **Üstte saydam**, 12px kaydırınca cam zemin + ince alt kenarlık belirir |

## 3. Görsel spesifikasyon

### 3.1 Bar (desktop, ≥ 901px)

| Özellik | Değer |
|---|---|
| Yükseklik | 70px; `.is-scrolled` hâlinde 64px |
| Konum | `position: sticky; top: 0; z-index: 900` (değişmiyor) |
| Zemin (tepe) | saydam |
| Zemin (scrolled) | `rgba(8, 8, 11, .72)` + `backdrop-filter: blur(24px) saturate(1.6)` |
| Alt kenarlık | tepede saydam; scrolled'da `1px solid rgba(255,255,255,.07)` |
| Yatay iç boşluk | `max(24px, calc((100% - 1200px) / 2))` |
| Düzen | `display: flex; align-items: center; gap: 32px` |

### 3.2 Marka (sol)

- Monogram: 30×30 px, `border-radius: 9px`, `background: linear-gradient(135deg, #ffffff, #a1a1aa)`, renk `#050507`, `font-weight: 800`
- Wordmark: `karahan's`, 1.1rem, `font-weight: 700`, `letter-spacing: -.03em`
- Wordmark içindeki `’s` parçası: `--c-subtle` (`#a1a1aa`)

### 3.3 Menü linkleri

- Yazı tipi: 0.875rem, `font-weight: 500`, renk `--c-subtle` (`#a1a1aa`)
- Hover: `--c-text` (`#f4f4f5`)
- Aktif: `--c-text`, `font-weight: 600`, `background: rgba(255,255,255,.09)`, `border-radius: 999px`, `padding: 8px 14px`
- **İkon yok.** Linkler yalnızca metin.
- "Projeler" öğesi: metin + 9px `▾` işareti (`opacity: .6`)

### 3.4 Eylem (sağ)

- Giriş yokken: `Giriş Yap` — `background: #fff`, `color: #050507`, `border-radius: 999px`, `padding: 9px 20px`, 0.85rem / 700; hover `background: #d4d4d8`
- Giriş varken: `Profil` — normal bir metin linki (`/profil`); dolu-hap stili **yalnızca** `/profil` sayfasındayken görünür

### 3.5 "Projeler" açılır listesi

- Tetikleyici: masaüstünde hover + tıklama; mobilde yalnızca tıklama
- Panel: `min-width: 280px`, `background: rgba(20,20,24,.86)` + blur, `border: 1px solid rgba(255,255,255,.1)`, `border-radius: 16px`, `box-shadow: var(--sh-3)`
- Öğeler: ürün adı + kategori rozeti (mevcut davranış korunur)

### 3.6 Mobil (≤ 900px)

- Bar: tam genişlik şerit, `padding: 8px 14px`, alt kenarlık
- Marka: monogram + küçük wordmark
- Hamburger: 44×44 px dokunma hedefi; 3 çizgi, açıkken X'e dönüşür
- Panel: `position: absolute; top: calc(100% + 10px); right: 0`, `width: min(340px, calc(100vw - 28px))`, `background: rgba(9,9,12,.9)` + `blur(28px)`, `border: 1px solid rgba(255,255,255,.14)`, `border-radius: 22px`
- Panel içi linkler: tam genişlik, `min-height: 48px`, `border-radius: 14px`; aktif link ince cam zemin + beyaz metin
- "Giriş Yap": panelin altında tam genişlik dolu beyaz buton
- Kapanma: Escape, panel dışına tıklama, 900px üstüne geçiş

## 4. Erişilebilirlik

- `<header class="navbar" role="banner">` ve `<nav aria-label="Birincil gezinme">` korunur
- Aktif linke `aria-current="page"` eklenir
- Dropdown tetikleyicisinde `aria-expanded` ve `aria-controls` senkron tutulur
- Hamburger'da `aria-expanded`, `aria-controls`, `aria-label` (aç/kapa) güncellenir
- `:focus-visible` → 2px `rgba(255,255,255,.55)` halka, 2px offset
- `prefers-reduced-motion: reduce` → geçişler ve animasyonlar kapanır

## 5. Silinenler

| Öğe | Aksiyon |
|---|---|
| `public/css/nav-lens.css` | **Dosya silinir**; `layout.js` içindeki `<link>` referansı kaldırılır |
| `public/js/nav.js` — lens yay animasyonu (~180 satır) | Silinir; kalan mobil menü / dropdown / 2FA / slider mantığı korunur |
| `src/modules/public/layout.js` — `NAV_ICONS`, lens SVG filtresi, `.nav-lens` span | Silinir |
| `public/css/liquid-glass.css` — `.navbar*`, `.nav-link*`, `.logo*`, `.nav-toggle*` blokları | Silinir; dosyanın kart/buton cam yüzeyleri korunur |
| `public/css/style.css` §8 Navigasyon | Yeni tasarımla değiştirilir |
| `public/css/mobile.css` navbar bloğu | Yeni mobil kurallarla değiştirilir |
| `public/js/layout.js` — ölü `renderNav` / `renderFooter` / `renderPage` | Silinir (ikinci, eski navbar). `escapeHtml`, `asset`, `assetVersion`, `sortedProjects` korunur — bunları kullanan 11 dosya var |
| `public/js/motion.js` — `is-hidden` yönetimi | Silinir; `is-scrolled` mantığı korunur |

**Kapsam dışı:** `public/assets/css/style.css` (yüklenmeyen eski kopya) silinmiyor.

## 6. Etkilenen dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/modules/public/layout.js` | `renderHeader()` yeniden yazılır; `NAV_ICONS` ve lens markupları silinir; `nav-lens.css` `<link>`i kaldırılır; `ICONS` içinden kullanılmayan `sun`/`moon`/`sys` temizlenir |
| `public/css/style.css` | §8 Navigasyon bloğu yeniden yazılır; §26–§29b'deki navbar'a ait parçalar güncellenir |
| `public/css/liquid-glass.css` | Navbar'a ait tüm bloklar çıkarılır |
| `public/css/mobile.css` | Navbar mobil bloğu yeniden yazılır |
| `public/css/nav-lens.css` | Silinir |
| `public/js/nav.js` | Lens animasyonu ve `is-scrolled` dışı navbar kodu silinir; dropdown/mobil menü korunur |
| `public/js/motion.js` | `is-hidden` yönetimi kaldırılır |
| `public/js/layout.js` | Ölü `renderNav`/`renderFooter`/`renderPage` silinir |

## 7. Doğrulama

1. `node --test` — 4 test dosyası (`data-store`, `firebase-auth`, `product-checkout`, `security`) yeşil kalmalı
2. Manuel kontrol genişlikleri: 1440, 1024, 900, 390
3. Kontrol noktaları: aktif link durumu, dropdown açılıp kapanması, mobil panel, scroll'da cam geçişi, giriş/giriş yapmış navbar farkı
4. `grep -ri "nav-lens\|NAV_ICONS\|nav-tab-label"` → kalıntı olmamalı. Admin panelinin kendi `admin-nav` sınıfları bu taramadan muaftır ve değiştirilmez.

## 8. Riskler

| Risk | Azaltma |
|---|---|
| `liquid-glass.css` ve `mobile.css` navbar kuralları gözden kaçar, eski görünüm artıkları kalır | Uygulama sonrası `grep` taraması + dört genişlikte görsel doğrulama |
| `public/js/layout.js` silinen export'ları bekleyen dosya var | `escapeHtml`/`asset`/`assetVersion` korunur; 11 çağıran dosya `node --test` ve sayfa yüklemesiyle doğrulanır |
| Sticky bar + `backdrop-filter` performansı | Blur yalnızca scrolled hâlinde aktif; mobilde `blur` zaten düşük maliyetli alanlarda sınırlı |
