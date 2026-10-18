'use strict';

const crypto = require('node:crypto');
const config = require('../config');

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function digest(code) {
    return crypto.createHmac('sha256', config.session.secret).update(String(code)).digest('hex');
}

function issue(now = Date.now()) {
    const code = String(crypto.randomInt(100000, 1000000));
    return {
        code,
        digest: digest(code),
        expiresAt: now + OTP_TTL_MS,
        attempts: 0,
        lastSentAt: now
    };
}

function matches(expectedDigest, code) {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code) || typeof expectedDigest !== 'string') return false;
    const actual = Buffer.from(digest(code), 'hex');
    const expected = Buffer.from(expectedDigest, 'hex');
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

module.exports = { issue, matches, OTP_TTL_MS, MAX_ATTEMPTS };
