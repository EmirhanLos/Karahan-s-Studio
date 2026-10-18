const fs   = require('fs');
const path = require('path');

const projectsJs       = require('./projects');
const users            = require('../../data/users.json');

const TRANSACTIONS_FILE = path.join(__dirname, '../../data/transactions.json');
const UPDATES_FILE      = path.join(__dirname, '../../data/updates.json');
const UPCOMING_FILE     = path.join(__dirname, '../../data/upcoming-projects.json');
const MESSAGES_FILE     = path.join(__dirname, '../../data/messages.json');

function readJson(f) { return JSON.parse(fs.readFileSync(f, 'utf8')); }

/* Sunucu tarafı HTML kaçışlama.
   Bu dosya hem sunucuda çalışan render fonksiyonlarını hem de
   şablonların içine gömülü istemci betiklerini içeriyor; istemci
   tarafındaki eşdeğer yalnızca kendi fonksiyon kapsamında. */
function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ─── İstatistik hesaplama ─── */
function calculateStats() {
    const tx  = readJson(TRANSACTIONS_FILE);
    const now = new Date();

    function from(y, m, d) { return new Date(now.getFullYear()+y, now.getMonth()+m, now.getDate()+d); }
    function sumI(d) { return tx.filter(t => new Date(t.date)>=d && t.type==='income' ).reduce((s,t)=>s+t.amount,0); }
    function sumE(d) { return tx.filter(t => new Date(t.date)>=d && t.type==='expense').reduce((s,t)=>s+t.amount,0); }

    const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const dailyI  = sumI(today);     const dailyE  = sumE(today);
    const monthI  = sumI(thisMonth); const monthE  = sumE(thisMonth);

    return {
        totalUsers: readJson(path.join(__dirname,'../../data/users.json')).length,
        daily:   { income: dailyI, expense: dailyE, profit: dailyI - dailyE },
        monthly: { income: monthI, expense: monthE, profit: monthI - monthE },
        revenue: {
            fiveYear:   sumI(from(-5,0,0)), oneYear:    sumI(from(-1,0,0)),
            sixMonth:   sumI(from(0,-6,0)), threeMonth: sumI(from(0,-3,0)),
            oneMonth:   sumI(from(0,-1,0)), fiveDay:    sumI(from(0,0,-5)),
            oneDay:     sumI(from(0,0,-1)),
        },
        recent: tx.slice(-20).reverse()
    };
}

/* ─── Çizgi grafik verisi (son 12 ay) ─── */
function buildChartData() {
    const tx  = readJson(TRANSACTIONS_FILE);
    const now = new Date();
    const labels=[], incomes=[], expenses=[];
    for (let i=11; i>=0; i--) {
        const d     = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end   = new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59);
        labels.push(d.toLocaleString('tr-TR',{month:'short',year:'2-digit'}));
        incomes.push( tx.filter(t=>{ const dt=new Date(t.date); return dt>=start&&dt<=end&&t.type==='income';  }).reduce((s,t)=>s+t.amount,0));
        expenses.push(tx.filter(t=>{ const dt=new Date(t.date); return dt>=start&&dt<=end&&t.type==='expense'; }).reduce((s,t)=>s+t.amount,0));
    }
    return { labels, incomes, expenses };
}

function fmt(n) { return Number(n).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+'₺'; }
function fmtSigned(n) { return (n>=0?'+':'')+fmt(n); }

/* ─── 12 aylık gelir/gider çizgi grafiği (SVG) ───
   Not: boyutlar (700x160) ve class/data-* isimleri admin-client.js
   içindeki "Grafik Tooltip" bölümüyle eşleşecek şekilde seçildi. */
function buildLineChart(chart) {
    const { labels, incomes, expenses } = chart;
    const W = 700, H = 160;
    const padL = 40, padR = 10, padT = 10, padB = 22;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const maxVal = Math.max(1, ...incomes, ...expenses);
    const n = labels.length;
    const stepX = n > 1 ? plotW / (n - 1) : 0;

    const xAt = (i) => padL + i * stepX;
    const yAt = (v) => padT + plotH - (v / maxVal) * plotH;

    const toPoints = (arr) => arr.map((v, i) => `${xAt(i).toFixed(2)},${yAt(v).toFixed(2)}`).join(' ');

    const incomePoints  = toPoints(incomes);
    const expensePoints = toPoints(expenses);

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = padT + plotH - f * plotH;
        return `<line x1="${padL}" y1="${y.toFixed(2)}" x2="${W - padR}" y2="${y.toFixed(2)}" stroke="rgba(255,255,255,0.08)" stroke-width="1" />`;
    }).join('');

    const xLabels = labels.map((label, i) => {
        // avoid overcrowding: show every other label if there are many months
        if (n > 8 && i % 2 !== 0) return '';
        return `<text x="${xAt(i).toFixed(2)}" y="${H - 4}" fill="var(--text-faint,#888)" font-size="7" text-anchor="middle">${label}</text>`;
    }).join('');

    const dot = (v, i, colorVar, type) => {
        const profit = incomes[i] - expenses[i];
        return `<circle cx="${xAt(i).toFixed(2)}" cy="${yAt(v).toFixed(2)}" r="3" fill="${colorVar}" class="chart-dot chart-dot--${type}" data-label="${labels[i]}" data-income="${fmt(incomes[i])}" data-expense="${fmt(expenses[i])}" data-profit="${fmtSigned(profit)}"><title>${labels[i]}: ${fmt(v)}</title></circle>`;
    };
    const incomeDots  = incomes.map((v, i) => dot(v, i, '#4ade80', 'income')).join('');
    const expenseDots = expenses.map((v, i) => dot(v, i, '#f87171', 'expense')).join('');

    return `
    <div class="chart-wrap" style="position:relative">
        <svg viewBox="0 0 ${W} ${H}" class="chart-svg line-chart-svg" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto">
            ${gridLines}
            <polyline points="${incomePoints}" fill="none" stroke="#4ade80" stroke-width="2" class="chart-line chart-line--income" />
            <polyline points="${expensePoints}" fill="none" stroke="#f87171" stroke-width="2" class="chart-line chart-line--expense" />
            ${incomeDots}
            ${expenseDots}
            ${xLabels}
        </svg>
        <div id="chartTooltip" class="chart-tooltip" style="display:none;position:absolute;background:#1a1a1a;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:.5rem .65rem;font-size:.78rem;line-height:1.5;pointer-events:none;z-index:5;white-space:nowrap"></div>
    </div>`;
}

/* ─── Dashboard render ─── */
function renderAdminDashboard({ email, users, security } = {}) {
    const stats   = calculateStats();
    const chart   = buildChartData();
    const updates = readJson(UPDATES_FILE);
    const upcoming= readJson(UPCOMING_FILE);
    const freshUsers = users || [];
    const messages = readJson(MESSAGES_FILE);
    const db = require('../../db.js');
    const inboxForms = db.getEncryptedData('inbox_forms') || [];

    // Ensure adminUser is defined for templates (server passes email)
    const adminUser = { email: email || '' };

    const profitClass = (n) => n >= 0 ? 'positive' : 'negative';

    return `
<div class="admin-wrap">

    <div class="admin-topbar">
        <h1>Admin Paneli</h1>
        <div class="admin-topbar-right">
            <span class="admin-email">${adminUser.email}</span>
            <a href="/admin/2fa/setup" class="admin-logout">Güvenlik</a>
            <a href="/admin/logout" class="admin-logout">Çıkış Yap →</a>
        </div>
    </div>

    <div class="admin-tabs" id="adminTabs">
        <button class="admin-tab active" data-tab="tab-overview">Genel Bakış</button>
        <button class="admin-tab" data-tab="tab-finance">Gelir / Gider</button>
        <button class="admin-tab" data-tab="tab-products">Ürünler</button>
        <button class="admin-tab" data-tab="tab-upcoming">Yakında</button>
        <button class="admin-tab" data-tab="tab-users">Kullanıcılar</button>
        <button class="admin-tab" data-tab="tab-updates">Güncelleme Notları</button>
        <button class="admin-tab" data-tab="tab-messages">İletişim Mesajları</button>
        <button class="admin-tab" data-tab="tab-forms">Müşteri Formları</button>
    </div>

    <div class="tab-panels">

    <!-- ══ Genel Bakış ══ -->
    <div class="tab-panel active" id="tab-overview">
        <div class="stats-grid">
            <div class="stat-card"><h3>Toplam Kullanıcı</h3><p class="stat-number">${stats.totalUsers}</p></div>
            <div class="stat-card"><h3>Günlük Gelir</h3><p class="stat-number positive">${fmt(stats.daily.income)}</p></div>
            <div class="stat-card"><h3>Günlük Gider</h3><p class="stat-number negative">${fmt(stats.daily.expense)}</p></div>
            <div class="stat-card"><h3>Günlük Kâr/Zarar</h3><p class="stat-number ${profitClass(stats.daily.profit)}">${fmtSigned(stats.daily.profit)}</p></div>
            <div class="stat-card"><h3>Aylık Gelir</h3><p class="stat-number positive">${fmt(stats.monthly.income)}</p></div>
            <div class="stat-card"><h3>Aylık Gider</h3><p class="stat-number negative">${fmt(stats.monthly.expense)}</p></div>
            <div class="stat-card"><h3>Aylık Kâr/Zarar</h3><p class="stat-number ${profitClass(stats.monthly.profit)}">${fmtSigned(stats.monthly.profit)}</p></div>
        </div>
        ${renderSecurityPanel(security || {})}
        <div class="admin-section">
            <h2 class="admin-section-title">Periyodik Ciro</h2>
            <div class="revenue-cards">
                <div class="revenue-card"><span>5 Yıl</span><strong>${fmt(stats.revenue.fiveYear)}</strong></div>
                <div class="revenue-card"><span>1 Yıl</span><strong>${fmt(stats.revenue.oneYear)}</strong></div>
                <div class="revenue-card"><span>6 Ay</span><strong>${fmt(stats.revenue.sixMonth)}</strong></div>
                <div class="revenue-card"><span>3 Ay</span><strong>${fmt(stats.revenue.threeMonth)}</strong></div>
                <div class="revenue-card"><span>1 Ay</span><strong>${fmt(stats.revenue.oneMonth)}</strong></div>
                <div class="revenue-card"><span>5 Gün</span><strong>${fmt(stats.revenue.fiveDay)}</strong></div>
                <div class="revenue-card"><span>1 Gün</span><strong>${fmt(stats.revenue.oneDay)}</strong></div>
            </div>
        </div>
    </div>

    <!-- ══ Gelir / Gider ══ -->
    <div class="tab-panel" id="tab-finance">
        <div class="admin-section">
            <h2 class="admin-section-title">Son 12 Ay — Gelir / Gider</h2>
            <div class="chart-legend">
                <span class="legend-dot legend-dot--income"></span> Gelir
                <span class="legend-dot legend-dot--expense" style="margin-left:1.25rem"></span> Gider
            </div>
            ${buildLineChart(chart)}
        </div>
        <div class="admin-section">
            <h2 class="admin-section-title">Yeni Gelir / Gider Ekle</h2>
            <form class="admin-form" id="addTransactionForm">
                <div class="form-grid form-grid--3">
                    <div class="form-group"><label>Tür</label>
                        <select name="type" id="txType" required>
                            <option value="income">Gelir</option>
                            <option value="expense">Gider</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Tutar (₺)</label>
                        <input type="number" id="txAmount" name="amount" min="0.01" step="0.01" placeholder="299.99" required>
                    </div>
                    <div class="form-group"><label>Açıklama</label>
                        <input type="text" id="txDesc" name="description" placeholder="Oyun satışı">
                    </div>
                </div>
                <button type="submit" class="btn-admin btn-admin-primary">Kaydet</button>
                <span class="tx-msg" id="txMsg"></span>
            </form>
        </div>
        <div class="admin-section">
            <h2 class="admin-section-title">Son İşlemler</h2>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Tarih</th><th>Tür</th><th>Tutar</th><th>Açıklama</th><th>İşlemler</th></tr></thead>
                    <tbody id="txTableBody">
                        ${stats.recent.map(t=>`
                        <tr id="tx-${t.id}">
                            <td>${new Date(t.date).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</td>
                            <td><span class="badge ${t.type==='income'?'badge-active':'badge-banned'}">${t.type==='income'?'Gelir':'Gider'}</span></td>
                            <td class="${t.type==='income'?'positive':'negative'}" id="tx-amt-${t.id}">${fmt(t.amount)}</td>
                            <td id="tx-desc-${t.id}">${t.description||'—'}</td>
                            <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                                <button onclick="editTx('${t.id}','${t.type}',${t.amount},'${(t.description||'').replace(/'/g,"\\'")}','${t.date}')"
                                    class="btn-admin btn-admin-secondary btn-admin-sm">Düzenle</button>
                                <button onclick="deleteTx('${t.id}')"
                                    class="btn-admin btn-admin-danger btn-admin-sm">Sil</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- İşlem Düzenleme Modal -->
        <div class="uc-modal-overlay" id="txModalOverlay" style="display:none" onclick="closeTxModal(event)">
            <div class="uc-modal" style="max-width:440px">
                <button class="uc-modal-close" onclick="closeTxModal()" aria-label="Kapat">✕</button>
                <h3 style="font-family:var(--font-display);font-size:1.1rem;margin-bottom:1.25rem">İşlemi Düzenle</h3>
                <form class="admin-form" id="editTxForm">
                    <input type="hidden" id="editTxId">
                    <div class="form-group"><label>Tür</label>
                        <select id="editTxType">
                            <option value="income">Gelir</option>
                            <option value="expense">Gider</option>
                        </select>
                    </div>
                    <div class="form-group"><label>Tutar (₺)</label>
                        <input type="number" id="editTxAmount" step="0.01" min="0.01" required>
                    </div>
                    <div class="form-group"><label>Açıklama</label>
                        <input type="text" id="editTxDesc">
                    </div>
                    <button type="submit" class="btn-admin btn-admin-primary">Kaydet</button>
                    <span class="tx-msg" id="editTxMsg" style="margin-left:.75rem"></span>
                </form>
            </div>
        </div>
    </div>

    <!-- ══ Ürünler ══ -->
    <div class="tab-panel" id="tab-products">
        <div class="admin-section">
            <h2 class="admin-section-title">Ürün Yönetimi</h2>
            <div class="admin-actions"><a href="/admin/products/add" class="btn-admin btn-admin-primary">+ Yeni Ürün Ekle</a></div>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Resim</th><th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>İndirim</th><th>Puan</th><th>İşlemler</th></tr></thead>
                    <tbody>
                        ${projectsJs.map(p=>`
                        <tr>
                            <td>${p.image?`<img src="${p.image}" style="width:48px;height:36px;object-fit:cover;border-radius:4px;border:1px solid var(--border)">`:'<span style="color:var(--text-faint);font-size:.8rem">—</span>'}</td>
                            <td>${p.name}</td>
                            <td><span class="badge badge-tag">${p.category||'—'}</span></td>
                            <td>${p.price>0?fmt(p.price):'Ücretsiz'}</td>
                            <td>${p.discount>0?'%'+p.discount:'—'}</td>
                            <td>${p.rating>0?'★ '+p.rating.toFixed(1)+' ('+p.ratingCount+')':'—'}</td>
                            <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                                <a href="/admin/products/edit/${p.id}" class="btn-admin btn-admin-secondary btn-admin-sm">Düzenle</a>
                                <form method="POST" action="/admin/products/delete/${p.id}" style="display:inline" onsubmit="return confirm('Bu ürünü silmek istediğine emin misin?')">
                                    <button type="submit" class="btn-admin btn-admin-danger btn-admin-sm">Sil</button>
                                </form>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- ══ Yakında ══ -->
    <div class="tab-panel" id="tab-upcoming">
        <div class="admin-section">
            <h2 class="admin-section-title">Yakında Eklenecek Ürünler</h2>
            <div class="admin-actions"><a href="/admin/upcoming/add" class="btn-admin btn-admin-primary">+ Yeni Ekle</a></div>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Resim</th><th>Ürün</th><th>Açıklama</th><th>Fiyat</th><th>İşlemler</th></tr></thead>
                    <tbody>
                        ${upcoming.length ? upcoming.map(p=>`
                        <tr>
                            <td>${p.image?`<img src="${p.image}" style="width:60px;height:40px;object-fit:cover;border-radius:4px;border:1px solid var(--border)">`:'—'}</td>
                            <td>${p.name}</td>
                            <td style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.description||'—'}</td>
                            <td>${p.price?fmt(p.price):'—'}</td>
                            <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                                <a href="/admin/upcoming/edit/${p.id}" class="btn-admin btn-admin-secondary btn-admin-sm">Düzenle</a>
                                <form method="POST" action="/admin/upcoming/delete/${p.id}" style="display:inline" onsubmit="return confirm('Silmek istediğine emin misin?')">
                                    <button type="submit" class="btn-admin btn-admin-danger btn-admin-sm">Sil</button>
                                </form>
                            </td>
                        </tr>`).join('') : '<tr><td colspan="5" style="color:var(--text-faint);text-align:center;padding:1.5rem">Henüz yakında ürünü eklenmedi.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- ══ Kullanıcılar ══ -->
    <div class="tab-panel" id="tab-users">
        <div class="admin-section">
            <h2 class="admin-section-title">Kullanıcı Yönetimi</h2>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>E-posta</th><th>IP</th><th>Durum</th><th>İşlemler</th></tr></thead>
                    <tbody>
                        ${freshUsers.map(u=>`
                        <tr>
                            <td>${u.email}</td>
                            <td>${u.ip}</td>
                            <td><span class="badge ${u.banned?'badge-banned':'badge-active'}">${u.banned?'Banlı':'Aktif'}</span></td>
                            <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                                ${!u.banned
                                    ?`<button onclick="banUser('${u.id}')" class="btn-admin btn-admin-danger btn-admin-sm">Banla</button>`
                                    :`<button onclick="unbanUser('${u.id}')" class="btn-admin btn-admin-secondary btn-admin-sm">Ban Kaldır</button>`}
                                <button onclick="banIP('${u.ip}')" class="btn-admin btn-admin-danger btn-admin-sm">IP Banla</button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="admin-section">
            <h2 class="admin-section-title">Yasaklı E-posta / Şifreler</h2>
            <div class="admin-actions"><a href="/admin/banned/add" class="btn-admin btn-admin-primary">+ Yeni Yasaklı Ekle</a></div>
        </div>
    </div>

    <!-- ══ Güncelleme Notları ══ -->
    <div class="tab-panel" id="tab-updates">
        <div class="admin-section">
            <h2 class="admin-section-title">Güncelleme Notları</h2>
            <div class="admin-actions"><a href="/admin/updates/add" class="btn-admin btn-admin-primary">+ Güncelleme Yayınla</a></div>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Proje</th><th>Sürüm</th><th>Başlık</th><th>Tarih</th><th>İşlemler</th></tr></thead>
                    <tbody>
                        ${updates.length ? updates.map(u=>`
                        <tr>
                            <td>${u.projectName}</td>
                            <td><span class="badge badge-tag">${u.version}</span></td>
                            <td>${u.title}</td>
                            <td>${u.dateDisplay}</td>
                            <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                                <a href="/admin/updates/edit/${u.id}" class="btn-admin btn-admin-secondary btn-admin-sm">Düzenle</a>
                                <form method="POST" action="/admin/updates/delete/${u.id}" style="display:inline" onsubmit="return confirm('Silmek istediğine emin misin?')">
                                    <button type="submit" class="btn-admin btn-admin-danger btn-admin-sm">Sil</button>
                                </form>
                            </td>
                        </tr>`).join('') : '<tr><td colspan="5" style="color:var(--text-faint);text-align:center;padding:1.5rem">Henüz güncelleme yayınlanmadı.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- ══ İletişim Mesajları ══ -->
    <div class="tab-panel" id="tab-messages">
        <div class="admin-section">
            <h2 class="admin-section-title">İletişim Mesajları</h2>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Tarih</th><th>Gönderen</th><th>E-posta</th><th>Konu</th><th>Durum</th><th>İşlemler</th></tr></thead>
                    <tbody>
                        ${messages.length ? messages.map(m=>`
                        <tr>
                            <td>${new Date(m.date).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</td>
                            <td>${m.name}</td>
                            <td>${m.email}</td>
                            <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.subject}</td>
                            <td><span class="badge ${m.status==='unread'?'badge-active':'badge-banned'}">${m.status==='unread'?'Okunmamış':'Okundu'}</span></td>
                            <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                                <button onclick="viewMessage('${m.id}')" class="btn-admin btn-admin-secondary btn-admin-sm">Görüntüle</button>
                                <button onclick="replyToMessage('${m.id}')" class="btn-admin btn-admin-primary btn-admin-sm">Yanıtla</button>
                                <form method="POST" action="/admin/messages/delete/${m.id}" style="display:inline" onsubmit="return confirm('Silmek istediğine emin misin?')">
                                    <button type="submit" class="btn-admin btn-admin-danger btn-admin-sm">Sil</button>
                                </form>
                            </td>
                        </tr>`).join('') : '<tr><td colspan="6" style="color:var(--text-faint);text-align:center;padding:1.5rem">Henüz iletişim mesajı yok.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- ══ Müşteri Formları ══ -->
    <div class="tab-panel" id="tab-forms">
        <div class="admin-section">
            <h2 class="admin-section-title">Müşteri Formları</h2>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead><tr><th>Tarih</th><th>Gönderen</th><th>Proje</th><th>E-posta</th><th>Telefon</th><th>Durum</th><th>İşlemler</th></tr></thead>
                    <tbody>
                        ${inboxForms.length ? inboxForms.map(f=>`
                        <tr>
                            <td>${new Date(f.date).toLocaleString('tr-TR',{dateStyle:'short',timeStyle:'short'})}</td>
                            <td>${f.firstName} ${f.lastName}</td>
                            <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.projectName}</td>
                            <td>${f.email||'—'}</td>
                            <td>${f.phone||'—'}</td>
                            <td><span class="badge ${f.status==='new'?'badge-active':'badge-banned'}">${f.status==='new'?'Yeni':f.status}</span></td>
                            <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                                <button onclick="viewForm('${f.id}')" class="btn-admin btn-admin-secondary btn-admin-sm">Görüntüle</button>
                                <button onclick="replyToForm('${f.id}')" class="btn-admin btn-admin-primary btn-admin-sm">Yanıtla</button>
                                <a href="/musteri-form/${f.token}" target="_blank" class="btn-admin btn-admin-secondary btn-admin-sm">Açık Link</a>
                            </td>
                        </tr>`).join('') : '<tr><td colspan="7" style="color:var(--text-faint);text-align:center;padding:1.5rem">Henüz müşteri formu yok.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    </div><!-- /tab-panels -->
</div>

<script>
/* Sekme geçişi */
(function(){
    const tabs  = document.querySelectorAll('.admin-tab');
    const panels= document.querySelectorAll('.tab-panel');
    
    // Ensure initial state is correct
    panels.forEach((p, i) => {
        if (p.classList.contains('active')) {
            p.style.display = 'block';
        } else {
            p.style.display = 'none';
        }
    });
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = tab.dataset.tab;
            if (!tabId) return;
            
            // Remove active from all tabs and panels
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => {
                p.classList.remove('active');
                p.style.display = 'none';
            });
            
            // Add active to clicked tab and corresponding panel
            tab.classList.add('active');
            const panel = document.getElementById(tabId);
            if (panel) {
                panel.classList.add('active');
                panel.style.display = 'block';
            }
        });
    });
})();

/* Gelir/gider form */
(function(){
    const form=document.getElementById('addTransactionForm');
    if(!form) return;
    form.addEventListener('submit',async e=>{
        e.preventDefault();
        const msg=document.getElementById('txMsg');
        const data={type:document.getElementById('txType').value,amount:document.getElementById('txAmount').value,description:document.getElementById('txDesc').value};
        try{
            const res=await fetch('/api/admin/transactions/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
            const json=await res.json();
            if(res.ok){msg.textContent='Kaydedildi!';msg.className='tx-msg tx-msg--ok';form.reset();setTimeout(()=>location.reload(),800);}
            else{msg.textContent=json.error||'Hata.';msg.className='tx-msg tx-msg--err';}
        }catch{msg.textContent='Bağlantı hatası.';msg.className='tx-msg tx-msg--err';}
    });
})();

async function banUser(id){if(!confirm('Banlamak istediğine emin misin?'))return;const r=await fetch('/api/admin/users/ban',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id})});if(r.ok)location.reload();}
async function unbanUser(id){const r=await fetch('/api/admin/users/unban',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:id})});if(r.ok)location.reload();}
async function banIP(ip){if(!confirm(ip+' adresini banlamak istediğine emin misin?'))return;const r=await fetch('/api/admin/ips/ban',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip})});if(r.ok)alert('IP banlandi.');}

/* ── Gelir/Gider düzenle/sil ── */
function editTx(id, type, amount, desc, date) {
    document.getElementById('editTxId').value     = id;
    document.getElementById('editTxType').value   = type;
    document.getElementById('editTxAmount').value = amount;
    document.getElementById('editTxDesc').value   = desc;
    var overlay = document.getElementById('txModalOverlay');
    overlay.style.display = 'flex';
    setTimeout(function(){ overlay.classList.add('uc-modal-open'); }, 10);
    document.body.style.overflow = 'hidden';
}
function closeTxModal(e) {
    if (e && e.target !== document.getElementById('txModalOverlay')) return;
    var overlay = document.getElementById('txModalOverlay');
    overlay.classList.remove('uc-modal-open');
    setTimeout(function(){ overlay.style.display='none'; }, 220);
    document.body.style.overflow = '';
}
(function(){
    var form = document.getElementById('editTxForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        var id   = document.getElementById('editTxId').value;
        var msg  = document.getElementById('editTxMsg');
        var data = {
            type:        document.getElementById('editTxType').value,
            amount:      parseFloat(document.getElementById('editTxAmount').value),
            description: document.getElementById('editTxDesc').value
        };
        var res  = await fetch('/api/admin/transactions/'+id, {method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        var json = await res.json();
        if (res.ok) {
            msg.textContent='Kaydedildi!'; msg.className='tx-msg tx-msg--ok';
            setTimeout(function(){ location.reload(); }, 600);
        } else {
            msg.textContent = json.error||'Hata.'; msg.className='tx-msg tx-msg--err';
        }
    });
})();
async function deleteTx(id) {
    if (!confirm('Bu işlemi silmek istediğine emin misin?')) return;
    var res = await fetch('/api/admin/transactions/'+id, {method:'DELETE'});
    if (res.ok) {
        var row = document.getElementById('tx-'+id);
        if (row) row.remove();
    } else {
        alert('Silinemedi.');
    }
}

/* ── HTML kaçışlama (görüntülenen veriler için) ── */
function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ── Mesaj görüntüle/yanıtla ── */
function viewMessage(id) {
    fetch('/api/admin/messages/'+id)
        .then(res => res.json())
        .then(msg => {
            if (!msg) return;
            
            // Create view modal with message details
            const modalHtml = '<div class="uc-modal-overlay" id="viewModalOverlay" style="display:flex"><div class="uc-modal" style="max-width:700px"><button class="uc-modal-close" onclick="closeViewModal()" aria-label="Kapat">✕</button><h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">Mesaj Detayları</h3><div class="message-details" style="background:var(--surface-2);padding:1.5rem;border-radius:8px;margin-bottom:1.5rem;border:1px solid var(--border)"><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem"><div><strong>Gönderen:</strong> ' + escapeHtml(msg.name) + '</div><div><strong>E-posta:</strong> ' + escapeHtml(msg.email) + '</div><div><strong>Konu:</strong> ' + escapeHtml(msg.subject) + '</div><div><strong>Tarih:</strong> ' + escapeHtml(new Date(msg.date).toLocaleString('tr-TR')) + '</div></div><div style="padding-top:1rem;border-top:1px solid var(--border)"><strong>Mesaj:</strong><p style="color:var(--text);margin-top:0.5rem;line-height:1.6;white-space:pre-wrap">' + escapeHtml(msg.message) + '</p></div></div><div style="display:flex;gap:0.75rem"><button onclick="closeViewModal();replyToMessage(\''+id+'\')" class="btn-admin btn-admin-primary">Yanıtla</button><button onclick="closeViewModal()" class="btn-admin btn-admin-secondary">Kapat</button></div></div></div>';
            
            // Add modal to page
            const existingModal = document.getElementById('viewModalOverlay');
            if (existingModal) existingModal.remove();
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.body.style.overflow = 'hidden';
            
            // Mark as read
            fetch('/api/admin/messages/'+id+'/read', {method:'POST'});
        })
        .catch(() => alert('Mesaj yüklenemedi.'));
}

function closeViewModal() {
    const modal = document.getElementById('viewModalOverlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function replyToMessage(id) {
    // Fetch message details to get contact info
    fetch('/api/admin/messages/'+id)
        .then(res => res.json())
        .then(msg => {
            if (!msg) return;
            
            // Create reply modal with user contact info
            const modalHtml = '<div class="uc-modal-overlay" id="replyModalOverlay" style="display:flex"><div class="uc-modal" style="max-width:600px"><button class="uc-modal-close" onclick="closeReplyModal()" aria-label="Kapat">✕</button><h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">Mesaja Yanıtla</h3><div class="reply-contact-info" style="background:var(--surface-2);padding:1rem;border-radius:8px;margin-bottom:1.5rem;border:1px solid var(--border)"><h4 style="font-size:0.9rem;color:var(--text-faint);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em">İletişim Bilgileri</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.9rem"><div><strong>Ad Soyad:</strong> ' + escapeHtml(msg.name) + '</div><div><strong>E-posta:</strong> ' + escapeHtml(msg.email) + '</div><div><strong>Konu:</strong> ' + escapeHtml(msg.subject) + '</div><div><strong>Tarih:</strong> ' + escapeHtml(new Date(msg.date).toLocaleString('tr-TR')) + '</div></div><div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)"><strong>Orijinal Mesaj:</strong><p style="color:var(--text-dim);margin-top:0.25rem;line-height:1.5">' + escapeHtml(msg.message) + '</p></div></div><form id="replyForm"><div class="form-group"><label>Yanıt Mesajı</label><textarea id="replyMessageText" rows="5" required placeholder="Yanıtınızı buraya yazın..."></textarea></div><div style="display:flex;gap:0.75rem;margin-top:1rem"><button type="submit" class="btn-admin btn-admin-primary">Gönder</button><button type="button" onclick="closeReplyModal()" class="btn-admin btn-admin-secondary">İptal</button></div></form></div></div>';
            
            // Add modal to page
            const existingModal = document.getElementById('replyModalOverlay');
            if (existingModal) existingModal.remove();
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.body.style.overflow = 'hidden';
            
            // Handle form submission
            document.getElementById('replyForm').addEventListener('submit', function(e) {
                e.preventDefault();
                const replyMessage = document.getElementById('replyMessageText').value;
                const submitBtn = this.querySelector('button[type="submit"]');
                
                // Disable button and show loading state
                submitBtn.disabled = true;
                submitBtn.textContent = 'Gönderiliyor...';
                
                fetch('/api/admin/messages/reply', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ to: msg.email, message: replyMessage })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('Yanıt gönderildi!');
                        closeReplyModal();
                        // Mark as read
                        fetch('/api/admin/messages/'+id+'/read', {method:'POST'})
                            .then(() => location.reload());
                    } else {
                        alert('Hata: ' + (data.error || 'Bilinmeyen hata'));
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Gönder';
                    }
                })
                .catch(() => {
                    alert('Bağlantı hatası.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Gönder';
                });
            });
        })
        .catch(() => alert('Mesaj yüklenemedi.'));
}

function closeReplyModal() {
    const modal = document.getElementById('replyModalOverlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

/* ── Müşteri formu görüntüle/yanıtla ── */
function viewForm(id) {
    fetch('/api/admin/musteri-form/' + encodeURIComponent(id))
        .then(res => res.json())
        .then(f => {
            if (!f) return;
            const modalHtml = '<div class="uc-modal-overlay" id="viewFormOverlay" style="display:flex"><div class="uc-modal" style="max-width:720px"><button class="uc-modal-close" onclick="closeViewForm()" aria-label="Kapat">✕</button><h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">Müşteri Formu</h3>' +
                '<div class="message-details" style="background:var(--surface-2);padding:1.5rem;border-radius:8px;margin-bottom:1.5rem;border:1px solid var(--border)">' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">' +
                '<div><strong>Gönderen:</strong> ' + escapeHtml(f.firstName) + ' ' + escapeHtml(f.lastName) + '</div>' +
                '<div><strong>E-posta:</strong> ' + escapeHtml(f.email||'—') + '</div>' +
                '<div><strong>Telefon:</strong> ' + escapeHtml(f.phone||'—') + '</div>' +
                '<div><strong>Yaş:</strong> ' + escapeHtml(f.age||'—') + '</div></div>' +
                '<div style="margin-top:.5rem"><strong>Proje:</strong><p style="color:var(--text-dim)">' + escapeHtml(f.projectName) + '</p></div>' +
                '<div style="margin-top:.5rem"><strong>Proje Amacı:</strong><p style="color:var(--text-dim)">' + escapeHtml(f.projectGoal) + '</p></div>' +
                '<div style="margin-top:.5rem"><strong>Ek Bilgiler:</strong><p style="color:var(--text-dim)">' + escapeHtml(f.additionalInfo||'—') + '</p></div>' +
                '</div>' +
                '<div style="display:flex;gap:0.75rem"><button onclick="closeViewForm();replyToForm(\'' + id + '\')" class="btn-admin btn-admin-primary">Yanıtla</button><button onclick="closeViewForm()" class="btn-admin btn-admin-secondary">Kapat</button></div>' +
                '</div></div></div>';
            const existing = document.getElementById('viewFormOverlay'); if (existing) existing.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.body.style.overflow = 'hidden';
        })
        .catch(() => alert('Form yüklenemedi.'));
}

function closeViewForm() {
    const m = document.getElementById('viewFormOverlay'); if (m) { m.remove(); document.body.style.overflow = ''; }
}

function replyToForm(id) {
    // Fetch form details to get contact info (avoids embedding raw text in onclick attributes)
    fetch('/api/admin/musteri-form/' + encodeURIComponent(id))
        .then(res => res.json())
        .then(f => {
            if (!f) return;
            if (!f.email) { alert('Bu kullanıcıya e-posta ile yanıt verilemez (e-posta adresi yok).'); return; }

            const modalHtml = '<div class="uc-modal-overlay" id="replyFormOverlay" style="display:flex"><div class="uc-modal" style="max-width:600px">' +
                '<button class="uc-modal-close" onclick="closeReplyForm()" aria-label="Kapat">✕</button>' +
                '<h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">Müşteriye Yanıt Gönder</h3>' +
                '<div class="reply-contact-info" style="background:var(--surface-2);padding:1rem;border-radius:8px;margin-bottom:1.25rem;border:1px solid var(--border)"><div><strong>' + escapeHtml(f.firstName + ' ' + f.lastName) + '</strong></div><div style="color:var(--text-faint);font-size:.9rem">' + escapeHtml(f.email||'—') + '</div></div>' +
                '<form id="replyForm" class="admin-form">' +
                '<div class="form-group"><label>Konu</label><input type="text" id="replySubject" placeholder="Konu (opsiyonel)"></div>' +
                '<div class="form-group"><label>Mesaj</label><textarea id="replyMessageText" rows="6" required placeholder="Yanıtınız..."></textarea></div>' +
                '<div style="display:flex;gap:.75rem;margin-top:.5rem"><button type="submit" class="btn-admin btn-admin-primary">Gönder</button><button type="button" class="btn-admin btn-admin-secondary" onclick="closeReplyForm()">İptal</button></div>' +
                '</form></div></div>';
            const existing = document.getElementById('replyFormOverlay'); if (existing) existing.remove();
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            document.body.style.overflow = 'hidden';

            document.getElementById('replyForm').addEventListener('submit', function(e){
                e.preventDefault();
                const subj = document.getElementById('replySubject').value;
                const msg = document.getElementById('replyMessageText').value;
                const btn = this.querySelector('button[type="submit"]');
                btn.disabled = true; btn.textContent = 'Gönderiliyor...';
                fetch('/api/admin/musteri-form/'+encodeURIComponent(id)+'/reply', {
                    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ subject: subj, message: msg })
                }).then(r=>r.json()).then(j=>{
                    if (j.success) { alert('Yanıt gönderildi.'); closeReplyForm(); location.reload(); }
                    else { alert('Hata: '+(j.error||'Bilinmeyen')); btn.disabled=false; btn.textContent='Gönder'; }
                }).catch(()=>{ alert('Bağlantı hatası'); btn.disabled=false; btn.textContent='Gönder'; });
            });
        })
        .catch(() => alert('Form yüklenemedi.'));
}

function closeReplyForm(){ const m=document.getElementById('replyFormOverlay'); if(m){m.remove();document.body.style.overflow='';} }

</script>`;
}

/* ─── Login formu ─── */
function renderAdminLogin(hasError=false) {
    return `
<div class="admin-login-wrap">
    <div class="login-box">
        <span class="login-eyebrow">Karahan's Studio</span>
        <h1>Admin Girişi</h1>
        <p class="login-sub">Panele erişmek için kimlik bilgilerini gir.</p>
        ${hasError?`<div class="login-error">E-posta veya şifre hatalı.</div>`:''}
        <form action="/admin/login" method="POST" autocomplete="off">
            <div class="form-group">
                <label for="email">E-posta</label>
                <input type="email" id="email" name="email" autocomplete="off" autocorrect="off" autocapitalize="off" placeholder="e-posta" required>
            </div>
            <div class="form-group">
                <label for="password">Şifre</label>
                <input type="password" id="password" name="password" autocomplete="new-password" placeholder="şifre" required>
            </div>
            <button type="submit" class="btn-login">Giriş Yap</button>
        </form>
    </div>
</div>`;
}

/* ═══════════════════════════════════════════════════════════════
   Yeni yönetici erişim ekranları
   Parola → TOTP iki aşamalı akış, kurulum ve kurtarma kodları
   ═══════════════════════════════════════════════════════════════ */

const GATE_ERRORS = {
    missing:   'E-posta ve parola gerekli.',
    bad:       'E-posta veya parola hatalı.',
    locked:    'Çok fazla hatalı deneme. Hesap geçici olarak kilitlendi.',
    missing2fa:'Doğrulama kodu gerekli.',
    bad2fa:    'Doğrulama kodu hatalı.',
    badrec:    'Kurtarma kodu geçersiz veya kullanılmış.'
};

const GATE_NOTICES = {
    setup2fa: 'Giriş başarılı. İkinci faktörü (2FA) etkinleştirmeniz önerilir.',
    '2faoff': 'İkinci faktör devre dışı bırakıldı.',
    loggedout:'Oturum kapatıldı.'
};

function gateErrorText(code, retry) {
    if (!code) return '';
    const base = GATE_ERRORS[code] || 'Bir şeyler ters gitti.';
    if (retry !== undefined && retry !== null && retry !== '') {
        return `${base} Kalan deneme: ${retry}.`;
    }
    return base;
}

/* ── 1. adım — parola ── */
function renderAdminGate({ error, notice, twoFactorOn, csrfToken } = {}) {
    const errMsg = error === 'locked'
        ? GATE_ERRORS.locked
        : gateErrorText(error);


    return `
    <main class="admin-gate">
      <div class="admin-gate-card">
        <div class="admin-gate-brand">
          <span class="admin-gate-logo">karahan<span>'s</span></span>
          <span class="admin-gate-badge">Yönetici</span>
        </div>

        <h1>Panel girişi</h1>
        <p class="admin-gate-sub">
          Bu alan yalnızca yetkili hesaplar içindir.
          ${twoFactorOn
            ? 'Parolanızın ardından doğrulama kodu istenecek.'
            : 'İlk girişten sonra iki faktörlü doğrulamayı etkinleştirin.'}
        </p>

        ${errMsg ? `<div class="admin-alert admin-alert--bad" role="alert">${escapeHtml(errMsg)}</div>` : ''}
        ${notice && GATE_NOTICES[notice] ? `<div class="admin-alert admin-alert--ok">${escapeHtml(GATE_NOTICES[notice])}</div>` : ''}

        <form method="POST" action="/admin/login" class="admin-form" autocomplete="on">
          <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken || '')}">

          <div class="form-group">
            <label for="gate-email">E-posta</label>
            <input type="email" id="gate-email" name="email" required
                   autocomplete="username" inputmode="email" autocapitalize="none"
                   spellcheck="false" placeholder="yonetici@ornek.com">
          </div>

          <div class="form-group">
            <label for="gate-password">Parola</label>
            <div class="input-wrapper">
              <input type="password" id="gate-password" name="password" required
                     autocomplete="current-password" placeholder="••••••••">
              <button type="button" class="password-toggle" data-pw-toggle="gate-password"
                      aria-label="Parolayı göster">
                <svg class="eye-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg class="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 3l18 18M10.6 10.7a3 3 0 004.2 4.2"/><path d="M9.4 5.2A9.8 9.8 0 0112 5c6.5 0 10.5 7 10.5 7a17 17 0 01-2.4 3.2M6.6 6.6A17 17 0 001.5 12S5.5 19 12 19c1 0 2-.2 2.9-.5"/></svg>
              </button>
            </div>
          </div>

          <button type="submit" class="btn-admin btn-admin-primary admin-gate-submit">
            Devam et
          </button>
        </form>

        <p class="admin-gate-foot">
          <a href="/">← Siteye dön</a>
        </p>
      </div>
    </main>`;
}

/* ── 2. adım — TOTP / kurtarma kodu ── */
function renderTwoFactorGate({ email, error, mode, remainingSeconds, csrfToken } = {}) {
    const isRecovery = mode === 'recovery';
    const msg = error === 'locked' ? GATE_ERRORS.locked
              : error === 'bad'   ? GATE_ERRORS.bad2fa
              : '';

    return `
    <main class="admin-gate">
      <div class="admin-gate-card">
        <div class="twofa-steps" aria-hidden="true">
          <span class="twofa-step-dot is-done"></span>
          <span class="twofa-step-dot"></span>
        </div>

        <span class="admin-gate-badge">Adım 2 / 2</span>
        <h1>Doğrulama kodu</h1>
        <p class="admin-gate-sub">
          <strong>${escapeHtml(email)}</strong> hesabı için
          ${isRecovery ? 'kurtarma kodunu girin' : 'uygulamadaki 6 haneli kodu girin'}.
        </p>

        ${msg ? `<div class="admin-alert admin-alert--bad" role="alert">${escapeHtml(msg)}</div>` : ''}

        <form method="POST" action="/admin/2fa" class="admin-form" autocomplete="off"
              data-twofa-form data-mode="${isRecovery ? 'recovery' : 'totp'}">
          <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken || '')}">

          ${isRecovery ? `
          <div class="form-group">
            <label for="tf-recovery">Kurtarma kodu</label>
            <input type="text" id="tf-recovery" name="recoveryCode" required
                   placeholder="XXXXX-XXXXX" autocapitalize="characters"
                   spellcheck="false" class="otp-input" style="letter-spacing:.16em">
            <span class="admin-field-hint">Her kod yalnızca bir kez kullanılabilir.</span>
          </div>
          ` : `
          <div class="form-group">
            <label for="tf-token">6 haneli kod</label>
            <input type="text" id="tf-token" name="token" required
                   inputmode="numeric" pattern="[0-9]*" maxlength="6"
                   autocomplete="one-time-code" placeholder="000000"
                   class="otp-input" autofocus>
            <span class="admin-field-hint" data-twofa-timer>Kodun süresi: ${remainingSeconds} sn</span>
          </div>
          `}

          <button type="submit" class="btn-admin btn-admin-primary admin-gate-submit">
            ${isRecovery ? 'Kodu doğrula' : 'Giriş yap'}
          </button>
        </form>

        <div class="admin-gate-alt">
          ${isRecovery
            ? '<a href="/admin/2fa">← Kodla devam et</a>'
            : '<a href="/admin/2fa?mode=recovery">Kodum çalışmıyor — kurtarma kodu kullan</a>'}
          <br>
          <a href="/admin/logout">Girişi iptal et</a>
        </div>
      </div>
    </main>`;
}

/* ── 2FA kurulumu ── */
function renderTwoFactorSetup({ email, secret, uri, enabled, error, csrfToken } = {}) {
    /* otpauth URI'den QR içeriği üretmek için sunucu tarafında
       görsel üretmek yerine, kullanıcıya hem QR hem de elle
       girilebilir anahtarı gösteriyoruz. */
    const grouped = (secret || '').match(/.{1,4}/g)?.join(' ') || '';

    return `
    <main class="admin-gate admin-gate--wide">
      <div class="admin-gate-card">
        <span class="admin-gate-badge">İki faktörlü doğrulama</span>
        <h1>${enabled ? '2FA yeniden yapılandır' : '2FA kurulumu'}</h1>
        <p class="admin-gate-sub">
          <strong>${escapeHtml(email)}</strong> için doğrulama kodları üreten bir
          kimlik doğrulama uygulaması gerekiyor.
          Google Authenticator, Authy, 1Password veya Bitwarden uygun.
        </p>

        ${error ? `<div class="admin-alert admin-alert--bad" role="alert">${escapeHtml(error)}</div>` : ''}

        <div class="admin-step-list">
          <div class="admin-step">
            <span class="admin-step-num">1</span>
            <div>
              <strong>Uygulamayı açın</strong>
              <p class="admin-field-hint">Yeni bir TOTP hesabı ekleyin.</p>
            </div>
          </div>

          <div class="admin-step">
            <span class="admin-step-num">2</span>
            <div style="flex:1">
              <strong>Anahtarı elle girin veya bağlantıyı kullanın</strong>
              <div class="secret-display" aria-label="Gizli anahtar">${escapeHtml(grouped)}</div>
              <span class="admin-field-hint">Kod: <code>otpauth://…</code></span>
              <a class="admin-alert-link" href="${escapeHtml(uri || '#')}" data-otpauth>
                Kimlik doğrulama uygulamasında aç ↗
              </a>
            </div>
          </div>

          <div class="admin-step">
            <span class="admin-step-num">3</span>
            <div>
              <strong>Uygulamadaki kodu doğrulayın</strong>
              <p class="admin-field-hint">Bu, kurulumun gerçekten çalıştığını kanıtlar.</p>
            </div>
          </div>
        </div>

        <form method="POST" action="/admin/2fa/setup" class="admin-form" autocomplete="off">
          <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken || '')}">
          <div class="form-group">
            <label for="setup-token">Uygulamadaki 6 haneli kod</label>
            <input type="text" id="setup-token" name="token" required inputmode="numeric"
                   pattern="[0-9]*" maxlength="6" autocomplete="one-time-code"
                   placeholder="000000" class="otp-input" autofocus>
          </div>
          <button type="submit" class="btn-admin btn-admin-primary admin-gate-submit">
            2FA'yı etkinleştir
          </button>
        </form>

        ${enabled ? `
        <hr class="admin-sep">
        <h2 class="admin-section-title">2FA'yı kapat</h2>
        <p class="admin-field-hint" style="margin-bottom:1rem">
          Kapatırsanız hesabınız yalnızca parolayla korunur.
        </p>
        <form method="POST" action="/admin/2fa/disable" class="admin-form">
          <input type="hidden" name="_csrf" value="${escapeHtml(csrfToken || '')}">
          <div class="form-group">
            <label for="disable-password">Mevcut parolanız</label>
            <input type="password" id="disable-password" name="password" required
                   autocomplete="current-password" placeholder="••••••••">
          </div>
          <button type="submit" class="btn-admin btn-admin-danger">2FA'yı kapat</button>
        </form>
        ` : ''}
      </div>
    </main>`;
}

/* ── Kurtarma kodları (yalnızca bir kez gösterilir) ── */
function renderRecoveryCodes({ email, codes } = {}) {
    return `
    <main class="admin-gate admin-gate--wide">
      <div class="admin-gate-card">
        <span class="admin-gate-badge">Son adım</span>
        <h1>Kurtarma kodlarınız</h1>
        <p class="admin-gate-sub">
          <strong>${escapeHtml(email)}</strong> için 2FA etkinleştirildi.
          Bu kodlar <strong>yalnızca şimdi</strong> gösterilir ve her biri
          yalnızca bir kez kullanılabilir. Güvenli bir yere kaydedin.
        </p>

        <div class="security-banner" style="margin-bottom:1.5rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/></svg>
          <span>Telefonunuzu kaybederseniz bu kodlardan biriyle panele girebilirsiniz.
          Panele girdikten sonra yenisini üretmeniz önerilir.</span>
        </div>

        <div class="recovery-codes">
          ${(codes || []).map(c => `<code>${escapeHtml(c)}</code>`).join('')}
        </div>

        <div class="admin-gate-actions">
          <button type="button" class="btn-admin btn-admin-secondary" data-copy-codes>Kodu kopyala</button>
          <a class="btn-admin btn-admin-primary" href="/admin">Panele git</a>
        </div>
      </div>
    </main>`;
}

/* ── Panelde gösterilecek güvenlik özeti ── */
function renderSecurityPanel(security = {}) {
    const on = Boolean(security.enabled);
    return `
    <section class="admin-section admin-security">
      <h2 class="admin-section-title">Güvenlik</h2>
      <div class="admin-security-grid">
        <div class="admin-security-item">
          <span class="admin-security-label">İki faktörlü doğrulama</span>
          <span class="admin-security-value ${on ? 'is-on' : 'is-off'}">
            ${on ? 'Etkin' : 'Kapalı'}
          </span>
        </div>
        <div class="admin-security-item">
          <span class="admin-security-label">Kalan kurtarma kodu</span>
          <span class="admin-security-value">${on ? (security.recoveryRemaining ?? 0) : '—'}</span>
        </div>
        <div class="admin-security-item">
          <span class="admin-security-label">Etkinleştirme</span>
          <span class="admin-security-value">${on && security.enabledAt ? new Date(security.enabledAt).toLocaleDateString('tr-TR') : '—'}</span>
        </div>
      </div>
      <a class="btn-admin ${on ? 'btn-admin-secondary' : 'btn-admin-primary'}"
         href="/admin/2fa/setup">
        ${on ? '2FA ayarları' : '2FA kur'}
      </a>
    </section>`;
}

module.exports = {
    renderAdminDashboard,
    renderAdminLogin,        // geriye uyumluluk
    calculateStats,
    renderAdminGate,
    renderTwoFactorGate,
    renderTwoFactorSetup,
    renderRecoveryCodes,
    renderSecurityPanel
};