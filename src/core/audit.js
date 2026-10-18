/* ═══════════════════════════════════════════════════════════════
   auth/audit.js — Olay günlüğü.
   Kim, neyi, ne zaman, nereden, başarılı/başarısız yaptı?
   Hukuki delil niteliği taşıyabilmesi için bütünlük korunur.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { audit, saveAudit, nextId } = require('../data');

const MAX_ENTRIES = 1000;

/* Kayıt: 1–2 ms, diske yazılır, döngüsel kırpılır */
function log({ type, req, actorId = null, severity = 'info', detail = '' }) {
    const list = audit();
    list.unshift({
        id: nextId(list),
        at: new Date().toISOString(),
        type, severity, detail,
        actorId,
        ip: req?.ip || req?.connection?.remoteAddress || null,
        ua: (req?.headers?.['user-agent'] || '').slice(0, 200)
    });
    saveAudit(list.slice(0, MAX_ENTRIES));
}

function recent(limit = 50) { return audit().slice(0, limit); }
function byActor(actorId, limit = 50) { return audit().filter(a => a.actorId === actorId).slice(0, limit); }

module.exports = { log, recent, byActor };
