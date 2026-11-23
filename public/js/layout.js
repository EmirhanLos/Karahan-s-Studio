const fs   = require('fs');
const path = require('path');

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
const crypto = require('crypto');
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
