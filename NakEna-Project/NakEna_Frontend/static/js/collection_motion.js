/* Favorit and Riwayat motion. Page logic: /static/js/api.js (setupFavorites,
   setupHistory, bindCollectionFilters). Styles: /static/css/collection.css.
   This file only watches the DOM api.js builds, so it never changes its data. */
(() => {
  'use strict';
  const body = document.body;
  if (!body.classList.contains('page-favorites') && !body.classList.contains('page-history')) return;

  const grid = document.querySelector('.collection-grid');
  const status = document.getElementById('collectionStatus');

  // "Memuat koleksi…" breathes until api.js hides it or changes its text.
  if (status && !status.hidden) {
    status.classList.add('is-loading');
    const loading = new MutationObserver(() => {
      status.classList.remove('is-loading');
      loading.disconnect();
    });
    loading.observe(status, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  }

  if (!grid) return;

  // api.js re-appends every card on each search, sort, filter or removal,
  // which restarts their animations. Number the visible cards so the stagger
  // follows what is on screen rather than the hidden ones in between.
  new MutationObserver(() => {
    let index = 0;
    for (const stage of grid.children) {
      if (!stage.hidden) stage.style.setProperty('--i', index++);
    }
  }).observe(grid, { childList: true });

  // Typing a search or removing a favorite keeps the cards still; changing a
  // filter pill or the sort order lets them play in again in the new order.
  const settle = () => grid.classList.add('is-settled');
  const replay = () => grid.classList.remove('is-settled');
  document.getElementById('collectionSearch')?.addEventListener('input', settle);
  grid.addEventListener('click', (event) => {
    if (event.target.closest('.recipe-card-favorite')) settle();
  }, true);
  document.getElementById('collectionSort')?.addEventListener('change', replay);
  document.querySelector('.collection-toolbar .filter-pills')?.addEventListener('click', (event) => {
    if (event.target.closest('button')) replay();
  });
})();
