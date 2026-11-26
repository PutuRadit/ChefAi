/* Guided cooking motion. Page logic: guided_cooking.js (steps, timer, dialogs)
   and /static/js/api.js (recipe data, saving). Styles: guided_cooking.css.
   This file only watches the DOM those scripts update, so it never changes
   the recipe, the cooking progress or the timer. */
(() => {
  'use strict';
  if (!document.body.classList.contains('page-guided_cooking')) return;

  const byId = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const restartClass = (element, name) => {
    if (!element) return;
    element.classList.remove(name);
    void element.offsetWidth; // restart the animation
    element.classList.add(name);
  };

  const watchText = (element, callback) => {
    if (element) new MutationObserver(callback).observe(element, { childList: true, characterData: true, subtree: true });
  };

  // Ingredient rows are rebuilt on load and on "Ulangi dari awal"; number
  // them so they come in one after another across all groups.
  const checklist = byId('ingredients-checklist-container');
  if (checklist) {
    new MutationObserver(() => {
      checklist.querySelectorAll('.gc-ingredient-list li').forEach((item, index) => item.style.setProperty('--i', index));
    }).observe(checklist, { childList: true });
  }

  // Counters bump when their value changes (not when first filled in, while
  // the panel itself is still coming in); the prep hint fades to its new text.
  ['progress-percent-text', 'checked-counter'].forEach((id) => {
    const element = byId(id);
    let last = element?.textContent.trim();
    watchText(element, () => {
      const text = element.textContent.trim();
      if (text === last) return;
      const first = !last;
      last = text;
      if (!first) restartClass(element, 'is-bumped');
    });
  });
  const hint = byId('prep-check-hint');
  let lastHint = hint?.textContent;
  watchText(hint, () => {
    if (hint.textContent === lastHint) return;
    lastHint = hint.textContent;
    restartClass(hint, 'is-filled');
  });

  // A new step slides in from the right when moving forward and from the
  // left when going back. Re-rendering the same step (e.g. when the last one
  // is marked done) does not move it.
  const heading = byId('step-heading-text');
  const stepParts = [byId('cooking-instruction'), document.querySelector('.gc-step-top'), byId('step-duration-estimate')];
  const stepNumber = () => Number((heading?.textContent.match(/\d+/) || [0])[0]);
  let lastStep = 0;
  watchText(heading, () => {
    const step = stepNumber();
    if (!step || step === lastStep) return;
    const direction = lastStep && step < lastStep ? 'is-prev' : 'is-next';
    const first = lastStep === 0;
    lastStep = step;
    if (first) return; // the card's own entrance covers the first step
    stepParts.forEach((part) => {
      part?.classList.remove('is-next', 'is-prev');
      restartClass(part, direction);
    });
  });
  // "Ulangi dari awal" goes back to the prep stage; the next start is a first step again.
  byId('restart-cooking-btn')?.addEventListener('click', () => { lastStep = 0; });

  // Timer card: glows while running, rings when the time is up.
  const timerCard = document.querySelector('.gc-timer-card');
  const timerStatus = byId('timer-status');
  watchText(timerStatus, () => {
    const text = timerStatus.textContent.toLowerCase();
    timerCard?.classList.toggle('is-running', text.includes('berjalan'));
    if (text.includes('waktu habis')) restartClass(timerCard, 'is-done');
    else timerCard?.classList.remove('is-done');
  });
  byId('bottom-quick-timer-btn')?.addEventListener('click', () => restartClass(byId('timer-display-string'), 'is-bumped'));
  byId('reset-timer-btn')?.addEventListener('click', () => restartClass(byId('reset-timer-btn'), 'is-spinning'));

  // Review error shakes each time it is shown.
  const reviewError = byId('cooking-review-error');
  if (reviewError) {
    new MutationObserver(() => {
      if (!reviewError.hidden) restartClass(reviewError, 'is-shaking');
    }).observe(reviewError, { attributes: true, attributeFilter: ['hidden'], childList: true, characterData: true, subtree: true });
  }

  // Finish dialog: a short burst of confetti behind the check badge.
  const finishDialog = byId('celebration-overlay');
  const colors = ['#ff8a3d', '#ffc178', '#fbbf24', '#8eddbd', '#f6a76d', '#ffd9b8'];
  const burst = () => {
    const content = finishDialog.querySelector('.gc-dialog-content');
    if (!content || reduceMotion) return;
    content.querySelectorAll('.gc-confetti').forEach((piece) => piece.remove());
    for (let index = 0; index < 26; index += 1) {
      const piece = document.createElement('span');
      piece.className = 'gc-confetti';
      piece.setAttribute('aria-hidden', 'true');
      const angle = (index / 26) * Math.PI * 2 + Math.random() * 0.4;
      const distance = 90 + Math.random() * 110;
      piece.style.setProperty('--x', `${Math.round(Math.cos(angle) * distance)}px`);
      piece.style.setProperty('--y', `${Math.round(Math.sin(angle) * distance * 0.75 + 40)}px`);
      piece.style.setProperty('--r', `${Math.round((Math.random() - 0.5) * 720)}deg`);
      piece.style.background = colors[index % colors.length];
      piece.style.animationDelay = `${300 + Math.random() * 150}ms`;
      if (index % 3 === 0) piece.style.borderRadius = '50%';
      piece.addEventListener('animationend', () => piece.remove(), { once: true });
      content.prepend(piece);
    }
  };
  if (finishDialog) {
    new MutationObserver(() => {
      if (finishDialog.open) burst();
    }).observe(finishDialog, { attributes: true, attributeFilter: ['open'] });
  }
})();
