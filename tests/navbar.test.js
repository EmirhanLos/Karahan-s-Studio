'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

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
