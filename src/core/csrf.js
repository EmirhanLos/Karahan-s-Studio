/* ═══════════════════════════════════════════════════════════════
   core/csrf.js — CSRF token üretimi ve doğrulama.

   Tüm POST formları gizli alan adı `_csrf` ile token gönderir.
   Alan adı tek bir yerde tanımlıdır (CSRF_FIELD) böylece şablonlar
   ile ara yazılım arasında "csrfToken" / "_csrf" gibi uyumsuzluklar
   yaşanmaz.

   Not: doğrulama zaman-sabit karşılaştırma (timingSafeEqual)
   kullanır; böylece saldırgan token'ı karakter karakter tahmin
   edemez.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const crypto = require('node:crypto');

/* Formlarda kullanılacak gizli alan adı — şablonlar ve sunucu aynı değeri kullanır. */
const CSRF_FIELD = '_csrf';

/* Header üzerinden gönderilen token (fetch/XHR için). */
const CSRF_HEADER = 'x-csrf-token';

/* Oturumda token yoksa üretir ve döndürür. */
function generateCsrf(req) {
    if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
    return req.session.csrf;
}

/* İstekteki tokenı oturumdaki tokenla güvenli şekilde karşılaştırır. */
function tokensMatch(sent, expected) {
    if (typeof sent !== 'string' || typeof expected !== 'string') return false;
    if (!sent.length || !expected.length) return false;

    const a = Buffer.from(sent, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/* POST/DELETE/PUT isteklerini reddeden ara yazılım. */
function requireCsrf(req, res, next) {
    const sent = req.body?.[CSRF_FIELD] || req.headers?.[CSRF_HEADER];
    if (!req.session?.csrf || !tokensMatch(sent, req.session.csrf)) {
        return res.status(403).send('Geçersiz istek. Lütfen sayfayı yenileyin.');
    }
    next();
}

/* Şablonlarda kullanılacak gizli alanı üretir. */
function csrfField(token) {
    const value = String(token ?? '');
    return `<input type="hidden" name="${CSRF_FIELD}" value="${value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')}">`;
}

module.exports = { CSRF_FIELD, CSRF_HEADER, generateCsrf, requireCsrf, csrfField, tokensMatch };
