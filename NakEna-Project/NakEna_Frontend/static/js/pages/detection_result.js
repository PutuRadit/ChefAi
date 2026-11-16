(() => {
  const form = document.getElementById('ingredientsConfirmationForm');
  if (!form) return;

  const container = document.getElementById('ingredientsListContainer');
  const emptyState = document.getElementById('emptyIngredientsState');
  const detectedCount = document.getElementById('detectedCount');
  const hiddenInput = document.getElementById('detectedIngredientsInput');
  const manualInput = document.getElementById('manualIngredientInput');
  const itemTemplate = document.getElementById('ingredientItemTemplate');
  const toast = document.getElementById('toastNotification');
  const overlay = document.getElementById('generatingOverlay');
  let toastTimeout;

  function showToast(message) {
    document.getElementById('toastMessage').textContent = message;
    clearTimeout(toastTimeout);
    toast.classList.add('is-visible');
    toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  function refreshListState() {
    const names = Array.from(container.querySelectorAll('.ingredient-name'))
      .map(item => item.textContent.trim()).filter(Boolean);
    detectedCount.textContent = String(names.length);
    hiddenInput.value = names.join(', ');
    container.classList.toggle('hidden', names.length === 0);
    emptyState.classList.toggle('hidden', names.length > 0);
    emptyState.classList.toggle('flex', names.length === 0);
  }

  container.addEventListener('click', (event) => {
    const remove = event.target.closest('.delete-item-btn');
    const edit = event.target.closest('.edit-item-btn');
    if (remove) {
      remove.closest('.ingredient-item').remove();
      refreshListState();
      showToast('Bahan dihapus.');
    }
    if (edit) {
      const name = edit.closest('.ingredient-item').querySelector('.ingredient-name');
      const updated = window.prompt('Nama bahan:', name.textContent.trim());
      if (!updated?.trim() || updated.trim() === name.textContent.trim()) return;
      name.textContent = updated.trim();
      refreshListState();
      showToast('Nama bahan diperbarui.');
    }
  });

  function addIngredient() {
    const name = manualInput.value.trim();
    if (!name) {
      manualInput.focus();
      return;
    }
    const item = itemTemplate.content.firstElementChild.cloneNode(true);
    item.dataset.id = `manual-${Date.now()}`;
    item.querySelector('.ingredient-name').textContent = name;
    item.querySelector('.detection-confidence').textContent = 'Manual';
    container.append(item);
    manualInput.value = '';
    refreshListState();
    manualInput.focus();
    showToast('Bahan ditambahkan.');
  }

  document.getElementById('addManualBtn').addEventListener('click', addIngredient);
  manualInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addIngredient();
  });

  function updateChoiceIcon(chip) {
    const input = chip.querySelector('input');
    const icon = chip.querySelector('[data-result-icon]');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', input.checked ? 'm5 12 4 4L19 6' : 'M12 5v14M5 12h14');
    icon.replaceChildren(path);
    icon.dataset.resultIcon = input.checked ? 'check' : 'add';
  }
  form.querySelectorAll('.choice-chip').forEach(chip => {
    chip.addEventListener('change', () => updateChoiceIcon(chip));
  });

  const servingsInput = document.getElementById('servingsInput');
  function changeServings(amount) {
    const current = Number(servingsInput.value) || 2;
    const next = Math.max(Number(servingsInput.min), Math.min(Number(servingsInput.max), current + amount));
    servingsInput.value = String(next);
  }
  document.getElementById('incrementServings').addEventListener('click', () => changeServings(1));
  document.getElementById('decrementServings').addEventListener('click', () => changeServings(-1));
  document.getElementById('cancelGeneratingBtn').addEventListener('click', () => {
    overlay.classList.add('opacity-0', 'pointer-events-none');
  });

  // API integration loads immediately after this script and populates the list.
  // Keep the count and submitted names in sync with both detected and manual rows.
  new MutationObserver(refreshListState).observe(container, { childList: true, subtree: true, characterData: true });
})();
