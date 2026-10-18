'use strict';

const config = require('../config');
const firestoreAdmin = require('./firestore-admin');
const password = require('./password');

class FirebaseAuthError extends Error {
    constructor(code) {
        super(code);
        this.name = 'FirebaseAuthError';
        this.code = code;
    }
}

function isCredentialError(error) {
    return error instanceof FirebaseAuthError
        && ['EMAIL_NOT_FOUND', 'INVALID_EMAIL', 'INVALID_LOGIN_CREDENTIALS', 'INVALID_PASSWORD', 'USER_DISABLED'].includes(error.code);
}

function createFirebaseAuth({
    getAdminAuth = firestoreAdmin.getFirebaseAuth,
    firebase = config.firebase,
    fetchImpl = (...args) => fetch(...args)
} = {}) {
    async function identityRequest(endpoint, payload) {
        if (!firebase?.apiKey) throw new FirebaseAuthError('FIREBASE_API_KEY_MISSING');

        const response = await fetchImpl(
            `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(firebase.apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000)
            }
        );

        let result;
        try {
            result = await response.json();
        } catch {
            throw new FirebaseAuthError('INVALID_IDENTITY_TOOLKIT_RESPONSE');
        }

        if (!response.ok) {
            const code = result?.error?.message?.split(':')[0] || 'IDENTITY_TOOLKIT_REQUEST_FAILED';
            throw new FirebaseAuthError(code);
        }
        return result;
    }

    async function signInWithPassword(email, plainPassword, legacyUser = null) {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const auth = getAdminAuth();
        let user;

        try {
            user = await auth.getUserByEmail(normalizedEmail);
        } catch (error) {
            if (error.code !== 'auth/user-not-found') throw error;
            if (!legacyUser || legacyUser.banned || !password.verify(plainPassword, legacyUser.password)) {
                throw new FirebaseAuthError('INVALID_LOGIN_CREDENTIALS');
            }

            try {
                user = await auth.createUser({
                    email: normalizedEmail,
                    password: plainPassword,
                    displayName: [legacyUser.firstName, legacyUser.lastName].filter(Boolean).join(' ')
                });
            } catch (createError) {
                if (createError.code !== 'auth/email-already-exists') throw createError;
                user = await auth.getUserByEmail(normalizedEmail);
            }
        }

        if (user.disabled) throw new FirebaseAuthError('USER_DISABLED');

        const result = await identityRequest('accounts:signInWithPassword', {
            email: normalizedEmail,
            password: plainPassword,
            returnSecureToken: true
        });
        const decoded = await auth.verifyIdToken(result.idToken, true);
        if (decoded.uid !== user.uid) throw new FirebaseAuthError('ID_TOKEN_USER_MISMATCH');
        return auth.getUser(user.uid);
    }

    async function createUser(email, plainPassword, displayName = '') {
        return getAdminAuth().createUser({
            email: String(email || '').trim().toLowerCase(),
            password: plainPassword,
            ...(displayName ? { displayName } : {})
        });
    }

    async function deleteUser(uid) {
        return getAdminAuth().deleteUser(uid);
    }

    async function getUserByEmail(email) {
        return getAdminAuth().getUserByEmail(String(email || '').trim().toLowerCase());
    }

    async function updateUserByEmail(email, changes) {
        const auth = getAdminAuth();
        const user = await auth.getUserByEmail(String(email || '').trim().toLowerCase());
        return auth.updateUser(user.uid, changes);
    }

    async function setDisabledByEmail(email, disabled) {
        try {
            const user = await getUserByEmail(email);
            await getAdminAuth().updateUser(user.uid, { disabled: disabled === true });
            return true;
        } catch (error) {
            if (error.code === 'auth/user-not-found') return false;
            throw error;
        }
    }

    async function sendPasswordResetEmail(email) {
        try {
            return await identityRequest('accounts:sendOobCode', {
                requestType: 'PASSWORD_RESET',
                email: String(email || '').trim().toLowerCase()
            });
        } catch (error) {
            if (error.code === 'EMAIL_NOT_FOUND' || error.code === 'USER_NOT_FOUND') return null;
            throw error;
        }
    }

    async function resetPassword(oobCode, plainPassword) {
        return identityRequest('accounts:resetPassword', {
            oobCode,
            newPassword: plainPassword
        });
    }

    return {
        createUser,
        deleteUser,
        getUserByEmail,
        identityRequest,
        isCredentialError,
        resetPassword,
        sendPasswordResetEmail,
        setDisabledByEmail,
        signInWithPassword,
        updateUserByEmail
    };
}

module.exports = { ...createFirebaseAuth(), createFirebaseAuth, FirebaseAuthError, isCredentialError };
