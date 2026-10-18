/* ═══════════════════════════════════════════════════════════════
   auth/rbac.js — Rol tabanlı erişim kontrolü.
   Üç rol: viewer (giriş yapmamış), user (giriş yapmış), admin.
   Adminler için ek alt-roller: products, updates, users, finance, audit.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const ROLES = ['viewer', 'user', 'admin'];
const PERMS = {
    'products.read':   ['user', 'admin'],
    'products.write':  ['admin'],
    'updates.write':   ['admin'],
    'banned.write':    ['admin'],
    'forms.read':      ['admin'],
    'forms.write':     ['admin'],
    'finance.read':    ['admin'],
    'finance.write':   ['admin'],
    'users.read':      ['admin'],
    'users.write':     ['admin'],
    'audit.read':      ['admin'],
    '2fa.manage':      ['user', 'admin']
};

function roleOf(req) {
    if (!req.session?.userId) return 'viewer';
    return req.session.isAdmin ? 'admin' : 'user';
}

function can(role, perm) {
    const allowed = PERMS[perm];
    return Array.isArray(allowed) && allowed.includes(role);
}

function requireAuth(req, res, next) {
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Bu işlem için giriş gerekli.' });
    }
    next();
}

function requireRole(perm) {
    return (req, res, next) => {
        const role = roleOf(req);
        if (!can(role, perm)) {
            return res.status(403).json({ error: 'Yetkin yok.' });
        }
        next();
    };
}

module.exports = { ROLES, PERMS, roleOf, can, requireAuth, requireRole };
