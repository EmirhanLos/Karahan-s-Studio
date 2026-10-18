const { escapeHtml } = require('./layout');

function renderSatinAl(project) {
    const discounted = project.discount > 0
        ? project.price * (1 - project.discount / 100)
        : project.price;
    const finalPrice = discounted.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const origPrice  = project.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const isFree = discounted <= 0;

    return `
    <main>
        <div class="page-header">
            <a class="back-link" href="/urun/${escapeHtml(project.id)}">← Ürüne Dön</a>
            <span class="hero-eyebrow">${isFree ? 'Ücretsiz İndirme' : 'Satın Alma'}</span>
            <h1>${escapeHtml(project.name)}</h1>
        </div>
        <div class="checkout-wrap container">
            <div class="checkout-grid">

                <!-- Sipariş özeti -->
                <div class="checkout-summary">
                    <h2 class="checkout-section-title">Sipariş Özeti</h2>
                    <div class="order-item">
                        <span class="order-item-name">${escapeHtml(project.name)}</span>
                        <span class="order-item-version">${escapeHtml(project.version)}</span>
                    </div>
                    <div class="order-price-row">
                        <span>Ürün Fiyatı</span>
                        ${isFree 
                            ? `<span><strong>Ücretsiz</strong></span>`
                            : (project.discount > 0
                                ? `<span><s class="price-old">${origPrice}₺</s> <strong>${finalPrice}₺</strong></span>`
                                : `<span><strong>${finalPrice}₺</strong></span>`
                            )
                        }
                    </div>
                    ${project.discount > 0 && !isFree ? `
                    <div class="order-price-row order-discount">
                        <span>İndirim (%${project.discount})</span>
                        <span class="positive">−${(project.price - discounted).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})}₺</span>
                    </div>` : ''}
                    <div class="order-price-row order-total">
                        <span>Toplam</span>
                        <span><strong>${isFree ? 'Ücretsiz' : finalPrice + '₺'}</strong></span>
                    </div>
                </div>

                ${isFree ? `
                <!-- Ücretsiz indirme -->
                <div class="checkout-form-wrap">
                    <h2 class="checkout-section-title">Ücretsiz İndirme</h2>
                    <div class="free-download-info">
                        <p>Bu ürün ücretsizdir. Ödeme bilgisi gerekmez.</p>
                        <p>İndirmek için aşağıdaki butona tıklayın.</p>
                    </div>
                    <form method="POST" action="/satin-al/${escapeHtml(project.id)}/onayla" class="admin-form checkout-form">
                        <button type="submit" class="btn-checkout">
                            📥 Ücretsiz İndir
                        </button>
                    </form>
                </div>
                ` : `
                <!-- Ödeme formu -->
                <div class="checkout-form-wrap">
                    <h2 class="checkout-section-title">Ödeme Bilgileri</h2>
                    <form method="POST" action="/satin-al/${escapeHtml(project.id)}/onayla" class="admin-form checkout-form">
                        <div class="form-group">
                            <label>Kart Numarası</label>
                            <input type="text" name="cardNumber" placeholder="1234 5678 9012 3456"
                                maxlength="19" autocomplete="cc-number" required
                                oninput="formatCard(this)">
                        </div>
                        <div class="form-group">
                            <label>Kart Üzerindeki İsim</label>
                            <input type="text" name="cardHolder" placeholder="AD SOYAD"
                                autocomplete="cc-name" required>
                        </div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Son Kullanım (AA/YY)</label>
                                <input type="text" name="cardExpiry" placeholder="AA/YY"
                                    maxlength="5" autocomplete="cc-exp" required
                                    oninput="formatExpiry(this)">
                            </div>
                            <div class="form-group">
                                <label>CVV</label>
                                <input type="password" name="cvv" placeholder="•••"
                                    maxlength="4" autocomplete="cc-csc" required>
                            </div>
                        </div>
                        <div class="checkout-secure">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                                <path d="M12 2.5l7.5 3v6c0 5-3.2 8.7-7.5 10-4.3-1.3-7.5-5-7.5-10v-6l7.5-3z"
                                    stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                            </svg>
                            Ödeme bilgilerin güvendedir.
                        </div>
                        <button type="submit" class="btn-checkout">
                            ${finalPrice}₺ Öde
                        </button>
                    </form>
                </div>
                `}

            </div>
        </div>
    </main>

    <script>
    function formatCard(input) {
        let v = input.value.replace(/\\D/g,'').slice(0,16);
        input.value = v.replace(/(\\d{4})(?=\\d)/g,'$1 ');
    }
    function formatExpiry(input) {
        let v = input.value.replace(/\\D/g,'');
        if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4);
        input.value = v;
    }
    </script>`;
}

function renderSatinAlOnayla(project, orderId, isFree = false) {
    return `
    <main>
        <div class="checkout-success">
            <div class="success-icon">✓</div>
            <h1>${isFree ? 'Ücretsiz İndirme Tamamlandı!' : 'Satın Alma Tamamlandı!'}</h1>
            <p class="success-sub">${escapeHtml(project.name)} ${isFree ? 'başarıyla indirildi.' : 'başarıyla satın alındı.'}</p>
            ${!isFree ? `<p class="success-order">Sipariş No: <strong>#${escapeHtml(String(orderId))}</strong></p>` : ''}
            <div class="success-actions">
                <a href="/projeler" class="btn-primary">Projelere Dön</a>
                <a href="/urun/${escapeHtml(project.id)}" class="btn-secondary">Ürüne Git</a>
            </div>
        </div>
    </main>`;
}

function renderIndir(project) {
    return renderSatinAlOnayla(project, Date.now(), true);
}

module.exports = { renderSatinAl, renderSatinAlOnayla, renderIndir };
