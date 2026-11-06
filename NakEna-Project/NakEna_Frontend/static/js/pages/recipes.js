const recipesData = {
      'nasi-goreng': {
        title: 'Nasi Goreng Rumahan Spesial',
        tag: '⭐ Rekomendasi Utama • 98% Cocok',
        time: '15 Menit',
        difficulty: 'Sangat Mudah',
        portion: '2 Porsi',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCYlJN0eQe5E3DxgMO3q0tZZcrL3Hv04S7uyRN07oDPvvI9p4PMnD0KrBCrjbro9QhMj_9xL-6GMe44ZqhILk6K8NEQysKYfHl77DygHP0A5DaxwGok5ukjYqlzlAjGQTl01HKWeLumoQ_imAqjCPSDNZweJJbd5N6rm35HbkYLPIAAdxoZ4sF9eACv6yg-4FmPXymzK4_POo2vWXvvuY7xOzRaya3NwkzqQSI9IBVoYbA-wIdq9VABcw'
      },
      'telur-balado': {
        title: 'Telur Balado Praktis Pedas Manis',
        tag: '🔥 Favorit Pengguna • 94% Cocok',
        time: '20 Menit',
        difficulty: 'Sedang',
        portion: '3 Porsi',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1O-g73_WPNEtEJB1qHla5HJ47aYFeze9ODhEKw7jovFRD14bepF1gRqCuYqHN5_Hhdbh-klKjo_EwAX_VindojySP_Z4CPb_AU_o1a9xbElnDpusGW_v3_dw5qpz89h-pw_QSAKI-7cfUCmCe0lLFOGFZqdAy4iTE8BFe-7v3sS2aYLbShrIld9iXhU6Xn5OcXoFjU-41uTugsbZFhIhV7LMrXSe0JxAZj-N2f0rFMfm0vJxvK0IyqA'
      },
      'tumis-sayur': {
        title: 'Tumis Sayur Sederhana & Tomat Segar',
        tag: '⚡ Cepat Dibuat • 92% Cocok',
        time: '10 Menit',
        difficulty: 'Sangat Mudah',
        portion: '2 Porsi',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEexNgZ2xh4el2x_nmx14Bfq7cUjaPQK391JxrYucFMdjbP6fzcfoM1VnvYTEe0THPCWA0ojWjOGRNf1ZPCoQ5En7kH9RMXonjpoaumYriGiyR2EP4mIJcJVFQOnt-4WnsGh8VZkR1dWKqqumDjXKMCM4T59rX1568L86Ed-2OjlSZlZY11bkdPwafQVJNXVTkN9uKuibqAIQmxaXd0BCBjo4NDNmc5oSn0v-0nabgUamqz2TSEyyCMg'
      },
      'omelet-sayur': {
        title: 'Omelet Sayur Gurih Mengembang',
        tag: '✨ Bahan Lengkap • 95% Cocok',
        time: '12 Menit',
        difficulty: 'Sangat Mudah',
        portion: '2 Porsi',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOjTZ0ZWShg4-9xWF58ZGisbvRDelPvoPXXhfuV2gGiEWhvrlYRtCEnOaoKuPKwD5RoSmmsf7O2xLKnZw3X2QXRWNck8BlfLdnpsd62ENd9V6YDeacV5uE2rnPx8Tc_iRsSkxjEWH6h2YwRdsXOqzkNuA9eE8M_v43dH9dvLZTgAO64aDvKEu9hK9FWN2jUCvbRuvyMB65GthrYE8bwIEjka2bvo-181Cmmh-MWUXztD82FHUYxTdr2A'
      },
      'mie-goreng': {
        title: 'Mie Goreng Spesial Dapur Sendiri',
        tag: '🍜 Alternatif Lezat • 88% Cocok',
        time: '15 Menit',
        difficulty: 'Mudah',
        portion: '1-2 Porsi',
        img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt2i2HEzO3D8k5xI7dhUk57iT1lS6xgLNz3_xgz57hdtxwPCQtqMsvQmLNXJihGVhrDiSe5Cpcau-MVS5wkGggJQOUiV5a3v2ITwiLGv8qAOT6nTJWqOeettpoFAJgSb7WNLGd0TsjT9TnEyhLC-5T14c9ENxni1iV7HCkDygQt-hG5LOPqCBhYYk5ZdBfWBoOU-sneXmva3KCIncj3XVdirTai1Cizg6OXKzoSK4Lsfw1RcOmXLAhww'
      }
    };

    let savedRecipes = [];

    function updateCounts() {
      const topCount = document.getElementById('savedCountHeader');
      const bottomCount = document.getElementById('savedCountBottom');
      if (topCount) topCount.innerText = savedRecipes.length;
      if (bottomCount) bottomCount.innerText = savedRecipes.length;
    }

    function showToast(message, icon = 'check_circle') {
      const toast = document.getElementById('toastNotification');
      const msg = document.getElementById('toastMessage');
      const icn = document.getElementById('toastIcon');
      if (!toast) return;

      msg.innerText = message;
      icn.innerText = icon;
      toast.classList.remove('translate-y-24', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 3000);
    }

    function toggleFav(btn, recipeTitle) {
      const icon = btn.querySelector('.bookmark-icon') || btn.querySelector('.material-symbols-outlined');
      const idx = savedRecipes.indexOf(recipeTitle);

      if (idx === -1) {
        savedRecipes.push(recipeTitle);
        if (icon) {
          icon.innerText = 'favorite';
          icon.style.fontVariationSettings = "'FILL' 1";
          icon.classList.add('text-primary');
        }
        showToast(`'${recipeTitle}' disimpan ke resep favorit!`, 'bookmark_added');
      } else {
        savedRecipes.splice(idx, 1);
        if (icon) {
          icon.innerText = 'favorite_border';
          icon.style.fontVariationSettings = "'FILL' 0";
          icon.classList.remove('text-primary');
        }
        showToast(`'${recipeTitle}' dihapus dari favorit.`, 'bookmark_remove');
      }
      updateCounts();
    }

    function openRecipeModal(key) {
      const modal = document.getElementById('recipeDetailModal');
      const data = recipesData[key];
      if (!modal || !data) return;

      document.getElementById('modalTitle').innerText = data.title;
      document.getElementById('modalTag').innerText = data.tag;
      document.getElementById('modalTime').innerText = data.time;
      document.getElementById('modalDifficulty').innerText = data.difficulty;
      document.getElementById('modalPortion').innerText = data.portion;
      if (data.img) {
        document.getElementById('modalImg').src = data.img;
      }

      modal.classList.remove('hidden');
      modal.classList.add('flex');
      document.body.style.overflow = 'hidden';
    }

    function closeRecipeModal() {
      const modal = document.getElementById('recipeDetailModal');
      if (!modal) return;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      document.body.style.overflow = 'auto';
    }

    function startInteractiveCooking() {
      closeRecipeModal();
      showToast('Memulai sesi panduan memasak interaktif...', 'skillet');
    }

    function triggerRegenerate() {
      const btn = document.getElementById('btnRegenerate');
      if (!btn) return;
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="material-symbols-outlined text-[18px] animate-spin">progress_activity</span> Meracik...`;
      btn.disabled = true;

      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showToast('3 ide resep baru berhasil diracik NakEna!', 'auto_awesome');
      }, 1500);
    }

    function requestCustomPrompt() {
      const input = document.getElementById('customPromptInput');
      if (!input || !input.value.trim()) {
        showToast('Tuliskan permintaan masakanmu terlebih dahulu!', 'info');
        return;
      }
      const val = input.value;
      input.value = '';
      showToast(`Meracik resep khusus: "${val}"`, 'smart_toy');
    }

    // Filter Chips Active state
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.remove('bg-primary', 'text-white', 'shadow-[0_0_12px_rgba(255,94,20,0.4)]');
          c.classList.add('bg-navy-surface', 'text-on-surface-variant');
        });
        this.classList.remove('bg-navy-surface', 'text-on-surface-variant');
        this.classList.add('bg-primary', 'text-white', 'shadow-[0_0_12px_rgba(255,94,20,0.4)]');
      });
    });

    window.addEventListener('click', (e) => {
      const modal = document.getElementById('recipeDetailModal');
      if (e.target === modal) {
        closeRecipeModal();
      }
    });
