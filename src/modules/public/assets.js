/* ═══════════════════════════════════════════════════════════════
   modules/public/assets.js — İçerik hash'li varlık sürümleme.
   style.css ve istemci betiklerinin sürümü içerik hash'inden üretilir;
   bu sayede önbellek (max-age=30 gün) ile birlikte dosya değiştiğinde
   tarayıcılar eski sürümü kullanmaz.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const fs   = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');
const cache = new Map();

function version(relPath) {
    let full;
    try {
        const cleanRel = relPath.replace(/^\/+/, '');
        full = path.join(PUBLIC_DIR, cleanRel);
        const stat = fs.statSync(full);
        const cached = cache.get(relPath);
        if (cached?.mtimeMs === stat.mtimeMs && cached.size === stat.size) return cached.tag;

        const buf  = fs.readFileSync(full);
        const tag = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
        cache.set(relPath, { tag, mtimeMs: stat.mtimeMs, size: stat.size });
        return tag;
    } catch (e) {
        cache.delete(relPath);
        return '1';
    }
}

function asset(relPath) {
    if (relPath.startsWith('http://') || relPath.startsWith('https://')) return relPath;
    return `${relPath}?v=${version(relPath)}`;
}

module.exports = { asset, version };
