/* Detection result motion. Page logic: detection_result.js and /static/js/api.js.
   This file only watches the DOM those scripts build, so it never changes their data. */
(() => {
  'use strict';
  if (!document.body.classList.contains('page-detection_result')) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const restartClass = (element, name) => {
    if (!element) return;
    element.classList.remove(name);
    void element.offsetWidth; // restart the animation
    element.classList.add(name);
  };

  // Detection boxes appear one by one on the first render only. api.js redraws
  // them on every resize, so the intro is switched off once it has played.
  const boxes = document.getElementById('detectionBoxes');
  if (boxes) {
    let settleTimer = null;
    new MutationObserver(() => {
      if (boxes.classList.contains('is-settled')) return;
      const items = [...boxes.children];
      items.forEach((box, index) => box.style.setProperty('--i', index));
      if (items.length && !settleTimer) {
        settleTimer = setTimeout(() => boxes.classList.add('is-settled'), 1600 + items.length * 140);
      }
    }).observe(boxes, { childList: true });
  }

  const countUp = (element, target, delay) => {
    element.textContent = '0%';
    const duration = 700;
    let start = null;
    const step = (now) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      element.textContent = `${Math.round(target * eased)}%`;
      if (progress < 1) requestAnimationFrame(step);
    };
    setTimeout(() => requestAnimationFrame(step), delay);
  };

  // Ingredient rows: the first batch from api.js is staggered and its
  // confidence values count up; rows added later simply slide in.
  const list = document.getElementById('ingredientsListContainer');
  if (list) {
    let firstBatch = true;
    new MutationObserver((records) => {
      let index = 0;
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement) || !node.classList.contains('ingredient-item')) return;
        const order = firstBatch ? index++ : 0;
        node.style.setProperty('--i', order);
        const confidence = node.querySelector('.detection-confidence');
        const match = confidence?.textContent.trim().match(/^(\d+)%$/);
        if (firstBatch && match && !reduceMotion) countUp(confidence, Number(match[1]), 250 + order * 70);
      }));
      if (index) firstBatch = false;
    }).observe(list, { childList: true });

    // Let a removed row slide out first, then hand the click back to the
    // page's own delete handler so its count and toast still run.
    list.addEventListener('click', (event) => {
      const button = event.target.closest('.delete-item-btn');
      const item = button?.closest('.ingredient-item');
      if (!item || reduceMotion || item.dataset.leaving === 'done') return;
      event.stopPropagation();
      if (item.dataset.leaving) return;
      item.dataset.leaving = 'pending';
      item.classList.add('is-leaving');
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        item.dataset.leaving = 'done';
        button.click();
      };
      item.addEventListener('animationend', (end) => { if (end.target === item) finish(); });
      setTimeout(finish, 450);
    }, true);
  }

  const count = document.getElementById('detectedCount');
  if (count) {
    new MutationObserver(() => restartClass(count.closest('.small-badge'), 'is-bumped'))
      .observe(count, { childList: true, characterData: true, subtree: true });
  }

  const servings = document.getElementById('servingsInput');
  ['incrementServings', 'decrementServings'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', () => restartClass(servings, 'is-bumped'));
  });
})();
