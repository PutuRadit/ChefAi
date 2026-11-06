// Recipe Steps Data Model
  const RECIPE_STEPS = [
    {
      step: 1,
      total: 7,
      badge: "LANGKAH 1 DARI 7 • PERSIAPAN BAHAN",
      title: "Siapkan & Iris Bahan Dapur",
      desc: "Iris tipis bawang merah dan bawang putih. Potong tomat segar menjadi dadu kecil. Kocok lepas 2 butir telur ayam dalam mangkuk kecil, dan pastikan nasi putih sudah dalam keadaan dingin agar tidak lembek saat digoreng.",
      estimation: "Estimasi: 3 Menit",
      seconds: 180,
      mascotQuote: "Pelan-pelan ya chef, kamu sudah hebat! Pastikan nasinya tidak menggumpal biar hasilnya mawur dan lezat! 🍳✨",
      tip: "Gunakan pisau yang tajam agar mata tidak perih saat mengiris bawang merah.",
      ingredients: [
        { name: "4 Siung Bawang Merah", note: "diiris tipis" },
        { name: "1 Buah Tomat Segar", note: "dipotong dadu kecil" },
        { name: "2 Butir Telur Ayam", note: "dikocok lepas" },
        { name: "2 Piring Nasi Dingin", note: "pisahkan butirannya" }
      ]
    },
    {
      step: 2,
      total: 7,
      badge: "LANGKAH 2 DARI 7 • MENUMIS AROMA",
      title: "Tumis Bumbu Iris Hingga Harum",
      desc: "Panaskan 2 sendok makan minyak goreng di atas wajan dengan api sedang. Masukkan irisan bawang merah dan bawang putih, aduk perlahan hingga warnanya keemasan dan aroma sedap keluar.",
      estimation: "Estimasi: 2 Menit",
      seconds: 120,
      mascotQuote: "Wangi bumbunya mulai tercium enak nih! Jangan sampai gosong ya, api sedang saja! 🔥",
      tip: "Minyak yang cukup panas akan mengunci rasa manis alami dari bawang.",
      ingredients: [
        { name: "2 sdm Minyak Sayur", note: "untuk menumis" },
        { name: "Irisan Bawang Merah & Putih", note: "dari langkah 1" }
      ]
    },
    {
      step: 3,
      total: 7,
      badge: "LANGKAH 3 DARI 7 • ORAK-ARIK TELUR",
      title: "Orak-Arik Telur di Sisi Wajan",
      desc: "Geser bumbu ke tepi wajan, tuang telur kocok di sisi tengah yang panas. Diamkan sejenak 10 detik lalu orak-arik hingga berbutir lembut dan matang merata.",
      estimation: "Estimasi: 1.5 Menit",
      seconds: 90,
      mascotQuote: "Orak-arik cepat biar telurnya lembut dan menyatu sempurna dengan nasi nantinya! 🥚",
      tip: "Jangan biarkan telur terlalu kering agar tekstur nasi goreng tetap moist.",
      ingredients: [
        { name: "2 Butir Telur Kocok", note: "siap tuang" }
      ]
    },
    {
      step: 4,
      total: 7,
      badge: "LANGKAH 4 DARI 7 • MEMASUKKAN NASI",
      title: "Masukkan Nasi & Aduk Cepat",
      desc: "Masukkan nasi dingin ke dalam wajan. Besarkan sedikit api kompor, gunakan spatula untuk menekan gumpalan nasi dan campurkan dengan telur serta bumbu secara merata.",
      estimation: "Estimasi: 3 Menit",
      seconds: 180,
      mascotQuote: "Gunakan spatula dengan mantap! Goyang wajannya seperti koki profesional! 🥄💨",
      tip: "Gunakan teknik menekan dengan punggung spatula agar nasi tidak hancur.",
      ingredients: [
        { name: "2 Piring Nasi Dingin", note: "sudah diurai" }
      ]
    },
    {
      step: 5,
      total: 7,
      badge: "LANGKAH 5 DARI 7 • PEMBUMBUMAN RASA",
      title: "Bumbui Kecap Manis & Rempah",
      desc: "Tuang kecap manis di pinggiran wajan panas agar terkaramelisasi. Tambahkan garam, merica bubuk, dan sedikit kaldu jamur. Aduk cepat hingga warna nasi cokelat mengilap.",
      estimation: "Estimasi: 2 Menit",
      seconds: 120,
      mascotQuote: "Kecap manis yang kena panas wajan bakal ngasih aroma smoky yang gurih banget! 🍯",
      tip: "Menuangkan kecap di pinggir wajan dinamakan teknik 'wok hei' rumahan.",
      ingredients: [
        { name: "2 sdm Kecap Manis", note: "tuang melingkar" },
        { name: "1/2 sdt Garam & Merica", note: "sesuai selera" },
        { name: "1/2 sdt Kaldu Jamur", note: "opsional" }
      ]
    },
    {
      step: 6,
      total: 7,
      badge: "LANGKAH 6 DARI 7 • SENTUHAN SEGAR",
      title: "Tambahkan Potongan Tomat & Daun Bawang",
      desc: "Masukkan dadu tomat segar dan irisan daun bawang di menit terakhir. Aduk rata selama 30 detik agar tomat tetap segar dan juicy saat disantap.",
      estimation: "Estimasi: 1 Menit",
      seconds: 60,
      mascotQuote: "Warna merah tomat dan hijau daun bawang bikin piring kita ceria dan menggugah selera! 🍅🌱",
      tip: "Tomat jangan dimasak terlalu lama agar tidak mengeluarkan air berlebih.",
      ingredients: [
        { name: "1 Buah Dadu Tomat", note: "langkah 1" },
        { name: "1 Batang Daun Bawang", note: "diiris halus" }
      ]
    },
    {
      step: 7,
      total: 7,
      badge: "LANGKAH 7 DARI 7 • PENYAJIAN AKHIR",
      title: "Plating & Taburan Bawang Goreng",
      desc: "Matikan kompor. Angkat dan sajikan nasi goreng hangat di atas piring saji. Beri taburan bawang merah goreng renyah dan hiasi dengan irisan mentimun.",
      estimation: "Estimasi: 1 Menit",
      seconds: 60,
      mascotQuote: "Selesaaai! Baunya harum banget, siap memanjakan lidah keluarga tercinta! 🥳❤️",
      tip: "Sajikan selagi panas berasap untuk cita rasa maksimal.",
      ingredients: [
        { name: "Taburan Bawang Goreng", note: "secukupnya" },
        { name: "Irisan Mentimun / Kerupuk", note: "pelengkap" }
      ]
    }
  ];

  let currentStepIndex = 0;
  let timerInterval = null;
  let remainingSeconds = 180;
  let isTimerRunning = false;
  let isVoiceEnabled = true;

  // Render Step into UI
  function renderStep(index) {
    const data = RECIPE_STEPS[index];
    currentStepIndex = index;

    // Headings & Badges
    document.getElementById("step-count-text").innerText = `Langkah ${data.step} dari ${data.total}`;
    const percent = Math.round((data.step / data.total) * 100);
    document.getElementById("progress-percent-text").innerText = `${percent}% Selesai`;
    document.getElementById("progress-indicator-bar").style.width = `${percent}%`;

    document.getElementById("step-badge-text").innerText = data.badge;
    document.getElementById("step-estimation-text").innerText = data.estimation;
    document.getElementById("step-heading-text").innerText = data.title;
    document.getElementById("step-description-text").innerText = data.desc;

    // Companion Mascot
    document.getElementById("mascot-quote-text").innerHTML = `&ldquo;${data.mascotQuote}&rdquo;`;
    document.getElementById("mascot-tip-text").innerText = data.tip;

    // Reset and Load Timer
    pauseTimer();
    remainingSeconds = data.seconds;
    updateTimerDisplay();
    document.getElementById("main-timer-btn-label").innerText = `Mulai Timer ${formatTime(remainingSeconds)}`;

    // Build Checklist
    const listContainer = document.getElementById("ingredients-checklist-container");
    listContainer.innerHTML = "";
    data.ingredients.forEach(item => {
      const label = document.createElement("label");
      label.className = "ingredient-item flex items-center gap-space-md p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high cursor-pointer transition-all shadow-sm";
      label.innerHTML = `
        <input type="checkbox" class="step-ingredient-checkbox w-5 h-5 rounded accent-primary-container cursor-pointer">
        <div class="flex flex-col min-w-0">
          <span class="font-body-md text-body-md text-on-surface font-semibold truncate">${item.name}</span>
          <span class="text-label-sm font-label-sm text-secondary">${item.note}</span>
        </div>
      `;
      listContainer.appendChild(label);
    });

    // Reset Checklist UI count & alert
    updateChecklistCount();
    document.getElementById("step-completion-alert").classList.add("hidden");

    // Reattach checklist listeners
    document.querySelectorAll(".step-ingredient-checkbox").forEach(chk => {
      chk.addEventListener("change", () => {
        updateChecklistCount();
      });
    });

    // Navigation buttons state
    const prevBtn = document.getElementById("prev-step-btn");
    if (index === 0) {
      prevBtn.disabled = true;
      prevBtn.classList.add("opacity-40", "cursor-not-allowed");
    } else {
      prevBtn.disabled = false;
      prevBtn.classList.remove("opacity-40", "cursor-not-allowed");
    }

    const nextBtnText = document.getElementById("next-btn-text");
    if (index === RECIPE_STEPS.length - 1) {
      nextBtnText.innerText = "Selesaikan Masakan! 🎉";
    } else {
      nextBtnText.innerText = "Tandai Selesai & Lanjut";
    }

    // Update modal display step
    document.getElementById("modal-step-display").innerText = data.step;
  }

  function formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    const timeStr = formatTime(remainingSeconds);
    document.getElementById("timer-display-string").innerText = timeStr;
    document.getElementById("top-timer-badge").innerText = timeStr;
  }

  function startTimer() {
    if (isTimerRunning) return;
    isTimerRunning = true;
    document.getElementById("main-timer-btn-label").innerText = "Jeda Timer";
    document.getElementById("main-timer-btn-icon").innerText = "pause";
    document.getElementById("step-timer-icon").classList.add("animate-pulse", "text-primary-container");

    timerInterval = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds--;
        updateTimerDisplay();
      } else {
        pauseTimer();
        alert("Waktu langkah ini telah selesai!");
      }
    }, 1000);
  }

  function pauseTimer() {
    isTimerRunning = false;
    clearInterval(timerInterval);
    document.getElementById("main-timer-btn-label").innerText = `Mulai Timer ${formatTime(remainingSeconds)}`;
    document.getElementById("main-timer-btn-icon").innerText = "play_arrow";
    document.getElementById("step-timer-icon").classList.remove("animate-pulse", "text-primary-container");
  }

  function updateChecklistCount() {
    const checkboxes = document.querySelectorAll(".step-ingredient-checkbox");
    const total = checkboxes.length;
    let checked = 0;
    checkboxes.forEach(c => {
      if (c.checked) checked++;
    });
    document.getElementById("checked-counter").innerText = `${checked}/${total} Siap`;

    const alertBanner = document.getElementById("step-completion-alert");
    if (checked === total && total > 0) {
      alertBanner.classList.remove("hidden");
      alertBanner.classList.add("flex");
    } else {
      alertBanner.classList.add("hidden");
      alertBanner.classList.remove("flex");
    }
  }

  // Next / Prev Actions
  document.getElementById("next-step-btn").addEventListener("click", () => {
    if (currentStepIndex < RECIPE_STEPS.length - 1) {
      renderStep(currentStepIndex + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      openCelebrationOverlay();
    }
  });

  document.getElementById("prev-step-btn").addEventListener("click", () => {
    if (currentStepIndex > 0) {
      renderStep(currentStepIndex - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  document.getElementById("alert-next-btn").addEventListener("click", () => {
    document.getElementById("next-step-btn").click();
  });

  // Timer Buttons
  document.getElementById("main-timer-action-btn").addEventListener("click", () => {
    if (isTimerRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  });

  document.getElementById("reset-timer-btn").addEventListener("click", () => {
    pauseTimer();
    remainingSeconds = RECIPE_STEPS[currentStepIndex].seconds;
    updateTimerDisplay();
  });

  document.getElementById("bottom-quick-timer-btn").addEventListener("click", () => {
    remainingSeconds += 60;
    updateTimerDisplay();
    startTimer();
  });

  // Voice Toggle
  document.getElementById("toggle-voice-btn").addEventListener("click", () => {
    isVoiceEnabled = !isVoiceEnabled;
    const icon = document.getElementById("voice-icon");
    const text = document.getElementById("voice-text");
    if (isVoiceEnabled) {
      icon.innerText = "volume_up";
      text.innerText = "Suara: ON";
    } else {
      icon.innerText = "volume_off";
      text.innerText = "Suara: OFF";
    }
  });

  // Exit Modal Logic
  const exitModal = document.getElementById("exit-modal-overlay");
  document.getElementById("trigger-exit-modal-btn").addEventListener("click", () => {
    exitModal.classList.remove("hidden");
  });
  document.getElementById("cancel-exit-btn").addEventListener("click", () => {
    exitModal.classList.add("hidden");
  });

  // Celebration Overlay Logic
  const celebrationOverlay = document.getElementById("celebration-overlay");
  function openCelebrationOverlay() {
    celebrationOverlay.classList.remove("hidden");
  }
  function closeCelebrationOverlay() {
    celebrationOverlay.classList.add("hidden");
    renderStep(0);
  }

  // Simulator States Switcher Function
  function setCookingSimulatorState(stateNum) {
    exitModal.classList.add("hidden");
    celebrationOverlay.classList.add("hidden");

    switch(stateNum) {
      case 1:
        // Normal state: Step 1 initialized
        renderStep(0);
        break;
      case 2:
        // Timer active state at 02:45
        renderStep(0);
        remainingSeconds = 165; // 02:45
        updateTimerDisplay();
        startTimer();
        break;
      case 3:
        // Checklist all completed state
        renderStep(0);
        document.querySelectorAll(".step-ingredient-checkbox").forEach(c => c.checked = true);
        updateChecklistCount();
        break;
      case 4:
        // Final celebration completed overlay
        renderStep(RECIPE_STEPS.length - 1);
        openCelebrationOverlay();
        break;
      case 5:
        // Exit confirmation modal
        renderStep(currentStepIndex);
        exitModal.classList.remove("hidden");
        break;
    }
  }

  // Initialize first view
  renderStep(0);
