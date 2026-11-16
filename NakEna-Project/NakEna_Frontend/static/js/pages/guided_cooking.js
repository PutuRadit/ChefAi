(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  // Only prefill one explicit duration. Ranges and multiple durations stay manual.
  function durationForStep(text) {
    if (/\d\s*(?:[-–—]|sampai|hingga)\s*\d/i.test(text) || /\d+\s*\/\s*\d+\s*(?:jam|menit|detik)\b/i.test(text)) return null;
    const durations = [...text.matchAll(/(^|[^\d.,])(\d+(?:[.,]\d+)?)\s*(jam|menit|detik)\b/gi)];
    if (durations.length !== 1) return null;
    const value = Number(durations[0][2].replace(",", "."));
    const unit = durations[0][3].toLowerCase();
    const seconds = Math.round(value * (unit === "jam" ? 3600 : unit === "menit" ? 60 : 1));
    return seconds >= 6 && seconds <= 21600 ? seconds : null;
  }

  function checkIcon() {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "gc-icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "m5 12 4 4L19 6");
    icon.append(path);
    return icon;
  }

  let initialized = false;
  window.addEventListener("nakena:guided-recipe", (event) => {
    if (initialized || !byId("cooking-workspace")) return;
    initialized = true;
    const recipe = event.detail;
    const instructions = recipe.instructions;
    const groups = recipe.ingredientGroups;
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
    const saveProgress = () => {
      try {
        sessionStorage.setItem(progressKey, JSON.stringify({ signature, current, completed: [...completed], checked: [...checked] }));
      } catch { /* Progress is still maintained in memory for this page. */ }
    };
    let interval = null;
    let speech = null;
    const timer = { remaining: 60, duration: 60, deadline: 0, running: false, touched: false, source: 0 };
    const exitDialog = byId("exit-modal-overlay");
    const finishDialog = byId("celebration-overlay");
    const minutes = byId("timer-minutes-input");

    document.title = `${recipe.title} — Panduan memasak | NakEna`;
    byId("recipe-title-display").textContent = recipe.title;
    byId("recipe-step-total").textContent = `${total} langkah`;
    byId("outline-step-count").textContent = `${total} langkah`;
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
      const duration = durationForStep(instructions[current]);
      timer.remaining = timer.duration = duration || 60;
      timer.source = current;
      minutes.value = String(timer.duration / 60);
      byId("timer-status").textContent = duration ? `Durasi pada langkah ${current + 1}` : "Atur sesuai kebutuhan";
      updateTimer();
    }

    function updateCheckedCount() {
      byId("checked-counter").textContent = `${checked.size}/${ingredients.length} siap`;
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

    function renderOutline() {
      const list = byId("cooking-step-list");
      list.replaceChildren();
      instructions.forEach((text, index) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = `gc-outline-step${completed.has(index) ? " is-complete" : ""}`;
        if (index === current) button.setAttribute("aria-current", "step");
        button.setAttribute("aria-label", `Langkah ${index + 1}${completed.has(index) ? ", selesai" : ""}: ${text}`);
        const number = document.createElement("span");
        number.className = "gc-step-number";
        number.setAttribute("aria-hidden", "true");
        if (completed.has(index)) number.append(checkIcon()); else number.textContent = String(index + 1).padStart(2, "0");
        const summary = document.createElement("span");
        summary.className = "gc-step-summary";
        summary.textContent = text.length > 94 ? text.slice(0, 91).trimEnd() + "…" : text;
        button.append(number, summary);
        button.addEventListener("click", () => goToStep(index));
        item.append(button);
        list.append(item);
      });
    }

    function renderStep(focus = false) {
      const percent = Math.round(completed.size / total * 100);
      byId("step-heading-text").textContent = `Langkah ${current + 1}`;
      byId("step-description-text").textContent = instructions[current];
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
      renderOutline();
      loadStepTimer();
      if (focus) {
        byId("cooking-instruction").focus({ preventScroll: true });
        byId("cooking-instruction").scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    }

    function goToStep(index) {
      stopSpeaking();
      current = Math.max(0, Math.min(total - 1, index));
      saveProgress();
      renderStep(true);
    }

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
    byId("prev-step-btn").addEventListener("click", () => goToStep(current - 1));
    byId("trigger-exit-modal-btn").addEventListener("click", () => { stopSpeaking(); exitDialog.showModal(); });
    byId("cancel-exit-btn").addEventListener("click", () => exitDialog.close());
    byId("restart-cooking-btn").addEventListener("click", () => {
      finishDialog.close();
      pauseTimer();
      timer.touched = false;
      completed.clear();
      checked.clear();
      renderIngredients();
      goToStep(0);
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
      renderStep();
    } else {
      byId("cooking-grid").hidden = true;
      byId("cooking-empty").hidden = false;
      byId("step-count-text").textContent = "Belum ada langkah";
      byId("progress-percent-text").textContent = "0%";
    }
    byId("cooking-loading").hidden = true;
    byId("cooking-workspace").hidden = false;
    byId("cooking-main").setAttribute("aria-busy", "false");
  });
})();
