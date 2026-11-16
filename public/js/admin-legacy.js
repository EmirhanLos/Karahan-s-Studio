/* ═══════════════════════════════════════════════════════════════
   js/admin-legacy.js — Eski yönetim paneli şablonunun istemci betiği.

   Bu dosya, public/js/admin.js şablonunda satır içi olarak bulunan
   <script> bloğunun dışarı taşınmış hâlidir. CSP "script-src"
   kuralında 'unsafe-inline' bulunmadığı için onclick/onsubmit gibi
   satır içi olay işleyicileri çalıştırılmaz.

   Bunun yerine:
     · düğmeler  data-action="fn" data-action-args="a,b,c"
     · formlar  data-confirm="onay metni"
   özniteliklerini kullanır ve aşağıdaki temsilci (delegated)
   dinleyici bunları global fonksiyonlara bağlar.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── Argüman ayrıştırıcı ─────────────────────────────────
       data-action-args içeriği JS çağrı sözdizimine benzer:
       "'12','income',500,'açıklama'". Tırnak içindeki metinler
       birebir aktarılır, sayılar sayıya çevrilir. */
    function parseArgs(raw) {
        if (!raw) return [];
        const args = [];
        let i = 0;
        while (i < raw.length) {
            while (i < raw.length && /[\s,]/.test(raw[i])) i++;
            if (i >= raw.length) break;
            const ch = raw[i];
            if (ch === "'" || ch === '"') {
                const quote = ch;
                i++;
                let out = '';
                while (i < raw.length) {
                    if (raw[i] === '\\') { out += raw[i + 1] ?? ''; i += 2; continue; }
                    if (raw[i] === quote) { i++; break; }
                    out += raw[i];
                    i++;
                }
                args.push(out);
            } else {
                let out = '';
                while (i < raw.length && !/[\s,]/.test(raw[i])) { out += raw[i]; i++; }
                const num = Number(out);
                args.push(out !== '' && Number.isFinite(num) ? num : out);
            }
        }
        return args;
    }

    function invoke(name, args) {
        const fn = window[name];
        if (typeof fn !== 'function') return false;
        fn.apply(null, args);
        return true;
    }

    /* ── Temsilci dinleyiciler ──────────────────────────────── */

    document.addEventListener('click', function (event) {
        const el = event.target.closest('[data-action]');
        if (!el) return;
        event.preventDefault();

        const name = el.getAttribute('data-action');
        const args = parseArgs(el.getAttribute('data-action-args'));
        invoke(name, args);

        /* Ardışık ikinci eylem (ör. kapat + yanıtla). */
        const next = el.getAttribute('data-action-next');
        if (next) {
            invoke(next, parseArgs(el.getAttribute('data-action-next-args')));
        }
    });

    document.addEventListener('submit', function (event) {
        const form = event.target;
        if (!form || !form.getAttribute) return;
        const message = form.getAttribute('data-confirm');
        if (message && !window.confirm(message)) {
            event.preventDefault();
        }
    });
})();

/* ═══════════════════════════════════════════════════════════════
   Aşağıdaki bölüm public/js/admin.js şablonundaki satır içi
   <script> bloğundan birebir taşındı. Satır içi onclick
   öznitelikleri yerine data-action kullanılır.
   ═══════════════════════════════════════════════════════════════ */

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
function closeTxModal() {
    var overlay = document.getElementById('txModalOverlay');
    if (!overlay) return;
    overlay.classList.remove('uc-modal-open');
    setTimeout(function(){ overlay.style.display='none'; }, 220);
    document.body.style.overflow = '';
}
/* Overlay'in kendisine tıklanınca kapanır; içeriğe tıklanınca kapanmaz. */
(function(){
    var overlay = document.getElementById('txModalOverlay');
    if (!overlay) return;
    overlay.addEventListener('click', function(e){
        if (e.target !== overlay) return;
        closeTxModal();
    });
})();
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
            const modalHtml = '<div class="uc-modal-overlay" id="viewModalOverlay" style="display:flex"><div class="uc-modal" style="max-width:700px"><button class="uc-modal-close" data-action="closeViewModal" aria-label="Kapat">✕</button><h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">Mesaj Detayları</h3><div class="message-details" style="background:var(--surface-2);padding:1.5rem;border-radius:8px;margin-bottom:1.5rem;border:1px solid var(--border)"><div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem"><div><strong>Gönderen:</strong> ' + escapeHtml(msg.name) + '</div><div><strong>E-posta:</strong> ' + escapeHtml(msg.email) + '</div><div><strong>Konu:</strong> ' + escapeHtml(msg.subject) + '</div><div><strong>Tarih:</strong> ' + escapeHtml(new Date(msg.date).toLocaleString('tr-TR')) + '</div></div><div style="padding-top:1rem;border-top:1px solid var(--border)"><strong>Mesaj:</strong><p style="color:var(--text);margin-top:0.5rem;line-height:1.6;white-space:pre-wrap">' + escapeHtml(msg.message) + '</p></div></div><div style="display:flex;gap:0.75rem"><button data-action="closeViewModal" data-action-next="replyToMessage" data-action-next-args="\'' + id + '\'" class="btn-admin btn-admin-primary">Yanıtla</button><button data-action="closeViewModal" class="btn-admin btn-admin-secondary">Kapat</button></div></div></div>';

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
            const modalHtml = '<div class="uc-modal-overlay" id="replyModalOverlay" style="display:flex"><div class="uc-modal" style="max-width:600px"><button class="uc-modal-close" data-action="closeReplyModal" aria-label="Kapat">✕</button><h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">Mesaja Yanıtla</h3><div class="reply-contact-info" style="background:var(--surface-2);padding:1rem;border-radius:8px;margin-bottom:1.5rem;border:1px solid var(--border)"><h4 style="font-size:0.9rem;color:var(--text-faint);margin-bottom:0.75rem;text-transform:uppercase;letter-spacing:0.05em">İletişim Bilgileri</h4><div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;font-size:0.9rem"><div><strong>Ad Soyad:</strong> ' + escapeHtml(msg.name) + '</div><div><strong>E-posta:</strong> ' + escapeHtml(msg.email) + '</div><div><strong>Konu:</strong> ' + escapeHtml(msg.subject) + '</div><div><strong>Tarih:</strong> ' + escapeHtml(new Date(msg.date).toLocaleString('tr-TR')) + '</div></div><div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)"><strong>Orijinal Mesaj:</strong><p style="color:var(--text-dim);margin-top:0.25rem;line-height:1.5">' + escapeHtml(msg.message) + '</p></div></div><form id="replyForm"><div class="form-group"><label>Yanıt Mesajı</label><textarea id="replyMessageText" rows="5" required placeholder="Yanıtınızı buraya yazın..."></textarea></div><div style="display:flex;gap:0.75rem;margin-top:1rem"><button type="submit" class="btn-admin btn-admin-primary">Gönder</button><button type="button" data-action="closeReplyModal" class="btn-admin btn-admin-secondary">İptal</button></div></form></div></div>';

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
                    headers: {'Content-Type':'application/json'},
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
            const modalHtml = '<div class="uc-modal-overlay" id="viewFormOverlay" style="display:flex"><div class="uc-modal" style="max-width:720px"><button class="uc-modal-close" data-action="closeViewForm" aria-label="Kapat">✕</button><h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">Müşteri Formu</h3>' +
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
                '<div style="display:flex;gap:0.75rem"><button data-action="closeViewForm" data-action-next="replyToForm" data-action-next-args="\'' + id + '\'" class="btn-admin btn-admin-primary">Yanıtla</button><button data-action="closeViewForm" class="btn-admin btn-admin-secondary">Kapat</button></div>' +
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
                '<button class="uc-modal-close" data-action="closeReplyForm" aria-label="Kapat">✕</button>' +
                '<h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1rem">Müşteriye Yanıt Gönder</h3>' +
                '<div class="reply-contact-info" style="background:var(--surface-2);padding:1rem;border-radius:8px;margin-bottom:1.25rem;border:1px solid var(--border)"><div><strong>' + escapeHtml(f.firstName + ' ' + f.lastName) + '</strong></div><div style="color:var(--text-faint);font-size:.9rem">' + escapeHtml(f.email||'—') + '</div></div>' +
                '<form id="replyForm" class="admin-form">' +
                '<div class="form-group"><label>Konu</label><input type="text" id="replySubject" placeholder="Konu (opsiyonel)"></div>' +
                '<div class="form-group"><label>Mesaj</label><textarea id="replyMessageText" rows="6" required placeholder="Yanıtınız..."></textarea></div>' +
                '<div style="display:flex;gap:.75rem;margin-top:.5rem"><button type="submit" class="btn-admin btn-admin-primary">Gönder</button><button type="button" class="btn-admin btn-admin-secondary" data-action="closeReplyForm">İptal</button></div>' +
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
