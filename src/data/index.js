/* ═══════════════════════════════════════════════════════════════
   data/index.js — İş alanlarına göre kapsüllenmiş depolar.
   Tek tek dosya adlarıyla uğraşmak yerine buradan erişilir.
   Şema doğrulama zod ile katmanın dışında yapılır.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const store = require('./store');

const stores = {
    users:        () => store.read('users', []),
    saveUsers:    (list) => store.write('users', list),
    userById:     (id) => store.findById('users', id),
    userByEmail:  (email) => store.findBy('users', u => u.email === email).pop() || null,
    saveUser:     (u) => store.upsert('users', u),
    removeUser:   (id) => store.remove('users', id),

    projects:     () => store.read('projects', []),
    saveProjects: (list) => store.write('projects', list),
    projectById:  (id) => store.findById('projects', id),
    saveProject:  (p) => store.upsert('projects', p),
    removeProject:(id) => store.remove('projects', id),

    updates:      () => store.read('updates', []),
    saveUpdates:  (list) => store.write('updates', list),
    saveUpdate:   (u) => store.upsert('updates', u),
    removeUpdate: (id) => store.remove('updates', id),

    upcoming:     () => store.read('upcoming-projects', []),
    saveUpcoming: (list) => store.write('upcoming-projects', list),
    saveUp:       (u) => store.upsert('upcoming-projects', u),
    removeUp:     (id) => store.remove('upcoming-projects', id),

    messages:     () => store.read('messages', []),
    saveMessages: (list) => store.write('messages', list),
    saveMessage:  (m) => store.upsert('messages', m),
    removeMessage:(id) => store.remove('messages', id),

    forms:        () => store.read('forms', []),
    saveForms:    (list) => store.write('forms', list),
    saveForm:     (f) => store.upsert('forms', f),
    removeForm:   (id) => store.remove('forms', id),

    transactions: () => store.read('transactions', []),
    saveTxns:     (list) => store.write('transactions', list),
    saveTxn:      (t) => store.upsert('transactions', t),
    removeTxn:    (id) => store.remove('transactions', id),

    banned:       () => store.read('banned', { ips: [], emails: [], passwords: [] }),
    saveBanned:   (b) => store.write('banned', b),

    audit:        () => store.read('audit', []),
    saveAudit:    (list) => store.write('audit', list),

    sliderImages: () => store.read('slider-images', []),
    saveSliderImages: (list) => store.write('slider-images', list)
};

module.exports = { ...stores, nextId: store.nextId, _raw: store };
