'use strict';

const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

function getTransporter() {
    if (!config.smtp) throw new Error('Admin e-posta kodu için SMTP yapılandırılmamış.');
    if (!transporter) transporter = nodemailer.createTransport(config.smtp);
    return transporter;
}

async function sendLoginCode(email, code) {
    const safeCode = String(code);
    if (!/^\d{6}$/.test(safeCode)) throw new Error('Admin giriş kodu geçersiz.');
    return getTransporter().sendMail({
        from: config.smtp.from,
        to: email,
        subject: "Karahan's Studio admin giriş kodu",
        text: `Merhaba admin,\n${safeCode}\nbu kodu kullanarak Karahan's Studio admin sayfasına giriş yapabilirsin.\nKodu kimseyle paylaşma!\n\nwww.karahans.com`,
        html: `<p>Merhaba admin,</p><p><strong style="font-size:24px;letter-spacing:4px">${safeCode}</strong></p><p>bu kodu kullanarak Karahan's Studio admin sayfasına giriş yapabilirsin.<br>Kodu kimseyle paylaşma!</p><p><a href="https://www.karahans.com">www.karahans.com</a></p>`
    });
}

module.exports = { sendLoginCode };
