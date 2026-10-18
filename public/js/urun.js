const { escapeHtml } = require('./layout');
const { iconSvg } = require('./icons');
const { renderCardGrid } = require('./cards');

function renderStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
        '<span class="stars" aria-hidden="true">' +
        '★'.repeat(full) +
        (half ? '½' : '') +
        '☆'.repeat(empty) +
        '</span>'
    );
}

function renderRatingWidget(project) {
    const avg   = project.rating      || 0;
    const count = project.ratingCount || 0;
    return `
    <div class="rating-section" id="ratingSection">
        <h2 class="product-h2">Bu Projeyi Puanla</h2>
        <div class="rating-current" id="ratingCurrent">
            <span class="stars" id="ratingStars">${avg > 0 ? '★'.repeat(Math.floor(avg)) + (avg - Math.floor(avg) >= 0.5 ? '½' : '') + '☆'.repeat(5 - Math.floor(avg) - (avg - Math.floor(avg) >= 0.5 ? 1 : 0)) : '☆☆☆☆☆'}</span>
            <span class="rating-value" id="ratingValue">${avg > 0 ? avg.toFixed(1) : '—'}</span>
            <span class="rating-count" id="ratingCount">(${count} değerlendirme)</span>
        </div>
        <div class="rating-stars-input" id="starInput" data-project-id="${escapeHtml(project.id)}">
            ${[1,2,3,4,5].map(n => `
            <button class="star-btn" data-value="${n}" aria-label="${n} yıldız" type="button">★</button>`).join('')}
        </div>
        <p class="rating-msg" id="ratingMsg"></p>
    </div>
    <script>
    (function() {
        const container   = document.getElementById('starInput');
        const msg         = document.getElementById('ratingMsg');
        const starsEl     = document.getElementById('ratingStars');
        const valueEl     = document.getElementById('ratingValue');
        const countEl     = document.getElementById('ratingCount');
        if (!container) return;
        const btns = container.querySelectorAll('.star-btn');
        const pid  = container.dataset.projectId;

        /* Yıldızları güncelle */
        function updateStarsDisplay(rating, ratingCount) {
            const full  = Math.floor(rating);
            const half  = (rating - full) >= 0.5 ? 1 : 0;
            const empty = 5 - full - half;
            starsEl.textContent = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
            valueEl.textContent = rating.toFixed(1);
            countEl.textContent = '(' + ratingCount + ' değerlendirme)';
            /* Buton renklerini de güncelle */
            btns.forEach((b, i) => {
                b.style.color = i < Math.round(rating) ? '#facc15' : '';
            });
        }

        /* Hover efekti */
        btns.forEach((btn, i) => {
            btn.addEventListener('mouseenter', () => {
                btns.forEach((b, j) => b.classList.toggle('hovered', j <= i));
            });
        });
        container.addEventListener('mouseleave', () => {
            btns.forEach(b => b.classList.remove('hovered'));
        });

        /* Tıklama → API → DOM güncelle */
        btns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const rating = Number(btn.dataset.value);
                try {
                    const res  = await fetch('/api/projects/' + pid + '/rate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rating })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        updateStarsDisplay(data.rating, data.ratingCount);
                        msg.textContent = 'Puanın kaydedildi!';
                        msg.className   = 'rating-msg rating-msg--ok';
                        btns.forEach(b => { b.disabled = true; b.style.cursor = 'default'; });
                    } else {
                        msg.textContent = data.error || 'Bir hata oluştu.';
                        msg.className   = 'rating-msg rating-msg--err';
                    }
                } catch {
                    msg.textContent = 'Bağlantı hatası.';
                    msg.className   = 'rating-msg rating-msg--err';
                }
            });
        });
    })();
    </script>`;
}


function renderUrun(project, similarProjects) {
    const isLive = project.status === 'Yayında';

    const featuresHtml  = project.features.map((f) => `
        <div class="feature-item">
            <span class="dot"></span>
            <span>${escapeHtml(f)}</span>
        </div>
    `).join('');

    const stackHtml     = project.stack.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('');
    const platformsHtml = project.platforms.map((p) => `<span class="chip">${escapeHtml(p)}</span>`).join('');

    // Fiyat gösterimi
    let priceHtml = '';
    const finalPrice = project.discount > 0
        ? project.price * (1 - project.discount / 100)
        : project.price;
    
    if (finalPrice > 0) {
        priceHtml = `
        <div>
            <span class="meta-label">Fiyat</span>
            <span class="meta-value">
                ${project.discount > 0
                    ? `<s class="price-old">${project.price.toLocaleString('tr-TR')}₺</s>
                       <span class="price-new">${finalPrice.toLocaleString('tr-TR', {maximumFractionDigits:2})}₺</span>
                       <span class="price-badge">-%${project.discount}</span>`
                    : `${project.price.toLocaleString('tr-TR')}₺`
                }
            </span>
        </div>`;
    } else {
        priceHtml = `
        <div>
            <span class="meta-label">Fiyat</span>
            <span class="meta-value">Ücretsiz</span>
        </div>`;
    }

    return `
    <main class="product-page">
        <div class="product-hero">
            <a class="back-link" href="/projeler">← Tüm projelere dön</a>
            <div class="product-badge">${iconSvg(project.icon, 30)}</div>
            <div class="detail-head">
                <span class="card-tag">${escapeHtml(project.category)}</span>
                <span class="card-status">
                    <span class="status-dot ${isLive ? 'status-dot--live' : ''}"></span>
                    ${escapeHtml(project.status)}
                </span>
            </div>
            <h1>${escapeHtml(project.name)}</h1>
            <p class="product-tagline">${escapeHtml(project.tagline)}</p>

            <div class="detail-meta">
                <div>
                    <span class="meta-label">Sürüm</span>
                    <span class="meta-value">${escapeHtml(project.version)}</span>
                </div>
                <div>
                    <span class="meta-label">Kategori</span>
                    <span class="meta-value">${escapeHtml(project.category)}</span>
                </div>
                <div>
                    <span class="meta-label">Yayın tarihi</span>
                    <span class="meta-value">${escapeHtml(project.date)}</span>
                </div>
                ${priceHtml}
            </div>

            <p class="lead">${escapeHtml(project.description)}</p>

            <div class="product-cta">
                ${finalPrice > 0
                    ? `<a href="/satin-al/${encodeURIComponent(project.id)}" class="btn-primary btn-buy">
                           Satın Al — ${project.discount > 0
                               ? `<s style="opacity:.6;font-weight:400">${project.price.toLocaleString('tr-TR')}₺</s>&nbsp;${finalPrice.toLocaleString('tr-TR',{maximumFractionDigits:2})}₺`
                               : `${project.price.toLocaleString('tr-TR')}₺`}
                       </a>`
                    : `<a href="/indir/${encodeURIComponent(project.id)}" class="btn-primary btn-download">📥 Ücretsiz İndir</a>`
                }
            </div>
        </div>

        <div class="product-section container">
            <h2 class="product-h2">Öne Çıkanlar</h2>
            <div class="feature-grid">${featuresHtml}</div>
        </div>

        <div class="product-section container">
            <h2 class="product-h2">Teknoloji</h2>
            <div class="chip-row">${stackHtml}</div>
        </div>

        <div class="product-section container">
            <h2 class="product-h2">Platformlar</h2>
            <div class="chip-row">${platformsHtml}</div>
        </div>

        <div class="product-section container">
            ${renderRatingWidget(project)}
        </div>

        ${similarProjects.length ? `
        <div class="product-section container related">
            <h2 class="product-h2">Benzer Projeler</h2>
            ${renderCardGrid(similarProjects, 'grid grid--three')}
        </div>` : ''}
    </main>`;
}

module.exports = { renderUrun };
