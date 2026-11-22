/* ═══════════════════════════════════════════════════════════════
   modules/public/assets.js — İçerik hash'li varlık sürümleme & CDN desteği.
   style.css ve istemci betiklerinin sürümü içerik hash'inden üretilir;
   bu sayede önbellek (max-age=30 gün / 1 yıl immutable) ile birlikte
   dosya değiştiğinde tarayıcılar eski sürümü kullanmaz.
   CDN_URL tanımlı olduğunda varlık URL'leri doğrudan CDN üzerinden sunulur.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const fs   = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');
const cache = new Map();
const CDN_URL = (process.env.CDN_URL || '').trim().replace(/\/+$/, '');

function version(relPath) {
    let full;
    try {
        const cleanRel = relPath.split('?')[0].replace(/^\/+/, '');
        full = path.join(PUBLIC_DIR, cleanRel);
        const stat = fs.statSync(full);
        const cached = cache.get(cleanRel);
        if (cached?.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.tag;

        const buf  = fs.readFileSync(full);
        const tag = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
        cache.set(cleanRel, { tag, mtimeMs: stat.mtimeMs, size: stat.size });
        return tag;
    } catch (e) {
        cache.delete(relPath);
        return '1';
    }
}

function asset(relPath) {
    if (!relPath) return '';
    if (relPath.startsWith('http://') || relPath.startsWith('https://') || relPath.startsWith('//')) return relPath;
    const clean = relPath.startsWith('/') ? relPath : `/${relPath}`;
    const versioned = `${clean}?v=${version(clean)}`;
    return CDN_URL ? `${CDN_URL}${versioned}` : versioned;
}

function fullAssetUrl(relPath, baseOrigin = 'https://karahans.com') {
    if (!relPath) return '';
    if (relPath.startsWith('http://') || relPath.startsWith('https://')) return relPath;
    if (CDN_URL) return `${CDN_URL}${relPath.startsWith('/') ? '' : '/'}${relPath}`;
    const origin = (baseOrigin || 'https://karahans.com').replace(/\/+$/, '');
    return `${origin}${relPath.startsWith('/') ? '' : '/'}${relPath}`;
}

module.exports = { asset, version, fullAssetUrl, CDN_URL };
