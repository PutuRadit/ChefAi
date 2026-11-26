/* Admin dashboard motion. Page logic: /static/js/api.js (setupAdminDashboard)
   and admin_dashboard.js (mobile sidebar). Styles: admin_dashboard.css.
   This file only watches the DOM api.js builds, so it never changes the data:
   every number it animates ends on the value api.js wrote. */
(() => {
  'use strict';
  const main = document.querySelector('body > .pl-64 > main');
  if (!main || !document.getElementById('adminSidebar')) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const restartClass = (element, name) => {
    if (!element) return;
    element.classList.remove(name);
    void element.offsetWidth; // restart the animation
    element.classList.add(name);
  };

  const numberIndex = (elements) => elements.forEach((element, index) => element.style.setProperty('--i', index));

  // "12" or "4.2 / 5" -> { value, decimals, suffix }
  const parseStat = (text) => {
    const match = text.trim().match(/^(\d+(?:[.,]\d+)?)(.*)$/);
    if (!match) return null;
    const raw = match[1].replace(',', '.');
    return { value: Number(raw), decimals: (raw.split('.')[1] || '').length, suffix: match[2] };
  };

  const countTo = (element, from, stat) => {
    const duration = Math.min(1100, 500 + Math.abs(stat.value - from) * 25);
    const final = element.textContent;
    let start = null;
    const step = (now) => {
      if (!element.isConnected) return;
      start ??= now;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      element.textContent = progress < 1
        ? (from + (stat.value - from) * eased).toFixed(stat.decimals) + stat.suffix
        : final;
      if (progress < 1) requestAnimationFrame(step);
    };
    element.textContent = from.toFixed(stat.decimals) + stat.suffix;
    requestAnimationFrame(step);
  };

  const attach = (shell) => {
    // Stat cards are rebuilt on every refresh. The first time, cards pop in
    // and numbers count up from 0; afterwards cards stay put and only the
    // numbers that changed count to their new value and bump.
    const stats = shell.querySelector('.admin-stats-grid');
    const previous = new Map();
    let firstStats = true;
    new MutationObserver(() => {
      const cards = [...stats.querySelectorAll('.admin-stat-card')];
      if (!cards.length) return;
      numberIndex(cards);
      cards.forEach((card) => {
        const value = card.querySelector('.admin-stat-value');
        const stat = value && parseStat(value.textContent);
        const key = [...card.classList].find((name) => name.startsWith('is-')) || card.textContent;
        if (!stat) return;
        const before = previous.get(key);
        previous.set(key, stat.value);
        if (reduceMotion) return;
        if (firstStats) countTo(value, 0, stat);
        else if (before != null && before !== stat.value) {
          countTo(value, before, stat);
          restartClass(value, 'is-bumped');
        }
      });
      if (!firstStats) stats.classList.add('is-settled');
      firstStats = false;
    }).observe(stats, { childList: true });

    // Chart bars grow day by day (both bars of a day share an index).
    const activity = shell.querySelector('.admin-activity-chart');
    new MutationObserver(() => {
      activity.querySelectorAll('.admin-chart-bar.is-user').forEach((bar, index) => bar.style.setProperty('--i', index));
      activity.querySelectorAll('.admin-chart-bar.is-recipe').forEach((bar, index) => bar.style.setProperty('--i', index));
    }).observe(activity, { childList: true });

    // Rating rows, scan tiles, reviews and table rows: number them in order.
    const lists = [
      [shell.querySelector('.admin-rating-chart'), '.admin-rating-fill'],
      [shell.querySelector('.admin-upload-status-grid'), '.admin-upload-status'],
      [shell.querySelector('.admin-review-list'), '.admin-review-item'],
      ...[...shell.querySelectorAll('.admin-users-table tbody')].map((body) => [body, 'tr']),
    ];
    lists.forEach(([container, selector]) => {
      if (!container) return;
      new MutationObserver(() => numberIndex([...container.querySelectorAll(selector)]))
        .observe(container, { childList: true });
    });

    // Status lines fade to their new text.
    shell.querySelectorAll('.admin-dashboard-status').forEach((line) => {
      let last = line.textContent;
      new MutationObserver(() => {
        if (line.textContent === last) return;
        last = line.textContent;
        restartClass(line, 'is-filled');
      }).observe(line, { childList: true, characterData: true, subtree: true });
    });
  };

  // api.js builds the dashboard into <main> after the admin check.
  const existing = main.querySelector('.admin-dashboard-shell');
  if (existing) { attach(existing); return; }
  const waiting = new MutationObserver(() => {
    const shell = main.querySelector('.admin-dashboard-shell');
    if (!shell) return;
    waiting.disconnect();
    attach(shell);
  });
  waiting.observe(main, { childList: true });
})();
