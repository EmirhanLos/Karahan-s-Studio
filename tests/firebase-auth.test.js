'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const password = require('../src/core/password');
const { createFirebaseAuth } = require('../src/core/firebase-auth');

function userNotFound() {
    return Object.assign(new Error('not found'), { code: 'auth/user-not-found' });
}

test('rejects a legacy password when no Firebase account exists', async () => {
    let created = false;
    const auth = createFirebaseAuth({
        firebase: null,
        getAdminAuth: () => ({
            getUserByEmail: async () => { throw userNotFound(); },
            createUser: async () => { created = true; }
        })
    });

    await assert.rejects(
        auth.signInWithPassword('admin@example.com', 'wrong password', {
            password: password.hash('correct password'),
            banned: false
        }),
        error => auth.isCredentialError(error)
    );
    assert.equal(created, false);
});

test('migrates a valid legacy account into Firebase Authentication', async () => {
    let createdAccount;
    const auth = createFirebaseAuth({
        firebase: { apiKey: 'test-key' },
        getAdminAuth: () => ({
            getUserByEmail: async () => { throw userNotFound(); },
            createUser: async account => {
                createdAccount = account;
                return { uid: 'firebase-user-1', email: account.email };
            },
            verifyIdToken: async () => ({ uid: 'firebase-user-1' }),
            getUser: async uid => ({ uid, email: 'admin@example.com' })
        }),
        fetchImpl: async () => ({
            ok: true,
            json: async () => ({ idToken: 'migration-id-token' })
        })
    });

    const user = await auth.signInWithPassword('ADMIN@example.com', 'correct password', {
        firstName: 'Admin',
        lastName: 'User',
        password: password.hash('correct password'),
        banned: false
    });

    assert.equal(user.uid, 'firebase-user-1');
    assert.equal(createdAccount.email, 'admin@example.com');
    assert.equal(createdAccount.password, 'correct password');
});

test('validates Firebase ID tokens after password sign-in', async () => {
    const requests = [];
    const auth = createFirebaseAuth({
        firebase: { apiKey: 'test-key' },
        getAdminAuth: () => ({
            getUserByEmail: async () => ({ uid: 'firebase-user-2', disabled: false }),
            verifyIdToken: async token => {
                assert.equal(token, 'test-id-token');
                return { uid: 'firebase-user-2' };
            },
            getUser: async uid => ({ uid, email: 'user@example.com' })
        }),
        fetchImpl: async (url, options) => {
            requests.push({ url, body: JSON.parse(options.body) });
            return { ok: true, json: async () => ({ idToken: 'test-id-token' }) };
        }
    });

    const user = await auth.signInWithPassword('user@example.com', 'correct password');

    assert.equal(user.uid, 'firebase-user-2');
    assert.equal(requests.length, 1);
    assert.match(requests[0].url, /accounts:signInWithPassword\?key=test-key$/);
    assert.equal(requests[0].body.email, 'user@example.com');
});

test('maps rejected Firebase credentials to an authentication failure', async () => {
    const auth = createFirebaseAuth({
        firebase: { apiKey: 'test-key' },
        getAdminAuth: () => ({
            getUserByEmail: async () => ({ uid: 'firebase-user-3', disabled: false })
        }),
        fetchImpl: async () => ({
            ok: false,
            json: async () => ({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } })
        })
    });

    await assert.rejects(
        auth.signInWithPassword('user@example.com', 'wrong password'),
        error => auth.isCredentialError(error)
    );
});
