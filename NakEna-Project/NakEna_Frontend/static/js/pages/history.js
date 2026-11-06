document.addEventListener("DOMContentLoaded", () => {
      const navLinks = document.querySelectorAll("header nav a");
      navLinks.forEach((link) => {
        if (link.getAttribute("data-path") === "riwayat") {
          link.className = "bg-primary-container text-on-primary font-bold rounded-full px-space-md py-space-xs shadow-[0_0_16px_rgba(255,94,20,0.4)]";
        }
      });
    });

;

let currentItemPendingDelete = '';

    // Filter Buttons logic
    const filterTabs = document.querySelectorAll('.filter-tab-btn');
    const cards = document.querySelectorAll('.activity-card');
    const emptyState = document.getElementById('emptyStateView');
    const activityGrid = document.getElementById('activityGrid');
    const searchInput = document.getElementById('searchInput');

    function applyFilter(filterType) {
      filterTabs.forEach(btn => {
        if(btn.getAttribute('data-filter') === filterType) {
          btn.className = 'filter-tab-btn active bg-primary-container text-on-primary px-space-md py-space-xs rounded-full font-label-lg text-label-lg shadow-[0_0_14px_rgba(255,94,20,0.45)] whitespace-nowrap transition-all';
        } else {
          btn.className = 'filter-tab-btn bg-surface-container text-on-surface-variant hover:text-on-surface px-space-md py-space-xs rounded-full font-label-lg text-label-lg whitespace-nowrap transition-all';
        }
      });

      let visibleCount = 0;
      cards.forEach(card => {
        const type = card.getAttribute('data-type');
        if (filterType === 'all' || type === filterType) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      if (visibleCount === 0) {
        activityGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
      } else {
        activityGrid.classList.remove('hidden');
        emptyState.classList.add('hidden');
      }
    }

    filterTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        applyFilter(btn.getAttribute('data-filter'));
      });
    });

    // Quick chips filter
    function applyQuickFilter(statusKey) {
      let visibleCount = 0;
      cards.forEach(card => {
        const status = card.getAttribute('data-status');
        const type = card.getAttribute('data-type');
        if (statusKey === 'scan' && type === 'scan') {
          card.classList.remove('hidden');
          visibleCount++;
        } else if (status === statusKey) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
      });
      if (visibleCount === 0) {
        activityGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
      } else {
        activityGrid.classList.remove('hidden');
        emptyState.classList.add('hidden');
      }
      showToast('Menampilkan filter: ' + statusKey);
    }

    function resetAllFilters() {
      searchInput.value = '';
      applyFilter('all');
      showToast('Semua filter direset');
    }

    // Search query logic
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      let matchCount = 0;
      cards.forEach(card => {
        const title = card.querySelector('h2').innerText.toLowerCase();
        const body = card.innerText.toLowerCase();
        if (title.includes(term) || body.includes(term)) {
          card.classList.remove('hidden');
          matchCount++;
        } else {
          card.classList.add('hidden');
        }
      });

      if (matchCount === 0) {
        activityGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
      } else {
        activityGrid.classList.remove('hidden');
        emptyState.classList.add('hidden');
      }
    });

    // Modal Delete handlers
    function promptDelete(itemName) {
      currentItemPendingDelete = itemName;
      openDeleteModal(itemName);
    }

    function openDeleteModal(name) {
      const modal = document.getElementById('deleteModal');
      const itemTitle = document.getElementById('itemNameToDelete');
      const card = document.getElementById('modalCard');
      itemTitle.textContent = '"' + name + '"';
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.remove('opacity-0');
        card.classList.remove('scale-95');
      }, 10);
    }

    function closeDeleteModal() {
      const modal = document.getElementById('deleteModal');
      const card = document.getElementById('modalCard');
      modal.classList.add('opacity-0');
      card.classList.add('scale-95');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    }

    function confirmDeletion() {
      closeDeleteModal();
      showToast('Aktivitas berhasil dihapus dari jurnal.');
    }

    function showToast(msg) {
      const toast = document.getElementById('toastNotification');
      const text = document.getElementById('toastMessage');
      text.textContent = msg;
      toast.classList.remove('translate-y-24', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
      }, 3200);
    }

    // Interactive State Switcher for showcase
    function setStateMode(mode) {
      const statePills = document.querySelectorAll('.state-pill');
      statePills.forEach(pill => {
        pill.classList.remove('bg-primary-container', 'text-on-primary');
        pill.classList.add('bg-surface-container', 'text-on-surface-variant');
      });
      event.target.classList.add('bg-primary-container', 'text-on-primary');
      event.target.classList.remove('bg-surface-container', 'text-on-surface-variant');

      if (mode === 'normal') {
        resetAllFilters();
      } else if (mode === 'scan-only') {
        applyFilter('scan');
      } else if (mode === 'selesai-only') {
        applyQuickFilter('selesai');
      } else if (mode === 'empty') {
        cards.forEach(card => card.classList.add('hidden'));
        activityGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        showToast('Menampilkan kondisi riwayat kosong');
      }
    }
