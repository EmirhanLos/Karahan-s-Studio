/* ═══════════════════════════════════════════════════════════════
   core/views.js — HTML çıktısı için temel yardımcılar.

   Tasarım kararı: Tam bir şablon motoru yazmak yerine, her sayfa
   bir düz fonksiyon olarak yazılıyor ve esc() ile çıktı veriyor.
   Bu:
     · XSS yüzeyini küçültür (her dinamik değer esc'ten geçer)
     · Hata ayıklaması kolay (standart JavaScript)
     · Yeterince esnek (tüm sayfaları özgürce yazabiliriz)

   HTML_esc() -> güvenli metin
   raw()      -> güvenilen metin (güvenmediğin sürece kullanma)
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function esc(value) {
    if (value == null) return '';
    return String(value).replace(/[&<>"']/g, ch => ENTITIES[ch]);
}

/* Sayılar, boolean'lar ve zaten güvenli olan URL'ler için */
function attr(value) {
    if (value == null) return '';
    return String(value);
}

/* JSON için — script etiketi içine gömülüyse </script> kırması */
function json(value) {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

/* Türkçe para formatı */
function money(value) {
    const n = Number(value) || 0;
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '₺';
}

/* ISO tarih -> kısa Türkçe */
function date(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('tr-TR'); } catch { return '—'; }
}

/* url içindeki path injection'ı önle */
function url(path) {
    if (typeof path !== 'string') return '#';
    if (/^(https?:|mailto:|\/)/i.test(path)) return path;
    return '/' + path;
}

module.exports = { esc, attr, json, money, date, url };
