/* ═══════════════════════════════════════════════════════════════
   modules/admin/validation.js — Yönetim paneli girdi doğrulama.

   Buradaki doğrulayıcılar hem API rotaları hem de birim testleri
   tarafından kullanılır; bu yüzden modül bağımsız ve test edilebilir
   biçimde tutulur.

   Görsel adresi doğrulaması (isSafeImageUrl) kritik bir güvenlik
   sınırıdır: img src özniteliğine javascript: veya data: şeması
   verilirse tarayıcıda kod çalıştırma (XSS) mümkün olur. Yalnızca
   https:// ile başlayan mutlak adresler ve /images/ altındaki yerel
   yollar kabul edilir.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* İzin verilen görsel adresi şemaları. */
const SAFE_IMAGE_PREFIXES = ['https://', '/images/'];
const MAX_IMAGE_LENGTH = 2048;

/**
 * Görsel adresinin güvenli olup olmadığını kontrol eder.
 * @param {unknown} value
 * @returns {boolean}
 */
function isSafeImageUrl(value) {
    if (typeof value !== 'string') return false;
    const url = value.trim();
    if (!url || url.length > MAX_IMAGE_LENGTH) return false;
    return SAFE_IMAGE_PREFIXES.some(prefix => url.startsWith(prefix));
}

function requiredString(v) {
    return typeof v === 'string' && v.trim().length > 0;
}

const productValidate = (b) => {
    if (!requiredString(b.name)) return { ok: false, error: 'Ürün adı zorunlu' };
    const price = Number(b.price ?? 0), discount = Number(b.discount ?? 0), couponDiscount = Number(b.couponDiscount ?? 0);
    if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Fiyat sıfır veya daha büyük olmalı' };
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) return { ok: false, error: 'İndirim %0 ile %100 arasında olmalı' };
    if (!Number.isFinite(couponDiscount) || couponDiscount < 0 || couponDiscount > 100) return { ok: false, error: 'Kupon indirimi %0 ile %100 arasında olmalı' };
    if (b.image && !isSafeImageUrl(b.image)) return { ok: false, error: 'Görsel adresi geçersiz' };
    let file = null;
    if (b.file && typeof b.file === 'object' && !Array.isArray(b.file)) {
        const stored = String(b.file.stored || '');
        if (!/^[A-Za-z0-9._-]+$/.test(stored) || stored.includes('..')) return { ok: false, error: 'Ürün dosyası referansı geçersiz' };
        file = {
            name: String(b.file.name || stored).slice(0, 255),
            stored,
            size: Number(b.file.size) || 0,
            type: String(b.file.type || 'application/octet-stream').slice(0, 100),
            uploadedAt: b.file.uploadedAt || new Date().toISOString()
        };
    }
    return { ok: true, value: {
        name: b.name.trim(), category: b.category || 'Araç', status: b.status || 'Yayında',
        summary: b.summary || b.description || '', tagline: b.tagline || '', description: b.description || '',
        price, discount, image: b.image || '', couponCode: b.couponCode || '',
        couponDiscount, isFree: b.isFree === true || b.isFree === 'true', features: b.features || [], stack: b.stack || [],
        platforms: b.platforms || [], tags: b.tags || [], file
    } };
};

const upcomingValidate = (b) => {
    if (!requiredString(b.name)) return { ok: false, error: 'Ad zorunlu' };
    if (!['Yayınlandı', 'Geliştirmede'].includes(b.status || 'Geliştirmede')) {
        return { ok: false, error: 'Durum Yayınlandı veya Geliştirmede olmalı' };
    }
    const price = Number(b.price ?? 0);
    if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Fiyat sıfır veya daha büyük olmalı' };
    if (b.image && !isSafeImageUrl(b.image)) return { ok: false, error: 'Görsel adresi geçersiz' };
    return { ok: true, value: {
        name: b.name.trim(), status: b.status || 'Geliştirmede',
        description: b.description || '', launchDate: b.launchDate || '',
        price, image: b.image || '', featured: b.featured === true || b.featured === 'true'
    } };
};

module.exports = {
    SAFE_IMAGE_PREFIXES,
    MAX_IMAGE_LENGTH,
    isSafeImageUrl,
    requiredString,
    productValidate,
    upcomingValidate
};
