'use strict';

const { createStore, root } = require('../data/store');
const store = createStore();

try {
    console.log(`SQLite veri deposu hazır: ${root}`);
} finally {
    store.close();
}
