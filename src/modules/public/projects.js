/* ═══════════════════════════════════════════════════════════════
   modules/public/projects.js — Tüm projeler listesi.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc } = require('../../core/views');
const data = require('../../data');
const { renderProjectCard } = require('./home');

function renderProjects(req = {}) {
    const query = req.query || {};
    const q = String(query.q || '').toLowerCase().trim();
    const category = String(query.category || '');
    const free = String(query.free || '');
    const min = Number(query.min);
    const max = Number(query.max);

    let projects = data.projects()
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (q) {
        projects = projects.filter(p => String(p.name || '').toLowerCase().includes(q));
    }
    if (category) {
        projects = projects.filter(p => p.category === category);
    }
    if (free === 'true') {
        projects = projects.filter(p => p.isFree || Number(p.price || 0) <= 0);
    }
    if (free === 'paid') {
        projects = projects.filter(p => !p.isFree && Number(p.price || 0) > 0);
    }
    if (!Number.isNaN(min)) {
        projects = projects.filter(p => Number(p.price || 0) >= min);
    }
    if (!Number.isNaN(max)) {
        projects = projects.filter(p => Number(p.price || 0) <= max);
    }

    const categories = [...new Set(data.projects().map(p => p.category))].sort();

    const checkedFree = free === 'true' ? ' checked' : '';
    const checkedPaid = free === 'paid' ? ' checked' : '';

    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>Tüm Projeler</h1>
            <p class="lead">Geliştirdiğim masaüstü uygulamaları, sistem araçları ve oyunların tamamı — en yeniden en eskiye.</p>
        </header>

        <form class="project-filters" method="GET" action="/projeler" style="display:grid;gap:var(--sp-3);align-items:end;max-width:760px;margin:0 0 var(--sp-6)">
            <input name="q" placeholder="Proje ara (isim)" class="form-input" value="${esc(query.q || '')}">
            <select name="category" class="form-input">
                <option value="">Tüm kategoriler</option>
                ${categories.map(c => `<option value="${esc(c)}" ${category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
            <label style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)"><input type="radio" name="free" value="true"${checkedFree}> Sadece ücretsiz</label>
            <label style="display:flex;align-items:center;gap:var(--sp-2);font-size:var(--fs-sm)"><input type="radio" name="free" value="paid"${checkedPaid}> Sadece ücretli</label>
            <input name="min" type="number" step="0.01" placeholder="Min fiyat (₺)" class="form-input" value="${esc(query.min || '')}">
            <input name="max" type="number" step="0.01" placeholder="Maks fiyat (₺)" class="form-input" value="${esc(query.max || '')}">
            <div style="display:flex;gap:var(--sp-2)">
                <button class="btn btn-primary" type="submit">Filtrele</button>
                <a class="btn btn-ghost" href="/projeler">Sıfırla</a>
            </div>
        </form>

        ${projects.length === 0
            ? `<div class="empty-state" data-reveal>
                <h3>Aramanıza uygun proje bulunamadı</h3>
                <p>Farklı bir anahtar kelime veya filtre deneyebilirsiniz.</p>
                <a class="btn btn-primary" href="/projeler">Tüm projelere dön</a>
               </div>`
            : `<div class="popular-grid" data-reveal>${projects.map(renderProjectCard).join('')}</div>`}
    </section>`;
}

module.exports = { renderProjects };
