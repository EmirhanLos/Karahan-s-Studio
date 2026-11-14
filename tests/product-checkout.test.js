'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { renderCheckout } = require('../src/modules/public/product');

test('renders a discounted product checkout without collecting payment card data', () => {
    const html = renderCheckout({
        id: 7,
        name: 'Test Product',
        category: 'Software',
        summary: 'Product summary',
        price: 5000,
        discount: 75,
        isFree: false
    });

    assert.match(html, /1\.250,00₺/);
    assert.match(html, /Güvenli çevrimiçi ödeme henüz etkin değil/);
    assert.match(html, /Satın alma için iletişime geç/);
    assert.doesNotMatch(html, /cardNumber|cardExpiry|name="cvv"/);
});
