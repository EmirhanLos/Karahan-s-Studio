'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createStore } = require('../src/data/store');

function temporaryRoot(t) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'karahans-store-'));
    const stores = [];
    t.after(() => {
        for (const store of stores) store.close();
        fs.rmSync(root, { recursive: true, force: true });
    });
    return {
        root,
        createStore() {
            const store = createStore(root);
            stores.push(store);
            return store;
        }
    };
}

test('imports existing JSON data and preserves the source file', t => {
    const { root, createStore: openStore } = temporaryRoot(t);
    const sourceFile = path.join(root, 'items.json');
    fs.writeFileSync(sourceFile, JSON.stringify([{ id: 1, name: 'first' }]), 'utf8');
    const store = openStore();

    assert.deepEqual(store.read('items'), [{ id: 1, name: 'first' }]);
    assert.equal(fs.readFileSync(sourceFile, 'utf8'), '[{"id":1,"name":"first"}]');
});

test('fails migration on malformed JSON without substituting fallback data', t => {
    const { root } = temporaryRoot(t);
    const sourceFile = path.join(root, 'items.json');
    fs.writeFileSync(sourceFile, '{invalid', 'utf8');

    assert.throws(() => createStore(root), /"items\.json" içe aktarılamadı; geçersiz JSON/);
    assert.equal(fs.readFileSync(sourceFile, 'utf8'), '{invalid');
});

test('persists writes, upserts, and removals in SQLite', t => {
    const { root, createStore: openStore } = temporaryRoot(t);
    const store = openStore();
    store.write('items', [{ id: 1, name: 'first' }]);

    assert.deepEqual(store.upsert('items', { id: 1, active: true }), { id: 1, name: 'first', active: true });
    assert.equal(store.remove('items', 1), true);
    assert.deepEqual(store.read('items'), []);

    store.close();
    const reopened = openStore();
    assert.deepEqual(reopened.read('items'), []);
});
