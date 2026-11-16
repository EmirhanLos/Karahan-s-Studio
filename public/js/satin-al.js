const { escapeHtml } = require('./layout');
/* Satın alma yapısı tek kaynaktan yönetilir:
   src/modules/public/product.js → renderCheckout */
const { renderCheckout } = require('../../src/modules/public/product');

/* Kart numarası, son kullanma tarihi ve CVV toplayan eski şablon
   kaldırıldı. Sitede güvenli çevrimiçi ödeme altyapısı olmadığı
   için ücretli ürünlerde checkout yapısı "ödeme henüz etkin değil,
   iletişime geçin" yönlendirmesi gösterir. */
function renderSatinAl(project) {
    const discounted = project.discount > 0
        ? project.price * (1 - project.discount / 100)
        : project.price;
    const isFree = discounted <= 0;

    if (!isFree) {
        return renderCheckout({
            id: project.id,
            name: project.name,
            category: project.category,
            summary: project.summary || project.tagline || '',
            price: project.price,
            discount: project.discount || 0,
            isFree: false
        });
    }

    return `
    <main>
        <div class="page-header">
            <a class="back-link" href="/urun/${escapeHtml(project.id)}">← Ürüne Dön</a>
            <span class="hero-eyebrow">Ücretsiz İndirme</span>
            <h1>${escapeHtml(project.name)}</h1>
        </div>
        <div class="checkout-wrap container">
            <div class="checkout-grid">
                <div class="checkout-summary">
                    <h2 class="checkout-section-title">Sipariş Özeti</h2>
                    <div class="order-item">
                        <span class="order-item-name">${escapeHtml(project.name)}</span>
                        <span class="order-item-version">${escapeHtml(project.version)}</span>
                    </div>
                    <div class="order-price-row order-total">
                        <span>Toplam</span>
                        <span><strong>Ücretsiz</strong></span>
                    </div>
                </div>

                <div class="checkout-form-wrap">
                    <h2 class="checkout-section-title">Ücretsiz İndirme</h2>
                    <div class="free-download-info">
                        <p>Bu ürün ücretsizdir. Ödeme bilgisi gerekmez.</p>
                        <p>İndirmek için aşağıdaki butona tıklayın.</p>
                    </div>
                    <a href="/indir/${escapeHtml(project.id)}" class="btn-checkout" role="button">📥 Ücretsiz İndir</a>
                </div>
            </div>
        </div>
    </main>`;
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
