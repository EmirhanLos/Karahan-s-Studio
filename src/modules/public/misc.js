/* ═══════════════════════════════════════════════════════════════
   modules/public/misc.js — Diğer genel sayfalar:
   hakkında, güncellemeler, yakında, iletişim, müşteri formu,
   yasal sayfalar, 404, yasak.
   ═══════════════════════════════════════════════════════════════ */
'use strict';

const { esc, date } = require('../../core/views');
const data = require('../../data');
const { getProductUpdates } = require('./product');
const { asset } = require('./assets');

const ICON = {
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    bulb:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.5.4 1 1 1 2v.3h6v-.3c0-1 .5-1.6 1-2A7 7 0 0 0 12 2z"/></svg>',
    code:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    flag:  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    mail:  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    pin:   '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
};

/* ═══ Hakkında ═══ */
function renderAbout() {
    const skills = [
        { icon: ICON.code, title: 'Masaüstü Uygulamalar', desc: 'Electron, Qt, native' },
        { icon: ICON.bulb, title: 'Sistem Araçları', desc: 'Pardus, Linux, Windows' },
        { icon: ICON.flag, title: 'Oyunlar', desc: '2D, 3D, mekanik' }
    ];

    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1 data-split>Hakkında</h1>
            <p class="lead">Karahan's Studio; fikirden çalışan yazılıma uzanan yolculuğu tek elden yönetiyor. Tasarım, geliştirme, dağıtım — hepsi burada.</p>
        </header>

        <section class="product-section" data-reveal>
            <div class="grid-2">
                <article class="surface" style="padding:var(--sp-6)">
                    <h3 style="margin-bottom:var(--sp-3)">Yaklaşım</h3>
                    <p>Her proje, gerçek bir ihtiyaçtan doğar. Kullanıcıyı dinleyerek, küçük başlayarak, hızlı yineleyerek geliştiriyorum. Mükemmel değil, kullanılabilir ve sürdürülebilir olanı hedefliyorum.</p>
                </article>
                <article class="surface" style="padding:var(--sp-6)">
                    <h3 style="margin-bottom:var(--sp-3)">Süreç</h3>
                    <p>Keşif &rarr; Prototip &rarr; Alfa &rarr; Beta &rarr; Yayın. Her aşamada geri bildirim ve ölçüm. Açık kaynak kütüphaneler, standartlar, tarayıcı uyumluluğu.</p>
                </article>
            </div>
        </section>

        <section class="product-section" data-reveal>
            <h2 style="margin-bottom:var(--sp-5)">Uzmanlık</h2>
            <div class="grid-3">
                ${skills.map(s => `
                <article class="feature-item surface">
                    <span class="icon-tile" style="margin-bottom:var(--sp-3)">${s.icon}</span>
                    <h4>${esc(s.title)}</h4>
                    <p>${esc(s.desc)}</p>
                </article>`).join('')}
            </div>
        </section>
    </section>`;
}

/* ═══ Güncelleme Notları ═══ */
function renderUpdates(product = null) {
    const updates = product
        ? getProductUpdates(product)
        : data.updates().sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
    const productIdForUpdate = update => {
        if (update.productId) return update.productId;
        const owner = data.projects().find(project =>
            (project.updates || []).some(item => item.id && String(item.id) === String(update.id))
        );
        return owner?.id;
    };
    const updateDetailHref = update => {
        const productId = product ? product.id : productIdForUpdate(update);
        return productId && update.id
            ? `/guncellemeler/${esc(productId)}/${esc(update.id)}`
            : `/guncellemeler/${esc(productId || '')}`;
    };

    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>${product ? `${esc(product.name)} Güncellemeleri` : 'Güncelleme Notları'}</h1>
            <p class="lead">${product ? `${esc(product.name)} için yayınlanan güncellemeler.` : 'Tüm projelerdeki yeni sürümler, hata düzeltmeleri ve iyileştirmeler.'}</p>
        </header>
        ${updates.length === 0
            ? `<div class="empty-state" data-reveal><h3>Henüz güncelleme yok</h3><p>Yeni sürümler burada görünecek.</p></div>`
            : `<div class="updates-list">${updates.map(u => `
                <article class="update-card surface" id="guncelleme-${esc(u.id)}" data-reveal>
                    <div class="update-card-left">
                        ${u.image
                            ? `<img src="${esc(u.image)}" alt="${esc(u.title || 'Güncelleme')}" loading="lazy">`
                            : `<div class="slider-placeholder">${esc((u.version || 'v').charAt(0).toUpperCase())}</div>`}
                    </div>
                    <div class="update-card-body">
                        <div class="update-meta-top">
                            <span class="badge badge--brand">v${esc(String(u.version || '').replace(/^v/i, ''))}</span>
                            ${u.projectName ? `<span class="update-project">${esc(u.projectName)}</span>` : ''}
                            <span class="update-date">${date(u.date || u.createdAt)}</span>
                        </div>
                        <h3 class="update-card-title">${esc(u.title || 'Güncelleme')}</h3>
                        <p class="update-card-desc">${esc(u.description || '')}</p>
                        <div class="update-card-foot">
                            <a class="btn btn-ghost btn-sm" href="${updateDetailHref(u)}">Tüm Detaylar ${ICON.arrow}</a>
                        </div>
                    </div>
                </article>`).join('')}</div>`}
    </section>`;
}

function renderUpdateDetail(update, product) {
    const version = String(update.version || '').replace(/^v/i, '');
    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <article class="release-detail">
            <a class="release-detail-back" href="/guncellemeler/${esc(product.id)}">← ${esc(product.name)} güncellemeleri</a>
            <div class="release-detail-meta">
                <span class="badge badge--brand">v${esc(version)}</span>
                <time datetime="${esc(update.date || update.createdAt || '')}">${date(update.date || update.createdAt)}</time>
            </div>
            <h1 class="release-detail-title">${esc(update.title || 'Güncelleme')}</h1>
            <p class="release-detail-product">${esc(product.name)}</p>
            <div class="release-detail-rule" aria-hidden="true"></div>
            <p class="release-detail-description">${esc(update.description || '')}</p>
            ${update.image ? `
            <figure class="release-detail-media">
                <img src="${esc(update.image)}" alt="${esc(update.title || 'Güncelleme')}" loading="lazy">
            </figure>` : ''}
        </article>
    </section>`;
}

/* ═══ Yakında ═══ */
function renderUpcoming(user = null) {
    const userEmail = user ? String(user.email || '').trim() : '';
    const items = data.upcoming()
        .sort((a, b) => (a.launchDate || '').localeCompare(b.launchDate || ''));

    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>Yakında</h1>
            <p class="lead">Çalışmamızın altında olan projeler. Çıkış tarihi yaklaşanlar üstte.</p>
        </header>
        ${items.length === 0
            ? `<div class="empty-state" data-reveal><h3>Şu an açıklanmış yeni ürün yok</h3><p>Yeni proje duyuruları burada paylaşılacak.</p></div>`
            : `<div class="upcoming-list">${items.map((u, i) => `
                <article class="upcoming-card surface ${i === 0 ? 'upcoming-card-wide' : ''}" data-reveal>
                    <div class="upcoming-card-body">
                        <div class="row" style="margin-bottom:var(--sp-3)">
                            <span class="badge badge--brand">${esc(u.status || 'Geliştirmede')}</span>
                            <span class="text-subtle text-xs">${date(u.launchDate || u.createdAt)}</span>
                        </div>
                        <h3 class="upcoming-card-title">${esc(u.name)}</h3>
                        <p class="upcoming-card-desc">${esc(u.description || '')}</p>
                        <a class="btn btn-ghost btn-sm" href="/urun/${esc(u.id || '')}">${u.id ? 'Detay' : 'Yakında'}</a>
                        <button class="btn btn-primary btn-sm btn-waitlist"
                                data-id="${esc(u.id || '')}"
                                data-email="${esc(userEmail)}"
                                type="button">Yayınlanınca Haber Ver</button>
                    </div>
                    <div class="upcoming-card-visual">
                        ${u.image
                            ? `<img src="${esc(u.image)}" alt="${esc(u.name)}" loading="lazy">`
                            : `<div class="slider-placeholder">${esc((u.name || 'Y').charAt(0).toUpperCase())}</div>`}
                    </div>
                </article>`).join('')}</div>`}
    </section>
    <script src="${asset('/js/bekleme-listesi.js')}" defer></script>`;
}

/* ═══ İletişim ═══ */
function renderContact({ error = null, success = null, csrf = '', values = {} } = {}) {
    const v = (k, fallback = '') => values[k] || fallback;

    return `
    <section class="container" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>İletişim</h1>
            <p class="lead">Sorularınız, iş birliği teklifleriniz veya destek için aşağıdaki kanallardan birini kullanın.</p>
        </header>

        <div class="contact-grid">
            <aside class="contact-info" data-reveal>
                <article class="contact-info-item">
                    <span class="contact-info-icon">${ICON.mail}</span>
                    <div>
                        <span class="contact-info-label">E-posta</span>
                        <span class="contact-info-value">iletisim@karahans.com</span>
                    </div>
                </article>
                <article class="contact-info-item">
                    <span class="contact-info-icon">${ICON.phone}</span>
                    <div>
                        <span class="contact-info-label">Telefon</span>
                        <span class="contact-info-value">+90 533 661 97 49</span>
                    </div>
                </article>
                <article class="contact-info-item">
                    <span class="contact-info-icon">${ICON.pin}</span>
                    <div>
                        <span class="contact-info-label">Konum</span>
                        <span class="contact-info-value">Ankara, Türkiye</span>
                    </div>
                </article>
            </aside>

            <div class="contact-form-card" data-reveal>
                ${success ? `<div class="form-success"><span class="icon">${ICON.check}</span><span><strong>Mesaj gönderildi.</strong> ${esc(success)}</span></div>` : ''}
                ${error ? `<div class="alert alert--bad">${esc(error)}</div>` : ''}
                <form method="POST" action="/iletisim" class="contact-form" novalidate>
                    <input type="hidden" name="_csrf" value="${esc(csrf)}">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="name">Ad Soyad</label>
                            <input id="name" name="name" type="text" required class="form-input" value="${esc(v('name'))}" placeholder="Adınız Soyadınız" autocomplete="name" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="email">E-posta</label>
                            <input id="email" name="email" type="email" required class="form-input" value="${esc(v('email'))}" placeholder="ornek@ornek.com" autocomplete="email" inputmode="email" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="phone">Telefon <span class="text-subtle">(opsiyonel)</span></label>
                        <input id="phone" name="phone" type="tel" class="form-input" value="${esc(v('phone'))}" placeholder="+90 5xx xxx xx xx" autocomplete="tel" inputmode="tel">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="subject">Konu</label>
                        <input id="subject" name="subject" type="text" required class="form-input" value="${esc(v('subject'))}" placeholder="Mesajınızın konusu" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="message">Mesaj</label>
                        <textarea id="message" name="message" required rows="6" placeholder="Mesajınızı buraya yazın..." required>${esc(v('message'))}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-label" style="font-size:var(--fs-sm);font-weight:500;color:var(--c-muted);text-transform:none;letter-spacing:0">
                            <input type="checkbox" name="consent" required>
                            <span><a href="/gizlilik-sozlesmesi">Gizlilik sözleşmesini</a> okudum, onaylıyorum.</span>
                        </label>
                    </div>
                    <button class="btn btn-primary" type="submit">Mesajı Gönder</button>
                </form>
            </div>
        </div>
    </section>`;
}

/* ═══ Müşteri Formu ═══ */
function renderCustomerForm({ error = null, success = null, csrf = '', project = null, values = {} } = {}) {
    const v = (k, fb = '') => values[k] || fb;
    return `
    <section class="container-narrow" style="padding-top:var(--sp-6)">
        <header class="page-header" data-reveal>
            <h1>Müşteri Formu</h1>
            <p class="lead">${project ? `Proje: <strong>${esc(project.name)}</strong> için özelleştirme talebi oluşturun.` : 'Özelleştirme istek formu.'}</p>
        </header>

        <div class="contact-form-card" data-reveal>
            ${success ? `<div class="form-success"><span class="icon">${ICON.check}</span><span><strong>Talebin alındı.</strong> ${esc(success)}</span></div>` : ''}
            ${error ? `<div class="alert alert--bad">${esc(error)}</div>` : ''}
            <form method="POST" class="contact-form" novalidate>
                <input type="hidden" name="_csrf" value="${esc(csrf)}">
                <input type="hidden" name="projectId" value="${esc(project?.id || '')}">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="firstName">Ad</label>
                        <input id="firstName" name="firstName" type="text" required class="form-input" value="${esc(v('firstName'))}" autocomplete="given-name" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="lastName">Soyad</label>
                        <input id="lastName" name="lastName" type="text" required class="form-input" value="${esc(v('lastName'))}" autocomplete="family-name" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="email">E-posta</label>
                        <input id="email" name="email" type="email" required class="form-input" value="${esc(v('email'))}" autocomplete="email" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="phone">Telefon</label>
                        <input id="phone" name="phone" type="tel" required class="form-input" value="${esc(v('phone'))}" autocomplete="tel" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="age">Yaş</label>
                        <input id="age" name="age" type="number" min="14" max="120" class="form-input" value="${esc(v('age'))}">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="budget">Bütçe Aralığı</label>
                        <select id="budget" name="budget" class="form-input">
                            <option value="">Seçin</option>
                            <option value="low" ${v('budget') === 'low' ? 'selected' : ''}>5.000 - 20.000 ₺</option>
                            <option value="mid" ${v('budget') === 'mid' ? 'selected' : ''}>20.000 - 50.000 ₺</option>
                            <option value="high" ${v('budget') === 'high' ? 'selected' : ''}>50.000 ₺ ve üstü</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label" for="projectGoal">Proje Amacı</label>
                    <textarea id="projectGoal" name="projectGoal" rows="5" placeholder="Neler başarmak istiyorsunuz?" required>${esc(v('projectGoal'))}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="additionalInfo">Ek Bilgi <span class="text-subtle">(opsiyonel)</span></label>
                    <textarea id="additionalInfo" name="additionalInfo" rows="3" placeholder="Başka söylemek istedikleriniz">${esc(v('additionalInfo'))}</textarea>
                </div>
                <div class="form-group">
                    <label class="checkbox-label" style="font-size:var(--fs-sm);font-weight:500;color:var(--c-muted);text-transform:none;letter-spacing:0">
                        <input type="checkbox" name="consent" required>
                        <span><a href="/kvkk">KVKK aydınlatma metnini</a> okudum.</span>
                    </label>
                </div>
                <button class="btn btn-primary" type="submit">Talebi Gönder</button>
            </form>
        </div>
    </section>`;
}

/* ═══ Yasal ═══ */
const LEGAL = {
    kullanim: {
        title: 'Kullanım Şartları',
        updated: '2026-08-14',
        sections: [
            { h: 'Genel', p: ['Bu kullanım şartları, karahans.com web sitesi ve tüm alt alanları üzerinden sağlanan hizmetlerin kullanımına ilişkin koşulları düzenler. Siteyi kullanarak bu şartları kabul etmiş sayılırsınız.'] },
            { h: 'Hesap Sorumlulukları', p: ['Hesabınızın güvenliği size aittir. Şifrenizi kimseyle paylaşmayın, iki faktörlü doğrulamayı etkinleştirin. Hesabınız üzerinden yapılan tüm işlemlerden siz sorumlusunuz.'] },
            { h: 'Fikri Mülkiyet', p: ['Sitedeki tüm içerikler (yazılım, tasarım, metin, görseller) Karahan\'s Studio\'ya aittir. İzinsiz kopyalanamaz, çoğaltılamaz veya dağıtılamaz.'] },
            { h: 'Hizmet Değişiklikleri', p: ['Önceden bildirimde bulunmaksızın hizmetlerde değişiklik yapma, askıya alma veya sonlandırma hakkımız saklıdır.'] },
            { h: 'Sorumluluk Sınırı', p: ['Hizmetin kesintisiz veya hatasız olacağını garanti etmiyoruz. Dolaylı zararlardan sorumlu değiliz.'] }
        ]
    },
    gizlilik: {
        title: 'Gizlilik Sözleşmesi',
        updated: '2026-08-14',
        sections: [
            { h: 'Toplanan Veriler', p: ['Hesap oluştururken ad, soyad, e-posta, telefon numarası; sipariş sırasında fatura ve adres bilgileri; teknik veriler olarak IP, tarayıcı ve cihaz bilgileri toplanır.'] },
            { h: 'Verilerin Kullanımı', p: ['Toplanan veriler yalnızca hizmetin sağlanması, geliştirilmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla kullanılır. Üçüncü taraflarla paylaşılmaz.'] },
            { h: 'Çerezler', p: ['Sitemizde zorunlu çerezler (oturum, güvenlik), performans çerezleri ve tercih çerezleri (tema) kullanılmaktadır. Tarayıcı ayarlarından çerezleri yönetebilirsiniz.'] },
            { h: 'Veri Saklama Süresi', p: ['Hesap verileri hesap aktif olduğu sürece, hesap kapatıldıktan sonra 1 yıl daha yasal yükümlülükler için saklanır.'] },
            { h: 'Haklarınız', p: ['KVKK kapsamında verilerinize erişme, düzeltme, silme ve işlenmesini kısıtlama haklarına sahipsiniz. Başvuru için iletişim sayfasını kullanabilirsiniz.'] }
        ]
    },
    teslimat: {
        title: 'Teslimat ve İade Şartları',
        updated: '2026-08-14',
        sections: [
            { h: 'Dijital Teslimat', p: ['Tüm ürünlerimiz dijital üründür. Satın alma sonrası indirme bağlantısı e-posta ile gönderilir ve hesabınızda görünür. Fiziksel kargo yoktur.'] },
            { h: 'İade Koşulları', p: ['Ücretsiz yazılımlarda iade yoktur. Ücretli yazılımlarda satın alma tarihinden itibaren 14 gün içinde, yazılım indirilmediyse ve lisans etkinleştirilmediyse iade yapılabilir.'] },
            { h: 'İade Süreci', p: ['İade talepleri iletisim@karahans.com adresine yazılı olarak iletilir. Uygunluk değerlendirildikten sonra 7 iş günü içinde iade gerçekleştirilir.'] }
        ]
    },
    mesafeli: {
        title: 'Mesafeli Satış Sözleşmesi',
        updated: '2026-08-14',
        sections: [
            { h: 'Taraflar', p: ['Satıcı: Karahan\'s Studio (Ankara, Türkiye). Alıcı: sipariş formunda belirtilen gerçek/tüzel kişi.'] },
            { h: 'Sözleşmenin Kurulması', p: ['Mesafeli satış sözleşmesi, alıcının sipariş onayı ve ödemesi ile kurulmuş sayılır.'] },
            { h: 'Cayma Hakkı', p: ['Ücretli dijital ürünlerde, ürünün indirilmemesi ve lisansın etkinleştirilmemesi koşuluyla 14 gün içinde cayma hakkı kullanılabilir. Ücretsiz ürünlerde cayma hakkı yoktur.'] },
            { h: 'Uyuşmazlık Çözümü', p: ['Uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.'] }
        ]
    },
    kvkk: {
        title: 'KVKK Aydınlatma Metni',
        updated: '2026-08-14',
        sections: [
            { h: 'Veri Sorumlusu', p: ['6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca veri sorumlusu sıfatıyla Karahan\'s Studio, kullanıcılarına ait kişisel verileri aşağıdaki çerçevede işlemektedir.'] },
            { h: 'İşlenen Veriler', p: ['Kimlik (ad, soyad), iletişim (e-posta, telefon), lokasyon (adres), işlem (sipariş) verileri, çerez kayıtları, log kayıtları.'] },
            { h: 'İşleme Amaçları', p: ['Hizmetin sağlanması, sözleşme süreçleri, yasal yükümlülükler, talep ve şikayet yönetimi, güvenlik.'] },
            { h: 'Veri Aktarımı', p: ['Yurtdışına veri aktarımı yalnızca yeterli koruma kararı bulunan ülkelere veya açık rıza alınarak yapılabilir.'] },
            { h: 'Haklarınız', p: ['Kişisel verilerinize ilişkin bilgi alma, düzeltme, silme, işlenmesini kısıtlama, otomatik işleme itiraz etme haklarına sahipsiniz. Başvurularınızı iletisim@karahans.com üzerinden iletebilirsiniz.'] }
        ]
    }
};

function renderLegal(kind) {
    const doc = LEGAL[kind];
    if (!doc) return '';
    return `
    <article class="legal-shell" data-reveal>
        <header style="margin-bottom:var(--sp-8)">
            <span class="badge badge--neutral">Yasal</span>
            <h1 style="margin-block:var(--sp-3)">${esc(doc.title)}</h1>
            <p class="legal-date">Son güncelleme: ${date(doc.updated)}</p>
        </header>
        ${doc.sections.map(s => `
        <section class="legal-section">
            <h2>${esc(s.h)}</h2>
            ${s.p.map(p => `<p>${esc(p)}</p>`).join('')}
        </section>`).join('')}
    </article>`;
}

/* ═══ Hata Sayfaları (404, 403, 500, 429, 400, 503) ═══ */
function renderErrorPage({ code = '500', badge = 'Hata', title = 'Bir sorun oluştu', lead = '', note = '', actions = [] }) {
    const defaultActions = [
        { label: 'Ana Sayfaya Dön', href: '/', primary: true },
        { label: 'Projeleri Keşfet', href: '/projeler' }
    ];
    const finalActions = actions.length ? actions : defaultActions;

    return `
    <section class="notfound" data-reveal>
        <div class="notfound-code">${esc(String(code))}</div>
        <div class="row" style="justify-content:center;margin-bottom:var(--sp-2)">
            <span class="badge ${code === '404' ? 'badge--neutral' : (code === '500' || code === '503' ? 'badge--bad' : 'badge--brand')}">${esc(badge)}</span>
        </div>
        <h1>${esc(title)}</h1>
        <p class="lead" style="max-width:540px;margin-inline:auto">${esc(lead)}</p>
        ${note ? `<p class="text-subtle text-sm" style="margin-top:var(--sp-2)">${esc(note)}</p>` : ''}
        <div class="row" style="justify-content:center;gap:var(--sp-3);margin-top:var(--sp-5);flex-wrap:wrap">
            ${finalActions.map(a => `<a class="btn ${a.primary ? 'btn-primary' : 'btn-secondary'}" href="${esc(a.href)}">${esc(a.label)}</a>`).join('')}
        </div>
    </section>`;
}

function renderNotFound() {
    return renderErrorPage({
        code: '404',
        badge: 'Sayfa Bulunamadı',
        title: 'Aradığınız sayfa kaybolmuş olabilir',
        lead: 'Ulaşmaya çalıştığınız sayfa taşınmış, silinmiş ya da adresi yanlış yazılmış olabilir. Aşağıdaki bağlantıları kullanarak aradığınızı bulabilirsiniz.',
        actions: [
            { label: 'Ana Sayfaya Dön', href: '/', primary: true },
            { label: 'Projeler', href: '/projeler' },
            { label: 'İletişim', href: '/iletisim' }
        ]
    });
}

function render500(message = '') {
    return renderErrorPage({
        code: '500',
        badge: 'Sunucu Hatası',
        title: 'Beklenmeyen bir aksaklık meydana geldi',
        lead: 'Sunucularımız bu isteği işlerken geçici bir sorunla karşılaştı. Teknik ekibimiz durumdan haberdar edildi.',
        note: message ? `Hata detayı: ${message}` : 'Lütfen sayfayı birkaç saniye sonra yeniden yüklemeyi deneyin.',
        actions: [
            { label: 'Yeniden Dene', href: 'javascript:location.reload()', primary: true },
            { label: 'Ana Sayfaya Dön', href: '/' },
            { label: 'Destek & İletişim', href: '/iletisim' }
        ]
    });
}

function render403(reason = '') {
    return renderErrorPage({
        code: '403',
        badge: 'Erişim Engellendi',
        title: 'Bu alana erişim yetkiniz bulunmuyor',
        lead: reason || 'Görüntülemeye çalıştığınız içerik yetkilendirme gerektiriyor veya hesabınız bu işlem için sınırlandırılmış olabilir.',
        note: 'Bir yanlışlık olduğunu düşünüyorsanız destek ekibimizle iletişime geçebilirsiniz.',
        actions: [
            { label: 'Ana Sayfaya Dön', href: '/', primary: true },
            { label: 'Giriş Yap', href: '/giris' },
            { label: 'İletişime Geç', href: '/iletisim' }
        ]
    });
}

function render429(retryAfter = '') {
    return renderErrorPage({
        code: '429',
        badge: 'Çok Fazla İstek',
        title: 'İstek sınırına ulaşıldı',
        lead: 'Kısa süre içinde çok fazla istek gönderildi. Sistem güvenliğini ve sunucu performansını korumak için geçici olarak sınırlandınız.',
        note: retryAfter ? `Lütfen ${retryAfter} sonra tekrar deneyin.` : 'Lütfen 1-2 dakika bekleyip tekrar deneyin.',
        actions: [
            { label: 'Yeniden Dene', href: 'javascript:location.reload()', primary: true },
            { label: 'Ana Sayfa', href: '/' }
        ]
    });
}

function render400(detail = '') {
    return renderErrorPage({
        code: '400',
        badge: 'Geçersiz İstek',
        title: 'İstek doğrulanamadı',
        lead: detail || 'Gönderilen form verisi veya güvenlik anahtarı (CSRF) geçersiz veya süresi dolmuş. Güvenliğiniz için işlem tamamlanamadı.',
        note: 'Sayfayı yenileyip formu tekrar doldurarak deneyebilirsiniz.',
        actions: [
            { label: 'Geri Dön ve Tekrar Dene', href: 'javascript:history.back()', primary: true },
            { label: 'Ana Sayfa', href: '/' }
        ]
    });
}

function render503() {
    return renderErrorPage({
        code: '503',
        badge: 'Bakım Modu',
        title: 'Hizmet geçici olarak kullanım dışı',
        lead: 'Sistemlerimizde planlı bir güncelleme veya altyapı bakımı yapılıyor. En kısa sürede tekrar yayında olacağız.',
        actions: [
            { label: 'Durumu Kontrol Et', href: 'javascript:location.reload()', primary: true }
        ]
    });
}

/* ═══ Yasak ═══ */
function renderBanned(reason = '') {
    return `
    <section class="ban-page" data-reveal>
        <div class="ban-container">
            <svg class="ban-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <h1>Hesabınız askıya alındı</h1>
            ${reason ? `<p class="ban-reason">${esc(reason)}</p>` : ''}
            <p class="ban-note">İtiraz için iletisim@karahans.com adresine yazabilirsiniz.</p>
        </div>
    </section>`;
}

module.exports = {
    renderAbout, renderUpdates, renderUpdateDetail, renderUpcoming, renderContact, renderCustomerForm,
    renderLegal, renderNotFound, render500, render403, render429, render400, render503, renderErrorPage, renderBanned, LEGAL
};
