(function initApp() {
      const container = document.getElementById('ingredientsListContainer');
      const emptyState = document.getElementById('emptyIngredientsState');
      const detectedCountEl = document.getElementById('detectedCount');
      const hiddenInput = document.getElementById('detectedIngredientsInput');
      const manualInput = document.getElementById('manualIngredientInput');
      const addManualBtn = document.getElementById('addManualBtn');
      const itemTemplate = document.getElementById('ingredientItemTemplate');
      const toast = document.getElementById('toastNotification');
      const toastMsg = document.getElementById('toastMessage');
      const generatingOverlay = document.getElementById('generatingOverlay');
      const form = document.getElementById('ingredientsConfirmationForm');
      const cancelGeneratingBtn = document.getElementById('cancelGeneratingBtn');

      function showToast(message) {
        toastMsg.textContent = message;
        toast.classList.remove('translate-y-28', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
        setTimeout(() => {
          toast.classList.add('translate-y-28', 'opacity-0');
          toast.classList.remove('translate-y-0', 'opacity-100');
        }, 2800);
      }

      function refreshListState() {
        const items = container.querySelectorAll('.ingredient-item');
        const count = items.length;
        detectedCountEl.textContent = count;
        
        if (count === 0) {
          container.classList.add('hidden');
          emptyState.classList.remove('hidden');
          emptyState.classList.add('flex');
          hiddenInput.value = '';
        } else {
          container.classList.remove('hidden');
          emptyState.classList.add('hidden');
          emptyState.classList.remove('flex');

          const names = Array.from(items).map(item => {
            const nameEl = item.querySelector('.ingredient-name');
            return nameEl ? nameEl.textContent.trim() : '';
          }).filter(Boolean);
          hiddenInput.value = names.join(', ');
        }
      }

      // Delete & Edit item
      container.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.delete-item-btn');
        if (delBtn) {
          const item = delBtn.closest('.ingredient-item');
          if (item) {
            const name = item.querySelector('.ingredient-name').textContent;
            item.remove();
            refreshListState();
            showToast(`Bahan "${name}" telah dihapus.`);
          }
        }

        const editBtn = e.target.closest('.edit-item-btn');
        if (editBtn) {
          const item = editBtn.closest('.ingredient-item');
          const nameEl = item.querySelector('.ingredient-name');
          const currentName = nameEl.textContent.trim();
          const newName = prompt('Ubah nama bahan masakan:', currentName);
          if (newName && newName.trim() !== '' && newName.trim() !== currentName) {
            nameEl.textContent = newName.trim();
            refreshListState();
            showToast(`Nama bahan diperbarui menjadi "${newName.trim()}".`);
          }
        }
      });

      // Add ingredient
      function addIngredient(nameStr, isManual = true) {
        if (!nameStr || nameStr.trim() === '') return;
        const cleanName = nameStr.trim();

        const itemEl = itemTemplate.content.firstElementChild.cloneNode(true);
        itemEl.dataset.id = `manual-${Date.now()}`;
        itemEl.querySelector('.ingredient-name').textContent = cleanName;
        const badge = itemEl.querySelector('.detection-confidence');
        badge.textContent = isManual ? 'Manual' : '';
        if (!isManual) badge.classList.add('hidden');
        container.appendChild(itemEl);
        refreshListState();
        showToast(`Bahan "${cleanName}" berhasil ditambahkan!`);
      }

      addManualBtn.addEventListener('click', () => {
        addIngredient(manualInput.value, true);
        manualInput.value = '';
      });

      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addIngredient(manualInput.value, true);
          manualInput.value = '';
        }
      });

      // Staple checkboxes logic
      const stapleGroup = document.getElementById('pantryChipsGroup');
      stapleGroup.addEventListener('change', (e) => {
        const checkbox = e.target;
        const chip = checkbox.closest('.staple-chip');
        const icon = chip.querySelector('.material-symbols-outlined');
        if (checkbox.checked) {
          chip.classList.remove('bg-[#060D1A]', 'border-slate-700', 'text-slate-300');
          chip.classList.add('bg-gradient-to-r', 'from-[#FF5E14]', 'to-[#F59E0B]', 'text-white', 'shadow-[0_0_14px_rgba(255,94,20,0.5)]', 'border-[#FF5E14]');
          icon.textContent = 'check';
          icon.classList.remove('opacity-40');
        } else {
          chip.classList.remove('bg-gradient-to-r', 'from-[#FF5E14]', 'to-[#F59E0B]', 'text-white', 'shadow-[0_0_14px_rgba(255,94,20,0.5)]', 'border-[#FF5E14]');
          chip.classList.add('bg-[#060D1A]', 'border-slate-700', 'text-slate-300');
          icon.textContent = 'add';
          icon.classList.add('opacity-40');
        }
      });

      // Diet & Allergy chip toggles
      document.querySelectorAll('.diet-chip, .allergy-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          const cb = chip.querySelector('input[type="checkbox"]');
          if (e.target !== cb) {
            cb.checked = !cb.checked;
          }
          const icon = chip.querySelector('.material-symbols-outlined');
          if (cb.checked) {
            chip.classList.remove('bg-[#060D1A]', 'border-slate-700', 'text-slate-400');
            chip.classList.add('bg-[#FF5E14]/20', 'border-[#FF5E14]', 'text-[#FF5E14]');
            icon.textContent = 'check';
            icon.classList.remove('opacity-40');
          } else {
            chip.classList.remove('bg-[#FF5E14]/20', 'border-[#FF5E14]', 'text-[#FF5E14]');
            chip.classList.add('bg-[#060D1A]', 'border-slate-700', 'text-slate-400');
            icon.textContent = 'add';
            icon.classList.add('opacity-40');
          }
        });
      });

      // Servings Stepper
      const servingsInput = document.getElementById('servingsInput');
      document.getElementById('incrementServings').addEventListener('click', () => {
        let val = parseInt(servingsInput.value, 10) || 1;
        if (val < 12) servingsInput.value = val + 1;
      });
      document.getElementById('decrementServings').addEventListener('click', () => {
        let val = parseInt(servingsInput.value, 10) || 1;
        if (val > 1) servingsInput.value = val - 1;
      });

      // Continue the required flow directly to the recipe recommendations page.
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        window.location.assign('/recipes/');
      });

      cancelGeneratingBtn.addEventListener('click', () => {
        generatingOverlay.classList.add('opacity-0', 'pointer-events-none');
        generatingOverlay.classList.remove('opacity-100');
      });



    })();
