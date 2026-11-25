/* Landing page motion. Interactive UI: /static/js/app_ui.js. Backend integration: /static/js/api.js. */
(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const syncHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    const targets = [...document.querySelectorAll('.home-section .section-intro, .steps-art, .home-cta')];
    document.querySelectorAll('.three-grid, .four-grid').forEach((grid) => {
      [...grid.children].forEach((card, index) => {
        card.style.setProperty('--reveal-delay', `${index * 90}ms`);
        targets.push(card);
      });
    });

    document.documentElement.classList.add('motion-ready');
    targets.forEach((element) => {
      element.classList.add('home-reveal');
      observer.observe(element);
    });
  }

  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.feature-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    });
  }
})();
