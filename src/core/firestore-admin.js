'use strict';

const firebaseAdmin = require('firebase-admin');
const config = require('../config');

let firestore;

function getFirestore() {
    if (firestore) return firestore;

    const credentials = config.firebase;
    if (!credentials?.projectId || !credentials.clientEmail || !credentials.privateKey) {
        throw new Error('Firebase Admin SDK için servis hesabı yapılandırılmamış.');
    }

    if (!firebaseAdmin.apps.length) {
        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert({
                projectId: credentials.projectId,
                clientEmail: credentials.clientEmail,
                privateKey: credentials.privateKey
            })
        });
    }

    firestore = firebaseAdmin.firestore();
    return firestore;
}

function getFirebaseAuth() {
    getFirestore();
    return firebaseAdmin.auth();
}

async function isEnabledAdmin(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.includes('/')) return false;

    const db = getFirestore();
    const userRecords = await db.collection('users')
        .where('email', '==', normalizedEmail)
        .limit(5)
        .get();
    if (userRecords.docs.some(doc => doc.get('isAdmin') === true)) return true;

    const adminRecord = await db.collection('admins').doc(normalizedEmail).get();
    return adminRecord.exists && adminRecord.get('enabled') === true;
}

async function verifyAdminIdentity(user, authUser) {
    const normalizedEmail = String(user?.email || '').trim().toLowerCase();
    const authEmail = String(authUser?.email || '').trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail !== authEmail || user?.isAdmin !== true) return false;
    if (user.firebaseUid && user.firebaseUid !== authUser.uid) return false;

    const db = getFirestore();
    const records = await db.collection('users')
        .where('email', '==', normalizedEmail)
        .limit(5)
        .get();
    if (records.docs.some(doc => {
        const uid = doc.get('firebaseUid');
        return uid && uid !== authUser.uid;
    })) return false;
    const matchingRoleRecord = records.docs.some((doc) => {
        const uid = doc.get('firebaseUid');
        return doc.get('isAdmin') === true && (!uid || uid === authUser.uid);
    });
    if (matchingRoleRecord) return true;
    if (!records.empty) return false;

    const adminRecord = await db.collection('admins').doc(normalizedEmail).get();
    return adminRecord.exists && adminRecord.get('enabled') === true;
}

async function syncUserProfile(user, firebaseUid) {
    if (!user || !firebaseUid || !String(user.email || '').trim()) {
        throw new Error('Firebase kullanıcı eşitlemesi için kullanıcı, UID ve e-posta gerekli.');
    }
    if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
        throw new Error('Yerel kullanıcı kaydındaki Firebase UID uyuşmuyor.');
    }

    const normalizedEmail = String(user.email).trim().toLowerCase();
    const db = getFirestore();
    let records = await db.collection('users')
        .where('email', '==', normalizedEmail)
        .limit(5)
        .get();
    if (records.empty) {
        records = await db.collection('users')
            .where('firebaseUid', '==', firebaseUid)
            .limit(5)
            .get();
    }
    const conflictingUid = records.docs.some((doc) => {
        const uid = doc.get('firebaseUid');
        return uid && uid !== firebaseUid;
    });
    if (conflictingUid) {
        throw new Error('Firestore kullanıcı kaydındaki Firebase UID uyuşmuyor.');
    }

    const firestore = require('firebase-admin').firestore;
    const adminRecord = await db.collection('admins').doc(normalizedEmail).get();
    const enabledInFirestore = records.docs.some(doc => doc.get('isAdmin') === true)
        || (adminRecord.exists && adminRecord.get('enabled') === true);
    const profile = {
        id: user.id,
        email: normalizedEmail,
        firebaseUid,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        address: user.address || {},
        card: user.card || {},
        banned: user.banned === true,
        createdAt: user.createdAt || null,
        lastLoginAt: user.lastLoginAt || null,
        viewedProducts: Array.isArray(user.viewedProducts) ? user.viewedProducts : [],
        updatedAt: new Date().toISOString(),
        password: firestore.FieldValue.delete()
    };
    const batch = db.batch();
    if (records.empty) {
        batch.set(db.collection('users').doc(firebaseUid), {
            ...profile,
            isAdmin: user.isAdmin === true && enabledInFirestore
        }, { merge: true });
    } else {
        for (const record of records.docs) {
            batch.update(record.ref, {
                ...profile,
                ...(user.isAdmin === true && enabledInFirestore ? { isAdmin: true } : {})
            });
        }
    }
    await batch.commit();
}

async function setAdminEnabled(email, enabled) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.includes('/')) {
        throw new Error('Firestore admin belgesi için geçerli e-posta gerekli.');
    }

    const db = getFirestore();
    const records = await db.collection('users')
        .where('email', '==', normalizedEmail)
        .limit(5)
        .get();
    const firestore = require('firebase-admin').firestore;
    const updatedAt = new Date().toISOString();

    if (records.empty) {
        await db.collection('admins')
            .doc(normalizedEmail)
            .set({ enabled: enabled === true, updatedAt }, { merge: true });
        return;
    }

    const batch = db.batch();
    for (const record of records.docs) {
        batch.update(record.ref, {
            isAdmin: enabled === true,
            updatedAt,
            password: firestore.FieldValue.delete()
        });
    }
    await batch.commit();
}

module.exports = { getFirebaseAuth, isEnabledAdmin, setAdminEnabled, syncUserProfile, verifyAdminIdentity };
