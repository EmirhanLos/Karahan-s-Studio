'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');
const { renderHeader } = require('../src/modules/public/layout');

test('navbar menü ikonu ve lens katmanı içermez', () => {
    const html = renderHeader('home', null);
    for (const needle of ['nav-lens', 'nav-icon', 'nav-tab-label', 'nav-lens-filter']) {
        assert.equal(html.includes(needle), false, `beklenmeyen: ${needle}`);
    }
});

test('navbar yalnızca metin linkleri içerir', () => {
    const html = renderHeader('home', null);
    for (const label of ['Ana sayfa', 'Projeler', 'Güncellemeler', 'Stüdyo']) {
        assert.match(html, new RegExp('>' + label + '<'), `eksik link: ${label}`);
    }
});

test('aktif link aria-current="page" taşır ve tek tanedir', () => {
    const html = renderHeader('guncellemeler', null);
    assert.match(html, /class="nav-link is-active" aria-current="page">Güncellemeler/);
    assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
});

test('giriş yapmamış kullanıcıya giriş butonu gösterilir', () => {
    const html = renderHeader('home', null);
    assert.match(html, /class="nav-cta"[^>]*>Giriş Yap/);
    assert.equal(html.includes('/profil'), false);
});

test('giriş yapmış kullanıcıya profil linki gösterilir', () => {
    const html = renderHeader('home', { firstName: 'Emirhan' });
    assert.match(html, /href="\/profil"[^>]*>Profil/);
    assert.equal(html.includes('nav-cta'), false);
});

test('projeler açılır listesi aria öznitelikleriyle bağlı', () => {
    const html = renderHeader('home', null);
    assert.match(html, /aria-controls="projectsDropdown"/);
    assert.match(html, /id="projectsDropdown"/);
});

test('navbar katmanlarında eski süsleme kalıntısı yok', () => {
    const files = [
        'public/css/style.css',
        'public/css/liquid-glass.css',
        'public/css/mobile.css',
        'public/js/nav.js',
        'src/modules/public/layout.js'
    ];
    for (const file of files) {
        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
        for (const needle of ['nav-lens', 'nav-tab-label', 'nav-icon', 'NAV_ICONS', 'nav-login']) {
            assert.equal(content.includes(needle), false, `${file} içinde kalıntı: ${needle}`);
        }
    }
});

test('nav-lens.css silinmiş ve hiçbir yerden referans verilmiyor', () => {
    assert.equal(fs.existsSync(path.join(ROOT, 'public/css/nav-lens.css')), false);
    const layout = fs.readFileSync(path.join(ROOT, 'src/modules/public/layout.js'), 'utf8');
    assert.equal(layout.includes('nav-lens.css'), false);
});

test('eski ikinci navbar kaldırıldı', () => {
    const legacy = fs.readFileSync(path.join(ROOT, 'public/js/layout.js'), 'utf8');
    for (const needle of ['renderNav', 'renderFooter', 'nav-theme-btn', 'nav-profile-dropdown']) {
        assert.equal(legacy.includes(needle), false, `legacy layout.js içinde kalıntı: ${needle}`);
    }
    for (const needle of ['escapeHtml', 'asset', 'assetVersion', 'sortedProjects']) {
        assert.ok(legacy.includes(needle), `legacy layout.js exportu kayboldu: ${needle}`);
    }
});
