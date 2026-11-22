/* ═══════════════════════════════════════════════════════════════════
   src/core/mail.js — Nodemailer posta yardımcıısı.
   SMTP ayarları config.smtp'tan alınır; SMTP yapılandırılmamışsa
   iletiler konsola simüle edilir (geliştirme ortamı için).
   ═══════════════════════════════════════════════════════════════════ */
'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

const transporter = config.smtp
    ? nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        requireTLS: config.smtp.requireTLS,
        auth: config.smtp.auth
    })
    : null;

async function sendMail({ to, subject, text, html }) {
    const message = {
        from: config.smtp.from,
        to,
        subject,
        text,
        html
    };
    if (transporter) {
        await transporter.sendMail(message);
        return { ok: true };
    }
    console.log(`[E-posta Simülasyon -> ${to}] ${subject}\n${text || html || ''}`);
    return { ok: true, simulated: true };
}

module.exports = { sendMail, transporter };
