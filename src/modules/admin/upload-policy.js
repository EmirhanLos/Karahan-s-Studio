/* ═══════════════════════════════════════════════════════════════
   modules/admin/upload-policy.js — Ürün dosyası yükleme beyaz listesi.

   Yüklenen dosya adı ve MIME türü istemciden gelir; ikisi de
   denetlenmeden sunucuya yazılırsa (ör. "rapor.html") uzaktan kod
   çalıştırma riski doğar. Bu modül yalnızca açıkça izin verilen
   uzantıları ve bunlara karşılık gelen MIME türlerini kabul eder.

   Tarayıcılar birçok ikili dosyayı "application/octet-stream" olarak
   bildirdiği için bu genel tür, izin verilen her uzantı için
   fallback olarak kabul edilir. HTML/JS/SVG gibi aktif içerik
   türleri hiçbir uzantı için kabul edilmez.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const path = require('node:path');

const GENERIC_MIME = 'application/octet-stream';

/* Uzantı → kabul edilen MIME türleri */
const ALLOWED_UPLOAD_TYPES = {
    '.zip':      ['application/zip', 'application/x-zip-compressed', 'application/x-zip', GENERIC_MIME],
    '.rar':      ['application/vnd.rar', 'application/x-rar-compressed', 'application/rar', GENERIC_MIME],
    '.7z':       ['application/x-7z-compressed', 'application/7z', GENERIC_MIME],
    '.exe':      ['application/x-msdownload', 'application/vnd.microsoft.portable-executable', 'application/x-msdos-program', GENERIC_MIME],
    '.msi':      ['application/x-msi', 'application/x-ms-installer', 'application/vnd.ms-iso', GENERIC_MIME],
    '.deb':      ['application/vnd.debian.binary-package', 'application/x-debian-package', 'application/x-deb', GENERIC_MIME],
    '.appimage': ['application/x-appimage', 'application/vnd.appimage', GENERIC_MIME],
    '.dmg':      ['application/x-apple-diskimage', 'application/x-apple-diskimage-udif', 'application/vnd.apple.installer+xml', GENERIC_MIME],
    '.pdf':      ['application/pdf', 'application/x-pdf', GENERIC_MIME]
};

const ALLOWED_UPLOAD_EXTENSIONS = Object.keys(ALLOWED_UPLOAD_TYPES);

/* Uzantıyı dosya adından çıkarır. Büyük/küçük harf duyarsızdır:
   ".AppImage" ve ".appimage" aynı kabul edilir. */
function uploadExtension(filename) {
    return path.extname(String(filename || '')).slice(0, 32).toLowerCase();
}

/* MIME türünü normalize eder (parametreler atılır). */
function normalizeMime(mimetype) {
    return String(mimetype || '').split(';')[0].trim().toLowerCase();
}

/**
 * Dosya izinli mi?
 * @param {string} filename  Yüklenen dosyanın adı
 * @param {string} mimetype  İstemcinin bildirdiği MIME türü
 * @returns {boolean}
 */
function isAllowedUpload(filename, mimetype) {
    const ext = uploadExtension(filename);
    const allowedMimes = ALLOWED_UPLOAD_TYPES[ext];
    if (!allowedMimes) return false;
    return allowedMimes.includes(normalizeMime(mimetype));
}

/* Kullanıcıya gösterilecek hata mesajı. */
function uploadRejectedMessage() {
    return 'Yalnızca ' + ALLOWED_UPLOAD_EXTENSIONS.join(', ') + ' türünde dosyalar yüklenebilir.';
}

module.exports = {
    GENERIC_MIME,
    ALLOWED_UPLOAD_TYPES,
    ALLOWED_UPLOAD_EXTENSIONS,
    uploadExtension,
    normalizeMime,
    isAllowedUpload,
    uploadRejectedMessage
};
