/* ═══════════════════════════════════════════════════════════════
   core/login-lockout.js — Kaba kuvvet (brute-force) kilitleme.

   Sayaç bellekte (Map) tutulursa:
     · süreç yeniden başladığında kilitler sıfırlanır,
     · birden fazla instance arkasında paylaşılmaz,
     · saldırgan kısa bir restart ile sınırı aşabilir.

   Bu yüzden sayaçlar data/store.js üzerinden SQLite'ta saklanır.
   Depo anahtarı (storeKey) çağıran taraf tarafından belirlenir,
   böylece yönetici ve kullanıcı giriş sayaçları birbirine karışmaz.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const store = require('../data/store');

/**
 * @param {object} options
 * @param {string} options.storeKey  SQLite depo anahtarı
 * @param {number} options.maxFails  Kilitleme için gereken hatalı deneme sayısı
 * @param {number} options.windowMs  Sayacın sıfırlanacağı süre (ms)
 */
function createLockout({ storeKey, maxFails, windowMs }) {
    if (!storeKey) throw new Error('createLockout: storeKey zorunlu.');
    if (!Number.isFinite(maxFails) || maxFails < 1) throw new Error('createLockout: maxFails geçerli olmalı.');
    if (!Number.isFinite(windowMs) || windowMs < 1) throw new Error('createLockout: windowMs geçerli olmalı.');

    /* Süresi dolmuş kayıtları atılmış hâliyle okur. */
    function readLive() {
        const all = store.read(storeKey, {});
        if (!all || typeof all !== 'object' || Array.isArray(all)) return {};
        const now = Date.now();
        const live = {};
        for (const [key, record] of Object.entries(all)) {
            if (!record || typeof record !== 'object') continue;
            const resetAt = Number(record.resetAt || 0);
            if (!Number.isFinite(resetAt) || now > resetAt) continue;
            live[key] = { count: Number(record.count) || 0, resetAt };
        }
        return live;
    }

    /* Başarısız denemeyi kaydeder. */
    function noteFail(key) {
        const now = Date.now();
        const live = readLive();
        const record = live[key] || { count: 0, resetAt: now + windowMs };
        if (now > record.resetAt) {
            record.count = 0;
            record.resetAt = now + windowMs;
        }
        record.count++;
        live[key] = record;
        store.write(storeKey, live);
        return { count: record.count, resetAt: record.resetAt };
    }

    /* Anahtar kilitli mi? */
    function isLocked(key) {
        const record = readLive()[key];
        return !!(record && Date.now() < record.resetAt && record.count >= maxFails);
    }

    /* Başarılı girişten sonra sayacı temizler. */
    function clear(key) {
        const live = readLive();
        if (!(key in live)) return;
        delete live[key];
        store.write(storeKey, live);
    }

    return { noteFail, isLocked, clear };
}

module.exports = { createLockout };
