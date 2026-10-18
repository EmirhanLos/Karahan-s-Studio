function legalPage(eyebrow, title, sections) {
    const sectionsHtml = sections.map(s => `
    <div class="legal-section">
        ${s.heading ? `<h2>${s.heading}</h2>` : ''}
        ${s.body}
    </div>`).join('');

    return `
    <main>
        <div class="page-header">
            <span class="hero-eyebrow">${eyebrow}</span>
            <h1>${title}</h1>
        </div>
        <div class="legal-wrap container">
            <p class="legal-date">Son güncelleme: 15 Ağustos 2026</p>
            ${sectionsHtml}
        </div>
    </main>`;
}

/* ── Kullanım Şartları ── */
function renderKullanimSartlari() {
    return legalPage('Yasal', 'Kullanım Şartları', [
        {
            body: `<p>Karahan's Studio'nun ("Stüdyo") web sitesi ve ürünlerini kullanarak aşağıdaki kullanım şartlarını kabul etmiş olursunuz. Bu şartları kabul etmiyorsanız hizmetlerimizi kullanmayınız.</p>`
        },
        {
            heading: '1. Hizmetlerin Kapsamı',
            body: `<p>Stüdyo, masaüstü uygulamaları, sistem araçları, oyunlar ve web tabanlı hizmetler sunmaktadır. Her ürünün lisans koşulları ürün sayfasında ayrıca belirtilmiştir.</p>`
        },
        {
            heading: '2. Kullanıcı Yükümlülükleri',
            body: `<ul>
                <li>Hizmetleri yalnızca yasal amaçlarla kullanmalısınız.</li>
                <li>Diğer kullanıcılara zarar verecek eylemlerden kaçınmalısınız.</li>
                <li>Hesap bilgilerinizi üçüncü şahıslarla paylaşmamalısınız.</li>
                <li>Yazılımları tersine mühendislik, kopyalama veya dağıtım amaçlı kullanamazsınız.</li>
            </ul>`
        },
        {
            heading: '3. Fikri Mülkiyet',
            body: `<p>Site üzerindeki tüm içerik, yazılım, tasarım ve materyaller Karahan's Studio'nun mülkiyetindedir. Önceden yazılı izin alınmadan kullanılamaz, çoğaltılamaz veya dağıtılamaz.</p>`
        },
        {
            heading: '4. Sorumluluk Sınırlaması',
            body: `<p>Stüdyo, hizmetlerin kesintisiz veya hatasız olacağını garanti etmez. Doğrudan veya dolaylı zararlardan sorumlu tutulamaz.</p>`
        },
        {
            heading: '5. Değişiklikler',
            body: `<p>Bu kullanım şartları önceden bildirimde bulunulmaksızın güncellenebilir. Güncel versiyona bu sayfa üzerinden ulaşabilirsiniz.</p>`
        },
        {
            heading: '6. İletişim',
            body: `<p>Sorularınız için: <a href="/iletisim">İletişim formunu</a> kullanabilirsiniz.</p>`
        }
    ]);
}

/* ── Gizlilik Sözleşmesi ── */
function renderGizlilikSozlesmesi() {
    return legalPage('Yasal', 'Gizlilik Sözleşmesi', [
        {
            body: `<p>Bu Gizlilik Politikası, Karahan's Studio tarafından sunulan hizmetlerin kullanımı sırasında toplanan kişisel verilerin nasıl işlendiğini açıklamaktadır.</p>`
        },
        {
            heading: '1. Toplanan Veriler',
            body: `<ul>
                <li><strong>Hesap bilgileri:</strong> Ad, e-posta adresi, telefon numarası.</li>
                <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı türü, cihaz bilgileri.</li>
                <li><strong>İşlem verileri:</strong> Satın alma geçmişi, ödeme bilgileri (kart numarası yalnızca maskeli şekilde saklanır).</li>
                <li><strong>İletişim verileri:</strong> İletişim formu aracılığıyla iletilen mesajlar.</li>
            </ul>`
        },
        {
            heading: '2. Verilerin Kullanım Amacı',
            body: `<ul>
                <li>Hizmetlerin sağlanması ve yönetimi</li>
                <li>Sipariş ve ödeme işlemlerinin gerçekleştirilmesi</li>
                <li>Kullanıcı desteğinin sağlanması</li>
                <li>Güvenlik ve dolandırıcılık önleme</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            </ul>`
        },
        {
            heading: '3. Veri Paylaşımı',
            body: `<p>Kişisel verileriniz; yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz. Ödeme işlemleri güvenli altyapı üzerinden gerçekleştirilir.</p>`
        },
        {
            heading: '4. Çerezler',
            body: `<p>Site, oturum yönetimi ve deneyimi iyileştirmek amacıyla çerezler kullanmaktadır. Tarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz.</p>`
        },
        {
            heading: '5. Haklarınız',
            body: `<p>KVKK kapsamında; verilerinize erişme, düzeltme, silme ve işlemeyi kısıtlama haklarına sahipsiniz. Talepler için <a href="/iletisim">iletişim sayfamızı</a> kullanabilirsiniz.</p>`
        }
    ]);
}

/* ── Teslimat ve İade Şartları ── */
function renderTeslimatIade() {
    return legalPage('Yasal', 'Teslimat ve İade Şartları', [
        {
            heading: 'Teslimat Koşulları',
            body: `<p>Karahan's Studio dijital ürünler sunmaktadır. Satın alım tamamlandıktan sonra ürünlere anında erişim sağlanır. Fiziksel kargo söz konusu değildir.</p>
            <ul>
                <li>Lisans anahtarları ve indirme bağlantıları e-posta yoluyla iletilir.</li>
                <li>Teknik sorun yaşanması durumunda <a href="/iletisim">iletişime geçebilirsiniz</a>.</li>
            </ul>`
        },
        {
            heading: 'İade Koşulları',
            body: `<p>Dijital ürünlerin niteliği gereği, ürün teslim edilip kullanılmaya başlandıktan sonra iade kabul edilmemektedir. Ancak aşağıdaki durumlarda iade değerlendirilebilir:</p>
            <ul>
                <li>Ürün hiç çalışmıyorsa ve 7 gün içinde bildirim yapılmışsa</li>
                <li>Satın alınan ürün tanımlananla önemli ölçüde farklıysa</li>
            </ul>
            <p>İade talepleri için <a href="/iletisim">iletişim formunu</a> kullanınız. Talepler 3-5 iş günü içinde yanıtlanır.</p>`
        },
        {
            heading: 'Ödeme Güvenliği',
            body: `<p>Tüm ödemeler SSL şifreli bağlantı üzerinden gerçekleştirilir. Kart bilgileri sunucularımızda saklanmaz.</p>`
        }
    ]);
}

/* ── Mesafeli Satış Sözleşmesi ── */
function renderMesafeliSatis() {
    return legalPage('Yasal', 'Mesafeli Satış Sözleşmesi', [
        {
            heading: 'Taraflar',
            body: `<p><strong>Satıcı:</strong> Karahan's Studio — iletisim@karahans.com<br>
            <strong>Alıcı:</strong> Satın alma işlemini gerçekleştiren kullanıcı.</p>`
        },
        {
            heading: 'Sözleşmenin Konusu',
            body: `<p>İşbu sözleşme, alıcının elektronik ortamda sipariş verdiği aşağıda özellikleri ve satış fiyatı belirtilen dijital ürünün satışı ve teslimatına ilişkin olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince tarafların hak ve yükümlülüklerini düzenlemektedir.</p>`
        },
        {
            heading: 'Ürün Bilgileri',
            body: `<p>Ürünlerin özellik, fiyat ve stok bilgileri ürün sayfalarında belirtilmektedir. Stok durumu anlık olarak güncellenmektedir.</p>`
        },
        {
            heading: 'Ödeme ve Teslimat',
            body: `<ul>
                <li>Ödeme işlemleri güvenli ödeme altyapısı üzerinden gerçekleştirilir.</li>
                <li>Dijital ürünler ödeme onayının ardından anında teslim edilir.</li>
                <li>Ödeme onaylanmadan sipariş işleme alınmaz.</li>
            </ul>`
        },
        {
            heading: 'Cayma Hakkı',
            body: `<p>6502 sayılı Kanun'un 49. maddesi kapsamında, dijital içeriklerin ifasına başlanmadan önce cayma hakkı kullanılabilir. Teslimattan önce cayma talebinde bulunmak için 14 gün süreniz bulunmaktadır. Ürün teslim edildikten ve kullanılmaya başlandıktan sonra cayma hakkı kullanılamaz.</p>`
        },
        {
            heading: 'Uyuşmazlık Çözümü',
            body: `<p>Uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri yetkilidir. Öncelikle <a href="/iletisim">iletişim kanalları</a> aracılığıyla çözüm aranır.</p>`
        }
    ]);
}

/* ── KVKK ── */
function renderKVKK() {
    return legalPage('Yasal', 'KVKK Aydınlatma Metni', [
        {
            body: `<p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla Karahan's Studio olarak kişisel verilerinizin işlenmesine ilişkin sizi aydınlatmak amacıyla bu metin hazırlanmıştır.</p>`
        },
        {
            heading: 'Veri Sorumlusu',
            body: `<p>Karahan's Studio<br>E-posta: iletisim@karahans.com</p>`
        },
        {
            heading: 'İşlenen Kişisel Veriler',
            body: `<ul>
                <li>Kimlik verileri: Ad, soyad</li>
                <li>İletişim verileri: E-posta adresi, telefon numarası, adres</li>
                <li>İşlem güvenliği verileri: IP adresi, oturum bilgileri</li>
                <li>Finansal veriler: Sipariş ve ödeme bilgileri</li>
            </ul>`
        },
        {
            heading: 'İşleme Amaçları ve Hukuki Sebepler',
            body: `<p>Kişisel verileriniz; hizmet sunumu (KVKK md. 5/2-c), yasal yükümlülüklerin yerine getirilmesi (md. 5/2-ç) ve meşru menfaat (md. 5/2-f) kapsamında işlenmektedir.</p>`
        },
        {
            heading: 'Veri Aktarımı',
            body: `<p>Kişisel verileriniz yurt içinde; ödeme hizmeti sağlayıcıları ve yasal mercilerle paylaşılabilir. Yurt dışına aktarım yapılmamaktadır.</p>`
        },
        {
            heading: 'Saklama Süresi',
            body: `<p>Verileriniz, işleme amacının ortadan kalkmasının ardından yasal süreler gözetilerek silinir, yok edilir veya anonim hale getirilir.</p>`
        },
        {
            heading: 'KVKK Kapsamındaki Haklarınız',
            body: `<ul>
                <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                <li>İşlenmişse bilgi talep etme</li>
                <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                <li>Yurt içinde/dışında aktarıldığı üçüncü kişileri öğrenme</li>
                <li>Eksik veya yanlış işlenmiş ise düzeltilmesini isteme</li>
                <li>KVKK md. 7'de öngörülen şartlar çerçevesinde silinmesini/yok edilmesini isteme</li>
                <li>İşlemenin otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhe sonuç doğurmasına itiraz etme</li>
                <li>Kanuna aykırı işlenmesi sebebiyle zarara uğranması durumunda zararın giderilmesini talep etme</li>
            </ul>
            <p style="margin-top:.85rem">Haklarınızı kullanmak için <a href="/iletisim">iletişim sayfamızı</a> kullanabilirsiniz.</p>`
        }
    ]);
}

module.exports = {
    renderKullanimSartlari,
    renderGizlilikSozlesmesi,
    renderTeslimatIade,
    renderMesafeliSatis,
    renderKVKK,
};