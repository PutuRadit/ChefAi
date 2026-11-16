const recipeIconShapes = {"check_circle":[["circle",{"cx":"12","cy":"12","r":"9"}],["path",{"d":"m8 12 3 3 5-6"}]],"bookmark_added":[["path",{"d":"M6 3h12v19l-6-4-6 4V3ZM9 10h6m-3-3v6"}]],"bookmark_remove":[["path",{"d":"M6 3h12v19l-6-4-6 4V3ZM9 10h6"}]],"skillet":[["path",{"d":"M15.5 8.5 22 2M17 7l2 2"}],["circle",{"cx":"9.5","cy":"14.5","r":"7.5"}],["path",{"d":"M6 14a4 4 0 0 1 4-3"}]],"auto_awesome":[["path",{"d":"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM3 2v4M1 4h4m15 14v4m-2-2h4"}]],"info":[["circle",{"cx":"12","cy":"12","r":"9"}],["path",{"d":"M12 11v6M12 7h.01"}]],"smart_toy":[["rect",{"x":"4","y":"7","width":"16","height":"14","rx":"3"}],["path",{"d":"M12 3v4M10 3h4M1 12v5m22-5v5M8 12h.01M16 12h.01M8 17h8"}]],"progress_activity":[["path",{"d":"M21 12a9 9 0 1 1-9-9"}]],"favorite":[["path",{"d":"M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"}]],"favorite_border":[["path",{"d":"M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"}]],"bookmark":[["path",{"d":"M6 3h12v19l-6-4-6 4V3Z"}]],"bookmark_border":[["path",{"d":"M6 3h12v19l-6-4-6 4V3Z"}]]};

function setRecipeIcon(icon, name) {
  if (!icon || icon.localName !== 'svg') return false;
  const nodes = (recipeIconShapes[name] || recipeIconShapes.info).map(([tag, attributes]) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  });
  icon.replaceChildren(...nodes);
  icon.dataset.recipeIcon = name;
  icon.setAttribute('fill', ['favorite', 'bookmark'].includes(name) ? 'currentColor' : 'none');
  return true;
}

function setRecipeSavedIcon(icon, saved) {
  if (!icon) return;
  const bookmark = (icon.dataset.recipeIcon || '').startsWith('bookmark');
  setRecipeIcon(icon, bookmark ? (saved ? 'bookmark' : 'bookmark_border') : (saved ? 'favorite' : 'favorite_border'));
  icon.classList.toggle('is-saved', saved);
  icon.closest('button')?.setAttribute('aria-pressed', String(saved));
}
window.NakEnaRecipeIcons = { set: setRecipeIcon, setSaved: setRecipeSavedIcon };

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
      setRecipeIcon(icn, icon);
      toast.classList.remove('translate-y-24', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 3000);
    }

    function toggleFav(btn, recipeTitle) {
      const icon = btn.querySelector('.bookmark-icon, [data-recipe-icon]');
      const idx = savedRecipes.indexOf(recipeTitle);

      if (idx === -1) {
        savedRecipes.push(recipeTitle);
        if (icon) {
          setRecipeSavedIcon(icon, true);
          icon.classList.add('text-primary');
        }
        showToast(`'${recipeTitle}' disimpan ke resep favorit!`, 'bookmark_added');
      } else {
        savedRecipes.splice(idx, 1);
        if (icon) {
          setRecipeSavedIcon(icon, false);
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
      const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      spinner.setAttribute('class', 'recipe-icon recipe-icon--18 recipe-icon--spinning');
      spinner.setAttribute('viewBox', '0 0 24 24');
      spinner.setAttribute('stroke', 'currentColor');
      spinner.setAttribute('stroke-width', '1.8');
      spinner.setAttribute('stroke-linecap', 'round');
      spinner.setAttribute('aria-hidden', 'true');
      spinner.setAttribute('focusable', 'false');
      setRecipeIcon(spinner, 'progress_activity');
      btn.replaceChildren(spinner, document.createTextNode(' Meracik...'));
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
