/* Profile motion. Page logic: /static/js/api.js (setupProfile, hydrateProfile).
   Styles: /static/css/pages/profile.css.
   This file only watches the DOM api.js fills in, so it never changes its data:
   the activity numbers it animates always end on the value api.js wrote. */
(() => {
  'use strict';
  if (!document.body.classList.contains('page-profile')) return;

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

  // Activity numbers start as "–". The first number api.js writes counts up
  // from 0; later changes (e.g. after saving pantry ingredients) bump.
  document.querySelectorAll('.account-stats strong').forEach((stat) => {
    let written = stat.textContent;
    let settled = null;
    let frame = 0;
    const write = (text) => { written = text; stat.textContent = text; };
    watchText(stat, () => {
      const text = stat.textContent.trim();
      if (text === written) return; // our own count-up frame
      cancelAnimationFrame(frame);
      written = text;
      if (!/^\d+$/.test(text)) return;
      const target = Number(text);
      if (settled == null && target > 0 && !reduceMotion) {
        const duration = Math.min(900, 400 + target * 60);
        let start = null;
        const step = (now) => {
          start ??= now;
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - progress) ** 3;
          write(String(Math.round(target * eased)));
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        write('0');
        frame = requestAnimationFrame(step);
      } else if (settled != null && settled !== target) {
        restartClass(stat, 'is-bumped');
      }
      settled = target;
    });
  });

  // Name and email fade in when api.js fills them.
  document.querySelectorAll('.profile-card [data-user-name], .profile-card [data-user-email]').forEach((element) => {
    watchText(element, () => restartClass(element, 'is-filled'));
  });

  // The avatar bumps when the account name is saved (not on the first fill,
  // which happens during its entrance animation).
  const initial = document.querySelector('[data-profile-initial]');
  let nameSaved = false;
  document.addEventListener('submit', (event) => {
    if (event.target.id === 'account-form') nameSaved = true;
  }, true);
  watchText(initial, () => {
    if (!nameSaved) return;
    nameSaved = false;
    restartClass(initial, 'is-bumped');
  });

  // Pantry chips: api.js rebuilds the whole list on every change, so only
  // ingredients that were not there before pop in. The first batch is staggered.
  const pantry = document.getElementById('pantryIngredientsList');
  if (pantry) {
    let known = null;
    new MutationObserver(() => {
      const chips = [...pantry.querySelectorAll('.pantry-chip')];
      let index = 0;
      chips.forEach((chip) => {
        const name = chip.dataset.stapleIngredient;
        if (known && known.has(name)) return;
        chip.style.setProperty('--i', known ? 0 : index++);
        chip.classList.add('is-new');
      });
      known = new Set(chips.map((chip) => chip.dataset.stapleIngredient));
    }).observe(pantry, { childList: true });

    // Let a removed chip shrink away first, then hand the click back to the
    // chip's own remove handler in api.js.
    pantry.addEventListener('click', (event) => {
      const button = event.target.closest('.pantry-chip button');
      const chip = button?.closest('.pantry-chip');
      if (!chip || reduceMotion || chip.dataset.leaving === 'done') return;
      event.stopPropagation();
      if (chip.dataset.leaving) return;
      chip.dataset.leaving = 'pending';
      chip.classList.add('is-leaving');
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        chip.dataset.leaving = 'done';
        known?.delete(chip.dataset.stapleIngredient);
        button.click();
      };
      chip.addEventListener('animationend', (end) => { if (end.target === chip) finish(); });
      setTimeout(finish, 350);
    }, true);
  }

  // "Tambah bahan" with an empty or duplicate entry nudges the input row.
  const addButton = document.getElementById('btn-add-pantry-ingredient');
  const addInput = document.getElementById('pantryIngredientInput');
  addButton?.addEventListener('click', () => {
    const value = addInput.value.trim().toLowerCase();
    const exists = [...document.querySelectorAll('[data-staple-ingredient]')]
      .some((chip) => chip.dataset.stapleIngredient.toLowerCase() === value);
    if (!value || exists) restartClass(addInput.closest('.inline-input'), 'is-nudged');
  }, true);
})();
