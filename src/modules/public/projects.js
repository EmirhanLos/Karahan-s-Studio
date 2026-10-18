/* ═══════════════════════════════════════════════════════════════
   modules/public/projects.js — Tüm projeler listesi.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc } = require('../../core/views');
const data = require('../../data');
const { renderProjectCard } = require('./home');

function renderProjects() {
    const projects = data.projects()
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>Tüm Projeler</h1>
            <p class="lead">Geliştirdiğim masaüstü uygulamaları, sistem araçları ve oyunların tamamı — en yeniden en eskiye.</p>
        </header>
        ${projects.length === 0
            ? `<div class="empty-state" data-reveal>
                <h3>Henüz proje eklenmedi</h3>
                <p>Yakınlarda burada yeni ürünler görünecek.</p>
                <a class="btn btn-primary" href="/iletisim">İletişime Geç</a>
               </div>`
            : `<div class="popular-grid" data-reveal>${projects.map(renderProjectCard).join('')}</div>`}
    </section>`;
}

module.exports = { renderProjects };
