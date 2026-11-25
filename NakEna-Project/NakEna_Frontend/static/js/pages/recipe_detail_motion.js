/* Recipe detail motion. Page content is rendered by /static/js/api.js;
   this file only watches that DOM, so it never changes the recipe data. */
(() => {
  'use strict';
  if (!document.body.classList.contains('page-recipe_detail')) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ingredient checklist: stagger the rows and show how many are ready.
  const list = document.getElementById('ingredient-checklist');
  const panel = list?.closest('.panel');
  if (list && panel) {
    const bar = document.createElement('div');
    bar.className = 'ingredient-progress';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-label', 'Bahan yang sudah disiapkan');
    bar.setAttribute('aria-valuemin', '0');
    bar.append(document.createElement('span'));
    const text = document.createElement('p');
    text.className = 'ingredient-progress-text';
    text.setAttribute('aria-live', 'polite');
    const heading = panel.querySelector('.panel-heading');
    (heading || list).after(bar, text);

    const update = () => {
      const boxes = [...list.querySelectorAll('input[type=checkbox]')];
      const done = boxes.filter((box) => box.checked).length;
      const total = boxes.length;
      bar.hidden = text.hidden = total === 0;
      bar.setAttribute('aria-valuemax', String(total));
      bar.setAttribute('aria-valuenow', String(done));
      bar.style.setProperty('--progress', `${total ? (done / total) * 100 : 0}%`);
      const complete = total > 0 && done === total;
      panel.classList.toggle('is-complete', complete);
      text.textContent = complete
        ? 'Semua bahan siap. Ayo mulai memasak!'
        : `${done} dari ${total} bahan sudah disiapkan`;
    };

    new MutationObserver(() => {
      [...list.children].forEach((item, index) => item.style.setProperty('--i', Math.min(index, 14)));
      update();
    }).observe(list, { childList: true });
    list.addEventListener('change', update);
    update();
  }

  // Step preview: reveal each step as it scrolls into view.
  const steps = document.getElementById('recipe-step-preview');
  if (steps && !reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -30px 0px' });
    new MutationObserver(() => {
      [...steps.children].forEach((step) => {
        if (step.classList.contains('rd-reveal')) return;
        step.classList.add('rd-reveal');
        observer.observe(step);
      });
    }).observe(steps, { childList: true });
  }
})();
