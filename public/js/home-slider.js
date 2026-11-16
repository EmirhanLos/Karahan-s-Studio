/* ═══════════════════════════════════════════════════════════════
   js/home-slider.js — Ana sayfa proje galerisi (slider).

   Şablon içindeki satır içi <script> bloğu buraya taşındı; CSP
   "script-src" kuralında 'unsafe-inline' bulunmadığı için betikler
   yalnızca <script src="..."> ile yüklenebilir.
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    function initSlider() {
        const track = document.getElementById('sliderTrack');
        const prev = document.getElementById('sliderPrev');
        const next = document.getElementById('sliderNext');
        const dotsContainer = document.getElementById('sliderDots');
        if (!track) return;

        const slides = track.querySelectorAll('.slider-slide');
        const dotBtns = dotsContainer ? dotsContainer.querySelectorAll('.slider-dot') : [];
        let currentIndex = 0;
        const totalSlides = slides.length;
        let autoTimer = null;

        function updateDots(index) {
            dotBtns.forEach(function (d, i) {
                d.classList.toggle('slider-dot--active', i === index);
            });
        }

        function goToSlide(index) {
            slides[currentIndex].setAttribute('aria-hidden', 'true');
            currentIndex = (index + totalSlides) % totalSlides;
            track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
            slides[currentIndex].setAttribute('aria-hidden', 'false');
            updateDots(currentIndex);
        }

        function nextSlide() { goToSlide(currentIndex + 1); }
        function prevSlide() { goToSlide(currentIndex - 1); }

        function resetAuto() {
            clearInterval(autoTimer);
            autoTimer = setInterval(nextSlide, 5000);
        }

        if (prev) prev.onclick = function () { prevSlide(); resetAuto(); };
        if (next) next.onclick = function () { nextSlide(); resetAuto(); };

        dotBtns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                goToSlide(parseInt(btn.getAttribute('data-dot')));
                resetAuto();
            });
        });

        resetAuto();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlider);
    } else {
        initSlider();
    }
})();
