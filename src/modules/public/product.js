/* ═══════════════════════════════════════════════════════════════
   modules/public/product.js — Tek ürün detay sayfası.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, money, date } = require('../../core/views');
const data = require('../../data');

function renderStars(rating = 0) {
    const full = Math.floor(rating);
    const empty = 5 - full;
    return '★'.repeat(full) + '☆'.repeat(empty);
}

function fileSize(bytes) {
    const n = Number(bytes) || 0;
    if (n <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = n, i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 1).replace('.', ',')} ${units[i]}`;
}

function getProductUpdates(product) {
    return [
        ...(product.updates || []),
        ...data.updates().filter(update => String(update.productId) === String(product.id))
    ].filter((update, index, all) => !update.id || all.findIndex(item => item.id && String(item.id) === String(update.id)) === index)
        .sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
}

function renderProduct(product, user = null) {
    if (!product) {
        return `
        <section class="container" style="padding-top:var(--sp-6)">
            <div class="empty-state" data-reveal>
                <h3>Proje bulunamadı</h3>
                <p>Aradığınız proje mevcut değil veya kaldırılmış olabilir.</p>
                <a class="btn btn-primary" href="/projeler">Tüm Projeler</a>
            </div>
        </section>`;
    }

    const finalPrice = product.isFree ? 0 : product.discount > 0
        ? product.price * (100 - product.discount) / 100
        : product.price;

    const isFree = finalPrice <= 0;

    const fileRef = (product.file && typeof product.file === 'object' && product.file.stored)
        ? product.file
        : ((typeof product.file === 'string' && product.file) ? product.file : (product.deviceFile || null));
    const notReleased = product.status === 'Yakında' || product.status === 'Geliştirmede';
    const downloadable = !!fileRef && !notReleased;

    const gallery = (product.screenshots || []).slice(0, 4);
    const heroImage = gallery[0] || product.image;
    const productUpdates = getProductUpdates(product);

    const platformsHtml = (product.platforms || []).map(platform => `<span class="chip">${esc(platform)}</span>`).join('');

    const userId = user ? String(user.id) : '';
    const purchased = userId && data.transactions().some(t =>
        t.type === 'income' && String(t.userId) === userId && String(t.productId) === String(product.id));
    const downloaded = userId && data.downloads().some(d =>
        String(d.userId) === userId && String(d.productId) === String(product.id));
    const canReview = !!(user && (purchased || downloaded));

    const reviews = data.reviews().filter(x => String(x.productId) === String(product.id))
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return `
    <article class="container" style="padding-top:var(--sp-6)">
        <header class="product-hero" data-reveal>
            <div class="row" style="gap:var(--sp-3);margin-bottom:var(--sp-3)">
                <span class="badge badge--brand">${esc(product.category || 'Araç')}</span>
                <span class="badge badge--neutral"><span class="status-dot ${product.status === 'Yayında' ? 'status-dot--live' : 'status-dot--beta'}"></span>${esc(product.status || '')}</span>
            </div>
            <h1>${esc(product.name)}</h1>
            <p class="product-tagline">${esc(product.tagline || product.summary || product.description || '')}</p>

            <div class="product-cta">
                ${isFree
                    ? (downloadable ? `<a class="btn btn-primary" href="/indir/${esc(product.id)}">İndir</a>` : '')
                    : `<a class="btn btn-primary" href="/satin-al/${esc(product.id)}">Satın Al · ${money(finalPrice)}</a>`}
                ${isFree && downloadable ? `<a class="btn btn-secondary" href="/indir/${esc(product.id)}">İndir</a>` : ''}
                ${product.liveUrl ? `<a class="btn btn-secondary" href="${esc(product.liveUrl)}" target="_blank" rel="noopener">Canlı</a>` : ''}
                <a class="btn btn-ghost" href="#features">Özellikler</a>
            </div>
            ${downloadable ? `<p class="text-subtle text-sm" style="margin-top:var(--sp-3)">İndirilecek dosya: <strong>${esc(typeof fileRef === 'string' ? fileRef : (fileRef.name || 'ürün dosyası'))}</strong>${typeof fileRef === 'object' && fileRef.size ? ` · ${fileSize(fileRef.size)}` : ''}</p>` : ''}
            ${product.couponCode ? `<div class="coupon-box"><span class="coupon-label">İndirim Kuponu</span> <strong class="coupon-code">${esc(product.couponCode)}</strong>${product.couponDiscount ? ` · ek %${esc(product.couponDiscount)} indirim` : ''}</div>` : ''}
            ${product.description ? `<p class="product-description">${esc(product.description)}</p>` : ''}
        </header>

        <section class="product-section" data-reveal>
            <div class="surface" style="padding:var(--sp-6)">
                <div style="aspect-ratio:16/7;background:var(--c-sunken);border-radius:var(--r-lg);overflow:hidden">
                    ${heroImage
                        ? `<img src="${esc(heroImage)}" alt="${esc(product.name)}" style="width:100%;height:100%;object-fit:cover" loading="lazy">`
                        : `<div class="slider-placeholder">${esc((product.name || 'P').charAt(0).toUpperCase())}</div>`}
                </div>
                ${gallery.length > 1 ? `
                <div class="row" style="margin-top:var(--sp-3);gap:var(--sp-3)">
                    ${gallery.slice(1).map(src => `
                        <div style="flex:1;aspect-ratio:4/3;background:var(--c-sunken);border-radius:var(--r-md);overflow:hidden">
                            <img src="${esc(src)}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy">
                        </div>`).join('')}
                </div>` : ''}
            </div>
        </section>

        <section id="features" class="product-section" data-reveal>
            <h2 style="margin-bottom:var(--sp-5)">Özellikler</h2>
            <div class="feature-grid">
                ${(product.features || []).map(f => {
                    // Düz metin ("Başlık | Açıklama" veya sadece "Başlık") ya da {title, description}
                    const t = typeof f === 'string' ? f : (f.title || '');
                    const d = typeof f === 'string' ? '' : (f.description || '');
                    const parts = String(t).split('|');
                    const title = (parts[0] || '').trim();
                    const desc = (parts[1] || d || '').trim();
                    return `
                    <article class="feature-item surface">
                        <h4>${esc(title)}</h4>
                        ${desc ? `<p>${esc(desc)}</p>` : ''}
                    </article>`;
                }).join('') || `
                    <p class="text-muted">Henüz özellik listesi eklenmedi.</p>`}
            </div>
        </section>

        ${(product.stack || []).length > 0 ? `
        <section class="product-section" data-reveal>
            <h2 style="margin-bottom:var(--sp-4)">Teknoloji</h2>
            <div class="chip-row">
                ${(product.stack || []).map(t => `<span class="chip">${esc(t)}</span>`).join('')}
            </div>
        </section>` : ''}

        ${(product.platforms || []).length > 0 ? `
        <section class="product-section" data-reveal>
            <h2 style="margin-bottom:var(--sp-4)">Platformlar</h2>
            <div class="chip-row">${platformsHtml}</div>
        </section>` : ''}

        <section class="product-section" id="rating" data-reveal>
            <div class="section-head" style="margin-bottom:var(--sp-4)">
                <div>
                    <p class="section-kicker">Topluluk Değerlendirmeleri</p>
                    <h2>Puanlar & Yorumlar</h2>
                </div>
            </div>

            <div class="rating-dashboard surface">
                <!-- Sol Taraf: Özet ve Dağılım Çubukları -->
                <div class="rating-overview">
                    <div class="rating-score-box">
                        <span class="rating-big-score" data-rating-value>${(product.rating || 0).toFixed(1)}</span>
                        <div class="stars rating-glow-stars" data-rating-stars>${renderStars(product.rating || 0)}</div>
                        <p class="rating-total-count"><strong data-rating-count>${product.reviewCount || 0}</strong> değerlendirme</p>
                        ${(product.rating || 0) >= 4 ? `<span class="badge badge--brand" style="margin-top:var(--sp-2)">★ Topluluk Önerisi</span>` : ''}
                    </div>

                    <div class="rating-breakdown" aria-label="Puan Dağılımı">
                        ${[5, 4, 3, 2, 1].map(starNum => {
                            const count = reviews.filter(r => Number(r.rating) === starNum).length;
                            const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : (starNum === 5 && (product.rating || 0) >= 4.5 ? 85 : (starNum === 4 ? 15 : 0));
                            return `
                            <div class="rating-bar-row">
                                <span class="rating-bar-label">${starNum} ★</span>
                                <div class="rating-bar-track">
                                    <div class="rating-bar-fill" style="width:${pct}%"></div>
                                </div>
                                <span class="rating-bar-pct">%${pct}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Sağ Taraf: Puan Verme Formu ya da Bilgilendirme -->
                <div class="rating-action-area">
                    ${canReview ? `
                    <div class="rating-form-card">
                        <h3>Deneyiminizi Puanlayın</h3>
                        <p class="text-subtle text-xs" style="margin-bottom:var(--sp-3)">Ürünü kullandınız; puanınız ve geri bildiriminiz diğer kullanıcılara yol gösterir.</p>
                        <form method="POST" action="/api/rate/${esc(product.id)}" data-rating-form class="rating-interactive-form">
                            <input type="hidden" name="rating" value="">
                            <div class="rating-picker-box">
                                <label class="form-label" style="font-weight:600">Puanınız:</label>
                                <div class="star-buttons-wrapper">
                                    <div class="star-buttons" role="radiogroup" aria-label="Puan verin">
                                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="star-btn" data-value="${n}" aria-label="${n} yıldız">★</button>`).join('')}
                                    </div>
                                    <span class="rating-hint-text" id="ratingHintText">Yıldız seçin</span>
                                </div>
                            </div>
                            <div class="form-group" style="margin-top:var(--sp-3)">
                                <label class="form-label">Yorumunuz (isteğe bağlı)</label>
                                <textarea name="comment" class="form-input" rows="3" placeholder="Ürün hakkında ne düşünüyorsunuz? Deneyiminizi paylaşın..."></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:var(--sp-3)">Değerlendirmeyi Gönder</button>
                            <p class="rating-msg" data-rating-message role="status" aria-live="polite" hidden></p>
                        </form>
                    </div>` : `
                    <div class="rating-gate-card">
                        <div class="rating-gate-icon">⭐</div>
                        <h3>Bu Ürünü Puanlayın</h3>
                        <p class="text-subtle text-sm">Doğrulanmış değerlendirme ekosistemi için yalnızca ürünü satın alan veya kütüphanesine ekleyen kullanıcılar puan verebilir.</p>
                        ${user
                            ? `<p class="badge badge--neutral" style="margin-top:var(--sp-2)">Ürünü indirerek veya satın alarak değerlendirme yapabilirsiniz.</p>`
                            : `<a href="/giris" class="btn btn-secondary btn-sm" style="margin-top:var(--sp-3)">Giriş Yaparak Değerlendir</a>`}
                    </div>`}
                </div>
            </div>

            <!-- Yorumlar Listesi -->
            <div class="rating-reviews-section">
                <div class="rating-reviews-header">
                    <h3>Kullanıcı Yorumları (${reviews.length})</h3>
                </div>
                ${reviews.length ? `
                <div class="reviews-list">
                    ${reviews.map(r => {
                        const initials = (r.userName || 'K').slice(0, 2).toUpperCase();
                        return `
                        <article class="review-item surface">
                            <div class="review-item-head">
                                <div class="review-user-info">
                                    <div class="review-avatar" aria-hidden="true">${esc(initials)}</div>
                                    <div>
                                        <div class="review-name-row">
                                            <strong>${esc(r.userName)}</strong>
                                            ${r.verified ? `<span class="badge badge--ok">Doğrulanmış</span>` : ''}
                                        </div>
                                        <time class="text-subtle text-xs">${date(r.date)}</time>
                                    </div>
                                </div>
                                <div class="review-item-stars" aria-label="${r.rating} / 5 yıldız">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                            </div>
                            ${r.comment ? `<p class="review-comment-text">${esc(r.comment)}</p>` : ''}
                        </article>`;
                    }).join('')}
                </div>` : `
                <div class="empty-state" style="padding:var(--sp-6);margin-top:var(--sp-4)">
                    <p class="text-subtle">Henüz kullanıcı yorumu yapılmamış. İlk değerlendiren siz olun!</p>
                </div>`}
            </div>
        </section>

        ${productUpdates.length > 0 ? `
        <section class="product-section" data-reveal>
            <h2 style="margin-bottom:var(--sp-4)">Güncellemeler</h2>
            <div class="updates-list">
                ${productUpdates.slice(0, 4).map(u => `
                    <article class="update-card surface">
                        <div class="update-card-left">
                            ${u.image
                                ? `<img src="${esc(u.image)}" alt="${esc(u.title || 'Güncelleme')}" loading="lazy">`
                                : `<div class="slider-placeholder">${esc((u.version || 'v').charAt(0).toUpperCase())}</div>`}
                        </div>
                        <div class="update-card-body">
                            <div class="update-meta-top">
                                <span class="badge badge--brand">v${esc(String(u.version || '').replace(/^v/i, ''))}</span>
                                <span class="update-date">${date(u.date || u.createdAt)}</span>
                            </div>
                            <h3 class="update-card-title">${esc(u.title || 'Güncelleme')}</h3>
                            <p class="update-card-desc">${esc(u.description || '')}</p>
                            <div class="update-card-foot">
                                <a class="btn btn-ghost btn-sm" href="/guncellemeler/${esc(product.id)}">Tümü</a>
                            </div>
                        </div>
                    </article>`).join('')}
            </div>
        </section>` : ''}
    </article>`;
}

function renderCheckout(product) {
    const finalPrice = product.isFree ? 0
        : product.discount > 0
            ? product.price * (100 - product.discount) / 100
            : product.price;
    const couponDiscount = product.couponDiscount || 0;
    const priceWithCoupon = couponDiscount > 0 ? finalPrice * (1 - couponDiscount / 100) : finalPrice;

    return `
    <section class="container checkout-page" style="padding-top:var(--sp-6);max-width:760px">
        <a class="text-link" href="/urun/${esc(product.id)}">← ${esc(product.name)} sayfasına dön</a>
        <header class="page-header" style="padding-bottom:var(--sp-4)">
            <p class="section-kicker">Sipariş özeti</p>
            <h1>Satın alma</h1>
            <p class="lead">${esc(product.name)} için ödeme bilgileri.</p>
        </header>
        <section class="surface" style="padding:clamp(20px,5vw,36px)" aria-labelledby="checkout-product">
            <div class="row" style="justify-content:space-between;align-items:flex-start;gap:var(--sp-4)">
                <div>
                    <span class="badge badge--neutral">${esc(product.category || 'Ürün')}</span>
                    <h2 id="checkout-product" style="margin-top:var(--sp-3)">${esc(product.name)}</h2>
                    <p class="text-muted">${esc(product.summary || product.tagline || '')}</p>
                </div>
                <strong style="font-size:clamp(1.25rem,4vw,1.75rem);white-space:nowrap">${money(priceWithCoupon)}</strong>
                ${couponDiscount > 0 ? `<span class="text-subtle" style="font-size:0.85rem">· kupon sonrası</span>` : ''}
            </div>
            ${product.discount > 0 && !product.isFree
                ? `<p class="text-subtle">Liste fiyatı: <s>${money(product.price)}</s> · %${esc(product.discount)} indirim uygulandı.</p>`
                : ''}
            ${product.couponCode ? `<div class="callout coupon-box" role="status" style="margin-top:var(--sp-4)"><strong>İndirim Kuponu</strong> <span class="coupon-code">${esc(product.couponCode)}</span>${couponDiscount > 0 ? ` · ek %${esc(couponDiscount)} indirim` : ''} ürün fiyatından düşülmüştür.</div>` : ''}
            <div class="callout" role="status" style="margin-top:var(--sp-4)">
                <strong>Güvenli çevrimiçi ödeme henüz etkin değil.</strong>
                <p style="margin:var(--sp-1) 0 0">Kart bilgilerinizi bu sitede paylaşmayın. Satın alma ve lisans seçenekleri için bizimle iletişime geçebilirsiniz.</p>
            </div>
            <div class="row" style="gap:var(--sp-3);margin-top:var(--sp-5)">
                <a class="btn btn-primary" href="/iletisim">Satın alma için iletişime geç</a>
                <a class="btn btn-ghost" href="/projeler">Projelere dön</a>
            </div>
        </section>
    </section>`;
}

module.exports = { renderProduct, renderCheckout, getProductUpdates };
