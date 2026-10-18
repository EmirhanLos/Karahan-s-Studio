'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { issue, matches, OTP_TTL_MS, MAX_ATTEMPTS } = require('../src/core/admin-email-otp');

test('issues a six-digit code with a ten-minute expiry', () => {
    const now = 1000;
    const otp = issue(now);

    assert.match(otp.code, /^\d{6}$/);
    assert.equal(otp.expiresAt, now + OTP_TTL_MS);
    assert.equal(otp.attempts, 0);
    assert.equal(otp.lastSentAt, now);
    assert.equal(MAX_ATTEMPTS, 5);
});

test('compares codes using a keyed digest and rejects malformed input', () => {
    const otp = issue();

    assert.equal(matches(otp.digest, otp.code), true);
    assert.equal(matches(otp.digest, '000000'), otp.code === '000000');
    assert.equal(matches(otp.digest, '12345'), false);
    assert.equal(matches(otp.digest, ''), false);
    assert.equal(matches('', otp.code), false);
});
