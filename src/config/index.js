/* ═══════════════════════════════════════════════════════════════
   config.js — Tek kaynaktan tüm ortam ayarları.
   Doğrulama zod ile yapılır; uygulama hatalı yapılandırmayla
   asla başlamaz — başlamadan önce hata verir.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const { z } = require('zod');

const schema = z.object({
    NODE_ENV:          z.enum(['development', 'test', 'production']).default('development'),
    PORT:              z.coerce.number().int().positive().default(3000),

    SESSION_SECRET:    z.string().min(32, 'SESSION_SECRET en az 32 karakter olmalı'),
    ALLOWED_ORIGINS:   z.string().default(''),

    ADMIN_LOGIN_PATH:  z.string().regex(/^\/[a-z0-9-]+$/i, 'ADMIN_LOGIN_PATH "/kelime" biçiminde olmalı').default('/panel-giris'),
    ADMIN_IP_ALLOWLIST: z.string().default(''),

    SMTP_HOST:         z.string().default(''),
    SMTP_PORT:         z.coerce.number().default(587),
    SMTP_SECURE:       z.coerce.boolean().default(false),
    SMTP_USER:         z.string().default(''),
    SMTP_PASS:         z.string().default(''),
    EMAIL_FROM:        z.string().default('Karahan\'s Studio <noreply@karahans.com>'),

    GOOGLE_CLIENT_ID:     z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    GOOGLE_CALLBACK_URL:  z.string().default(''),

    FIREBASE_PROJECT_ID:    z.string().default(''),
    FIREBASE_API_KEY:       z.string().min(1, 'Firebase Authentication için FIREBASE_API_KEY gerekli'),
    FIREBASE_PRIVATE_KEY:   z.string().default(''),
    FIREBASE_CLIENT_EMAIL:  z.string().default('')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error('Ortam değişkenleri geçersiz:');
    for (const issue of parsed.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
    process.exit(1);
}

const env = parsed.data;
const isProd = env.NODE_ENV === 'production';

module.exports = {
    env: env.NODE_ENV,
    isProd,
    isDev: !isProd,
    port: env.PORT,
    origins: env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean),

    admin: {
        loginPath: env.ADMIN_LOGIN_PATH,
        ipAllowlist: env.ADMIN_IP_ALLOWLIST.split(',').map(s => s.trim()).filter(Boolean),
        idleMs: 2 * 60 * 60 * 1000,        // 2 saat hareketsizlikte düşer
        absoluteMs: 12 * 60 * 60 * 1000,   // 12 saat sonra kesinlikle yenilenir
        pendingMs: 10 * 60 * 1000          // parola sonrası 2FA için süre
    },

    session: {
        secret: env.SESSION_SECRET,
        cookieName: 'ks.sid',
        maxAgeMs: 30 * 24 * 60 * 60 * 1000,   // 30 gün
        rolling: false /* performans: her istekte oturum yazımını engeller */
    },

    smtp: env.SMTP_HOST ? {
        host: env.SMTP_HOST, port: env.SMTP_PORT,
        secure: env.SMTP_SECURE && env.SMTP_PORT !== 587,
        requireTLS: env.SMTP_SECURE && env.SMTP_PORT === 587,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
        from: env.EMAIL_FROM
    } : null,

    google: (process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID) ? {
        clientID: process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
    } : null,

    firebase: env.FIREBASE_PROJECT_ID ? {
        projectId: env.FIREBASE_PROJECT_ID,
        apiKey: env.FIREBASE_API_KEY,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    } : null
};
