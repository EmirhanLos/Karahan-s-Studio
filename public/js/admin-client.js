/* ═══════════════════════════════════════════════════════════════
   public/js/admin-client.js — Yönetim paneli SPA denetleyicisi.
   Tüm içerik admin SPA kabuğu tarafından sağlanır; bu istemci
   sadece sekmeleri arasında geçiş yapar, listeleri API'den
   çeker ve CRUD işlemlerini yönetir.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* Yönetici oturum verisi şablon içinde JSON veri bloğu olarak
       gelir (<script type="application/json">). Bu blok çalıştırılmaz,
       dolayısıyla CSP "script-src" kuralını ihlal etmez. */
    function readBootstrap() {
        const el = document.getElementById('ks-admin-bootstrap');
        if (!el) return {};
        try { return JSON.parse(el.textContent || '{}'); }
        catch { return {}; }
    }

    const cfg = readBootstrap();
    const $  = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

    const root = document.getElementById('admin-root');
    if (!root) return;

    const state = { view: 'dashboard', items: {} };

    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function money(n) {
        return Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '₺';
    }
    function date(iso) {
        if (!iso) return '—';
        try { return new Date(iso).toLocaleString('tr-TR'); } catch { return '—'; }
    }
    function fileSize(bytes) {
        const n = Number(bytes) || 0;
        if (n <= 0) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let v = n, i = 0;
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
        return `${v.toFixed(i === 0 ? 0 : 1).replace('.', ',')} ${units[i]}`;
    }
    function api(path, options = {}) {
        return fetch(path, {
            method: options.method || 'GET',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': cfg.csrf || '' },
            body: options.body ? JSON.stringify(options.body) : undefined,
            credentials: 'same-origin'
        }).then(async r => {
            const type = r.headers.get('content-type') || '';
            const payload = type.includes('application/json')
                ? await r.json()
                : null;
            if (!r.ok) {
                const message = payload?.error
                    || (r.status === 401 || r.status === 403
                        ? `Admin isteği reddedildi (HTTP ${r.status}, ${type || 'yanıt türü bilinmiyor'}). Sayfayı yenileyip tekrar deneyin.`
                        : `İstek başarısız (HTTP ${r.status}).`);
                throw new Error(message);
            }
            if (!payload) throw new Error('Sunucudan geçerli JSON yanıtı alınamadı.');
            return payload;
        });
    }

    function showView(name) {
        if (!$$('.admin-view').some(view => view.dataset.view === name)) name = 'dashboard';
        state.view = name;
        $$('.admin-view').forEach(v => v.hidden = v.dataset.view !== name);
        $$('.admin-nav-link').forEach(a => a.classList.toggle('is-active', a.dataset.view === name));
        if (location.hash !== '#' + name) history.pushState(null, '', '#' + name);
        const list = document.querySelector(`.admin-view[data-view="${name}"] [data-list]`);
        if (list) loadList(name);
    }

    function openModal(html) {
        const overlay = document.getElementById('modalOverlay');
        const body    = document.querySelector('[data-modal-body]');
        if (!overlay || !body) return;
        body.innerHTML = html;
        overlay.hidden = false;
        overlay.classList.add('is-open');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.matches('[data-action="modal-close"]')) closeModal();
        });
        document.addEventListener('keydown', escClose);
    }
    function escClose(e) { if (e.key === 'Escape') closeModal(); }
    function closeModal() {
        const overlay = document.getElementById('modalOverlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.hidden = true;
        }
        document.removeEventListener('keydown', escClose);
    }

    /* ── Listeler ── */
    async function loadList(name) {
        try {
            if (name === 'updates' || name === 'finance') {
                const [products, users] = await Promise.all([
                    api('/admin/api/products'),
                    name === 'finance' ? api('/admin/api/users') : Promise.resolve({ items: [] })
                ]);
                state.items.products = products.items || [];
                if (name === 'finance') state.items.users = users.items || [];
            }
            const data = await api(`/admin/api/${name}`);
            state.items[name] = data.items || data.data || [];
            renderList(name);
        } catch (e) {
            const list = document.querySelector(`.admin-view[data-view="${name}"] [data-list]`);
            if (list) list.innerHTML = `<div class="alert alert--bad">${esc(e.message)}</div>`;
        }
    }

    function renderList(name) {
        const container = document.querySelector(`.admin-view[data-view="${name}"] [data-list]`);
        if (!container) return;
        const items = state.items[name] || [];
        if (name === 'products')  return renderProductsTable(container, items);
        if (name === 'updates')   return renderUpdatesTable(container, items);
        if (name === 'upcoming')  return renderUpcomingTable(container, items);
        if (name === 'users')     return renderUsersTable(container, items);
        if (name === 'messages')  return renderMessagesTable(container, items);
        if (name === 'forms')     return renderFormsTable(container, items);
        if (name === 'finance')   return renderFinanceTable(container, items);
        if (name === 'banned')    return renderBannedTable(container, items);
        if (name === 'audit')     return renderAuditTable(container, items);
    }

    function table(headers, rows) {
        if (!rows.length) return `<div class="empty-state">Henüz kayıt yok.</div>`;
        return `<div class="table-wrap"><table class="table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    }

    function renderProductsTable(container, items) {
        container.innerHTML = table(
            ['Ürün', 'Kategori', 'Durum', 'Fiyat / İndirim', 'Kupon', 'Dosya', 'Tarih', 'İşlemler'],
            items.map(p => `<tr>
                <td>${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" style="width:48px;height:36px;object-fit:cover;border-radius:8px;margin-right:8px;vertical-align:middle">` : ''}<strong>${esc(p.name)}</strong></td>
                <td>${esc(p.category || '—')}</td>
                <td><span class="badge badge--${p.status === 'Yayında' ? 'ok' : 'warn'}">${esc(p.status)}</span></td>
                <td>${p.isFree || p.price <= 0 ? '<span class="badge badge--ok">Ücretsiz</span>' : `${money(p.price)}${p.discount ? ` <span class="badge badge--warn">-%${esc(p.discount)}</span>` : ''}`}</td>
                <td>${p.couponCode ? `${esc(p.couponCode)}${p.couponDiscount ? ` (-%${esc(p.couponDiscount)})` : ''}` : '—'}</td>
                <td>${p.file && p.file.stored ? `<span class="badge badge--ok" title="${esc(p.file.name || '')}">${esc((p.file.name || p.file.stored).length > 24 ? (p.file.name || p.file.stored).slice(0, 22) + '…' : (p.file.name || p.file.stored))}</span>` : '—'}</td>
                <td>${esc(p.date || '—')}</td>
                <td><div class="row" style="gap:var(--sp-2)">
                    <button class="btn btn-sm btn-secondary" data-edit="products" data-id="${esc(p.id)}">Düzenle</button>
                    <button class="btn btn-sm btn-danger"  data-delete="products" data-id="${esc(p.id)}">Sil</button>
                </div></td>
            </tr>`)
        );
    }

    function renderUpdatesTable(container, items) {
        container.innerHTML = table(
            ['Sürüm', 'Başlık', 'Proje', 'Tarih', 'İşlemler'],
            items.map(u => `<tr>
                <td><span class="badge badge--brand">v${esc(u.version || '?')}</span></td>
                <td>${esc(u.title)}</td>
                <td>${esc(u.projectName || '—')}</td>
                <td>${esc(u.date || u.createdAt || '—')}</td>
                <td><div class="row" style="gap:var(--sp-2)">
                    <button class="btn btn-sm btn-secondary" data-edit="updates" data-id="${esc(u.id)}">Düzenle</button>
                    <button class="btn btn-sm btn-danger"  data-delete="updates" data-id="${esc(u.id)}">Sil</button>
                </div></td>
            </tr>`)
        );
    }

    function renderUpcomingTable(container, items) {
        container.innerHTML = table(['Ad', 'Durum', 'Tarih', 'İşlemler'],
            items.map(u => `<tr>
                <td>${u.image ? `<img src="${esc(u.image)}" alt="" loading="lazy" style="width:48px;height:36px;object-fit:cover;border-radius:8px;margin-right:8px;vertical-align:middle">` : ''}${esc(u.name)}</td>
                <td>${esc(u.status || '—')}</td>
                <td>${esc(u.launchDate || '—')}</td>
                <td><div class="row" style="gap:var(--sp-2)">
                    <button class="btn btn-sm btn-secondary" data-edit="upcoming" data-id="${esc(u.id)}">Düzenle</button>
                    <button class="btn btn-sm btn-danger"  data-delete="upcoming" data-id="${esc(u.id)}">Sil</button>
                </div></td>
            </tr>`)
        );
    }

    function renderUsersTable(container, items) {
        container.innerHTML = table(['E-posta', 'Ad', 'Yetki', 'Durum', 'Kayıt', 'Son giriş', 'Satın aldığı ürünler', 'Gezdiği ürünler', 'İşlemler'],
            items.map(u => `<tr>
                <td>${esc(u.email)}</td>
                <td>${esc(u.firstName + ' ' + u.lastName)}</td>
                <td>${u.isAdmin ? '<span class="badge badge--brand">Yönetici</span>' : 'Kullanıcı'}</td>
                <td>${u.banned ? '<span class="badge badge--bad">Yasaklı</span>' : '<span class="badge badge--ok">Aktif</span>'}</td>
                <td>${date(u.createdAt)}</td>
                <td>${date(u.lastLoginAt)}</td>
                <td>${(u.purchases || []).length
                    ? esc(u.purchases.map(p => `${p.productName || p.description || 'Ürün'} · ${date(p.date || p.createdAt)}`).join(' | '))
                    : '—'}</td>
                <td>${(u.viewedProducts || []).length
                    ? esc(u.viewedProducts.map(p => `${p.productName} · ${date(p.viewedAt)}`).join(' | '))
                    : '—'}</td>
                <td><div class="row" style="gap:var(--sp-2)">
                    <button class="btn btn-sm btn-secondary" data-action="user-edit" data-id="${esc(u.id)}">E-posta / Parola</button>
                    <button class="btn btn-sm btn-secondary" data-action="user-admin" data-id="${esc(u.id)}">Yetki</button>
                    <button class="btn btn-sm btn-danger" data-action="user-ban" data-id="${esc(u.id)}">${u.banned ? 'Yasağı Kaldır' : 'Yasakla'}</button>
                </div></td>
            </tr>`)
        );
    }

    function renderMessagesTable(container, items) {
        if (!items.length) { container.innerHTML = `<div class="empty-state">Mesaj yok.</div>`; return; }
        container.innerHTML = `<div class="admin-list-wrap">${items.map(m => `
            <article class="admin-message ${m.read ? 'is-read' : 'is-unread'}">
                <div class="admin-message-head">
                    <div>
                        <strong>${esc(m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim())}</strong>
                        <span class="text-muted" style="font-size:var(--fs-sm);margin-left:8px">${esc(m.email)}</span>
                        <div class="text-subtle text-xs">${esc(m.subject || 'Başlıksız mesaj')} · ${date(m.date)}</div>
                    </div>
                    <div class="row" style="gap:var(--sp-2)">
                        ${!m.read ? `<button class="btn btn-sm btn-secondary" data-action="msg-read" data-id="${esc(m.id)}">Okundu</button>` : ''}
                        <button class="btn btn-sm btn-secondary" data-action="msg-details" data-id="${esc(m.id)}" aria-expanded="false">Detaylar</button>
                        <button class="btn btn-sm btn-danger" data-action="msg-delete" data-id="${esc(m.id)}">Sil</button>
                    </div>
                </div>
                <div class="admin-message-details" data-message-details="${esc(m.id)}" hidden>
                    <p><strong>Gönderen:</strong> ${esc(m.firstName || (m.name || '').split(/\s+/)[0] || '')} ${esc(m.lastName || (m.name || '').split(/\s+/).slice(1).join(' '))}</p>
                    <p><strong>E-posta:</strong> ${esc(m.email || '—')}</p>
                    <p><strong>Telefon:</strong> ${esc(m.phone || 'Belirtilmedi')}</p>
                    <p><strong>Başlık:</strong> ${esc(m.subject || '—')}</p>
                    <p><strong>Tarih:</strong> ${date(m.date)}</p>
                    <p><strong>Mesaj:</strong></p>
                    <p style="white-space:pre-wrap;color:var(--c-muted)">${esc(m.message || '')}</p>
                </div>
            </article>`).join('')}</div>`;
    }

    function renderFormsTable(container, items) {
        container.innerHTML = table(['Proje', 'Ad Soyad', 'E-posta', 'Telefon', 'Durum', 'İşlemler'],
            items.map(f => `<tr>
                <td>${esc(f.projectName || '—')}</td>
                <td>${esc((f.firstName || '') + ' ' + (f.lastName || ''))}</td>
                <td>${esc(f.email || '—')}</td>
                <td>${esc(f.phone || '—')}</td>
                <td><span class="badge badge--${f.status === 'Yeni' ? 'warn' : 'ok'}">${esc(f.status || '—')}</span></td>
                <td>
                    <select class="form-input" data-action="form-status" data-id="${esc(f.id)}" style="max-width:140px">
                        <option value="Yeni" ${f.status === 'Yeni' ? 'selected' : ''}>Yeni</option>
                        <option value="İşlemde" ${f.status === 'İşlemde' ? 'selected' : ''}>İşlemde</option>
                        <option value="Tamamlandı" ${f.status === 'Tamamlandı' ? 'selected' : ''}>Tamamlandı</option>
                        <option value="İptal" ${f.status === 'İptal' ? 'selected' : ''}>İptal</option>
                    </select>
                </td>
            </tr>`)
        );
    }

    function renderFinanceTable(container, items) {
        const inc = items.filter(t => t.type === 'income').reduce((a, t) => a + Number(t.amount || 0), 0);
        const exp = items.filter(t => t.type === 'expense').reduce((a, t) => a + Number(t.amount || 0), 0);
        const net = inc - exp;
        const toProfit = net < 0 ? (Math.round((Math.abs(net) + 0.01) * 100) / 100) : 0;
        container.innerHTML = `
            <div class="admin-grid stats">
                <article class="stat-card"><span class="stat-label">Toplam Gelir</span><span class="stat-number text-ok">${money(inc)}</span></article>
                <article class="stat-card"><span class="stat-label">Toplam Gider</span><span class="stat-number text-bad">${money(exp)}</span></article>
                <article class="stat-card"><span class="stat-label">${net < 0 ? 'Zarar' : 'Net Kâr'}</span><span class="stat-number ${net < 0 ? 'text-bad' : 'text-ok'}">${money(net)}</span></article>
                ${net < 0 ? `<article class="stat-card"><span class="stat-label">Kâra geçmek için gereken ek gelir</span><span class="stat-number">${money(toProfit)}</span></article>` : ''}
            </div>
            ${table(['Tür', 'Tutar', 'Ürün / Alıcı', 'Açıklama', 'Tarih', 'İşlemler'],
                items.slice().reverse().map(t => `<tr>
                    <td><span class="badge badge--${t.type === 'income' ? 'ok' : 'bad'}">${t.type === 'income' ? 'Gelir' : 'Gider'}</span></td>
                    <td>${money(t.amount)}</td>
                    <td>${esc(t.productName || '—')}${t.recipient ? `<br><span class="text-subtle text-xs">${esc(t.recipient)}</span>` : t.userId ? `<br><span class="text-subtle text-xs">${esc((state.items.users || []).find(u => String(u.id) === String(t.userId))?.email || '')}</span>` : ''}</td>
                    <td>${esc(t.description || '—')}</td>
                    <td>${date(t.date)}</td>
                    <td><button class="btn btn-sm btn-danger" data-delete="transactions" data-id="${esc(t.id)}">Sil</button></td>
                </tr>`)
            )}
            <div style="margin-top:var(--sp-4)">
                <button class="btn btn-primary" data-action="txn-new">Yeni İşlem</button>
            </div>`;
    }

    function renderBannedTable(container, data) {
        const b = data || { ips: [], emails: [], passwords: [] };
        const section = (label, list, type) => `
            <div class="admin-banned-section">
                <h3>${label}</h3>
                <ul class="admin-list">${(list || []).map(v => `<li><code>${esc(v)}</code>
                    <button class="btn btn-sm btn-danger" data-action="banned-remove" data-type="${type}" data-value="${esc(v)}">Kaldır</button>
                </li>`).join('') || '<li class="text-subtle text-sm">Boş.</li>'}</ul>
                <form data-banned-add data-type="${type}" class="row" style="gap:var(--sp-2);margin-top:var(--sp-3)">
                    <input type="text" class="form-input" name="value" placeholder="${label} ekle" required>
                    <button class="btn btn-secondary" type="submit">Ekle</button>
                </form>
            </div>`;
        container.innerHTML = section('IP Adresleri', b.ips, 'ips')
            + section('E-postalar', b.emails, 'emails')
            + section('Parolalar', b.passwords, 'passwords');
    }

    function renderAuditTable(container, items) {
        container.innerHTML = table(['Zaman', 'Tür', 'IP', 'Aktör', 'Detay'],
            items.map(a => `<tr>
                <td>${date(a.at)}</td>
                <td><code style="font-size:var(--fs-xs)">${esc(a.type)}</code></td>
                <td>${esc(a.ip || '—')}</td>
                <td>${a.actorId || '—'}</td>
                <td>${esc(a.detail || '—')}</td>
            </tr>`)
        );
    }

    /* ── Form şablonları (modal için) ── */
    function productForm(p = {}) {
        const file = (p.file && typeof p.file === 'object') ? p.file : null;
        return `<h2 style="margin-bottom:var(--sp-4)">${p.id ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h2>
        <form class="auth-form" data-form="products" data-id="${esc(p.id || '')}">
            <div class="form-row">
                <div class="form-group"><label class="form-label">Ad</label><input name="name" class="form-input" value="${esc(p.name || '')}" required></div>
                <div class="form-group"><label class="form-label">Kategori</label>
                    <select name="category" class="form-input">
                        <option ${p.category === 'Araç' ? 'selected' : ''}>Araç</option>
                        <option ${p.category === 'Oyun' ? 'selected' : ''}>Oyun</option>
                        <option ${p.category === 'Sistem Aracı' ? 'selected' : ''}>Sistem Aracı</option>
                        <option ${p.category === 'Web Uygulaması' ? 'selected' : ''}>Web Uygulaması</option>
                    </select></div>
            </div>
            <div class="form-group"><label class="form-label">Durum</label>
                <select name="status" class="form-input">
                    <option ${p.status === 'Yayında' ? 'selected' : ''}>Yayında</option>
                    <option ${p.status === 'Beta' ? 'selected' : ''}>Beta</option>
                    <option ${p.status === 'Yakında' ? 'selected' : ''}>Yakında</option>
                </select></div>
            <div class="form-group"><label class="form-label">Kart özeti</label><input name="summary" class="form-input" value="${esc(p.summary || p.description || '')}"></div>
            <div class="form-group"><label class="form-label">Açıklama</label><textarea name="description" rows="3">${esc(p.description || '')}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Fiyat (₺)</label><input name="price" type="number" min="0" step="0.01" class="form-input" value="${p.price || 0}"></div>
                <div class="form-group"><label class="form-label">İndirim (%)</label><input name="discount" type="number" min="0" max="100" class="form-input" value="${p.discount || 0}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">İndirim kuponu</label><input name="couponCode" class="form-input" value="${esc(p.couponCode || '')}" placeholder="Örn. YAZ2026"></div>
                <div class="form-group"><label class="form-label">Kupon indirimi (%)</label><input name="couponDiscount" type="number" min="0" max="100" class="form-input" value="${p.couponDiscount || 0}"></div>
            </div>
            <div class="form-group"><label class="form-label">Görsel URL</label><input name="image" class="form-input" value="${esc(p.image || '')}"></div>
            <div class="form-group">
                <label class="form-label">Ürün dosyası (cihazdan yükle)</label>
                <div class="row" style="gap:var(--sp-2);flex-wrap:wrap">
                    <input type="file" name="file" data-product-file class="form-input" style="flex:1;min-width:220px">
                    <button type="button" class="btn btn-secondary" data-action="file-clear" ${file ? '' : 'hidden'}>Kaldır</button>
                </div>
                <input type="hidden" name="fileData" value="${file ? esc(JSON.stringify(file)) : ''}">
                <p class="form-hint" data-file-status>${file
                    ? `Yüklü dosya: ${esc(file.name || file.stored)}${file.size ? ` · ${fileSize(file.size)}` : ''}`
                    : 'Yayınlanan ürünler bu dosyayı "İndir" düğmesiyle indirir. "Yakında"/"Geliştirmede" ürünler indirilemez.'}</p>
            </div>
            <div class="form-group"><label class="form-label">Özellikler (her satıra bir özellik · "Başlık | Açıklama" yazabilirsiniz)</label><textarea name="features" rows="4" placeholder="Hızlı temizlik | Tek tıkla tüm dosyaları siler&#10;Karanlık tema">${esc((p.features || []).join('\n'))}</textarea></div>
            <label class="row" style="gap:var(--sp-2);margin-bottom:var(--sp-4)">
                <input name="isFree" type="checkbox" value="true" ${p.isFree ? 'checked' : ''}>
                Ücretsiz yayınla
            </label>
            <div class="row" style="gap:var(--sp-3)">
                <button type="submit" class="btn btn-primary">Kaydet</button>
                <button type="button" class="btn btn-ghost" data-action="modal-close">İptal</button>
            </div>
        </form>`;
    }

    function updateForm(u = {}) {
        return `<h2 style="margin-bottom:var(--sp-4)">${u.id ? 'Güncelleme Düzenle' : 'Yeni Güncelleme'}</h2>
        <form class="auth-form" data-form="updates" data-id="${esc(u.id || '')}">
            <div class="form-group"><label class="form-label">Ürün</label>
                <select name="productId" class="form-input" required>
                    <option value="">Ürün seçin</option>
                    ${(state.items.products || []).map(p => `<option value="${esc(p.id)}" ${String(p.id) === String(u.productId) ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Sürüm</label><input name="version" class="form-input" value="${esc(u.version || '')}" required></div>
                <div class="form-group"><label class="form-label">Yayın tarihi</label><input name="date" class="form-input" type="date" value="${esc((u.date || '').slice(0, 10))}"></div>
            </div>
            <div class="form-group"><label class="form-label">Başlık</label><input name="title" class="form-input" value="${esc(u.title || '')}" required></div>
            <div class="form-group"><label class="form-label">Açıklama</label><textarea name="description" rows="4">${esc(u.description || '')}</textarea></div>
            <div class="form-group"><label class="form-label">Görsel URL</label><input name="image" class="form-input" value="${esc(u.image || '')}"></div>
            <div class="row" style="gap:var(--sp-3)">
                <button type="submit" class="btn btn-primary">Kaydet</button>
                <button type="button" class="btn btn-ghost" data-action="modal-close">İptal</button>
            </div>
        </form>`;
    } 

    function upcomingForm(u = {}) {
        return `<h2 style="margin-bottom:var(--sp-4)">${u.id ? 'Yakında Ürünü Düzenle' : 'Yeni'}</h2>
        <form class="auth-form" data-form="upcoming" data-id="${esc(u.id || '')}">
            <div class="form-group"><label class="form-label">Ad</label><input name="name" class="form-input" value="${esc(u.name || '')}" required></div>
            <div class="form-group"><label class="form-label">Açıklama</label><textarea name="description" rows="3">${esc(u.description || '')}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Tarih</label><input name="launchDate" type="date" class="form-input" value="${esc((u.launchDate || '').slice(0, 10))}"></div>
                <div class="form-group"><label class="form-label">Fiyat (₺)</label><input name="price" type="number" class="form-input" value="${u.price || 0}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Durum</label>
                    <select name="status" class="form-input">
                        <option value="Yayınlandı" ${u.status === 'Yayınlandı' || u.status === 'Yayında' ? 'selected' : ''}>Yayınlandı</option>
                        <option value="Geliştirmede" ${!u.status || u.status === 'Geliştirmede' ? 'selected' : ''}>Geliştirmede</option>
                    </select></div>
                <div class="form-group"><label class="form-label">Ana sayfada öne çıkar</label>
                    <select name="featured" class="form-input"><option value="false" ${u.featured ? '' : 'selected'}>Hayır</option><option value="true" ${u.featured ? 'selected' : ''}>Evet</option></select>
                </div>
            </div>
            <div class="form-group"><label class="form-label">Görsel URL</label><input name="image" class="form-input" value="${esc(u.image || '')}"></div>
            <div class="row" style="gap:var(--sp-3)">
                <button type="submit" class="btn btn-primary">Kaydet</button>
                <button type="button" class="btn btn-ghost" data-action="modal-close">İptal</button>
            </div>
        </form>`;
    }

    function txnForm(t = {}) {
        return `<h2 style="margin-bottom:var(--sp-4)">Yeni İşlem</h2>
        <form class="auth-form" data-form="transactions">
            <div class="form-row">
                <div class="form-group"><label class="form-label">Tür</label>
                    <select name="type" class="form-input"><option value="income">Gelir</option><option value="expense">Gider</option></select></div>
                <div class="form-group"><label class="form-label">Tutar (₺)</label><input name="amount" type="number" min="0.01" step="0.01" class="form-input" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label class="form-label">Ürün (isteğe bağlı)</label>
                    <select name="productId" class="form-input"><option value="">Ürün seçilmedi</option>${(state.items.products || []).map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">Alıcı (isteğe bağlı)</label><input name="recipient" class="form-input"></div>
            </div>
            <div class="form-group"><label class="form-label">Açıklama</label><input name="description" class="form-input"></div>
            <div class="form-group"><label class="form-label">Tarih</label><input name="date" type="date" class="form-input" value="${new Date().toISOString().slice(0, 10)}"></div>
            <div class="row" style="gap:var(--sp-3)">
                <button type="submit" class="btn btn-primary">Kaydet</button>
                <button type="button" class="btn btn-ghost" data-action="modal-close">İptal</button>
            </div>
        </form>`;
    }

    function userForm(u = {}) {
        return `<h2 style="margin-bottom:var(--sp-2)">Kullanıcı bilgilerini düzenle</h2>
        <p class="text-subtle text-sm" style="margin-bottom:var(--sp-4)">Mevcut parola güvenlik nedeniyle görüntülenemez. Yeni parola belirlerseniz eskisi değiştirilir.</p>
        <form class="auth-form" data-form="users" data-id="${esc(u.id)}">
            <div class="form-group"><label class="form-label">E-posta</label><input name="email" type="email" class="form-input" value="${esc(u.email || '')}" required></div>
            <div class="form-group"><label class="form-label">Yeni parola (isteğe bağlı)</label><input name="password" type="password" minlength="8" class="form-input" autocomplete="new-password"></div>
            <div class="row" style="gap:var(--sp-3)">
                <button type="submit" class="btn btn-primary">Kaydet</button>
                <button type="button" class="btn btn-ghost" data-action="modal-close">İptal</button>
            </div>
        </form>`;
    }

    /* ── Olay yönetimi ── */
    async function onClick(e) {
        const t = e.target.closest('[data-action],[data-edit],[data-delete],[data-nav]');
        if (!t) return;
        if (t.hasAttribute('data-nav') && t.dataset.view) {
            e.preventDefault();
            showView(t.dataset.view);
            return;
        }
        const id   = t.dataset.id;
        const name = t.dataset.edit || t.dataset.delete;
        if (t.dataset.edit) {
            const item = (state.items[name] || []).find(x => String(x.id) === String(id));
            if (name === 'products') openModal(productForm(item));
            if (name === 'updates')  openModal(updateForm(item));
            if (name === 'upcoming') openModal(upcomingForm(item));
        }
        if (t.dataset.delete) {
            if (!confirm('Silmek istediğinizden emin misiniz?')) return;
            try { await api(`/admin/api/${t.dataset.delete}/${id}`, { method: 'DELETE' }); loadList(state.view); }
            catch (e) { alert(e.message); }
        }
        if (t.dataset.action === 'product-new') openModal(productForm());
        if (t.dataset.action === 'update-new')  openModal(updateForm());
        if (t.dataset.action === 'upcoming-new') openModal(upcomingForm());
        if (t.dataset.action === 'txn-new')     openModal(txnForm());
        if (t.dataset.action === 'banned-new')   openModal(`<h2>Yeni Yasaklı</h2>
            <form class="auth-form" id="bannedQuickForm">
                <div class="form-group"><label class="form-label">Tür</label>
                    <select name="type" class="form-input"><option value="ips">IP</option><option value="emails">E-posta</option><option value="passwords">Parola</option></select></div>
                <div class="form-group"><label class="form-label">Değer</label><input name="value" class="form-input" required></div>
                <div class="row" style="gap:var(--sp-3)">
                    <button class="btn btn-primary" type="submit">Ekle</button>
                    <button class="btn btn-ghost" type="button" data-action="modal-close">İptal</button>
                </div>
            </form>`);
        if (t.dataset.action === 'user-ban' || t.dataset.action === 'user-admin') {
            const path = t.dataset.action === 'user-ban' ? 'ban' : 'admin';
            try { await api(`/admin/api/users/${id}/${path}`, { method: 'POST' }); loadList('users'); }
            catch (e) { alert(e.message); }
        }
        if (t.dataset.action === 'user-edit') {
            const user = (state.items.users || []).find(item => String(item.id) === String(id));
            if (user) openModal(userForm(user));
        }
        if (t.dataset.action === 'msg-read') {
            try { await api(`/admin/api/messages/${id}/read`, { method: 'POST' }); loadList('messages'); }
            catch (e) { alert(e.message); }
        }
        if (t.dataset.action === 'msg-details') {
            const details = $$('[data-message-details]').find(node => node.dataset.messageDetails === id);
            if (details) {
                details.hidden = !details.hidden;
                t.setAttribute('aria-expanded', String(!details.hidden));
            }
        }
        if (t.dataset.action === 'msg-delete') {
            if (!confirm('Mesajı silmek istediğinizden emin misiniz?')) return;
            try { await api(`/admin/api/messages/${id}`, { method: 'DELETE' }); loadList('messages'); }
            catch (e) { alert(e.message); }
        }
        if (t.dataset.action === 'banned-remove') {
            try { await api('/admin/api/banned', { method: 'DELETE', body: { type: t.dataset.type, value: t.dataset.value } }); loadList('banned'); }
            catch (e) { alert(e.message); }
        }
        if (t.dataset.action === 'file-clear') {
            const form = t.closest('form[data-form="products"]');
            if (form) {
                const input = form.querySelector('input[type="file"][data-product-file]');
                const hidden = form.querySelector('input[name="fileData"]');
                const status = form.querySelector('[data-file-status]');
                if (input) input.value = '';
                if (hidden) hidden.value = '';
                if (status) status.textContent = 'Dosya kaldırıldı — kaydederseniz ürün indirilemez olur.';
                t.hidden = true;
            }
        }
        if (t.dataset.action === 'audit-refresh') loadList('audit');
    }

    async function onSubmit(e) {
        const bannedForm = e.target.closest('form[data-banned-add],form#bannedQuickForm');
        if (bannedForm) {
            e.preventDefault();
            const values = Object.fromEntries(new FormData(bannedForm).entries());
            const body = bannedForm.id === 'bannedQuickForm'
                ? values
                : { type: bannedForm.dataset.type, value: values.value };
            try {
                await api('/admin/api/banned', { method: 'POST', body });
                closeModal();
                loadList('banned');
            } catch (error) { alert(error.message); }
            return;
        }
        const form = e.target.closest('form[data-form]');
        if (!form) return;
        e.preventDefault();
        const name = form.dataset.form;
        const id   = form.dataset.id;
        const fd   = new FormData(form);
        const body = Object.fromEntries(fd.entries());
        if (name === 'products') {
            body.price = Number(body.price) || 0;
            body.discount = Number(body.discount) || 0;
            body.couponDiscount = Number(body.couponDiscount) || 0;
            body.isFree = fd.has('isFree');
            body.features = String(body.features || '').split('\n').map(x => x.trim()).filter(Boolean);
            if (!body.summary) body.summary = body.description || '';
            delete body.file;
            try { body.file = body.fileData ? JSON.parse(body.fileData) : null; } catch (parseError) { body.file = null; }
            delete body.fileData;
        }
        if (name === 'transactions') body.amount = Number(body.amount) || 0;
        if (name === 'upcoming' || name === 'products') body.featured = body.featured === 'true';
        if (name === 'users' && !body.password) delete body.password;
        try {
            await api(`/admin/api/${name}${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', body });
            closeModal();
            loadList(name);
        } catch (e) { alert(e.message); }
    }

    async function uploadProductFile(input) {
        const form = input.closest('form[data-form="products"]');
        const file = input.files && input.files[0];
        if (!form || !file) return;
        const hidden = form.querySelector('input[name="fileData"]');
        const status = form.querySelector('[data-file-status]');
        const clearBtn = form.querySelector('[data-action="file-clear"]');
        const submit = form.querySelector('button[type="submit"]');
        if (!hidden) return;
        if (submit) submit.disabled = true;
        if (status) status.textContent = `Yükleniyor: ${file.name}…`;
        try {
            const fd = new FormData();
            fd.append('file', file);
            const r = await fetch('/admin/api/products/upload', {
                method: 'POST',
                headers: { 'X-CSRF-Token': cfg.csrf || '' },
                body: fd,
                credentials: 'same-origin'
            });
            const payload = await r.json().catch(() => null);
            if (!r.ok || !payload || !payload.ok) throw new Error((payload && payload.error) || `Yükleme başarısız (HTTP ${r.status}).`);
            hidden.value = JSON.stringify(payload.file);
            if (status) status.textContent = `Yüklendi: ${payload.file.name}${payload.file.size ? ` · ${fileSize(payload.file.size)}` : ''}`;
            if (clearBtn) clearBtn.hidden = false;
        } catch (e) {
            alert(e.message);
            input.value = '';
            if (status) status.textContent = 'Dosya yüklenemedi, yeniden deneyin.';
        } finally {
            if (submit) submit.disabled = false;
        }
    }

    async function onChange(e) {
        const fileInput = e.target.closest('input[type="file"][data-product-file]');
        if (fileInput) { uploadProductFile(fileInput); return; }
        const sel = e.target.closest('select[data-action="form-status"]');
        if (sel) {
            try { await api(`/admin/api/forms/${sel.dataset.id}/status`, { method: 'POST', body: { status: sel.value } }); }
            catch (e) { alert(e.message); }
        }
    }

    /* ── Mikro-animasyon: istatistik sayaçlarında rAF ile sayım ──
       Yalnızca görsel; tamsayı değerlerde çalışır, para biçimli
       (₺, ondalık) değerleri ve reduced-motion tercihini atlar. */
    function animateStatNumbers() {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        document.querySelectorAll('.stat-number').forEach(el => {
            const raw = el.textContent.trim();
            if (!/^\d+$/.test(raw)) return;
            const end = parseInt(raw, 10);
            const start = performance.now();
            const dur = 700;
            function frame(now) {
                const p = Math.min((now - start) / dur, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                el.textContent = String(Math.round(end * eased));
                if (p < 1) requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
        });
    }

    function init() {
        /* Kabuk + ilk görünüm sunucu tarafından hazırlanır.
           Burada yalnızca sekmeleri, modalı ve olayları bağlarız. */
        const initial = (location.hash || '#dashboard').slice(1);
        showView(initial);
        animateStatNumbers();
        document.addEventListener('click', onClick);
        document.addEventListener('submit', onSubmit);
        document.addEventListener('change', onChange);
        window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
