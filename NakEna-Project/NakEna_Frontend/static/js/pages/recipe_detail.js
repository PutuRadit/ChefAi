// Favorite Button Interaction
    const favBtn = document.getElementById('favorite-btn');
    const saveRecipeBtn = document.getElementById('btn-save-recipe');
    let isFavorited = true;

    function toggleFavorite() {
      isFavorited = !isFavorited;
      const icon = favBtn.querySelector('span');
      if (isFavorited) {
        favBtn.classList.add('text-tertiary');
        favBtn.classList.remove('text-secondary');
        icon.style.fontVariationSettings = "'FILL' 1";
        if (saveRecipeBtn) saveRecipeBtn.innerHTML = '<span class="material-symbols-outlined text-tertiary text-[20px]">bookmark</span><span>Tersimpan di Favorit</span>';
      } else {
        favBtn.classList.remove('text-tertiary');
        favBtn.classList.add('text-secondary');
        icon.style.fontVariationSettings = "'FILL' 0";
        if (saveRecipeBtn) saveRecipeBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">bookmark_border</span><span>Simpan Resep</span>';
      }
    }

    if (favBtn) favBtn.addEventListener('click', toggleFavorite);
    if (saveRecipeBtn) saveRecipeBtn.addEventListener('click', toggleFavorite);

    // Share Recipe Notification Simulation
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(window.location.href);
          alert('Tautan resep "Nasi Goreng Rumahan Spesial" berhasil disalin!');
        } else {
          alert('Bagikan resep NakEna ke teman memasakmu!');
        }
      });
    }

    // Grocery List Addition Button Toast
    const addGroceryBtn = document.getElementById('add-grocery-btn');
    if (addGroceryBtn) {
      addGroceryBtn.addEventListener('click', () => {
        addGroceryBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-tertiary">check</span><span>Bahan Tambahan Masuk ke Daftar Belanja!</span>';
        addGroceryBtn.classList.add('bg-surface-bright');
        setTimeout(() => {
          addGroceryBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-tertiary">add_shopping_cart</span><span>+ Tambahkan Bahan Pelengkap ke Daftar Belanja</span>';
          addGroceryBtn.classList.remove('bg-surface-bright');
        }, 2500);
      });
    }

    // Dynamic Review Form Submission
    let selectedRating = 5;
    const starButtons = document.querySelectorAll('.star-btn');
    starButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        selectedRating = parseInt(btn.getAttribute('data-val'));
        starButtons.forEach((s, idx) => {
          const span = s.querySelector('span');
          if (idx < selectedRating) {
            span.style.fontVariationSettings = "'FILL' 1";
          } else {
            span.style.fontVariationSettings = "'FILL' 0";
          }
        });
      });
    });

    function addReview() {
      const commentInput = document.getElementById('review-comment');
      const text = commentInput.value.trim();
      if (!text) return;

      const list = document.getElementById('reviews-list');
      const newReview = document.createElement('div');
      newReview.className = "p-space-md rounded-lg bg-surface-container-low flex items-start gap-space-md animate-fade-in";
      
      let starsHtml = '';
      for (let i = 0; i < 5; i++) {
        starsHtml += `<span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' ${i < selectedRating ? '1' : '0'};">star</span>`;
      }

      newReview.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold shrink-0">
          KM
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between mb-1">
            <span class="font-label-md text-label-md text-on-surface font-semibold">Kamu (Koki Hebat)</span>
            <span class="font-label-sm text-label-sm text-secondary">Baru saja</span>
          </div>
          <div class="flex items-center text-tertiary mb-space-xs">
            ${starsHtml}
          </div>
          <p class="font-body-sm text-body-sm text-on-surface-variant">
            ${text}
          </p>
        </div>
      `;

      list.prepend(newReview);
      commentInput.value = '';
    }
