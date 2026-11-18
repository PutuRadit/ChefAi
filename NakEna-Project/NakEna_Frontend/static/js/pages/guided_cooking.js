(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  function durationForStep(text) {
    const range = text.match(/(\d+(?:[.,]\d+)?)\s*(?:[-–—]|sampai|hingga)\s*(\d+(?:[.,]\d+)?)\s*(jam|menit|detik)\b/i);
    const duration = range || text.match(/(\d+(?:[.,]\d+)?)\s*(jam|menit|detik)\b/i);
    if (!duration) return null;
    const value = range
      ? (Number(range[1].replace(",", ".")) + Number(range[2].replace(",", "."))) / 2
      : Number(duration[1].replace(",", "."));
    const unit = duration[range ? 3 : 2].toLowerCase();
    const seconds = Math.round(value * (unit === "jam" ? 3600 : unit === "menit" ? 60 : 1));
    return seconds >= 6 && seconds <= 21600 ? seconds : null;
  }

  function estimateStepSeconds(text) {
    const explicit = durationForStep(text);
    if (explicit) return explicit;
    const instruction = text.toLowerCase();
    if (/potong|iris|cincang|kupas|bersihkan|siapkan/.test(instruction)) return 4 * 60;
    if (/haluskan|ulek|blender|giling/.test(instruction)) return 5 * 60;
    if (/panaskan/.test(instruction)) return 2 * 60;
    if (/rebus|ungkep|panggang|bakar/.test(instruction)) return 12 * 60;
    if (/tumis|goreng/.test(instruction)) return 6 * 60;
    if (/sajikan|angkat|taburkan/.test(instruction)) return 1 * 60;
    return 3 * 60;
  }

  function formatEstimate(seconds) {
    const minutes = Math.max(1, Math.round(seconds / 6) / 10);
    return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(minutes)} menit`;
  }

  function instructionWithoutEstimate(text) {
    return text.replace(/\s*\((?:±|sekitar|kurang lebih)\s*\d+(?:[.,]\d+)?\s*(?:jam|menit|detik)\)\s*$/i, "").trim();
  }

  let initialized = false;
  window.addEventListener("nakena:guided-recipe", (event) => {
    if (initialized || !byId("cooking-workspace")) return;
    initialized = true;
    const recipe = event.detail;
    const instructions = recipe.instructions;
    const groups = recipe.ingredientGroups;
    if (!Array.isArray(instructions) || !Array.isArray(groups)) return;
    const ingredients = groups.flatMap((group) => group.items);
    const total = instructions.length;
    const signature = JSON.stringify([recipe.title, instructions, groups]);
    let progressKey = "nakena_cooking_progress_guest";
    let stored = {};
    try {
      progressKey = `nakena_cooking_progress_${sessionStorage.getItem("nakena_user_email") || "guest"}`;
      const value = JSON.parse(sessionStorage.getItem(progressKey) || "null");
      if (value?.signature === signature) stored = value;
    } catch { /* Cooking remains available when session storage is blocked. */ }
    const validIndex = (index, limit) => Number.isInteger(index) && index >= 0 && index < limit;
    let current = validIndex(stored.current, total) ? stored.current : 0;
    const completed = new Set((Array.isArray(stored.completed) ? stored.completed : []).filter((i) => validIndex(i, total)));
    const checked = new Set((Array.isArray(stored.checked) ? stored.checked : []).filter((i) => validIndex(i, ingredients.length)));
    let started = stored.started === true && (ingredients.length === 0 || checked.size === ingredients.length);
    if (!ingredients.length) started = true;
    const saveProgress = () => {
      try {
        sessionStorage.setItem(progressKey, JSON.stringify({ signature, current, completed: [...completed], checked: [...checked], started }));
      } catch { /* Progress is still maintained in memory for this page. */ }
    };
    let interval = null;
    let speech = null;
    const timer = { remaining: 60, duration: 60, deadline: 0, running: false, touched: false, source: 0 };
    const exitDialog = byId("exit-modal-overlay");
    const finishDialog = byId("celebration-overlay");
    const reviewDialog = byId("cooking-review-dialog");
    const reviewForm = byId("cooking-review-form");
    const minutes = byId("timer-minutes-input");

    document.title = `${recipe.title} — Panduan memasak | NakEna`;
    byId("recipe-title-display").textContent = recipe.title;
    byId("recipe-step-total").textContent = `${total} langkah`;
    byId("review-recipe-title").textContent = recipe.title;
    if (recipe.time) {
      byId("recipe-total-time").textContent = `Total ${recipe.time}`;
      byId("recipe-total-time").hidden = false;
    }
    if (recipe.tips.length) {
      recipe.tips.forEach((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        byId("mascot-tip-text").append(p);
      });
      byId("cooking-tips").hidden = false;
    }

    function stopSpeaking() {
      speech = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      byId("voice-text").textContent = "Bacakan langkah";
      byId("toggle-voice-btn").setAttribute("aria-pressed", "false");
    }

    function updateTimer() {
      byId("timer-display-string").textContent = formatTime(timer.remaining);
      byId("main-timer-action-btn").textContent = timer.running ? "Jeda" : timer.remaining === 0 ? "Mulai lagi" : timer.touched && timer.remaining < timer.duration ? "Lanjutkan" : "Mulai";
      minutes.disabled = timer.running;
    }

    function tickTimer() {
      if (!timer.running) return;
      timer.remaining = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
      if (timer.remaining === 0) {
        timer.running = false;
        clearInterval(interval);
        interval = null;
        byId("timer-status").textContent = "Waktu habis";
      }
      updateTimer();
    }

    function pauseTimer() {
      tickTimer();
      if (timer.running) {
        timer.running = false;
        byId("timer-status").textContent = `Timer langkah ${timer.source + 1} dijeda`;
      }
      clearInterval(interval);
      interval = null;
      updateTimer();
    }

    function loadStepTimer() {
      if (timer.touched || timer.running) return;
      const duration = estimateStepSeconds(instructions[current]);
      timer.remaining = timer.duration = duration;
      timer.source = current;
      minutes.value = String(timer.duration / 60);
      byId("timer-status").textContent = `Perkiraan ${formatEstimate(duration)} · bisa disesuaikan`;
      updateTimer();
    }

    function updatePrepProgress() {
      const percent = ingredients.length ? Math.round(checked.size / ingredients.length * 100) : 100;
      byId("step-count-text").textContent = "Persiapan bahan";
      byId("progress-percent-text").textContent = `${checked.size}/${ingredients.length} bahan siap`;
      byId("progress-indicator-bar").style.width = `${percent}%`;
      byId("cooking-progress").setAttribute("aria-valuenow", String(percent));
      byId("cooking-progress").setAttribute("aria-valuetext", `${checked.size} dari ${ingredients.length} bahan siap`);
    }

    function updateCheckedCount() {
      const ready = checked.size === ingredients.length;
      byId("checked-counter").textContent = `${checked.size}/${ingredients.length} siap`;
      byId("start-cooking-btn").disabled = !ready;
      byId("prep-check-hint").textContent = ready
        ? "Semua bahan siap. Kamu bisa mulai memasak."
        : "Centang semua bahan untuk melanjutkan.";
      updatePrepProgress();
    }

    function renderIngredients() {
      const container = byId("ingredients-checklist-container");
      container.replaceChildren();
      let ingredientIndex = 0;
      groups.forEach((group) => {
        const block = document.createElement("div");
        block.className = "gc-ingredient-group";
        if (groups.length > 1 || /bumbu|utama/.test(group.label)) {
          const heading = document.createElement("h3");
          heading.textContent = group.label.charAt(0).toUpperCase() + group.label.slice(1);
          block.append(heading);
        }
        const list = document.createElement("ul");
        list.className = "gc-ingredient-list";
        list.setAttribute("role", "list");
        group.items.forEach((ingredient) => {
          const index = ingredientIndex++;
          const item = document.createElement("li");
          const label = document.createElement("label");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.checked = checked.has(index);
          const text = document.createElement("span");
          text.textContent = ingredient;
          input.addEventListener("change", () => {
            if (input.checked) checked.add(index); else checked.delete(index);
            updateCheckedCount();
            saveProgress();
          });
          label.append(input, text);
          item.append(label);
          list.append(item);
        });
        block.append(list);
        container.append(block);
      });
      byId("cooking-ingredients").hidden = ingredients.length === 0;
      updateCheckedCount();
    }

    function renderStep(focus = false) {
      const percent = Math.round(completed.size / total * 100);
      const duration = estimateStepSeconds(instructions[current]);
      byId("step-heading-text").textContent = `Langkah ${current + 1}`;
      byId("step-description-text").textContent = instructionWithoutEstimate(instructions[current]);
      byId("step-duration-estimate").textContent = `Perkiraan waktu: ${formatEstimate(duration)}`;
      byId("step-badge-text").textContent = `LANGKAH ${String(current + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
      byId("step-count-text").textContent = `Langkah ${current + 1} dari ${total}`;
      byId("modal-step-display").textContent = String(current + 1);
      byId("progress-percent-text").textContent = `${completed.size}/${total} selesai · ${percent}%`;
      byId("progress-indicator-bar").style.width = `${percent}%`;
      byId("cooking-progress").setAttribute("aria-valuenow", String(percent));
      byId("cooking-progress").setAttribute("aria-valuetext", `${completed.size} dari ${total} langkah selesai`);
      byId("step-completed-label").hidden = !completed.has(current);
      byId("prev-step-btn").disabled = current === 0;
      byId("next-btn-text").textContent = current === total - 1 ? (completed.size + (completed.has(current) ? 0 : 1) === total ? "Selesai memasak" : "Tandai selesai") : "Selesai & lanjut";
      loadStepTimer();
      if (focus) {
        byId("cooking-instruction").focus({ preventScroll: true });
        byId("cooking-instruction").scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    }

    function goToStep(index) {
      stopSpeaking();
      pauseTimer();
      timer.touched = false;
      current = Math.max(0, Math.min(total - 1, index));
      saveProgress();
      renderStep(true);
    }

    byId("start-cooking-btn").addEventListener("click", () => {
      if (checked.size !== ingredients.length) return;
      started = true;
      current = 0;
      saveProgress();
      byId("prep-stage").hidden = true;
      byId("cooking-grid").hidden = false;
      renderStep(true);
    });
    byId("next-step-btn").addEventListener("click", () => {
      completed.add(current);
      saveProgress();
      if (completed.size === total) {
        stopSpeaking();
        pauseTimer();
        renderStep();
        byId("finished-recipe-title").textContent = recipe.title;
        finishDialog.showModal();
        return;
      }
      const next = current + 1 < total ? current + 1 : instructions.findIndex((_, index) => !completed.has(index));
      goToStep(next);
    });
    byId("open-cooking-review-btn").addEventListener("click", () => {
      finishDialog.close();
      reviewDialog.showModal();
    });
    byId("cancel-cooking-review-btn").addEventListener("click", () => {
      reviewDialog.close();
      finishDialog.showModal();
    });
    reviewForm.addEventListener("change", (event) => {
      if (event.target.name !== "rating") return;
      const rating = Number(event.target.value);
      reviewForm.querySelectorAll(".gc-rating-option").forEach((option, index) => {
        option.classList.toggle("is-selected", index < rating);
      });
    });
    reviewForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const rating = Number(new FormData(reviewForm).get("rating"));
      const error = byId("cooking-review-error");
      const submit = byId("submit-cooking-review-btn");
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        error.textContent = "Pilih rating bintang terlebih dahulu.";
        error.hidden = false;
        return;
      }
      if (!recipe.id || String(recipe.id).startsWith("pending-")) {
        error.textContent = "Resep belum tersimpan di riwayat akun, jadi review belum bisa disimpan.";
        error.hidden = false;
        return;
      }
      error.hidden = true;
      submit.disabled = true;
      submit.textContent = "Menyimpan review…";
      window.addEventListener("nakena:cooking-review-saved", () => {
        reviewDialog.close();
        location.assign("/recipes/?review=saved#other-recipes");
      }, { once: true });
      window.addEventListener("nakena:cooking-review-error", (saveEvent) => {
        error.textContent = saveEvent.detail?.message || "Review belum tersimpan. Coba lagi.";
        error.hidden = false;
        submit.disabled = false;
        submit.textContent = "Simpan review & lihat rekomendasi";
      }, { once: true });
      window.dispatchEvent(new CustomEvent("nakena:submit-cooking-review", {
        detail: {
          rating,
          comment: byId("cooking-review-comment").value.trim(),
        },
      }));
    });
    byId("prev-step-btn").addEventListener("click", () => goToStep(current - 1));
    byId("trigger-exit-modal-btn").addEventListener("click", () => { stopSpeaking(); exitDialog.showModal(); });
    byId("cancel-exit-btn").addEventListener("click", () => exitDialog.close());
    byId("restart-cooking-btn").addEventListener("click", () => {
      finishDialog.close();
      pauseTimer();
      timer.touched = false;
      started = false;
      completed.clear();
      checked.clear();
      renderIngredients();
      current = 0;
      saveProgress();
      byId("prep-stage").hidden = false;
      byId("cooking-grid").hidden = true;
      updatePrepProgress();
    });

    minutes.addEventListener("input", () => {
      const value = Number(minutes.value);
      const valid = Number.isFinite(value) && value >= 0.1 && value <= 360;
      byId("timer-error").hidden = valid;
      minutes.setAttribute("aria-invalid", String(!valid));
      byId("main-timer-action-btn").disabled = !valid;
      if (!valid) return;
      pauseTimer();
      timer.remaining = timer.duration = Math.round(value * 60);
      timer.source = current;
      timer.touched = true;
      byId("timer-status").textContent = `Timer langkah ${current + 1}`;
      updateTimer();
    });
    byId("main-timer-action-btn").addEventListener("click", () => {
      if (timer.running) { pauseTimer(); return; }
      if (timer.remaining === 0) timer.remaining = timer.duration;
      timer.running = timer.touched = true;
      timer.deadline = Date.now() + timer.remaining * 1000;
      byId("timer-status").textContent = `Timer langkah ${timer.source + 1} berjalan`;
      interval = setInterval(tickTimer, 250);
      updateTimer();
    });
    byId("reset-timer-btn").addEventListener("click", () => {
      pauseTimer();
      timer.remaining = timer.duration;
      minutes.value = String(timer.duration / 60);
      byId("timer-error").hidden = true;
      minutes.setAttribute("aria-invalid", "false");
      byId("main-timer-action-btn").disabled = false;
      byId("timer-status").textContent = `Timer langkah ${timer.source + 1}`;
      updateTimer();
    });
    byId("bottom-quick-timer-btn").addEventListener("click", () => {
      tickTimer();
      timer.remaining = Math.min(21600, timer.remaining + 60);
      timer.duration = Math.max(timer.duration, timer.remaining);
      timer.touched = true;
      if (timer.running) timer.deadline = Date.now() + timer.remaining * 1000;
      minutes.value = String(timer.duration / 60);
      byId("timer-error").hidden = true;
      minutes.setAttribute("aria-invalid", "false");
      byId("main-timer-action-btn").disabled = false;
      if (!timer.running) byId("timer-status").textContent = `Timer langkah ${timer.source + 1}`;
      updateTimer();
    });

    if (total && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      byId("toggle-voice-btn").hidden = false;
      byId("toggle-voice-btn").setAttribute("aria-pressed", "false");
      byId("toggle-voice-btn").addEventListener("click", () => {
        if (speech) { stopSpeaking(); return; }
        const utterance = new window.SpeechSynthesisUtterance(`Langkah ${current + 1}. ${instructions[current]}`);
        utterance.lang = "id-ID";
        const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("id"));
        if (voice) utterance.voice = voice;
        utterance.rate = 0.9;
        utterance.onend = utterance.onerror = () => { if (speech === utterance) stopSpeaking(); };
        speech = utterance;
        byId("voice-text").textContent = "Hentikan bacaan";
        byId("toggle-voice-btn").setAttribute("aria-pressed", "true");
        window.speechSynthesis.speak(utterance);
      });
    }
    document.addEventListener("visibilitychange", tickTimer);
    window.addEventListener("pagehide", () => { pauseTimer(); stopSpeaking(); });
    if (total) {
      renderIngredients();
      byId("prep-stage").hidden = started;
      byId("cooking-grid").hidden = !started;
      if (started) renderStep();
    } else {
      byId("cooking-grid").hidden = true;
      byId("prep-stage").hidden = true;
      byId("cooking-empty").hidden = false;
      byId("step-count-text").textContent = "Belum ada langkah";
      byId("progress-percent-text").textContent = "0%";
    }
    byId("cooking-loading").hidden = true;
    byId("cooking-workspace").hidden = false;
    byId("cooking-main").setAttribute("aria-busy", "false");
  });
})();
