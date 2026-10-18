/* ═══════════════════════════════════════════════════════════════
   data/store.js — Dosya tabanlı JSON depoları.
   Tek tip API: read / write / update / append / remove.
   Her mağaza aynı kalıba oturur; yeni kaynak eklemek 4 satır.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', 'data');

function ensureDir() {
    if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
}

function filePath(name) {
    return path.join(ROOT, `${name}.json`);
}

function read(name, fallback = []) {
    ensureDir();
    const p = filePath(name);
    try {
        if (!fs.existsSync(p)) {
            fs.writeFileSync(p, JSON.stringify(fallback, null, 2), 'utf8');
            return fallback;
        }
        const raw = fs.readFileSync(p, 'utf8').trim();
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch (e) {
        console.error(`store.read("${name}") hatasi:`, e.message);
        return fallback;
    }
}

function write(name, data) {
    ensureDir();
    const p = filePath(name);
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, p);
    return data;
}

function findById(name, id) {
    return read(name).find(item => String(item.id) === String(id)) || null;
}

function findBy(name, predicate) {
    return read(name).filter(predicate);
}

function upsert(name, item) {
    const list = read(name);
    const i = list.findIndex(x => String(x.id) === String(item.id));
    if (i === -1) list.push({ ...item });
    else list[i] = { ...list[i], ...item };
    return write(name, list).find(x => x.id === item.id);
}

function remove(name, id) {
    const list = read(name);
    const next = list.filter(x => String(x.id) !== String(id));
    write(name, next);
    return next.length !== list.length;
}

function nextId(list) {
    if (!Array.isArray(list) || list.length === 0) return 1;
    return Math.max(...list.map(x => Number(x.id) || 0)) + 1;
}

module.exports = { read, write, findById, findBy, upsert, remove, nextId, root: ROOT };
