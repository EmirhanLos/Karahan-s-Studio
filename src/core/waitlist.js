/* ═══════════════════════════════════════════════════════════════════
   src/core/waitlist.js — Yayınlanınca Haber Ver (bekleme listesi).
   Yakında ürünleri takip eden kullanıcılar, ürün yayına çıktığında
   otomatik e-posta ile bilgilendirilir.
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

const data = require('../data');
const mail = require('./mail');
const config = require('../config');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signup({ productId, email, userId }) {
    const list = data.waitlist();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const exists = list.find(w =>
        String(w.productId) === String(productId) &&
        String(w.email || '').trim().toLowerCase() === normalizedEmail
    );
    if (exists) return exists;

    const entry = {
        id: data.nextId(data.waitlist()),
        productId: String(productId),
        email: normalizedEmail,
        userId: userId ? String(userId) : '',
        createdAt: new Date().toISOString(),
        notified: false
    };
    data.saveWaitlistEntry(entry);
    return entry;
}

function entriesFor(productId) {
    return data.waitlist().filter(w => String(w.productId) === String(productId));
}

async function notifyFor(productId) {
    const product = data.projectById(productId);
    if (!product) return { sent: 0, total: 0, error: 'Proje bulunamadı' };

    const list = data.waitlist();
    const pending = list.filter(w => String(w.productId) === String(productId) && !w.notified);

    const base = `http://localhost:${config.port}`;
    const results = await Promise.allSettled(pending.map(w =>
        mail.sendMail({
            to: w.email,
            subject: `Merhaba, ${product.name} yayınlandı!`,
            text: `Merhaba,\n\nTakip ettiğiniz "${product.name}" projesi artık yayınlandı ve indirime açıldı.\n\nÜrün detayı ve indirme linki: ${base}/urun/${encodeURIComponent(product.id)}\n\nİyi günler dileriz.\n— Karahan's Studio`
        })
    ));

    let sent = 0;
    for (const result of results) {
        if (result.status === 'fulfilled') sent += 1;
    }

    for (const w of pending) w.notified = true;
    data.saveWaitlist(list);

    return { sent, total: pending.length };
}

async function notifyAllLaunched() {
    const projects = data.projects();
    for (const p of projects) {
        if (p.status === 'Yayında') {
            try {
                await notifyFor(p.id);
            } catch (error) {
                console.error(`Bekleme listesi bildirim hatası (${p.id}):`, error.message);
            }
        }
    }
}

module.exports = { signup, entriesFor, notifyFor, notifyAllLaunched };
