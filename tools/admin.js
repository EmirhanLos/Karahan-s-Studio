#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════
   tools/admin.js — Yönetici hesabı komut satırı aracı.

     node tools/admin.js create <kullanici-adi> [e-posta]
     node tools/admin.js password <kullanici-adi>
     node tools/admin.js disable <kullanici-adi>
     node tools/admin.js enable <kullanici-adi>
     node tools/admin.js reset-2fa <kullanici-adi>
     node tools/admin.js list

   Parola gizli olarak terminalden istenir; argüman olarak verilmez.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const readline = require('node:readline');
const admins = require('../src/core/admin-accounts');

function askHidden(question) {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        const write = rl._writeToOutput;
        rl.question(question, answer => { rl._writeToOutput = write; rl.close(); process.stdout.write('\n'); resolve(answer); });
        rl._writeToOutput = function (chunk) { if (chunk.includes(question)) write.call(rl, question); };
    });
}

async function readPassword() {
    const first = await askHidden('Parola: ');
    const err = admins.validatePassword(first);
    if (err) throw new Error(err);
    const second = await askHidden('Parola (tekrar): ');
    if (first !== second) throw new Error('Parolalar eşleşmiyor.');
    return first;
}

function need(admin, username) {
    if (!admin) throw new Error(`"${username}" adlı yönetici bulunamadı.`);
    return admin;
}

const ALIAS = {
    create: 'create', kayit: 'create', ekle: 'create',
    password: 'password', sifre: 'password', parola: 'password',
    disable: 'disable', kapat: 'disable',
    enable: 'enable', ac: 'enable', etkinlestir: 'enable',
    'reset-2fa': 'reset-2fa', '2fa-sifirla': 'reset-2fa',
    list: 'list', liste: 'list'
};

async function main() {
    const [rawCmd, username, email] = process.argv.slice(2);
    const cmd = ALIAS[rawCmd] || rawCmd;
    switch (cmd) {
        case 'create': {
            if (!username) throw new Error('Kullanıcı adı gerekli.');
            const usernameError = admins.validateUsername(username);
            if (usernameError) throw new Error(usernameError);
            const password = await readPassword();
            const admin = admins.create({ username, email, password });
            console.log(`Yönetici oluşturuldu: ${admin.username} (${admin.id})`);
            console.log('İlk girişte Authenticator (TOTP) kurulumu zorunlu olarak istenecek.');
            break;
        }
        case 'password': {
            const admin = need(admins.byUsername(username), username);
            admins.setPassword(admin, await readPassword());
            console.log('Parola güncellendi.');
            break;
        }
        case 'disable':
        case 'enable': {
            const admin = need(admins.byUsername(username), username);
            admin.disabled = cmd === 'disable';
            admins.save(admin);
            console.log(cmd === 'disable' ? 'Hesap devre dışı bırakıldı.' : 'Hesap etkinleştirildi.');
            break;
        }
        case 'reset-2fa': {
            const admin = need(admins.byUsername(username), username);
            admins.resetTotp(admin);
            console.log('2FA sıfırlandı; bir sonraki girişte yeniden kurulum istenecek.');
            break;
        }
        case 'list': {
            const list = admins.all();
            if (!list.length) { console.log('Kayıtlı yönetici yok.'); break; }
            for (const a of list) {
                console.log(`${a.username.padEnd(20)} 2FA:${admins.is2faEnabled(a) ? 'açık ' : 'kapalı'} ${a.disabled ? 'DEVRE DIŞI' : 'aktif'}  son giriş: ${a.lastLoginAt || '—'}`);
            }
            break;
        }
        default:
            console.log('Kullanım: node tools/admin.js <kayit|sifre|kapat|etkinlestir|2fa-sifirla|liste> [kullanici-adi] [e-posta]');
            process.exitCode = 1;
    }
}

main().catch(err => { console.error('Hata:', err.message); process.exitCode = 1; });
