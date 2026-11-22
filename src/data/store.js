/* ═══════════════════════════════════════════════════════════════
   data/store.js — SQLite tabanlı JSON mağazaları.
   Mevcut JSON dosyaları ilk açılışta SQLite'a aktarılır; API
   alan modüller için değişmeden kalır.
   Vercel ve sunucusuz canlı ortamlarda proje dizini salt okunur
   olduğundan SQLite veritabanı /tmp dizininde barındırılır.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const BUNDLED_ROOT = path.join(__dirname, '..', '..', 'data');
const IS_SERVERLESS_OR_PROD = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    (process.env.NODE_ENV === 'production' && process.platform !== 'win32')
);
const ROOT = IS_SERVERLESS_OR_PROD ? (process.env.DB_DIR || '/tmp') : (process.env.DB_DIR || BUNDLED_ROOT);
const IMPORT_MARKER = 'json-import-v1';

function createStore(root = ROOT) {
    fs.mkdirSync(root, { recursive: true });

    // Canlı / Vercel ortamında /tmp kullanılıyorsa ve henüz database.sqlite yoksa
    // projeyle birlikte gelen data/database.sqlite dosyasını /tmp dizinine kopyala
    const targetDbPath = path.join(root, 'database.sqlite');
    const bundledDbPath = path.join(BUNDLED_ROOT, 'database.sqlite');
    if (root === ROOT && IS_SERVERLESS_OR_PROD && !fs.existsSync(targetDbPath) && fs.existsSync(bundledDbPath)) {
        try {
            fs.copyFileSync(bundledDbPath, targetDbPath);
        } catch (copyErr) {
            console.warn('Varsayılan SQLite veritabanı kopyalanamadı:', copyErr.message);
        }
    }

    const db = new Database(targetDbPath);
    db.pragma('journal_mode = WAL');
    db.exec(`
        CREATE TABLE IF NOT EXISTS store (
            key TEXT PRIMARY KEY,
            data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS store_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    const getStatement = db.prepare('SELECT data FROM store WHERE key = ?');
    const setStatement = db.prepare(`
        INSERT INTO store (key, data) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET data = excluded.data
    `);
    const hasImported = db.prepare('SELECT 1 FROM store_meta WHERE key = ?');
    const markImported = db.prepare('INSERT INTO store_meta (key, value) VALUES (?, ?)');

    function encode(name, data) {
        const serialized = JSON.stringify(data);
        if (serialized === undefined) {
            throw new TypeError(`store.write("${name}") JSON olarak serileştirilemiyor.`);
        }
        return serialized;
    }

    function decode(name, serialized) {
        try {
            return JSON.parse(serialized);
        } catch (error) {
            throw new Error(`store.read("${name}") geçersiz JSON: ${error.message}`, { cause: error });
        }
    }

    function importJsonFiles() {
        const files = fs.readdirSync(root).filter(file => file.endsWith('.json'));
        const importAll = db.transaction(() => {
            if (hasImported.get(IMPORT_MARKER)) return;

            for (const file of files) {
                const name = path.basename(file, '.json');
                if (!/^[a-z0-9_-]+$/i.test(name)) {
                    throw new Error(`Geçersiz veri deposu dosya adı: ${file}`);
                }
                const content = fs.readFileSync(path.join(root, file), 'utf8');
                let parsed;
                try {
                    parsed = JSON.parse(content);
                } catch (error) {
                    throw new Error(`"${file}" içe aktarılamadı; geçersiz JSON: ${error.message}`, { cause: error });
                }
                setStatement.run(name, encode(name, parsed));
            }
            markImported.run(IMPORT_MARKER, new Date().toISOString());
        });

        importAll();
    }

    try {
        importJsonFiles();
    } catch (error) {
        db.close();
        throw error;
    }

    function read(name, fallback = []) {
        const row = getStatement.get(name);
        if (row) return decode(name, row.data);
        const serialized = encode(name, fallback);
        db.prepare('INSERT OR IGNORE INTO store (key, data) VALUES (?, ?)').run(name, serialized);
        return decode(name, getStatement.get(name).data);
    }

    function write(name, data) {
        const serialized = encode(name, data);
        setStatement.run(name, serialized);
        return data;
    }

    function findById(name, id) {
        return read(name).find(item => String(item.id) === String(id)) || null;
    }

    function findBy(name, predicate) {
        return read(name).filter(predicate);
    }

    function upsert(name, item) {
        return db.transaction(() => {
            const list = read(name);
            if (!Array.isArray(list)) {
                throw new TypeError(`store.upsert("${name}") bir dizi depoda kullanılabilir.`);
            }
            const i = list.findIndex(x => String(x.id) === String(item.id));
            if (i === -1) list.push({ ...item });
            else list[i] = { ...list[i], ...item };
            write(name, list);
            return list.find(x => x.id === item.id);
        })();
    }

    function remove(name, id) {
        return db.transaction(() => {
            const list = read(name);
            if (!Array.isArray(list)) {
                throw new TypeError(`store.remove("${name}") bir dizi depoda kullanılabilir.`);
            }
            const next = list.filter(x => String(x.id) !== String(id));
            write(name, next);
            return next.length !== list.length;
        })();
    }

    return {
        read, write, findById, findBy, upsert, remove, root,
        close: () => { if (db.open) db.close(); }
    };
}

function nextId(list) {
    if (!Array.isArray(list) || list.length === 0) return 1;
    return Math.max(...list.map(x => Number(x.id) || 0)) + 1;
}

let defaultStore;
function getDefaultStore() {
    if (!defaultStore) defaultStore = createStore();
    return defaultStore;
}

const api = {};
for (const method of ['read', 'write', 'findById', 'findBy', 'upsert', 'remove']) {
    api[method] = (...args) => getDefaultStore()[method](...args);
}
api.close = () => defaultStore?.close();
api.nextId = nextId;
api.root = ROOT;
api.createStore = createStore;

module.exports = api;
