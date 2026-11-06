// Counter Porsi Logic
    const portionVal = document.getElementById('portion-value');
    const btnInc = document.getElementById('btn-portion-inc');
    const btnDec = document.getElementById('btn-portion-dec');
    let portions = 2;

    if (btnInc && btnDec && portionVal) {
      btnInc.addEventListener('click', () => {
        if (portions < 12) {
          portions++;
          portionVal.textContent = portions;
        }
      });
      btnDec.addEventListener('click', () => {
        if (portions > 1) {
          portions--;
          portionVal.textContent = portions;
        }
      });
    }

    // Toggleable Chips (Diet & Alergi)
    document.querySelectorAll('.chip-toggle').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        if (chip.classList.contains('active')) {
          chip.classList.remove('bg-surface-container', 'text-on-surface');
          chip.classList.add('bg-primary-container', 'text-on-primary', 'shadow-sm');
        } else {
          chip.classList.remove('bg-primary-container', 'text-on-primary', 'shadow-sm');
          chip.classList.add('bg-surface-container', 'text-on-surface');
        }
      });
    });

    // Toast and Modals triggers
    const toast = document.getElementById('save-toast');
    const logoutModal = document.getElementById('logout-modal');
    const bioModal = document.getElementById('bio-modal');

    function triggerToast() {
      if (toast) {
        toast.classList.remove('hidden');
        toast.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    function openLogoutModal() {
      if (logoutModal) logoutModal.classList.remove('hidden');
    }

    function closeLogoutModal() {
      if (logoutModal) logoutModal.classList.add('hidden');
    }

    function openBioModal() {
      if (bioModal) bioModal.classList.remove('hidden');
    }

    function closeBioModal() {
      if (bioModal) bioModal.classList.add('hidden');
    }

    function saveBioModal() {
      closeBioModal();
      triggerToast();
    }

    function resetStates() {
      if (toast) toast.classList.add('hidden');
      if (logoutModal) logoutModal.classList.add('hidden');
      if (bioModal) bioModal.classList.add('hidden');
    }

    // Bind DOM events
    document.getElementById('btn-save-preferences')?.addEventListener('click', triggerToast);
    document.getElementById('btn-save-account')?.addEventListener('click', triggerToast);
    document.getElementById('btn-trigger-logout-modal')?.addEventListener('click', openLogoutModal);
    document.getElementById('btn-open-biodata-modal')?.addEventListener('click', openBioModal);
    document.getElementById('btn-edit-avatar')?.addEventListener('click', openBioModal);
    document.getElementById('btn-change-password-modal')?.addEventListener('click', openBioModal);
