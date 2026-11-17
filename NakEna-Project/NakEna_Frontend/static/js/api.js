(() => {
  const tokenKey = "nakena_access_token";
  const emailKey = "nakena_user_email";
  const userNameKey = "nakena_user_name";
  const uploadKey = "nakena_last_upload";
  const recipeKey = "nakena_latest_recipe";
  const recipeNoticeKey = "nakena_recipe_notice";
  const apiBaseUrl = (document.currentScript?.dataset.apiBase || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const token = () => sessionStorage.getItem(tokenKey);
  const isGuest = () => !token();
  const email = () => sessionStorage.getItem(emailKey) || "guest";
  const storageKey = (name) => `nakena_${name}_${email()}`;

  function uiElement(tag, className = "", text = "") {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== "") element.textContent = text;
    return element;
  }

  function uiIcon(name) {
    const paths = {
      clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
      list: "m3 6 2 2 4-4m3 2h9M3 13l2 2 4-4m3 2h9M3 20l2 2 4-4m3 2h9",
      people: "M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 22v-3a9 9 0 0 1 18 0v3",
      next: "M5 12h14m-7-7 7 7-7 7",
      close: "M6 6l12 12M6 18 18 6",
      heart: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z",
      camera: "M14 4h-4L8 7H4a2 2 0 0 0-2 2v10h20V9a2 2 0 0 0-2-2h-4l-2-3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    };
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [key, value] of Object.entries({ class: "icon", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.8", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) icon.setAttribute(key, value);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", paths[name] || paths.next); icon.append(path); return icon;
  }

  function storedJSON(key, fallback = null) {
    try { return JSON.parse(sessionStorage.getItem(key) || "null") || fallback; }
    catch { sessionStorage.removeItem(key); return fallback; }
  }

  function normalizeRecipe(value) {
    const { options, ...recipe } = value || {};
    return { ...recipe, title: String(recipe.title || "Resep NakEna"), text: String(recipe.text || recipe.recipe_text || ""), ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [] };
  }

  function recipeMinutes(recipe) {
    const text = parseRecipeContent(recipe.text || recipe.recipe_text, recipe.ingredients).time.toLowerCase();
    const times = [...text.matchAll(/(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?\s*(jam|menit|detik)/g)];
    if (!times.length) return null;
    return times.reduce((sum, match) => sum + Number((match[2] || match[1]).replace(",", ".")) * (match[3] === "jam" ? 60 : match[3] === "detik" ? 1 / 60 : 1), 0);
  }

  function recipeMeta(recipe) {
    const parsed = parseRecipeContent(recipe.text || recipe.recipe_text, recipe.ingredients);
    const root = uiElement("div", "recipe-meta");
    const values = [];
    if (parsed.time) values.push(["clock", parsed.time]);
    const count = recipeInstructions(parsed, recipe.title).length;
    if (count) values.push(["list", `${count} langkah`]);
    if (recipe.request?.servings) values.push(["people", `${recipe.request.servings} porsi`]);
    values.forEach(([name, text]) => { const span = uiElement("span"); span.append(uiIcon(name), document.createTextNode(text)); root.append(span); });
    return root;
  }

  function updateSavedCount(count) {
    const element = document.getElementById("savedCountHeader");
    if (element) { element.textContent = String(count); element.hidden = false; }
  }

  function openRecipe(recipe, cooking = false, options = null) {
    const value = normalizeRecipe(recipe);
    if (options?.length) value.options = options;
    sessionStorage.setItem(recipeKey, JSON.stringify(value));
    location.assign(cooking ? "/recipes/1/guided-cooking/" : "/recipes/1/");
  }

  function recipeCard(recipe, { featured = false, favorite = null, favorites = new Map(), options = null, label = "" } = {}) {
    const stage = uiElement("div", featured ? "recipe-results-stage" : "recipe-card-stage");
    const loader = uiElement("div", "recipe-results-loading");
    // This markup is a constant skeleton. Recipe/provider text is always textContent.
    loader.innerHTML = '<div class="recipe-results-loading-photo"></div><div class="recipe-results-loading-copy"><span class="recipe-loading-bar recipe-loading-title"></span><span class="recipe-loading-bar"></span><span class="recipe-loading-bar recipe-loading-short"></span><span class="recipe-loading-bar recipe-loading-action"></span></div>';
    const card = uiElement("article", featured ? "recipe-featured" : "recipe-other-card");
    card.dataset.title = recipe.title;
    const photo = uiElement("div", "recipe-visual");
    const image = uiElement("img"); image.alt = "Foto hidangan"; photo.append(image);
    if (favorite) {
      const button = uiElement("button", "recipe-card-favorite"); button.type = "button";
      button.setAttribute("aria-label", `${favorites.has(recipe.title) ? "Hapus dari favorit" : "Simpan"} ${recipe.title}`);
      button.setAttribute("aria-pressed", String(favorites.has(recipe.title)));
      button.append(uiIcon("heart"));
      button.addEventListener("click", () => favorite(recipe, button)); photo.append(button);
    }
    const body = uiElement("div", "recipe-card-body");
    if (label) body.append(uiElement("span", "small-label warm", label));
    body.append(uiElement(featured ? "h2" : "h3", "", recipe.title));
    const parsed = parseRecipeContent(recipe.text || recipe.recipe_text, recipe.ingredients);
    const intro = String(recipe.description || parsed.intro || "").trim();
    if (intro && intro.toLowerCase() !== recipe.title.toLowerCase()) body.append(uiElement("p", "", intro));
    body.append(recipeMeta(recipe));
    if (recipe.ingredients.length) body.append(uiElement("p", "recipe-mini-ingredients", recipe.ingredients.join(" · ")));
    const actions = uiElement("div", "button-row");
    const detail = uiElement("a", "btn btn-primary", "Lihat detail resep"); detail.href = "/recipes/1/"; detail.append(uiIcon("next"));
    detail.addEventListener("click", (event) => { event.preventDefault(); openRecipe(recipe, false, options); }); actions.append(detail);
    const cook = uiElement("a", "btn btn-secondary", "Mulai memasak"); cook.href = "/recipes/1/guided-cooking/";
    cook.addEventListener("click", (event) => { event.preventDefault(); openRecipe(recipe, true, options); }); actions.append(cook);
    body.append(actions); card.append(photo, body); stage.append(loader, card);
    const reveal = prepareRecipeReveal(card, loader);
    renderRecipePhoto(image, recipe, !featured, reveal.reveal);
    return stage;
  }

  function dateLabel(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
  }

  function createGuestInfoCard(title, description, actionPath = "/login/", actionLabel = "Masuk atau daftar") {
    const card = uiElement("section", "empty-card guest-card");
    card.append(uiElement("h2", "", title), uiElement("p", "", description));
    const actions = uiElement("div", "button-row");
    const login = uiElement("a", "btn btn-primary", actionLabel); login.href = actionPath;
    const scan = uiElement("a", "btn btn-secondary", "Scan bahan"); scan.href = "/scan/";
    actions.append(login, scan); card.append(actions); return card;
  }

  function showGuestInfo(main, title, description, actionPath = "/login/", actionLabel = "Masuk atau daftar") {
    if (!main) return;
    main.prepend(createGuestInfoCard(title, description, actionPath, actionLabel));
  }

  function setupHeaderAccount() {
    const accounts = document.querySelectorAll("[data-header-account]");
    if (!accounts.length) return;
    const sync = (detail = {}) => {
      const authenticated = Boolean(token()) && detail.authenticated === true;
      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      accounts.forEach((account) => {
        const guest = account.querySelector("[data-header-guest]");
        const profile = account.querySelector("[data-header-profile]");
        if (guest) guest.hidden = authenticated;
        if (profile) profile.hidden = !authenticated;
        account.querySelectorAll("[data-header-member-only]").forEach((element) => {
          element.hidden = !authenticated;
        });
        const login = account.querySelector("[data-header-login]");
        const register = account.querySelector("[data-header-register]");
        if (login) login.href = `/login/?next=${next}`;
        if (register) register.href = `/register/?next=${next}`;
        const avatar = account.querySelector("[data-user-avatar]");
        if (authenticated) renderProfileAvatar(avatar, { full_name: detail.fullName });
        else if (avatar) avatar.replaceChildren();
      });
    };
    // Keep the guest controls until the stored session has been verified.
    sync();
    window.addEventListener("nakena:auth-changed", (event) => sync(event.detail));
  }

  function renderGuestIdentity() {
    if (!isGuest() || location.pathname === "/" || location.pathname.startsWith("/login") || location.pathname.startsWith("/register")) return;

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = "Guest";
    });
    document.querySelectorAll("[data-user-email]").forEach((element) => {
      element.textContent = "Mode tamu • tanpa akun";
    });
    const memberBadge = document.getElementById("userMemberBadge");
    if (memberBadge) memberBadge.textContent = "Mode Tamu";
    const createdAt = document.getElementById("userCreatedAt");
    if (createdAt) createdAt.textContent = "Tidak terdaftar";

    // Guest tetap dapat memakai halaman scan. Ganti avatar profil dengan
    // tombol Masuk/Daftar agar status belum login terlihat tanpa banner tambahan.
    const profileLink = document.querySelector(
      'header a[data-path="profil-pengguna"], header a[data-path="profil"], header a[href="/profile/"]'
    );
    if (profileLink && !profileLink.closest("[data-header-account]")) {
      const actions = document.createElement("div");
      actions.className = "flex items-center gap-2 shrink-0";
      actions.setAttribute("aria-label", "Akun Guest");

      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      const login = document.createElement("a");
      login.href = `/login/?next=${next}`;
      login.textContent = "Masuk";
      login.className = "inline-flex items-center justify-center rounded-full border border-[#FF5E14]/60 px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold text-[#ffb59b] hover:bg-[#FF5E14]/10 transition-colors whitespace-nowrap";

      const register = document.createElement("a");
      register.href = `/register/?next=${next}`;
      register.textContent = "Daftar";
      register.className = "inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#FF5E14] to-[#ea580c] px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-bold text-white shadow-[0_0_16px_rgba(255,94,20,0.25)] hover:brightness-110 transition whitespace-nowrap";

      actions.append(login, register);
      profileLink.replaceWith(actions);
    }

    // Guest tidak memiliki daftar favorit tersimpan, jadi jangan tampilkan
    // penghitung bookmark yang selalu bernilai nol.
    document.querySelectorAll('header a[data-path="resep-tersimpan"]').forEach((link) => {
      if (!link.hasAttribute("data-header-member-only")) link.remove();
    });
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token()) headers.set("Authorization", `Bearer ${token()}`);
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    const endpoint = `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(endpoint, { ...options, headers });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem(tokenKey);
        sessionStorage.removeItem(emailKey);
        sessionStorage.removeItem(userNameKey);
        window.dispatchEvent(new CustomEvent("nakena:auth-changed", { detail: { authenticated: false } }));
      }
      const detail = data?.detail;
      throw new Error(Array.isArray(detail) ? "Periksa kembali data yang dimasukkan." : detail || "Permintaan ke server gagal.");
    }
    return data;
  }

  let noticeTimer;
  function setNotice(message, success = false) {
    const errorBox = document.getElementById("general-error-box");
    const errorText = document.getElementById("general-error-text");
    if (errorBox && errorText) { errorText.textContent = message; errorBox.classList.toggle("hidden", success); }
    const box = document.getElementById("appNotice");
    if (box) {
      clearTimeout(noticeTimer); box.textContent = message; box.hidden = false;
      box.classList.toggle("is-error", !success); box.setAttribute("role", success ? "status" : "alert");
      noticeTimer = setTimeout(() => { box.hidden = true; }, 9000);
    }
  }

  function captureSubmit(form, handler) {
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      handler(event);
    }, true);
  }

  function saveToken(data, userEmail) {
    sessionStorage.setItem(tokenKey, data.access_token);
    sessionStorage.setItem(emailKey, userEmail);
    sessionStorage.removeItem(userNameKey);
    sessionStorage.removeItem("nakena_guest_mode");
    window.dispatchEvent(new CustomEvent("nakena:auth-changed", { detail: { authenticated: true } }));
  }

  function setupAuth() {
    const loginForm = document.getElementById("login-form");
    captureSubmit(loginForm, async () => {
      const userEmail = String(new FormData(loginForm).get("email") || "").trim().toLowerCase();
      const password = String(new FormData(loginForm).get("password") || "");
      if (!userEmail || !password) return setNotice("Email dan kata sandi wajib diisi.");
      const button = document.getElementById("btn-submit");
      if (button) button.disabled = true;
      try {
        const data = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: userEmail, password }),
        });
        saveToken(data, userEmail);
        const next = new URLSearchParams(location.search).get("next");
        const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/scan/";
        window.location.assign(target);
      } catch (error) {
        setNotice(error.message);
        if (button) button.disabled = false;
      }
    });

    const registerForm = document.getElementById("registerForm");
    captureSubmit(registerForm, async () => {
      const values = new FormData(registerForm);
      const fullName = String(values.get("full_name") || "").trim();
      const userEmail = String(values.get("email") || "").trim().toLowerCase();
      const password = String(values.get("password") || "");
      const confirmation = String(values.get("password_confirm") || "");
      if (!fullName || !userEmail || password.length < 8 || password !== confirmation) {
        const message = document.getElementById("globalErrorMessage");
        const alert = document.getElementById("globalErrorAlert");
        if (message) message.textContent = "Lengkapi data, gunakan kata sandi minimal 8 karakter, dan pastikan konfirmasi cocok.";
        if (alert) alert.classList.remove("hidden");
        return;
      }
      const button = registerForm.querySelector("button[type=submit]");
      if (button) button.disabled = true;
      try {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({ full_name: fullName, email: userEmail, password }),
        });
        const data = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: userEmail, password }),
        });
        saveToken(data, userEmail);
        const next = new URLSearchParams(location.search).get("next");
        const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/scan/";
        window.location.assign(target);
      } catch (error) {
        const message = document.getElementById("globalErrorMessage");
        const alert = document.getElementById("globalErrorAlert");
        if (message) message.textContent = error.message;
        if (alert) alert.classList.remove("hidden");
        if (button) button.disabled = false;
      }
    });
  }

  function setPageLinks() {
    const paths = {
      beranda: "/",
      "scan-bahan": "/scan/",
      "konfirmasi-bahan": "/scan/result/",
      "rekomendasi-resep": "/recipes/",
      "resep-tersimpan": "/favorites/",
      "riwayat-resep": "/history/",
      "profil-pengguna": "/profile/",
      recommendations: "/recipes/",
      "guided-cooking": "/recipes/1/guided-cooking/",
    };
    document.querySelectorAll("[data-path]").forEach((link) => {
      const path = paths[link.getAttribute("data-path")];
      if (path && (link.getAttribute("href") === "#" || link.getAttribute("href") === "")) link.setAttribute("href", path);
    });
    document.querySelectorAll('a[href="#register"]').forEach((link) => link.setAttribute("href", "/register/"));
    document.querySelectorAll('a[href="#login"]').forEach((link) => link.setAttribute("href", "/login/"));
  }

  function protectPages() {
    // Halaman memasak dapat dipakai tanpa akun. Hanya area admin yang wajib login.
    if (location.pathname.startsWith("/admin-dashboard/") && isGuest()) {
      location.replace(`/login/?next=${encodeURIComponent(location.pathname)}`);
      return false;
    }
    if (isGuest() && location.pathname.startsWith("/scan/")) {
      sessionStorage.setItem("nakena_guest_mode", "1");
    }
    return true;
  }

  function setupScan() {
    const form = document.getElementById("scanForm");
    const input = document.getElementById("fileInput");
    if (!form || !input) return;
    let previewReady = Promise.resolve();
    let uploadInFlight = false;
    let sourceDimensions = null;

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      sourceDimensions = null;
      if (file.size > 5 * 1024 * 1024) {
        input.value = "";
        return setNotice("Ukuran foto maksimal 5 MB.");
      }
      const preview = document.querySelector("#state-preview img");
      if (preview) preview.src = URL.createObjectURL(file);
      const title = document.querySelector("#state-preview h4");
      if (title) title.textContent = file.name;
      previewReady = new Promise((resolve) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          const image = new Image();
          image.onload = () => {
            sourceDimensions = { width: image.width, height: image.height };
            const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
            try {
              sessionStorage.setItem("nakena_preview_image", canvas.toDataURL("image/jpeg", 0.72));
            } catch {
              sessionStorage.removeItem("nakena_preview_image");
            }
            resolve();
          };
          image.onerror = resolve;
          image.src = String(reader.result || "");
        }, { once: true });
        reader.addEventListener("error", resolve, { once: true });
        reader.readAsDataURL(file);
      });
    });

    async function uploadSelectedImage() {
      const file = input.files?.[0];
      if (!file) return setNotice("Pilih foto bahan terlebih dahulu.");
      if (uploadInFlight) return;
      uploadInFlight = true;
      window.switchState?.("loading");
      await previewReady;
      const formData = new FormData();
      formData.append("file", file);
      try {
        if (isGuest()) {
          // Mode Guest: foto diproses langsung di memori backend, tanpa upload record,
          // penyimpanan file, atau riwayat pada database.
          const detection = await api("/uploads/guest/detect", {
            method: "POST",
            body: formData,
          });
          sessionStorage.setItem(uploadKey, JSON.stringify({
            id: "guest",
            filename: file.name,
            width: sourceDimensions?.width || null,
            height: sourceDimensions?.height || null,
            guest: true,
            ingredients: detection.ingredients,
            detections: detection.detections,
          }));
        } else {
          const upload = await api("/uploads", { method: "POST", body: formData });
          const detection = await api(`/uploads/${upload.id}/detect`, { method: "POST" });
          sessionStorage.setItem(uploadKey, JSON.stringify({
            id: upload.id,
            filename: upload.original_filename,
            width: upload.width,
            height: upload.height,
            ingredients: detection.ingredients,
            detections: detection.detections,
          }));
        }
        location.assign("/scan/result/");
      } catch (error) {
        setNotice(error.message);
        uploadInFlight = false;
        if (typeof window.switchState === "function") window.switchState("preview");
      }
    }

    captureSubmit(form, uploadSelectedImage);
    document.querySelectorAll("#state-preview button").forEach((button) => {
      if (button.textContent.toLowerCase().includes("racik resep")) {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          uploadSelectedImage();
        }, true);
      }
    });
  }

  function setupDetectionResult() {
    const storedUpload = sessionStorage.getItem(uploadKey);
    if (!document.getElementById("ingredientsConfirmationForm")) return;
    if (!storedUpload) {
      location.replace("/scan/");
      return;
    }
    let upload;
    try {
      upload = JSON.parse(storedUpload);
    } catch {
      sessionStorage.removeItem(uploadKey);
      setNotice("Data hasil deteksi tidak valid. Silakan unggah ulang foto.");
      return;
    }
    if (!upload || typeof upload !== "object" || Array.isArray(upload)) {
      sessionStorage.removeItem(uploadKey);
      setNotice("Data hasil deteksi tidak valid. Silakan unggah ulang foto.");
      return;
    }
    const preview = document.getElementById("scanPreviewImage");
    const imageData = sessionStorage.getItem("nakena_preview_image");
    if (preview && imageData) {
      preview.addEventListener("load", () => renderDetectionBoxes(preview, upload), { once: true });
      preview.src = imageData;
      if (preview.complete && preview.naturalWidth) renderDetectionBoxes(preview, upload);
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => renderDetectionBoxes(preview, upload)).observe(preview);
      }
    }
    const ingredientList = document.getElementById("ingredientsListContainer");
    const emptyState = document.getElementById("emptyIngredientsState");
    const itemTemplate = document.getElementById("ingredientItemTemplate");
    ingredientList?.replaceChildren();
    const detectionsByName = new Map();
    (Array.isArray(upload.detections) ? upload.detections : []).forEach((detection) => {
      const previous = detectionsByName.get(detection.name);
      if (!previous || detection.confidence > previous.confidence) {
        detectionsByName.set(detection.name, detection);
      }
    });
    const detections = Array.from(detectionsByName.values());
    const ingredients = Array.isArray(upload.ingredients) ? upload.ingredients : [];
    detections.forEach((detection, index) => {
      if (!itemTemplate || !ingredientList) return;
      const item = itemTemplate.content.firstElementChild.cloneNode(true);
      item.dataset.id = `detected-${index}`;
      const name = item.querySelector(".ingredient-name");
      const confidence = item.querySelector(".detection-confidence");
      if (name) name.textContent = detection.name;
      if (confidence) confidence.textContent = `${Math.round(detection.confidence * 100)}%`;
      ingredientList.append(item);
    });
    const hidden = document.getElementById("detectedIngredientsInput");
    if (hidden) hidden.value = ingredients.join(", ");
    const count = document.getElementById("detectedCount");
    if (count) count.textContent = String(detections.length);
    const scanCount = document.getElementById("scanDetectionCount");
    if (scanCount) scanCount.textContent = String(detections.length);
    const summary = document.getElementById("detectedIngredientSummary");
    if (summary) summary.textContent = detections.length
      ? `${detections.length} bahan siap diolah jadi mahakarya`
      : "Belum ada bahan terdeteksi. Kamu bisa menambahkannya secara manual.";
    if (ingredientList) ingredientList.classList.toggle("hidden", detections.length === 0);
    if (emptyState) {
      emptyState.classList.toggle("hidden", detections.length > 0);
      emptyState.classList.toggle("flex", detections.length === 0);
      const emptyMessage = emptyState.querySelector("p");
      if (emptyMessage) emptyMessage.textContent = "Tambahkan bahan secara manual.";
    }
    const message = document.querySelector("#ingredientsConfirmationForm aside .text-slate-400");
    if (message) message.textContent = detections.length
      ? `${detections.length} objek bahan terdeteksi. Periksa hasilnya sebelum membuat resep.`
      : "Tidak ada bahan terdeteksi. Tambahkan bahan secara manual sebelum membuat resep.";
    const detectedBadge = document.querySelector("#ingredientsConfirmationForm aside .text-amber-400.text-xs.font-bold");
    if (detectedBadge) detectedBadge.textContent = `${detections.length} Bahan Terdeteksi`;
  }

  function renderDetectionBoxes(image, upload) {
    const overlay = document.getElementById("detectionBoxes");
    if (!overlay) return;
    overlay.replaceChildren();
    const detections = Array.isArray(upload.detections) ? upload.detections : [];
    if (!detections.length || !image.naturalWidth || !image.naturalHeight) return;

    const bounds = overlay.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const imageFit = getComputedStyle(image).objectFit;
    const scale = imageFit === "contain"
      ? Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight)
      : Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
    const offsetX = (bounds.width - image.naturalWidth * scale) / 2;
    const offsetY = (bounds.height - image.naturalHeight * scale) / 2;
    const sourceScaleX = image.naturalWidth / Number(upload.width || image.naturalWidth);
    const sourceScaleY = image.naturalHeight / Number(upload.height || image.naturalHeight);
    const colors = ["#FF5E14", "#FBBF24", "#38BDF8", "#34D399"];

    detections.forEach((detection, index) => {
      if (!Array.isArray(detection.box) || detection.box.length !== 4) return;
      const [x1, y1, x2, y2] = detection.box.map(Number);
      if (![x1, y1, x2, y2].every(Number.isFinite)) return;
      const left = (x1 * sourceScaleX * scale + offsetX) / bounds.width * 100;
      const top = (y1 * sourceScaleY * scale + offsetY) / bounds.height * 100;
      const width = (x2 - x1) * sourceScaleX * scale / bounds.width * 100;
      const height = (y2 - y1) * sourceScaleY * scale / bounds.height * 100;
      const color = colors[index % colors.length];
      const box = document.createElement("div");
      box.className = "detection-box";
      box.style.cssText = `left:${left}%;top:${top}%;width:${width}%;height:${height}%;border-color:${color};background:${color}22;`;
      box.title = `${detection.name} (${Math.round(detection.confidence * 100)}%)`;
      const label = document.createElement("span");
      label.className = "detection-box-label";
      label.style.color = color;
      label.textContent = `${detection.name} • ${Math.round(detection.confidence * 100)}%`;
      box.append(label);
      overlay.append(box);
    });
  }

  function profilePreferenceFromForm(form) {
    const values = new FormData(form);
    return {
      diet: values.getAll("profile_diet").join(", ") || null,
      allergies: values.getAll("profile_allergies"),
      staple_ingredients: Array.from(document.querySelectorAll("[data-staple-ingredient]")).map((chip) => chip.dataset.stapleIngredient),
      default_max_cook_minutes: values.get("max_cook_minutes") ? Number(values.get("max_cook_minutes")) : null,
      default_difficulty: values.get("default_difficulty") || null,
      default_servings: Number(values.get("default_servings") || 2),
      preferred_cuisine: values.get("preferred_cuisine") || null,
    };
  }

  function renderPantryIngredients(ingredients) {
    const list = document.getElementById("pantryIngredientsList");
    if (!list) return;
    list.replaceChildren();
    ingredients.forEach((ingredient) => {
      const chip = uiElement("span", "pantry-chip"); chip.dataset.stapleIngredient = ingredient;
      const name = uiElement("span", "", ingredient);
      const remove = uiElement("button"); remove.type = "button"; remove.setAttribute("aria-label", `Hapus ${ingredient}`); remove.append(uiIcon("close"));
      remove.addEventListener("click", () => chip.remove()); chip.append(name, remove); list.append(chip);
    });
  }

  function setupProfile() {
    const form = document.getElementById("preferences-form");
    if (!form) return;
    if (isGuest()) {
      document.querySelector("main")?.replaceChildren(createGuestInfoCard(
        "Preferensi dan profil akunmu",
        "Masuk untuk menyimpan preferensi, resep favorit, dan riwayat. Kamu tetap bisa scan bahan dan memasak sebagai Guest.",
        "/login/?next=%2Fprofile%2F", "Masuk ke akun",
      )); return;
    }
    const preferenceButton = document.getElementById("btn-save-preferences");
    preferenceButton.disabled = true;
    api("/users/me/preferences").then((preferences) => {
      const selectedDiet = (preferences.diet || "").toLowerCase().split(",").map((text) => text.trim());
      form.querySelectorAll('[name="profile_diet"]').forEach((input) => { input.checked = selectedDiet.includes(input.value.toLowerCase()); });
      form.querySelectorAll('[name="profile_allergies"]').forEach((input) => { input.checked = (preferences.allergies || []).some((value) => value.toLowerCase() === input.value.toLowerCase()); });
      const set = (name, value) => {
        const input = form.elements.namedItem(name);
        if (input.tagName === "SELECT" && value != null && value !== "") {
          let option = Array.from(input.options).find((item) => item.value.toLowerCase() === String(value).toLowerCase());
          if (!option) { option = uiElement("option", "", String(value)); option.value = String(value); input.append(option); }
          input.value = option.value;
        } else input.value = value == null ? "" : String(value);
      };
      set("max_cook_minutes", preferences.default_max_cook_minutes);
      set("default_difficulty", preferences.default_difficulty);
      set("default_servings", preferences.default_servings || 2);
      set("preferred_cuisine", preferences.preferred_cuisine);
      renderPantryIngredients(preferences.staple_ingredients || []);
      document.getElementById("profilePantryCount").textContent = String((preferences.staple_ingredients || []).length);
      document.dispatchEvent(new Event("nakena:preferences-loaded"));
      preferenceButton.disabled = false;
    }).catch((error) => setNotice(`Preferensi belum dapat dimuat: ${error.message}`));
    const metrics = [["/uploads", "profileScanCount"], ["/recipes/history", "profileRecipeCount"], ["/recipes/favorites", "profileFavoriteCount"]];
    metrics.forEach(async ([path, id]) => {
      try { const values = await api(path); document.getElementById(id).textContent = String(values.length); if (path.endsWith("favorites")) updateSavedCount(values.length); }
      catch { /* Leave unknown counts as dashes, without fabricated statistics. */ }
    });
    captureSubmit(form, async () => {
      if (preferenceButton.disabled) return;
      const payload = profilePreferenceFromForm(form);
      if ((payload.diet || "").length > 50) return setNotice("Pilih pola makan dengan total nama maksimal 50 karakter.");
      preferenceButton.disabled = true;
      try {
        const saved = await api("/users/me/preferences", { method: "PATCH", body: JSON.stringify(payload) });
        renderPantryIngredients(saved.staple_ingredients || []);
        document.getElementById("profilePantryCount").textContent = String((saved.staple_ingredients || []).length);
        setNotice("Preferensi memasak tersimpan.", true);
      } catch (error) { setNotice(error.message); }
      finally { preferenceButton.disabled = false; }
    });
    document.getElementById("btn-add-pantry-ingredient")?.addEventListener("click", () => {
      const input = document.getElementById("pantryIngredientInput");
      const ingredient = input.value.trim(); if (!ingredient) { input.focus(); return; }
      const current = Array.from(document.querySelectorAll("[data-staple-ingredient]")).map((chip) => chip.dataset.stapleIngredient);
      if (current.length >= 30) return setNotice("Maksimal 30 bahan dapur.");
      if (current.some((text) => text.toLowerCase() === ingredient.toLowerCase())) return setNotice("Bahan tersebut sudah ada.");
      renderPantryIngredients([...current, ingredient]); input.value = "";
    });
    const account = document.getElementById("account-form");
    captureSubmit(account, async () => {
      const name = String(new FormData(account).get("fullname") || "").trim();
      if (!name) return setNotice("Nama lengkap tidak boleh kosong.");
      const button = document.getElementById("btn-save-account"); button.disabled = true;
      try {
        const user = await api("/users/me", { method: "PATCH", body: JSON.stringify({ full_name: name }) });
        sessionStorage.setItem(userNameKey, user.full_name);
        document.querySelectorAll("[data-user-name]").forEach((element) => { element.textContent = user.full_name; });
        document.querySelectorAll("[data-profile-initial]").forEach((element) => { element.textContent = Array.from(user.full_name.trim())[0].toLocaleUpperCase("id-ID"); });
        window.dispatchEvent(new CustomEvent("nakena:auth-changed", { detail: { authenticated: true, fullName: user.full_name, email: user.email } }));
        setNotice("Nama akun diperbarui.", true);
      } catch (error) { setNotice(error.message); }
      finally { button.disabled = false; }
    });
  }

  function setupRecipeGeneration() {
    const form = document.getElementById("ingredientsConfirmationForm");
    if (!form) return;
    let confirmationEdited = false;
    form.addEventListener("input", () => { confirmationEdited = true; });
    form.addEventListener("change", () => { confirmationEdited = true; });
    if (!isGuest()) api("/users/me/preferences").then((preferences) => {
      if (confirmationEdited) return;
      const syncChecks = (name, values) => {
        const selected = values.map((text) => String(text).trim()).filter(Boolean);
        const existing = Array.from(form.querySelectorAll(`input[name="${name}"]`));
        existing.forEach((input) => { input.checked = selected.some((text) => text.toLowerCase() === input.value.toLowerCase()); });
        selected.forEach((text) => {
          if (existing.some((input) => input.value.toLowerCase() === text.toLowerCase()) || !existing[0]) return;
          const label = existing[0].closest("label").cloneNode(true);
          const input = label.querySelector("input"); input.value = text; input.checked = true;
          label.querySelector("span").textContent = text;
          existing[0].closest("label").parentElement.append(label);
        });
      };
      syncChecks("diet", (preferences.diet || "").split(","));
      syncChecks("allergies", preferences.allergies || []);
      syncChecks("staple_ingredients", preferences.staple_ingredients || []);
      const pick = (name, value) => {
        const options = Array.from(form.querySelectorAll(`input[name="${name}"]`));
        const found = options.find((input) => input.value.toLowerCase() === String(value).toLowerCase());
        if (found) options.forEach((input) => { input.checked = input === found; });
      };
      if (preferences.default_max_cook_minutes) pick("cooking_time", preferences.default_max_cook_minutes <= 15 ? "under_15" : preferences.default_max_cook_minutes <= 30 ? "15_to_30" : "over_30");
      if (preferences.default_difficulty === "hard") {
        const model = form.querySelector('input[name="difficulty"]')?.closest("label");
        if (model && !form.querySelector('input[name="difficulty"][value="Sulit"]')) {
          const label = model.cloneNode(true); label.querySelector("input").value = "Sulit"; label.querySelector("span").textContent = "Sulit"; model.parentElement.append(label);
        }
      }
      if (preferences.default_difficulty) pick("difficulty", { easy: "Mudah", medium: "Sedang", hard: "Sulit" }[preferences.default_difficulty]);
      if (preferences.preferred_cuisine) pick("cuisine_type", preferences.preferred_cuisine.toLowerCase() === "berkuah" ? "Kuah Hangat" : preferences.preferred_cuisine);
      if (preferences.default_servings) document.getElementById("servingsInput").value = String(preferences.default_servings);
      document.dispatchEvent(new Event("nakena:preferences-loaded"));
    }).catch(() => { /* The visible manual choices remain available if saved defaults cannot be loaded. */ });
    captureSubmit(form, async () => {
      confirmationEdited = true;
      const values = new FormData(form);
      const ingredients = [
        ...String(values.get("detected_ingredients") || "").split(","),
        ...String(values.get("manual_ingredients") || "").split(","),
        ...values.getAll("staple_ingredients").map(String),
      ].map((item) => item.trim()).filter(Boolean);
      const uniqueIngredients = [...new Set(ingredients)];
      if (!uniqueIngredients.length) {
        setNotice("Tambahkan minimal satu bahan untuk membuat resep.");
        return;
      }

      const allergies = values.getAll("allergies")
        .map((item) => String(item).replace(/^Bebas\s+/i, "").trim())
        .filter((item) => item && !/^tidak ada$/i.test(item));
      const preferences = [
        ...values.getAll("diet").map(String),
        `Waktu memasak: ${String(values.get("cooking_time") || "15_to_30")}`,
        `Tingkat kesulitan: ${String(values.get("difficulty") || "Sangat Mudah")}`,
      ].join("; ");
      const category = String(values.get("cuisine_type") || "Rumahan");
      const servings = Math.max(1, Math.min(20, Number(values.get("servings") || 2)));
      const button = document.getElementById("submitFormBtn");
      const overlay = document.getElementById("generatingOverlay");
      if (button) button.disabled = true;
      overlay?.classList.remove("opacity-0", "pointer-events-none");

      try {
        const request = { ingredients: uniqueIngredients, preferences, allergies, servings, category };
        const result = await api("/recipes/generate", { method: "POST", body: JSON.stringify(request) });
        const { recipes, errors } = await saveGeneratedRecipes(result, uniqueIngredients, category);
        recipes.forEach((recipe) => { recipe.request = request; });
        const recipe = { ...recipes[0], options: recipes, category, request };
        sessionStorage.setItem(recipeKey, JSON.stringify(recipe));
        if (errors.length) {
          sessionStorage.setItem(
            recipeNoticeKey,
            "Resep berhasil dibuat, tetapi sebagian tidak tersimpan ke riwayat. " + errors.join(" "),
          );
        }
        location.assign("/recipes/");
      } catch (error) {
        setNotice(error.message);
        if (button) button.disabled = false;
        overlay?.classList.add("opacity-0", "pointer-events-none");
      }
    });
  }

  async function saveGeneratedRecipes(result, ingredients, category) {
    const generated = Array.isArray(result.recipes) && result.recipes.length
      ? result.recipes
      : [{ title: "", recipe: result.recipe }];
    const recipes = generated.map((item, index) => {
      const text = String(item.recipe || "").trim();
      if (!text) throw new Error("Gemini tidak mengembalikan teks resep.");
      const title = String(item.title || text.split("\n").find((line) => line.trim()) || "Resep NakEna")
        .replace(/^#+\s*/, "")
        .slice(0, 200);
      return {
        id: `pending-${Date.now()}-${index}`,
        title,
        description: String(item.description || ""),
        text,
        ingredients,
        createdAt: new Date().toISOString(),
        category,
      };
    });
    // Resep Guest hanya hidup di sessionStorage agar halaman hasil/detail/cooking
    // tetap dapat digunakan selama tab terbuka. Tidak ada POST ke tabel riwayat.
    if (isGuest()) return { recipes, errors: [] };

    const errors = [];
    for (const recipe of recipes) {
      try {
        const saved = await api("/recipes/history", {
          method: "POST",
          body: JSON.stringify({
            title: recipe.title,
            recipe_text: recipe.text,
            ingredients,
          }),
        });
        recipe.id = saved.id;
        recipe.createdAt = saved.created_at;
      } catch (error) {
        errors.push(error.message);
      }
    }
    return { recipes, errors };
  }

  function showRecipeNotice(main, message) {
    if (!message) return;
    const notice = document.createElement("div");
    notice.className = "mx-auto mb-6 max-w-4xl rounded-xl border border-amber-400/40 bg-amber-500/10 px-5 py-4 text-sm text-amber-100";
    notice.setAttribute("role", "status");
    notice.textContent = message;
    main.prepend(notice);
  }

  function recipeTextClean(value) {
    return String(value || "").replace(/\r\n?/g, "\n")
      .replace(/^\s*#{1,6}\s*/gm, "")
      .replace(/\*\*|__/g, "").trim();
  }

  function recipeIngredientItems(value) {
    const lines = recipeTextClean(value).split(/\n+/).map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1) {
      return lines.map((line) => line.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, "").replace(/[.;]\s*$/, "").trim()).filter(Boolean);
    }
    const items = [];
    let depth = 0;
    let start = 0;
    const text = lines[0] || "";
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if ("([{".includes(char)) depth += 1;
      if (")]}".includes(char)) depth = Math.max(0, depth - 1);
      const decimal = char === "," && /\d/.test(text[index - 1] || "") && /\d/.test(text[index + 1] || "");
      if (depth === 0 && (char === ";" || (char === "," && !decimal))) {
        items.push(text.slice(start, index));
        start = index + 1;
      }
    }
    items.push(text.slice(start));
    return items.map((item) => item.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, "").replace(/[.;]\s*$/, "").trim()).filter(Boolean);
  }

  function recipeStepItems(value) {
    const text = recipeTextClean(value);
    const pattern = /(^|\s)(?:langkah\s+)?(\d{1,2})[.):]\s+/gi;
    const markers = [];
    let match;
    let next = 1;
    while ((match = pattern.exec(text))) {
      if (Number(match[2]) !== next) continue;
      markers.push({ start: match.index, end: pattern.lastIndex });
      next += 1;
    }
    if (markers.length) {
      const items = [];
      const preamble = text.slice(0, markers[0].start).trim();
      if (preamble) items.push(preamble);
      markers.forEach((marker, index) => {
        const item = text.slice(marker.end, markers[index + 1]?.start ?? text.length).trim();
        if (item) items.push(item);
      });
      return items;
    }
    return text.split(/\n+/).map((line) => line.replace(/^\s*[-*•]\s+/, "").trim()).filter(Boolean);
  }

  function parseRecipeContent(value, fallbackIngredients = []) {
    let text = recipeTextClean(value);
    const labels = "bahan(?:[-\\s]+bahan)?(?:\\s+utama)?|bumbu(?:\\s+(?:halus|utama|tambahan))?|ingredients?|langkah(?:[-\\s]+langkah)?(?:\\s+memasak)?|cara\\s+(?:memasak|membuat)|instructions?|steps?|waktu(?:\\s+(?:memasak|masak|total))?|durasi|cooking\\s+time|tips?(?:\\s+(?:penyajian|memasak))?|catatan";
    const headingLine = new RegExp("(^|\\n)\\s*(?:\\d+[.)]\\s+)?(" + labels + ")\\s*(?=\\n|$)", "gi");
    text = text.replace(headingLine, "$1$2:");
    const heading = new RegExp("(^|\\s)(?:\\d+[.)]\\s+)?(" + labels + ")\\s*[:：]\\s*", "gi");
    const headings = [];
    let match;
    while ((match = heading.exec(text))) {
      const before = text.slice(0, match.index);
      const lineStart = before.slice(before.lastIndexOf("\n") + 1).trim() === "" || match[1] === "\n";
      if (!lineStart && !/^[A-Z]/.test(match[2]) && !/[.!?;:]$/.test(before.trimEnd())) continue;
      const label = match[2].toLowerCase();
      const kind = /^(bahan|bumbu|ingredient)/.test(label) ? "ingredients"
        : /^(langkah|cara|instruction|step)/.test(label) ? "steps"
        : /^(waktu|durasi|cooking)/.test(label) ? "time" : "tips";
      headings.push({ start: match.index, end: heading.lastIndex, kind, label });
    }
    const intro = headings.length ? text.slice(0, headings[0].start).trim() : "";
    const sections = headings.map((item, index) => ({
      kind: item.kind,
      label: item.label,
      text: text.slice(item.end, headings[index + 1]?.start ?? text.length).trim(),
    })).filter((section) => section.text);
    if (!headings.length && text) sections.push({ kind: "text", label: "", text });
    sections.forEach((section) => {
      if (section.kind === "ingredients") section.items = recipeIngredientItems(section.text);
      if (section.kind === "steps") section.items = recipeStepItems(section.text);
    });
    const ingredients = sections.filter((section) => section.kind === "ingredients")
      .flatMap((section) => section.items);
    if (!ingredients.length && Array.isArray(fallbackIngredients) && fallbackIngredients.length) {
      const items = fallbackIngredients.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
      if (items.length) {
        ingredients.push(...items);
        sections.unshift({ kind: "ingredients", label: "bahan", text: items.join(", "), items });
      }
    }
    return {
      intro, sections, ingredients,
      time: sections.filter((section) => section.kind === "time").map((section) => section.text.replace(/[.;]\s*$/, "")).join(" · "),
    };
  }

  function recipeInstructions(parsed, title = "") {
    const steps = parsed.sections.filter((section) => section.kind === "steps")
      .flatMap((section) => section.items);
    if (steps.length) return steps;
    return parsed.sections.filter((section) => section.kind === "text")
      .flatMap((section) => recipeStepItems(section.text))
      .filter((text) => text.toLowerCase() !== String(title).trim().toLowerCase());
  }

  function renderRecipeStepPreview(container, instructions) {
    if (!container) return;
    container.replaceChildren();
    instructions.forEach((text, index) => {
      const item = document.createElement("li");
      const number = document.createElement("span");
      number.className = "recipe-preview-number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = String(index + 1).padStart(2, "0");
      const body = document.createElement("div");
      body.className = "recipe-preview-body";
      const heading = document.createElement("h3");
      heading.textContent = `Langkah ${index + 1}`;
      const instruction = document.createElement("p");
      instruction.textContent = text;
      body.append(heading, instruction);
      item.append(number, body);
      container.append(item);
    });
  }

  function createRecipeContent(recipe) {
    const parsed = parseRecipeContent(recipe.text || recipe.recipe_text, recipe.ingredients);
    const root = document.createElement("div");
    root.className = "recipe-copy";
    if (parsed.time) {
      const time = document.createElement("div");
      time.className = "recipe-cooking-time";
      time.setAttribute("aria-label", "Waktu memasak: " + parsed.time);
      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("fill", "none");
      icon.setAttribute("stroke", "currentColor");
      icon.setAttribute("stroke-width", "1.8");
      icon.setAttribute("stroke-linecap", "round");
      icon.setAttribute("aria-hidden", "true");
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "12"); circle.setAttribute("cy", "12"); circle.setAttribute("r", "9");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M12 7v5l3 2");
      icon.append(circle, path);
      time.append(icon, document.createTextNode(parsed.time));
      root.append(time);
    }
    if (parsed.intro && parsed.intro.toLowerCase() !== String(recipe.title || "").trim().toLowerCase()) {
      const intro = document.createElement("p");
      intro.className = "recipe-copy-intro";
      intro.textContent = parsed.intro;
      root.append(intro);
    }
    const ingredientGroups = parsed.sections.filter((section) => section.kind === "ingredients").length;
    parsed.sections.forEach((section) => {
      if (section.kind === "time") return;
      const block = document.createElement("section");
      block.className = "recipe-copy-section";
      if (section.kind !== "text") {
        const heading = document.createElement("h3");
        heading.className = "recipe-copy-heading";
        heading.textContent = section.kind === "ingredients"
          ? (ingredientGroups > 1 || /bumbu|utama/.test(section.label) ? section.label.charAt(0).toUpperCase() + section.label.slice(1) : "Bahan")
          : section.kind === "steps" ? "Langkah memasak"
          : section.label === "catatan" ? "Catatan"
          : section.label.includes("penyajian") ? "Tips penyajian"
          : section.label.includes("memasak") ? "Tips memasak" : "Tips";
        block.append(heading);
      }
      if (section.kind === "ingredients" || section.kind === "steps") {
        const list = document.createElement(section.kind === "steps" ? "ol" : "ul");
        list.className = section.kind === "steps" ? "recipe-steps" : "recipe-ingredients";
        list.setAttribute("role", "list");
        section.items.forEach((value) => {
          const item = document.createElement("li");
          item.textContent = value;
          list.append(item);
        });
        block.append(list);
      } else {
        const body = document.createElement("p");
        body.className = section.kind === "tips" ? "recipe-tips" : "recipe-copy-prose";
        body.textContent = section.text;
        block.append(body);
      }
      root.append(block);
    });
    return root;
  }

  const recipePhotoRequests = new Map();

  function recipePhotoData(recipe) {
    const title = String(recipe.title || "").trim().slice(0, 200);
    const ingredients = (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).join(", ").slice(0, 2000);
    const key = JSON.stringify([title.toLowerCase(), ingredients.toLowerCase()]);
    const cached = recipePhotoRequests.get(key);
    if (cached && cached.expires > Date.now()) return cached.promise;
    const query = new URLSearchParams({ title, ingredients });
    const promise = api("/recipes/image?" + query.toString()).catch(() => ({ status: "unavailable" }));
    recipePhotoRequests.set(key, { promise, expires: Date.now() + 60000 });
    if (recipePhotoRequests.size > 100) recipePhotoRequests.delete(recipePhotoRequests.keys().next().value);
    return promise;
  }

  async function renderRecipePhoto(image, recipe, compact = false, onSettled = null) {
    if (!image || !recipe?.title || !image.parentElement) return;
    const placeholder = "/static/assets/recipe-placeholder.svg";
    if (!document.getElementById("recipe-photo-styles")) {
      const link = document.createElement("link");
      link.id = "recipe-photo-styles";
      link.rel = "stylesheet";
      link.href = "/static/css/recipe_images.css?v=5";
      document.head.append(link);
    }
    const host = image.parentElement;
    host.classList.add("recipe-photo-host");
    host.classList.toggle("recipe-photo-host--compact", compact);
    image.classList.add("recipe-photo");
    image.decoding = "async";
    const key = String(recipe.title) + JSON.stringify(recipe.ingredients || []);
    image.dataset.recipePhotoKey = key;
    image.style.visibility = "";
    image.dataset.recipePhotoState = "loading";
    host.classList.add("is-photo-loading");
    host.setAttribute("aria-busy", "true");
    const skeleton = host.querySelector(".recipe-photo-skeleton") || document.createElement("div");
    skeleton.className = "recipe-photo-skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    if (!skeleton.parentElement) host.append(skeleton);
    const credit = host.querySelector(".recipe-image-credit") || document.createElement("p");
    credit.className = "recipe-image-credit";
    credit.textContent = "Memuat foto…";
    if (!credit.parentElement) host.append(credit);
    let settled = false;
    let fallbackStarted = false;
    let settleTimeout;
    const finishLoading = (state) => {
      if (image.dataset.recipePhotoKey !== key || settled) return;
      settled = true;
      clearTimeout(settleTimeout);
      image.dataset.recipePhotoState = state;
      host.classList.remove("is-photo-loading");
      host.setAttribute("aria-busy", "false");
      if (typeof onSettled === "function") onSettled(state);
    };
    const fallback = () => {
      if (image.dataset.recipePhotoKey !== key || settled || fallbackStarted) return;
      fallbackStarted = true;
      clearTimeout(settleTimeout);
      credit.replaceChildren(document.createTextNode("Foto belum tersedia"));
      image.onerror = () => {
        if (image.dataset.recipePhotoKey !== key) return;
        image.style.visibility = "hidden";
        finishLoading("fallback");
      };
      image.onload = async () => {
        try {
          if (typeof image.decode === "function") await image.decode();
        } catch {}
        finishLoading("fallback");
      };
      image.src = placeholder;
      image.alt = "Ilustrasi tempat foto hidangan";
      if (image.complete && image.naturalWidth > 0) image.onload();
    };
    settleTimeout = setTimeout(fallback, 20000);
    image.onerror = null;
    image.onload = null;
    image.src = placeholder;
    image.alt = "Ilustrasi tempat foto hidangan";
    const photo = (await recipePhotoData(recipe)) || {};
    if (image.dataset.recipePhotoKey !== key || settled || fallbackStarted) return;
    let valid = false;
    try {
      const url = new URL(photo.image_url);
      valid = url.protocol === "https:" && url.hostname === "images.unsplash.com";
    } catch {}
    if (photo.status !== "ok" || !valid) {
      fallback();
      return;
    }
    const creditLink = (text, value) => {
      let url;
      try { url = new URL(value); } catch { return null; }
      if (url.protocol !== "https:" || url.hostname !== "unsplash.com") return null;
      const link = document.createElement("a");
      link.href = url.href;
      link.textContent = text;
      link.target = "_blank";
      link.rel = "noopener";
      return link;
    };
    const photographer = creditLink(photo.photographer, photo.photographer_url);
    const source = creditLink("Unsplash", photo.photo_url);
    if (!photographer || !source) {
      fallback();
      return;
    }
    image.onload = async () => {
      try {
        if (typeof image.decode === "function") await image.decode();
      } catch {
        fallback();
        return;
      }
      if (image.dataset.recipePhotoKey !== key) return;
      credit.replaceChildren(
        document.createTextNode("Ilustrasi · Foto: "), photographer,
        document.createTextNode(" / "), source,
      );
      finishLoading("ready");
    };
    image.onerror = fallback;
    image.alt = photo.alt || ("Ilustrasi " + recipe.title);
    image.src = photo.image_url;
  }

  function prepareRecipeReveal(card, loader) {
    const related = [];
    let revealed = false;
    const visibility = (element, visible) => {
      if (!element) return;
      element.style.visibility = visible ? "visible" : "hidden";
      element.inert = !visible;
      element.setAttribute("aria-hidden", String(!visible));
    };
    visibility(card, false);
    card?.classList.add("recipe-result-card");
    card?.classList.remove("is-recipe-ready");
    card?.setAttribute("aria-busy", "true");
    if (loader) loader.hidden = false;
    return {
      hold(element) {
        visibility(element, false);
        related.push(element);
      },
      reveal() {
        if (revealed) return;
        revealed = true;
        visibility(card, true);
        card?.classList.add("is-recipe-ready");
        card?.setAttribute("aria-busy", "false");
        related.forEach((element) => visibility(element, true));
        if (loader) loader.hidden = true;
      },
      cancel() {
        card?.setAttribute("aria-busy", "false");
        card?.parentElement?.classList.remove("recipe-results-stage");
        if (loader) loader.hidden = true;
      },
    };
  }

  function updateRecipeFavoriteIcon(icon, saved) {
    if (!icon) return;
    if (icon.matches("svg[data-recipe-icon]")) {
      window.NakEnaRecipeIcons?.setSaved(icon, saved);
      return;
    }
    icon.textContent = saved ? "favorite" : "favorite_border";
  }

  async function setupRecipes() {
    const featured = document.getElementById("recipeFeaturedStage");
    if (!featured) return;
    let raw = storedJSON(recipeKey);
    if (!raw?.text && !raw?.recipe_text && !isGuest()) {
      try { raw = (await api("/recipes/history"))[0] || null; } catch (error) { setNotice(error.message); }
    }
    const empty = document.getElementById("recipeEmptyState");
    if (!raw?.text && !raw?.recipe_text) {
      featured.replaceChildren(); featured.hidden = true; empty.hidden = false;
      document.getElementById("customRecipeSection").hidden = true;
      document.getElementById("regenerateRecipes").disabled = true;
      return;
    }
    const selected = normalizeRecipe(raw);
    const options = (Array.isArray(raw.options) && raw.options.length ? raw.options : [raw]).map((value) => {
      const recipe = normalizeRecipe(value); recipe.request ||= raw.request; recipe.category ||= raw.category; return recipe;
    });
    const favorites = new Map();
    if (!isGuest()) {
      try { (await api("/recipes/favorites")).forEach((item) => favorites.set(item.title, item)); updateSavedCount(favorites.size); }
      catch (error) { setNotice(error.message); }
    }
    const favorite = async (recipe, button) => {
      if (isGuest()) { location.assign("/login/?next=%2Frecipes%2F"); return; }
      button.disabled = true;
      try {
        const existing = favorites.get(recipe.title);
        if (existing) { await api(`/recipes/favorites/${existing.id}`, { method: "DELETE" }); favorites.delete(recipe.title); }
        else {
          const saved = await api("/recipes/favorites", { method: "POST", body: JSON.stringify({ title: recipe.title, recipe_text: recipe.text, ingredients: recipe.ingredients }) });
          favorites.set(recipe.title, saved);
        }
        button.setAttribute("aria-pressed", String(favorites.has(recipe.title)));
        button.setAttribute("aria-label", `${favorites.has(recipe.title) ? "Hapus" : "Simpan"} ${recipe.title}`);
        updateSavedCount(favorites.size); setNotice(favorites.has(recipe.title) ? "Resep tersimpan di favorit." : "Resep dihapus dari favorit.", true);
      } catch (error) { setNotice(error.message); }
      finally { button.disabled = false; }
    };
    const pantry = document.getElementById("pantryBadges"); pantry.replaceChildren();
    selected.ingredients.forEach((ingredient) => pantry.append(uiElement("span", "recipe-confirmed-ingredient", ingredient)));
    const stages = new Map();
    const otherGrid = document.getElementById("recipeOtherGrid");
    const otherSection = document.getElementById("other-recipes");
    featured.replaceChildren();
    options.forEach((recipe, index) => {
      const isSelected = recipe.id === selected.id || (!selected.id && index === 0);
      const stage = recipeCard(recipe, { featured: isSelected, favorite, favorites, options, label: recipe.category || selected.category || "Dari bahanmu" });
      stages.set(recipe, { stage, featured: isSelected });
      (isSelected ? featured : otherGrid).append(stage);
    });
    // Older saved entries may not have ids matching their options. The first becomes the lead card.
    if (!featured.children.length && options.length) {
      const first = stages.get(options[0]); first.stage.remove();
      const stage = recipeCard(options[0], { featured: true, favorite, favorites, options, label: "Dari bahanmu" });
      stages.set(options[0], { stage, featured: true }); featured.append(stage);
    }
    document.getElementById("recipeOptionsLabel").textContent = `${options.length} pilihan resep · ${selected.category || "Rumahan"}`;
    let maxMinutes = null;
    const filter = () => {
      const sort = document.getElementById("recipe-sort").value;
      const ordered = [...options].sort((a, b) => sort === "name" ? a.title.localeCompare(b.title, "id") : sort === "time" ? (recipeMinutes(a) ?? Infinity) - (recipeMinutes(b) ?? Infinity) : 0);
      let visible = 0, visibleOther = 0, visibleFeatured = 0;
      ordered.forEach((recipe) => {
        const value = stages.get(recipe);
        const minutes = recipeMinutes(recipe);
        const show = maxMinutes == null || (minutes != null && minutes <= maxMinutes);
        value.stage.hidden = !show;
        if (show) { visible += 1; if (value.featured) visibleFeatured += 1; else visibleOther += 1; }
        if (!value.featured) otherGrid.append(value.stage);
      });
      featured.hidden = !visibleFeatured; otherSection.hidden = !visibleOther;
      document.getElementById("recipeFilterEmpty").hidden = visible > 0;
    };
    document.querySelectorAll("#recipe-time-filters button").forEach((button) => button.addEventListener("click", () => {
      maxMinutes = button.dataset.maxMinutes ? Number(button.dataset.maxMinutes) : null;
      document.querySelectorAll("#recipe-time-filters button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      filter();
    }));
    document.getElementById("recipe-sort").addEventListener("change", filter); filter();
    const notice = sessionStorage.getItem(recipeNoticeKey); if (notice) { setNotice(notice); sessionStorage.removeItem(recipeNoticeKey); }
    let generating = false;
    const regenerate = async (extra = "") => {
      if (generating) return;
      const original = raw.request || {};
      const category = ["Rumahan", "Tumisan", "Kuah Hangat"].includes(selected.category) ? selected.category : "Rumahan";
      const request = {
        ingredients: selected.ingredients,
        preferences: [original.preferences || "", extra || "Buat variasi resep baru dari bahan yang sama"].filter(Boolean).join("; "),
        allergies: Array.isArray(original.allergies) ? original.allergies : [],
        servings: original.servings || 2,
        category,
      };
      if (!request.ingredients.length) return setNotice("Konfirmasikan bahan terlebih dahulu.");
      generating = true;
      const button = document.getElementById("regenerateRecipes");
      const customButton = document.querySelector('#customRecipeForm button');
      button.disabled = customButton.disabled = true;
      const label = button.textContent; button.textContent = "Meracik resep…";
      try {
        const result = await api("/recipes/generate", { method: "POST", body: JSON.stringify(request) });
        const saved = await saveGeneratedRecipes(result, request.ingredients, request.category);
        saved.recipes.forEach((recipe) => { recipe.request = request; });
        sessionStorage.setItem(recipeKey, JSON.stringify({ ...saved.recipes[0], options: saved.recipes, request }));
        if (saved.errors.length) sessionStorage.setItem(recipeNoticeKey, "Resep dibuat, tetapi belum semuanya tersimpan. " + saved.errors.join(" "));
        location.reload();
      } catch (error) { setNotice(error.message); button.textContent = label; button.disabled = customButton.disabled = false; generating = false; }
    };
    document.getElementById("regenerateRecipes").addEventListener("click", () => regenerate());
    captureSubmit(document.getElementById("customRecipeForm"), () => {
      const prompt = document.getElementById("customPromptInput").value.trim();
      if (!prompt) return setNotice("Tuliskan permintaan masakan terlebih dahulu.");
      regenerate(prompt);
    });
  }

  function bindCollectionFilters(records, grid, empty, { kind = false } = {}) {
    const search = document.getElementById("collectionSearch");
    const sort = document.getElementById("collectionSort");
    const status = document.getElementById("collectionStatus");
    let selected = kind ? "all" : null;
    const refresh = () => {
      const query = search.value.trim().toLocaleLowerCase("id-ID");
      let visible = 0;
      const values = [...records].sort((a, b) => sort.value === "name" ? a.recipe.title.localeCompare(b.recipe.title, "id") : (new Date(b.created).getTime() - new Date(a.created).getTime()) * (sort.value === "oldest" ? -1 : 1));
      values.forEach((value) => {
        const text = `${value.recipe.title} ${value.recipe.ingredients.join(" ")}`.toLocaleLowerCase("id-ID");
        const minutes = recipeMinutes(value.recipe);
        const matches = (!query || text.includes(query)) && (kind ? selected === "all" || selected === value.kind : selected == null || minutes != null && minutes <= selected);
        value.node.hidden = !matches; if (matches) visible += 1; grid.append(value.node);
      });
      empty.hidden = visible > 0;
      status.hidden = visible > 0 || !records.length;
      if (records.length && !visible) { status.hidden = false; status.textContent = "Tidak ada hasil yang sesuai dengan pencarian atau filter."; empty.hidden = true; }
    };
    search.addEventListener("input", refresh); sort.addEventListener("change", refresh);
    document.querySelectorAll(kind ? "#historyTypeFilter button" : "#favoriteTimeFilter button").forEach((button) => button.addEventListener("click", () => {
      selected = kind ? button.dataset.kind : button.dataset.maxMinutes ? Number(button.dataset.maxMinutes) : null;
      button.parentElement.querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); refresh();
    }));
    refresh(); return refresh;
  }

  async function setupFavorites() {
    const grid = document.getElementById("recipeCardsGrid"); if (!grid) return;
    const status = document.getElementById("collectionStatus");
    if (isGuest()) {
      status.hidden = true;
      document.getElementById("recipeCounterBadge").hidden = true;
      document.querySelector(".collection-toolbar").hidden = true;
      showGuestInfo(document.querySelector("main"), "Koleksi resep favoritmu", "Masuk untuk menyimpan resep dan membukanya kembali kapan saja.", "/login/?next=%2Ffavorites%2F", "Masuk untuk menyimpan resep"); return;
    }
    let saved;
    try { saved = await api("/recipes/favorites"); } catch (error) { status.textContent = "Koleksi belum dapat dimuat."; setNotice(error.message); return; }
    const favorites = new Map(saved.map((value) => [value.title, value]));
    const records = [];
    let refresh = () => {};
    const updateCounts = () => { document.getElementById("recipeCounterBadge").textContent = `${records.length} resep tersimpan`; updateSavedCount(records.length); };
    const remove = async (recipe, button) => {
      const existing = favorites.get(recipe.title); if (!existing) return;
      button.disabled = true;
      try {
        await api(`/recipes/favorites/${existing.id}`, { method: "DELETE" });
        favorites.delete(recipe.title);
        const index = records.findIndex((value) => value.recipe.id === recipe.id);
        if (index >= 0) { records[index].node.remove(); records.splice(index, 1); }
        updateCounts(); refresh(); setNotice("Resep dihapus dari favorit.", true);
      } catch (error) { setNotice(error.message); button.disabled = false; }
    };
    saved.forEach((value) => {
      const recipe = normalizeRecipe(value);
      const node = recipeCard(recipe, { favorite: remove, favorites, label: "RESEP FAVORIT" });
      grid.append(node); records.push({ recipe, node, created: value.created_at });
    });
    status.hidden = true; updateCounts();
    refresh = bindCollectionFilters(records, grid, document.getElementById("emptyFavoriteState"));
  }

  async function setupHistory() {
    const grid = document.getElementById("activityGrid"); if (!grid) return;
    const status = document.getElementById("collectionStatus");
    if (isGuest()) {
      status.hidden = true; document.querySelector(".collection-toolbar").hidden = true;
      showGuestInfo(document.querySelector("main"), "Riwayat Guest tidak disimpan", "Hasil scan dan resep pada mode Guest hanya digunakan selama sesi ini. Masuk agar aktivitas berikutnya tersimpan ke akun.", "/login/?next=%2Fhistory%2F", "Masuk untuk menyimpan riwayat"); return;
    }
    let history, uploads;
    try { [history, uploads] = await Promise.all([api("/recipes/history"), api("/uploads")]); }
    catch (error) { status.textContent = "Riwayat belum dapat dimuat."; setNotice(error.message); return; }
    const summary = document.getElementById("historySummary");
    summary.append(uiElement("span", "small-badge", `${history.length} resep`), uiElement("span", "small-badge", `${uploads.length} hasil scan`));
    const records = [];
    history.forEach((entry) => {
      const recipe = normalizeRecipe(entry);
      const node = recipeCard(recipe, { label: `RESEP DIBUAT · ${dateLabel(entry.created_at)}` });
      grid.append(node); records.push({ recipe, node, kind: "recipe", created: entry.created_at });
    });
    const latest = storedJSON(uploadKey);
    uploads.forEach((entry) => {
      const node = uiElement("article", "recipe-other-card");
      const visual = uiElement("div", "recipe-visual scan-history-art");
      const preview = latest?.id === entry.id ? sessionStorage.getItem("nakena_preview_image") : null;
      if (preview) { const image = uiElement("img"); image.src = preview; image.alt = "Foto bahan yang kamu unggah"; visual.append(image); } else visual.append(uiIcon("camera"));
      const body = uiElement("div", "recipe-card-body");
      const statusLabel = { detected: "Selesai dipindai", no_detections: "Belum ada bahan terdeteksi", uploaded: "Foto diunggah", pending: "Menunggu proses", failed: "Pemindaian gagal" }[entry.status] || "Foto tersimpan";
      body.append(uiElement("span", "small-label warm", `HASIL SCAN · ${dateLabel(entry.created_at)}`), uiElement("h3", "", entry.original_filename), uiElement("p", "", statusLabel));
      const link = uiElement("a", "btn btn-primary", "Scan bahan baru"); link.href = "/scan/"; body.append(link); node.append(visual, body); grid.append(node);
      records.push({ recipe: { title: entry.original_filename, ingredients: [] }, node, kind: "upload", created: entry.created_at });
    });
    status.hidden = true; bindCollectionFilters(records, grid, document.getElementById("emptyState"), { kind: true });
  }

  async function setupRecipeDetail() {
    const title = document.getElementById("detailRecipeTitle"); if (!title) return;
    const value = storedJSON(recipeKey);
    if (!value?.text && !value?.recipe_text) { location.replace("/recipes/"); return; }
    const recipe = normalizeRecipe(value);
    const parsed = parseRecipeContent(recipe.text, recipe.ingredients);
    const instructions = recipeInstructions(parsed, recipe.title);
    title.textContent = recipe.title;
    document.title = `${recipe.title} — NakEna`;
    const description = document.getElementById("detailRecipeDescription");
    description.textContent = String(recipe.description || (parsed.intro.toLowerCase() !== recipe.title.toLowerCase() ? parsed.intro : "") || "");
    description.hidden = !description.textContent;
    document.getElementById("detailRecipeMeta").replaceChildren(...recipeMeta(recipe).children);
    renderRecipePhoto(document.getElementById("detailRecipePhoto"), recipe);
    const list = document.getElementById("ingredient-checklist"); list.replaceChildren();
    const groups = parsed.sections.filter((section) => section.kind === "ingredients");
    groups.forEach((group) => {
      if (groups.length > 1) list.append(uiElement("li", "detail-ingredient-group", group.label.charAt(0).toUpperCase() + group.label.slice(1)));
      group.items.forEach((text) => {
        const item = uiElement("li"), label = uiElement("label"), input = uiElement("input"); input.type = "checkbox";
        label.append(input, uiElement("span", "", text)); item.append(label); list.append(item);
      });
    });
    document.getElementById("detailIngredientCount").textContent = `${parsed.ingredients.length} bahan`;
    renderRecipeStepPreview(document.getElementById("recipe-step-preview"), instructions);
    document.getElementById("recipe-step-preview-count").textContent = `${instructions.length} langkah`;
    document.getElementById("recipe-step-preview-empty").hidden = instructions.length > 0;
    document.getElementById("recipe-step-preview-card").hidden = false;
    const tips = parsed.sections.filter((section) => section.kind === "tips");
    document.getElementById("recipe-coach-tip").textContent = tips.map((section) => section.text).join("\n\n");
    document.getElementById("recipe-coach-card").hidden = !tips.length;
    const notes = parsed.sections.filter((section) => section.kind === "text");
    if (notes.length) {
      notes.forEach((section) => document.getElementById("detailNotesContent").append(uiElement("p", "", section.text)));
      document.getElementById("detailNotes").hidden = false;
    }
    const button = document.getElementById("btn-save-recipe");
    let favorite = null;
    const update = () => {
      const text = button.querySelector("span"); text.textContent = favorite ? "Tersimpan" : "Simpan resep";
      button.setAttribute("aria-pressed", String(Boolean(favorite)));
    };
    if (!isGuest()) {
      button.disabled = true;
      try { const favorites = await api("/recipes/favorites"); favorite = favorites.find((entry) => entry.title === recipe.title); updateSavedCount(favorites.length); update(); }
      catch (error) { setNotice(error.message); }
      finally { button.disabled = false; }
    }
    button.addEventListener("click", async () => {
      if (isGuest()) { location.assign("/login/?next=%2Frecipes%2F1%2F"); return; }
      button.disabled = true;
      try {
        if (favorite) { await api(`/recipes/favorites/${favorite.id}`, { method: "DELETE" }); favorite = null; }
        else favorite = await api("/recipes/favorites", { method: "POST", body: JSON.stringify({ title: recipe.title, recipe_text: recipe.text, ingredients: recipe.ingredients }) });
        update(); setNotice(favorite ? "Resep tersimpan di favorit." : "Resep dihapus dari favorit.", true);
      } catch (error) { setNotice(error.message); }
      finally { button.disabled = false; }
    });
    document.getElementById("share-btn").addEventListener("click", async () => {
      try {
        // Recipe content is session-bound, so share the actual recipe as well as the title.
        const text = `${recipe.title}\n\n${recipe.text}`;
        if (navigator.share) await navigator.share({ title: recipe.title, text });
        else { await navigator.clipboard.writeText(text); setNotice("Teks resep disalin.", true); }
      } catch (error) { if (error.name !== "AbortError") setNotice("Resep belum dapat dibagikan. Coba lagi."); }
    });
  }

  function setupGuidedCooking() {
    if (!location.pathname.startsWith("/recipes/1/guided-cooking/")) return;
    let recipe;
    try {
      recipe = JSON.parse(sessionStorage.getItem(recipeKey) || "null");
    } catch {
      sessionStorage.removeItem(recipeKey);
    }
    const recipeText = recipe?.text || recipe?.recipe_text || "";
    if (!recipeText) {
      location.replace("/recipes/");
      return;
    }
    const parsed = parseRecipeContent(recipeText, recipe.ingredients);
    const instructions = recipeInstructions(parsed, recipe.title);
    window.dispatchEvent(new CustomEvent("nakena:guided-recipe", {
      detail: {
        title: recipe.title || "Resep pilihanmu",
        instructions,
        ingredientGroups: parsed.sections.filter((item) => item.kind === "ingredients")
          .map((item) => ({ label: item.label, items: item.items })),
        time: parsed.time,
        tips: parsed.sections.filter((item) => item.kind === "tips").map((item) => item.text),
      },
    }));
  }

  function renderProfileAvatar(avatar, user = {}) {
    if (!avatar) return;
    const fullName = [user.full_name, sessionStorage.getItem(userNameKey), sessionStorage.getItem(emailKey), "NakEna"]
      .find((value) => typeof value === "string" && value.trim())?.trim() || "NakEna";
    const initial = Array.from(fullName)[0].toLocaleUpperCase("id-ID");
    const avatarUrl = user.profile_image_url || user.avatar_url || user.photo_url;
    avatar.replaceChildren();
    if (avatarUrl && !avatar.closest("[data-header-account]")) {
      const image = document.createElement("img");
      image.src = avatarUrl;
      image.alt = "Foto profil";
      image.className = "w-full h-full object-cover";
      avatar.appendChild(image);
    } else {
      const fallback = document.createElement("span");
      fallback.textContent = initial;
      fallback.setAttribute("data-user-avatar-initial", "");
      avatar.appendChild(fallback);
    }
    avatar.closest("a")?.setAttribute("aria-label", `Buka profil ${fullName}`);
  }

  async function hydrateProfile() {
    if (!token()) return;
    const requestedToken = token();
    const avatar = document.querySelector("[data-user-avatar]");
    // Tampilkan huruf awal segera, lalu ganti dengan data profil setelah API selesai.
    renderProfileAvatar(avatar);
    try {
      const user = await api("/users/me");
      if (token() !== requestedToken) return;
      document.querySelectorAll("[data-user-name]").forEach((element) => {
        element.textContent = user.full_name;
      });
      document.querySelectorAll("[data-user-email]").forEach((element) => {
        element.textContent = user.email;
      });
      const createdAt = document.getElementById("userCreatedAt");
      if (createdAt) {
        createdAt.textContent = new Date(user.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
      document.querySelectorAll("[data-profile-initial]").forEach((element) => {
        element.textContent = Array.from(user.full_name.trim())[0]?.toLocaleUpperCase("id-ID") || "N";
      });
      const fullNameInput = document.getElementById("input-fullname");
      if (fullNameInput) fullNameInput.value = user.full_name || "";
      const emailInput = document.getElementById("input-email");
      if (emailInput) emailInput.value = user.email || "";
      sessionStorage.setItem(userNameKey, String(user.full_name || ""));
      renderProfileAvatar(avatar, user);
      window.dispatchEvent(new CustomEvent("nakena:auth-changed", {
        detail: { authenticated: true, fullName: user.full_name || "", email: user.email || "" },
      }));
    } catch (error) {
      if (location.pathname.startsWith("/profile/")) setNotice(error.message);
    }
  }

  async function setupAdminDashboard() {
    if (location.pathname !== "/admin-dashboard/") return;
    const main = document.querySelector("main");
    if (!main) return;
    main.classList.add("hidden");
    try {
      const user = await api("/users/me");
      if (user.role !== "admin") {
        location.replace("/scan/");
        return;
      }
      main.replaceChildren();
      const message = document.createElement("section");
      message.className = "mx-auto my-12 max-w-3xl rounded-3xl border border-white/10 bg-surface-container-low p-8 text-center";
      const heading = document.createElement("h1");
      heading.className = "text-2xl font-bold text-on-surface";
      heading.textContent = "Dashboard admin belum terhubung";
      const detail = document.createElement("p");
      detail.className = "mt-3 text-on-surface-variant";
      detail.textContent = "API belum menyediakan data statistik administrasi. Data contoh tidak ditampilkan.";
      message.append(heading, detail);
      main.append(message);
      main.classList.remove("hidden");
    } catch (error) {
      setNotice(error.message);
    }
  }

  function setupLogout() {
    const clearSession = () => {
      [tokenKey, emailKey, userNameKey, uploadKey, recipeKey, recipeNoticeKey,
        "nakena_preview_image", "nakena_guest_mode"].forEach((key) => sessionStorage.removeItem(key));
      window.dispatchEvent(new CustomEvent("nakena:auth-changed", { detail: { authenticated: false } }));
    };
    document.querySelectorAll('[data-action="logout"]').forEach((button) => {
      button.addEventListener("click", () => {
        clearSession();
        location.assign("/");
      });
    });
    document.querySelector("#logout-modal a[data-path='beranda']")?.addEventListener("click", (event) => {
      event.preventDefault();
      clearSession();
      location.assign("/");
    });
  }

  setPageLinks();
  setupAuth();
  const allowed = protectPages();
  if (allowed) {
    setupHeaderAccount();
    renderGuestIdentity();
    setupScan();
    setupDetectionResult();
    setupProfile();
    setupRecipeGeneration();
    setupRecipes();
    setupFavorites();
    setupHistory();
    setupRecipeDetail();
    setupGuidedCooking();
    setupAdminDashboard();
    hydrateProfile();
    setupLogout();
  }
})();
