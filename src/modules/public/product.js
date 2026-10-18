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

function renderProduct(product) {
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

    const gallery = (product.screenshots || []).slice(0, 4);
    const heroImage = gallery[0] || product.image;
    const productUpdates = [
        ...(product.updates || []),
        ...data.updates().filter(update => String(update.productId) === String(product.id))
    ].filter((update, index, all) => !update.id || all.findIndex(item => item.id && String(item.id) === String(update.id)) === index)
        .sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));

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
                    ? `<a class="btn btn-primary" href="/indir/${esc(product.id)}">Ücretsiz İndir</a>`
                    : `<a class="btn btn-primary" href="/satin-al/${esc(product.id)}">Satın Al · ${money(finalPrice)}</a>`}
                ${product.liveUrl ? `<a class="btn btn-secondary" href="${esc(product.liveUrl)}" target="_blank" rel="noopener">Canlı</a>` : ''}
                <a class="btn btn-ghost" href="#features">Özellikler</a>
            </div>
            ${product.couponCode ? `<p class="text-subtle text-sm" style="margin-top:var(--sp-3)">İndirim kuponu: <strong>${esc(product.couponCode)}</strong>${product.couponDiscount ? ` · ek %${esc(product.couponDiscount)} indirim` : ''}</p>` : ''}
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
                ${(product.features || []).map(f => `
                    <article class="feature-item surface">
                        <h4>${esc(f.title || '')}</h4>
                        <p>${esc(f.description || '')}</p>
                    </article>`).join('') || `
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

        <section class="product-section" id="rating" data-reveal>
            <h2 style="margin-bottom:var(--sp-4)">Puanla</h2>
            <div class="rating-block surface" style="padding:var(--sp-6)">
                <div class="stars" data-rating-stars style="font-size:1.4rem;margin-bottom:var(--sp-3)">${renderStars(product.rating || 0)}</div>
                <p class="rating-value" data-rating-value>${(product.rating || 0).toFixed(1)} / 5</p>
                <p class="rating-count"><span data-rating-count>${product.reviewCount || 0}</span> değerlendirme</p>
                <form method="POST" action="/api/rate/${esc(product.id)}" data-rating-form style="margin-top:var(--sp-5);display:grid;gap:var(--sp-3);max-width:340px;margin-inline:auto">
                    <div class="form-group">
                        <label class="form-label">Puanın</label>
                        <select name="rating" class="form-input">
                            <option value="5">5 · Mükemmel</option>
                            <option value="4">4 · Çok iyi</option>
                            <option value="3">3 · İyi</option>
                            <option value="2">2 · Orta</option>
                            <option value="1">1 · Kötü</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Gönder</button>
                    <p class="rating-msg" data-rating-message role="status" aria-live="polite" hidden></p>
                </form>
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
                                <span class="badge badge--brand">v${esc(u.version || '')}</span>
                                <span class="update-date">${date(u.date || u.createdAt)}</span>
                            </div>
                            <h3 class="update-card-title">${esc(u.title || 'Güncelleme')}</h3>
                            <p class="update-card-desc">${esc(u.description || '')}</p>
                            <div class="update-card-foot">
                                <a class="btn btn-ghost btn-sm" href="/guncellemeler">Tümü</a>
                            </div>
                        </div>
                    </article>`).join('')}
            </div>
        </section>` : ''}
    </article>`;
}

module.exports = { renderProduct };
