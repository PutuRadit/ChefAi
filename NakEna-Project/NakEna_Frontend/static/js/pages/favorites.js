let lastDeletedCard = null;
    let toastTimeout = null;

    function setCategoryFilter(category, btnElement) {
      document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.remove('active', 'bg-primary-container', 'text-on-primary', 'shadow-[0_0_15px_rgba(255,94,20,0.35)]');
        pill.classList.add('bg-surface-container-low', 'text-on-surface-variant');
      });

      if (btnElement) {
        btnElement.classList.add('active', 'bg-primary-container', 'text-on-primary', 'shadow-[0_0_15px_rgba(255,94,20,0.35)]');
        btnElement.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
      }

      const grid = document.getElementById('recipeCardsGrid');
      const emptyView = document.getElementById('emptyFavoriteState');
      const cards = grid.querySelectorAll('.recipe-item');
      let visibleCount = 0;

      cards.forEach(card => {
        const itemCategories = card.getAttribute('data-category') || '';
        if (category === 'all' || itemCategories.includes(category)) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (visibleCount === 0) {
        grid.classList.add('hidden');
        emptyView.classList.remove('hidden');
        emptyView.classList.add('flex');
      } else {
        grid.classList.remove('hidden');
        emptyView.classList.add('hidden');
        emptyView.classList.remove('flex');
      }
    }

    function filterRecipesBySearch() {
      const query = document.getElementById('recipeSearchInput').value.toLowerCase().trim();
      const grid = document.getElementById('recipeCardsGrid');
      const emptyView = document.getElementById('emptyFavoriteState');
      const cards = grid.querySelectorAll('.recipe-item');
      let visibleCount = 0;

      cards.forEach(card => {
        const title = (card.getAttribute('data-title') || '').toLowerCase();
        const category = (card.getAttribute('data-category') || '').toLowerCase();
        if (title.includes(query) || category.includes(query)) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      if (visibleCount === 0) {
        grid.classList.add('hidden');
        emptyView.classList.remove('hidden');
        emptyView.classList.add('flex');
      } else {
        grid.classList.remove('hidden');
        emptyView.classList.add('hidden');
        emptyView.classList.remove('flex');
      }
    }

    function sortRecipeGrid() {
      const sortType = document.getElementById('sortDropdown').value;
      const grid = document.getElementById('recipeCardsGrid');
      const cards = Array.from(grid.querySelectorAll('.recipe-item'));

      cards.sort((a, b) => {
        if (sortType === 'time') {
          return parseInt(a.getAttribute('data-time')) - parseInt(b.getAttribute('data-time'));
        }
        if (sortType === 'rating') {
          return parseFloat(b.getAttribute('data-rating')) - parseFloat(a.getAttribute('data-rating'));
        }
        if (sortType === 'match') {
          return parseInt(b.getAttribute('data-match')) - parseInt(a.getAttribute('data-match'));
        }
        return 0; // default recent sequence
      });

      cards.forEach(card => grid.appendChild(card));
    }

    function toggleFavorite(btn, recipeTitle) {
      const card = btn.closest('.recipe-item');
      const heartIcon = btn.querySelector('.material-symbols-outlined');
      
      // Animate card removal
      card.style.transform = 'scale(0.85)';
      card.style.opacity = '0';
      
      setTimeout(() => {
        card.style.display = 'none';
        card.style.transform = '';
        card.style.opacity = '';
        lastDeletedCard = { card, recipeTitle, heartBtn: btn };
        showUndoToast(recipeTitle);
        updateFavoritesCount();
      }, 250);
    }

    function updateFavoritesCount() {
      const grid = document.getElementById('recipeCardsGrid');
      const emptyView = document.getElementById('emptyFavoriteState');
      const visibleCards = Array.from(grid.querySelectorAll('.recipe-item')).filter(c => c.style.display !== 'none');
      const count = visibleCards.length;

      document.getElementById('recipeCounterBadge').innerHTML = `<span class="text-tertiary font-bold">${count}</span> Resep Tersimpan`;
      document.getElementById('count-all').innerText = count;

      if (count === 0) {
        grid.classList.add('hidden');
        emptyView.classList.remove('hidden');
        emptyView.classList.add('flex');
      } else {
        grid.classList.remove('hidden');
        emptyView.classList.add('hidden');
        emptyView.classList.remove('flex');
      }
    }

    function showUndoToast(title) {
      const toast = document.getElementById('undoToast');
      document.getElementById('toastItemName').innerText = title;
      toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
      toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');

      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        hideUndoToast();
      }, 4500);
    }

    function hideUndoToast() {
      const toast = document.getElementById('undoToast');
      toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
      toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    }

    function undoRemoveFavorite() {
      if (lastDeletedCard && lastDeletedCard.card) {
        lastDeletedCard.card.style.display = 'flex';
        updateFavoritesCount();
        hideUndoToast();
      }
    }

    function triggerToastDemo() {
      showUndoToast("Nasi Goreng Rumahan Spesial");
    }

    function setSimState(state) {
      const grid = document.getElementById('recipeCardsGrid');
      const emptyView = document.getElementById('emptyFavoriteState');
      const btnNormal = document.getElementById('btn-state-normal');
      const btnBreakfast = document.getElementById('btn-state-breakfast');
      const btnEmpty = document.getElementById('btn-state-empty');

      [btnNormal, btnBreakfast, btnEmpty].forEach(b => {
        b.className = 'px-space-sm py-1 rounded-md font-label-sm text-label-sm bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors';
      });

      if (state === 'normal') {
        btnNormal.className = 'px-space-sm py-1 rounded-md font-label-sm text-label-sm bg-primary-container text-on-primary font-bold transition-colors';
        setCategoryFilter('all');
        document.getElementById('recipeSearchInput').value = '';
      } else if (state === 'breakfast') {
        btnBreakfast.className = 'px-space-sm py-1 rounded-md font-label-sm text-label-sm bg-primary-container text-on-primary font-bold transition-colors';
        const breakfastPill = Array.from(document.querySelectorAll('.category-pill')).find(p => p.innerText.includes('Sarapan'));
        setCategoryFilter('sarapan', breakfastPill);
      } else if (state === 'empty') {
        btnEmpty.className = 'px-space-sm py-1 rounded-md font-label-sm text-label-sm bg-primary-container text-on-primary font-bold transition-colors';
        grid.classList.add('hidden');
        emptyView.classList.remove('hidden');
        emptyView.classList.add('flex');
        document.getElementById('recipeCounterBadge').innerHTML = `<span class="text-tertiary font-bold">0</span> Resep Tersimpan`;
      }
    }
