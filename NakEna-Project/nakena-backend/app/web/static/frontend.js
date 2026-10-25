(() => {
  const tokenKey = "nakena_access_token";
  const emailKey = "nakena_user_email";
  const userNameKey = "nakena_user_name";
  const uploadKey = "nakena_last_upload";
  const recipeKey = "nakena_latest_recipe";
  const recipeNoticeKey = "nakena_recipe_notice";
  const apiBaseUrl = (document.currentScript?.dataset.apiBase || "").replace(/\/+$/, "");
  const token = () => sessionStorage.getItem(tokenKey);
  const email = () => sessionStorage.getItem(emailKey) || "guest";
  const storageKey = (name) => `nakena_${name}_${email()}`;

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token()) headers.set("Authorization", `Bearer ${token()}`);
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem(tokenKey);
        sessionStorage.removeItem(emailKey);
      }
      const detail = data?.detail;
      throw new Error(Array.isArray(detail) ? "Periksa kembali data yang dimasukkan." : detail || "Permintaan ke server gagal.");
    }
    return data;
  }

  function setNotice(message, success = false) {
    const errorBox = document.getElementById("general-error-box");
    const errorText = document.getElementById("general-error-text");
    const successBox = document.getElementById("success-box");
    if (errorBox && errorText) {
      errorText.textContent = message;
      errorBox.classList.toggle("hidden", success);
    }
    if (successBox) successBox.classList.toggle("hidden", !success);
    if (!errorBox && !successBox) window.alert(message);
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
      if (!fullName || !userEmail || password.length < 8 || password !== confirmation || !values.get("terms_agreement")) {
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
        window.location.assign("/scan/");
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
    const protectedPaths = ["/scan/", "/scan/result/", "/recipes/", "/history/", "/favorites/", "/profile/", "/recipes/1/guided-cooking/", "/admin-dashboard/"];
    if (protectedPaths.some((path) => location.pathname.startsWith(path)) && !token()) {
      location.replace(`/login/?next=${encodeURIComponent(location.pathname)}`);
      return false;
    }
    return true;
  }

  function setupScan() {
    const form = document.getElementById("scanForm");
    const input = document.getElementById("fileInput");
    if (!form || !input) return;
    let previewReady = Promise.resolve();

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
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
      await previewReady;
      const formData = new FormData();
      formData.append("file", file);
      try {
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
        location.assign("/scan/result/");
      } catch (error) {
        setNotice(error.message);
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
      preview.src = imageData;
      preview.addEventListener("load", () => renderDetectionBoxes(preview, upload), { once: true });
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
      if (confidence) confidence.textContent = `${Math.round(detection.confidence * 100)}% yakin`;
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
      if (emptyMessage) emptyMessage.textContent = "Model belum menemukan bahan pada foto. Tambahkan bahan secara manual untuk melanjutkan.";
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
    const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
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
      box.className = "absolute rounded-2xl border-2";
      box.style.cssText = `left:${left}%;top:${top}%;width:${width}%;height:${height}%;border-color:${color};background:${color}22;`;
      box.title = `${detection.name} (${Math.round(detection.confidence * 100)}%)`;
      const label = document.createElement("span");
      label.className = "absolute -top-3 left-1 px-2 py-0.5 rounded-full bg-[#060D1A]/90 text-white font-bold text-[10px] sm:text-xs whitespace-nowrap";
      label.style.color = color;
      label.textContent = `${detection.name} • ${Math.round(detection.confidence * 100)}%`;
      box.append(label);
      overlay.append(box);
    });
  }

  function profilePreferenceFromForm(form) {
    const values = new FormData(form);
    const activeChips = (id) => Array.from(document.querySelectorAll(`#${id} .chip-toggle.active`))
      .map((chip) => chip.textContent.replace(/[^\p{L}\p{N}\s-]/gu, "").trim())
      .filter(Boolean);
    const selectedTime = values.get("cook_time");
    const selectedDifficulty = Array.from(form.querySelectorAll("button"))
      .find((button) => button.className.includes("bg-primary-container") && /Mudah|Sedang|Ahli/.test(button.textContent))?.textContent.trim();
    const selectedCuisine = Array.from(form.querySelectorAll("button"))
      .find((button) => button.className.includes("bg-primary-container") && /Nusantara|Tumisan|Sup|Pedas/.test(button.textContent))?.textContent.trim();
    const cookMinutes = { quick: 15, medium: 30, long: 120 }[selectedTime] || null;
    const difficulty = /Ahli/i.test(selectedDifficulty || "") ? "hard" : /Sedang/i.test(selectedDifficulty || "") ? "medium" : "easy";
    const portion = Number(document.getElementById("portion-value")?.textContent || 2);
    return {
      diet: activeChips("diet-chips").join(", ") || null,
      allergies: activeChips("allergy-chips").map((value) => value.replace(/^Bebas\s+/i, "")).filter((value) => !/Tidak Ada/i.test(value)),
      staple_ingredients: Array.from(document.querySelectorAll("[data-staple-ingredient]"))
        .map((chip) => chip.dataset.stapleIngredient)
        .filter(Boolean),
      default_max_cook_minutes: cookMinutes,
      default_difficulty: difficulty,
      default_servings: portion,
      preferred_cuisine: selectedCuisine || null,
    };
  }

  function setupProfile() {
    const form = document.getElementById("preferences-form");
    if (!token()) return;
    if (form) api("/users/me/preferences").then((preferences) => {
      document.querySelectorAll("#diet-chips .chip-toggle").forEach((chip) => {
        const name = chip.textContent.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().toLowerCase();
        const active = (preferences.diet || "").toLowerCase().includes(name);
        chip.classList.toggle("active", active);
        chip.classList.toggle("bg-primary-container", active);
        chip.classList.toggle("text-on-primary", active);
        chip.classList.toggle("shadow-sm", active);
        chip.classList.toggle("bg-surface-container", !active);
        chip.classList.toggle("text-on-surface", !active);
      });
      document.querySelectorAll("#allergy-chips .chip-toggle").forEach((chip) => {
        const name = chip.textContent.replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/^Bebas\s+/i, "").trim().toLowerCase();
        const active = (preferences.allergies || []).some((item) => item.toLowerCase().includes(name));
        chip.classList.toggle("active", active);
        chip.classList.toggle("bg-primary-container", active);
        chip.classList.toggle("text-on-primary", active);
        chip.classList.toggle("shadow-sm", active);
        chip.classList.toggle("bg-surface-container", !active);
        chip.classList.toggle("text-on-surface", !active);
      });
      const timeValue = preferences.default_max_cook_minutes <= 15 ? "quick" : preferences.default_max_cook_minutes > 30 ? "long" : "medium";
      const radio = form.querySelector(`input[name="cook_time"][value="${timeValue}"]`);
      if (radio) radio.checked = true;
      const portion = document.getElementById("portion-value");
      if (portion && preferences.default_servings) portion.textContent = preferences.default_servings;
      renderPantryIngredients(preferences.staple_ingredients || []);
    }).catch((error) => setNotice(error.message));

    if (form) {
      const save = async () => {
        try {
          await api("/users/me/preferences", {
            method: "PATCH",
            body: JSON.stringify(profilePreferenceFromForm(form)),
          });
          document.getElementById("save-toast")?.classList.remove("hidden");
        } catch (error) {
          setNotice(error.message);
        }
      };
      captureSubmit(form, save);
      document.getElementById("btn-save-preferences")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        save();
      }, true);
    }

    const accountForm = document.getElementById("account-form");
    if (accountForm) {
      const saveAccount = async () => {
        const fullName = String(new FormData(accountForm).get("fullname") || "").trim();
        if (!fullName) return setNotice("Nama lengkap tidak boleh kosong.");
        try {
          const user = await api("/users/me", {
            method: "PATCH",
            body: JSON.stringify({ full_name: fullName }),
          });
          sessionStorage.setItem(userNameKey, user.full_name);
          document.querySelectorAll("[data-user-name]").forEach((element) => {
            element.textContent = user.full_name;
          });
          setNotice("Profil berhasil diperbarui.", true);
        } catch (error) {
          setNotice(error.message);
        }
      };
      captureSubmit(accountForm, saveAccount);
      document.getElementById("btn-save-account")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveAccount();
      }, true);
    }

    document.getElementById("btn-add-pantry-ingredient")?.addEventListener("click", () => {
      const name = window.prompt("Nama bahan yang selalu tersedia di rumah:");
      if (!name?.trim()) return;
      const current = Array.from(document.querySelectorAll("[data-staple-ingredient]"))
        .map((chip) => chip.dataset.stapleIngredient.toLowerCase());
      if (current.includes(name.trim().toLowerCase())) return setNotice("Bahan tersebut sudah ada.");
      renderPantryIngredients([...current, name.trim()]);
    });
  }

  function renderPantryIngredients(ingredients) {
    const list = document.getElementById("pantryIngredientsList");
    if (!list) return;
    list.replaceChildren();
    ingredients.forEach((ingredient) => {
      const chip = document.createElement("span");
      chip.className = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface font-label-md text-label-md";
      chip.dataset.stapleIngredient = ingredient;
      const label = document.createElement("span");
      label.textContent = ingredient;
      const remove = document.createElement("button");
      remove.className = "material-symbols-outlined text-[14px] text-primary cursor-pointer hover:text-primary-container";
      remove.type = "button";
      remove.setAttribute("aria-label", `Hapus ${ingredient}`);
      remove.textContent = "close";
      remove.addEventListener("click", () => chip.remove());
      chip.append(label, remove);
      list.append(chip);
    });
  }

  function setupRecipeGeneration() {
    const form = document.getElementById("ingredientsConfirmationForm");
    if (!form) return;
    captureSubmit(form, async () => {
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
        const result = await api("/recipes/generate", {
          method: "POST",
          body: JSON.stringify({
            ingredients: uniqueIngredients,
            preferences,
            allergies,
            servings,
            category,
          }),
        });
        const { recipes, errors } = await saveGeneratedRecipes(result, uniqueIngredients, category);
        const recipe = { ...recipes[0], options: recipes, category };
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

  async function setupRecipes() {
    if (location.pathname !== "/recipes/") return;
    const main = document.querySelector("main");
    if (!main) return;
    let recipe = null;
    try {
      recipe = JSON.parse(sessionStorage.getItem(recipeKey) || "null");
    } catch {
      sessionStorage.removeItem(recipeKey);
    }
    const articles = Array.from(main.querySelectorAll("article"));
    const featured = articles[0];
    const extraGrid = articles[1]?.parentElement;
    articles.slice(1).forEach((article) => article.remove());
    if (extraGrid?.classList.contains("grid")) {
      const sectionHeading = extraGrid.previousElementSibling;
      extraGrid.remove();
      if (sectionHeading?.querySelector("h3")) sectionHeading.remove();
    }
    featured?.classList.add("hidden");
    let history = [];
    let favorites = [];
    let notice = sessionStorage.getItem(recipeNoticeKey) || "";
    sessionStorage.removeItem(recipeNoticeKey);
    try {
      [history, favorites] = await Promise.all([
        api("/recipes/history"),
        api("/recipes/favorites"),
      ]);
    } catch (error) {
      if (!recipe?.text && !recipe?.recipe_text) {
        setNotice(error.message);
        return;
      }
      notice = [notice, "Riwayat atau favorit belum dapat dimuat dari server."].filter(Boolean).join(" ");
    }
    if (!recipe?.recipe_text && !recipe?.text) {
      recipe = (recipe?.id ? history.find((entry) => entry.id === recipe.id) : null)
        || history[0]
        || null;
    } else if (recipe?.id) {
      const savedRecipe = history.find((entry) => entry.id === recipe.id);
      if (savedRecipe) recipe = { ...recipe, ...savedRecipe, text: savedRecipe.recipe_text };
    }
    if (recipe?.recipe_text && !recipe.text) recipe.text = recipe.recipe_text;
    if (Array.isArray(recipe?.options)) {
      recipe.options = recipe.options.map((option) => {
        const entry = history.find((item) => item.id === option.id);
        return entry ? { ...option, title: entry.title, text: entry.recipe_text } : option;
      });
    }

    const favoriteTitles = new Set(favorites.map((entry) => entry.title));
    const savedCount = document.getElementById("savedCountHeader");
    const bottomCount = document.getElementById("savedCountBottom");
    if (savedCount) savedCount.textContent = String(favorites.length);
    if (bottomCount) bottomCount.textContent = String(favorites.length);

    if (!recipe) {
      main.querySelectorAll("article").forEach((article) => article.remove());
      const empty = document.createElement("section");
      empty.className = "mx-auto my-10 max-w-3xl rounded-3xl border border-white/10 bg-navy-card p-8 text-center shadow-xl";
      const heading = document.createElement("h2");
      heading.className = "text-2xl font-display font-bold text-white";
      heading.textContent = "Belum ada resep buatanmu";
      const text = document.createElement("p");
      text.className = "mt-3 text-on-surface-variant";
      text.textContent = "Pindai bahan di dapur lalu minta NakEna meracik resep sesuai bahanmu.";
      const link = document.createElement("a");
      link.className = "mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-white";
      link.href = "/scan/";
      link.textContent = "Mulai scan bahan";
      empty.append(heading, text, link);
      main.append(empty);
    } else if (featured) {
      featured.classList.remove("hidden");
      const options = Array.isArray(recipe.options) && recipe.options.length
        ? recipe.options
        : [recipe];
      if (options.length > 1) {
        const selector = document.createElement("section");
        selector.className = "mb-6 rounded-2xl border border-white/10 bg-navy-card p-4";
        const heading = document.createElement("h3");
        heading.className = "mb-3 font-display text-lg font-bold text-white";
        heading.textContent = `Pilihan resep kategori ${recipe.category || "Rumahan"}`;
        const list = document.createElement("div");
        list.className = "grid grid-cols-1 gap-2 sm:grid-cols-3";
        options.forEach((option, index) => {
          const choice = document.createElement("button");
          choice.type = "button";
          choice.className = "rounded-xl border border-white/10 bg-navy-surface px-4 py-3 text-left text-sm font-semibold text-on-surface hover:border-primary";
          choice.textContent = option.title;
          choice.setAttribute("aria-pressed", String(option.id === recipe.id));
          if (option.id === recipe.id) choice.classList.add("border-primary", "text-white");
          choice.addEventListener("click", () => {
            sessionStorage.setItem(recipeKey, JSON.stringify({
              ...option,
              options,
              category: recipe.category || "Rumahan",
            }));
            location.reload();
          });
          choice.setAttribute("aria-label", `Pilihan ${index + 1}: ${option.title}`);
          list.append(choice);
        });
        selector.append(heading, list);
        const featuredContainer = featured.parentElement;
        if (featuredContainer?.parentElement === main) {
          main.insertBefore(selector, featuredContainer);
        }
      }
      const title = featured.querySelector("h2");
      const description = featured.querySelector("p");
      const image = featured.querySelector("img");
      if (title) title.textContent = recipe.title;
      if (description) description.textContent = recipe.ingredients?.length
        ? `Bahan: ${recipe.ingredients.join(", ")}`
        : "Resep ini dibuat untukmu oleh NakEna.";
      if (image) {
        image.removeAttribute("src");
        image.alt = `Resep ${recipe.title}`;
      }
      const content = Array.from(featured.querySelectorAll("div"))
        .find((element) => element.classList.contains("lg:col-span-7"));
      const recipeBody = Array.from(content?.children || [])
        .find((element) => element.classList.contains("flex-col"));
      const recipeHeading = recipeBody?.querySelector("h2");
      const recipeDescription = recipeBody?.querySelector("p");
      const details = document.createElement("pre");
      details.className = "whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface-variant";
      details.textContent = recipe.text || recipe.recipe_text || "";
      if (recipeBody) {
        recipeBody.replaceChildren(...[recipeHeading, recipeDescription, details].filter(Boolean));
      }
      featured.querySelectorAll("[onclick]").forEach((button) => {
        const action = button.getAttribute("onclick") || "";
        button.removeAttribute("onclick");
        if (action.startsWith("toggleFav")) {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            window.toggleFav(button, recipe.title);
          }, true);
        } else if (button.textContent.toLowerCase().includes("detail resep")) {
          button.addEventListener("click", (event) => {
            event.preventDefault();
            sessionStorage.setItem(recipeKey, JSON.stringify(recipe));
            location.assign("/recipes/1/");
          }, true);
        }
      });
      const icon = featured.querySelector(".bookmark-icon");
      if (icon && favoriteTitles.has(recipe.title)) icon.textContent = "favorite";
    }
    showRecipeNotice(main, notice);

    window.toggleFav = async (button, title) => {
      try {
        const favorites = await api("/recipes/favorites");
        const existing = favorites.find((item) => item.title === title);
        if (existing) {
          await api(`/recipes/favorites/${existing.id}`, { method: "DELETE" });
        } else {
          await api("/recipes/favorites", {
            method: "POST",
            body: JSON.stringify({
              title,
              recipe_text: recipe?.title === title ? recipe.text : recipe?.recipe_text || "",
              ingredients: recipe?.title === title ? recipe.ingredients : [],
            }),
          });
        }
        const icon = button?.querySelector(".bookmark-icon, .material-symbols-outlined");
        if (icon) icon.textContent = existing ? "favorite_border" : "favorite";
        const count = document.getElementById("savedCountHeader");
        if (count) count.textContent = existing ? favorites.length - 1 : favorites.length + 1;
        const bottomCount = document.getElementById("savedCountBottom");
        if (bottomCount) bottomCount.textContent = existing ? favorites.length - 1 : favorites.length + 1;
      } catch (error) {
        setNotice(error.message);
      }
    };

    const regenerate = async (preferences = "Buat variasi resep baru dari bahan yang sama") => {
      const ingredients = recipe?.ingredients;
      if (!Array.isArray(ingredients) || !ingredients.length) {
        setNotice("Pindai bahan terlebih dahulu sebelum membuat resep.");
        return;
      }
      try {
        const result = await api("/recipes/generate", {
          method: "POST",
          body: JSON.stringify({
            ingredients,
            preferences,
            allergies: [],
            servings: 2,
            category: recipe.category || "Rumahan",
          }),
        });
        const { recipes, errors } = await saveGeneratedRecipes(
          result,
          ingredients,
          recipe.category || "Rumahan",
        );
        sessionStorage.setItem(recipeKey, JSON.stringify({
          ...recipes[0],
          options: recipes,
          category: recipe.category || "Rumahan",
        }));
        if (errors.length) {
          sessionStorage.setItem(
            recipeNoticeKey,
            "Resep berhasil dibuat, tetapi sebagian tidak tersimpan ke riwayat. " + errors.join(" "),
          );
        }
        location.reload();
      } catch (error) {
        setNotice(error.message);
      }
    };
    window.triggerRegenerate = () => regenerate();
    window.requestCustomPrompt = () => {
      const input = document.getElementById("customPromptInput");
      const prompt = input?.value.trim();
      if (!prompt) return setNotice("Tuliskan permintaan masakanmu terlebih dahulu.");
      regenerate(prompt);
    };
  }

  async function setupFavorites() {
    const grid = document.getElementById("recipeCardsGrid");
    if (!grid) return;
    const template = grid.querySelector(".recipe-item");
    grid.replaceChildren();
    const empty = document.getElementById("emptyFavoriteState");
    if (empty) empty.classList.add("hidden");
    let favorites;
    try {
      favorites = await api("/recipes/favorites");
    } catch (error) {
      setNotice(error.message);
      return;
    }
    if (empty) empty.classList.toggle("hidden", favorites.length > 0);
    const badge = document.getElementById("recipeCounterBadge");
    if (badge) badge.textContent = `${favorites.length} Resep Tersimpan`;
    const allCount = document.getElementById("count-all");
    if (allCount) allCount.textContent = String(favorites.length);
    grid.style.display = favorites.length ? "" : "none";
    favorites.forEach((favorite) => {
      if (!template) return;
      const card = template.cloneNode(true);
      card.classList.remove("hidden");
      card.dataset.title = favorite.title;
      card.dataset.entryId = favorite.id;
      card.dataset.category = "tersimpan";
      card.dataset.match = "0";
      card.dataset.rating = "0";
      card.dataset.time = "0";

      const image = card.querySelector("img");
      if (image) {
        image.removeAttribute("src");
        image.alt = `Resep ${favorite.title}`;
      }
      const badge = card.querySelector(".absolute.top-space-sm.left-space-sm");
      if (badge) badge.textContent = "Tersimpan";
      const content = Array.from(card.querySelectorAll("div"))
        .find((element) => element.classList.contains("p-space-md") && element.classList.contains("flex-col"));
      const heading = content?.querySelector("h2, h3, h4");
      if (content && heading) {
        const title = document.createElement(heading.tagName.toLowerCase());
        title.className = heading.className;
        title.textContent = favorite.title;
        const summary = document.createElement("p");
        summary.className = "font-body-sm text-body-sm text-on-surface-variant";
        summary.textContent = favorite.ingredients?.length
          ? `Bahan: ${favorite.ingredients.join(", ")}`
          : "Resep tersimpan di akunmu.";
        content.replaceChildren(title, summary);
      }
      const buttons = Array.from(card.querySelectorAll("button"));
      buttons.forEach((button, index) => {
        button.removeAttribute("onclick");
        if (index === 0) {
          button.setAttribute("aria-label", "Hapus dari resep tersimpan");
          button.addEventListener("click", async () => {
            try {
              await api(`/recipes/favorites/${favorite.id}`, { method: "DELETE" });
              card.remove();
              const count = grid.querySelectorAll(".recipe-item").length;
              if (badge) badge.textContent = `${count} Resep Tersimpan`;
              if (empty && !count) empty.classList.remove("hidden");
            } catch (error) {
              setNotice(error.message);
            }
          });
          return;
        }
        button.addEventListener("click", () => {
          sessionStorage.setItem(recipeKey, JSON.stringify({
            id: favorite.id,
            title: favorite.title,
            text: favorite.recipe_text,
            ingredients: favorite.ingredients,
          }));
          location.assign("/recipes/1/");
        });
      });
      grid.append(card);
    });
    window.toggleFavorite = (button) => button?.closest(".recipe-item")?.querySelector("button")?.click();
  }

  async function setupHistory() {
    const grid = document.getElementById("activityGrid");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(".activity-card"));
    const template = cards[0];
    const empty = document.getElementById("emptyStateView");
    cards.forEach((card) => card.remove());
    let history;
    let uploads;
    try {
      [history, uploads] = await Promise.all([
        api("/recipes/history"),
        api("/uploads"),
      ]);
    } catch (error) {
      setNotice(error.message);
      return;
    }
    const entries = [
      ...history.map((entry) => ({ ...entry, kind: "recipe" })),
      ...uploads.map((upload) => ({ ...upload, kind: "upload", title: `Scan: ${upload.original_filename}` })),
    ].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
    grid.style.display = entries.length ? "" : "none";
    entries.forEach((entry) => {
      if (!template) return;
      const card = template.cloneNode(true);
      card.classList.remove("hidden");
      const title = card.querySelector("h2, h3, h4, [data-title]");
      if (title) title.textContent = entry.title;
      card.setAttribute("data-title", entry.title);
      card.setAttribute("data-type", entry.kind === "recipe" ? "resep" : "scan");
      card.setAttribute("data-status", entry.kind === "upload" ? entry.status : "selesai");
      const text = card.querySelector("p");
      if (text) text.textContent = new Date(entry.created_at).toLocaleString("id-ID");
      const image = card.querySelector("img");
      if (image) {
        image.removeAttribute("src");
        image.alt = entry.kind === "recipe" ? `Resep ${entry.title}` : "Foto bahan yang diunggah";
      }
      const badge = card.querySelector(".absolute.top-3.left-3");
      if (badge) badge.textContent = entry.kind === "recipe" ? "Resep tersimpan" : `Scan ${entry.status}`;
      const body = Array.from(card.querySelectorAll("div"))
        .find((element) => element.classList.contains("p-space-md") && element.classList.contains("flex-col"));
      const bodyTitle = body?.querySelector("h2, h3, h4");
      if (body && bodyTitle) {
        const dynamicTitle = document.createElement(bodyTitle.tagName.toLowerCase());
        dynamicTitle.className = bodyTitle.className;
        dynamicTitle.textContent = entry.title;
        const summary = document.createElement("p");
        summary.className = "font-body-sm text-body-sm text-on-surface-variant";
        summary.textContent = entry.kind === "recipe"
          ? (entry.ingredients?.length ? `Bahan: ${entry.ingredients.join(", ")}` : "Resep buatan NakEna")
          : `Status scan: ${entry.status}`;
        body.replaceChildren(dynamicTitle, summary);
      }
      card.querySelectorAll("[onclick]").forEach((button) => button.removeAttribute("onclick"));
      card.addEventListener("click", (event) => {
        if (event.target.closest("button")) return;
        if (entry.kind === "recipe") {
          sessionStorage.setItem(recipeKey, JSON.stringify({
            id: entry.id,
            title: entry.title,
            text: entry.recipe_text,
            ingredients: entry.ingredients,
          }));
          location.assign("/recipes/1/");
        }
      });
      card.querySelectorAll("button").forEach((button) => {
        button.textContent = entry.kind === "recipe" ? "Lihat resep" : "Scan ulang";
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (entry.kind === "recipe") {
            sessionStorage.setItem(recipeKey, JSON.stringify({
              id: entry.id,
              title: entry.title,
              text: entry.recipe_text,
              ingredients: entry.ingredients,
            }));
            location.assign("/recipes/1/");
          } else {
            location.assign("/scan/");
          }
        });
      });
      grid.append(card);
    });
    if (empty) empty.classList.toggle("hidden", entries.length > 0);
  }

  function setupRecipeDetail() {
    if (!location.pathname.match(/^\/recipes\/\d+\/$/)) return;
    let recipe;
    try {
      recipe = JSON.parse(sessionStorage.getItem(recipeKey) || "null");
    } catch {
      sessionStorage.removeItem(recipeKey);
    }
    if (!recipe?.text && !recipe?.recipe_text) {
      location.replace("/recipes/");
      return;
    }
    if (!recipe.text) recipe.text = recipe.recipe_text;
    const main = document.querySelector("main");
    if (!main) return;
    const heading = main.querySelector("h1, h2");
    if (heading) heading.textContent = recipe.title;
    const description = heading?.parentElement.querySelector("p");
    if (description) {
      description.textContent = recipe.ingredients?.length
        ? `Bahan: ${recipe.ingredients.join(", ")}`
        : "Resep yang dibuat khusus untukmu oleh NakEna.";
    }
    const checklist = document.getElementById("ingredient-checklist");
    if (checklist) {
      checklist.replaceChildren();
      (recipe.ingredients || []).forEach((ingredient) => {
        const item = document.createElement("li");
        item.className = "flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low";
        const label = document.createElement("span");
        label.className = "font-body-md text-body-md text-on-surface";
        label.textContent = ingredient;
        item.append(label);
        checklist.append(item);
      });
    }
    const details = document.createElement("pre");
    details.className = "whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface-variant";
    details.textContent = recipe.text;
    description?.after(details);

    const saveButton = document.getElementById("btn-save-recipe");
    if (saveButton) saveButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        const favorites = await api("/recipes/favorites");
        const favorite = favorites.find((entry) => entry.title === recipe.title);
        if (favorite) {
          await api(`/recipes/favorites/${favorite.id}`, { method: "DELETE" });
          setNotice("Resep dihapus dari favorit.");
        } else {
          await api("/recipes/favorites", {
            method: "POST",
            body: JSON.stringify({
              title: recipe.title,
              recipe_text: recipe.text,
              ingredients: recipe.ingredients || [],
            }),
          });
          setNotice("Resep disimpan ke favorit.", true);
        }
      } catch (error) {
        setNotice(error.message);
      }
    }, true);
    const shareButton = document.getElementById("share-btn");
    if (shareButton) shareButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        await navigator.clipboard.writeText(`${recipe.title}\n${location.href}`);
        setNotice("Tautan resep berhasil disalin.", true);
      } catch (error) {
        setNotice(`Gagal menyalin tautan: ${error.message}`);
      }
    }, true);
    main.querySelectorAll("h2").forEach((sectionTitle) => {
      if (/Nutrisi per Porsi|Ulasan|Komentar/i.test(sectionTitle.textContent)) {
        sectionTitle.closest("section")?.classList.add("hidden");
      }
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
    const section = recipeText.match(/(?:langkah(?:-langkah)?(?:\s+memasak)?|cara\s+(?:memasak|membuat))\s*:?\s*([\s\S]*)/i);
    let instructionText = section ? section[1] : recipeText;
    instructionText = instructionText.split(/\n\s*(?:tips?(?:\s+penyajian)?|waktu\s+memasak|catatan)\s*:?\s*/i)[0];
    const instructions = instructionText.split(/\r?\n/)
      .map((line) => line.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, ""))
      .filter((line) => line && !/^(?:langkah(?:-langkah)?(?:\s+memasak)?|cara\s+(?:memasak|membuat))\s*:?\s*$/i.test(line));
    if (!instructions.length) instructions.push(recipeText.trim());

    let current = 0;
    const renderStep = () => {
      const total = instructions.length;
      const heading = document.getElementById("step-heading-text");
      const description = document.getElementById("step-description-text");
      const count = document.getElementById("step-count-text");
      const modalCount = document.getElementById("modal-step-display");
      const badge = document.getElementById("step-badge-text");
      const progress = document.getElementById("progress-percent-text");
      const bar = document.getElementById("progress-indicator-bar");
      if (heading) heading.textContent = `Langkah ${current + 1}`;
      if (description) description.textContent = instructions[current];
      if (count) count.textContent = `Langkah ${current + 1} dari ${total}`;
      if (modalCount) modalCount.textContent = String(current + 1);
      if (badge) badge.textContent = `${recipe.title} • LANGKAH ${current + 1} DARI ${total}`;
      if (progress) progress.textContent = `${Math.round(((current + 1) / total) * 100)}% Selesai`;
      if (bar) bar.style.width = `${((current + 1) / total) * 100}%`;
      const title = document.getElementById("recipe-title-display");
      if (title) title.textContent = recipe.title;
      const nextText = document.getElementById("next-btn-text");
      if (nextText) nextText.textContent = current === total - 1 ? "Selesai Memasak" : "Langkah Berikutnya";
      const previous = document.getElementById("prev-step-btn");
      if (previous) previous.disabled = current === 0;
      const checklist = document.getElementById("ingredients-checklist-container");
      if (checklist) {
        checklist.replaceChildren();
        (recipe.ingredients || []).forEach((ingredient) => {
          const label = document.createElement("label");
          label.className = "ingredient-item flex items-center gap-space-md p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high cursor-pointer transition-all shadow-sm";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "step-ingredient-checkbox w-5 h-5 rounded accent-primary-container cursor-pointer";
          const name = document.createElement("span");
          name.className = "font-body-md text-body-md text-on-surface font-semibold truncate";
          name.textContent = ingredient;
          label.append(checkbox, name);
          checklist.append(label);
        });
      }
      const timer = document.getElementById("timer-display-string");
      if (timer) timer.textContent = "--:--";
      const timerButton = document.getElementById("main-timer-action-btn");
      if (timerButton) timerButton.disabled = true;
      const timerLabel = document.getElementById("main-timer-btn-label");
      if (timerLabel) timerLabel.textContent = "Timer tidak tersedia untuk resep ini";
      const estimation = document.getElementById("step-estimation-text");
      if (estimation) estimation.textContent = "Ikuti waktu pada resep";
    };
    const bindNavigation = (id, direction) => {
      document.getElementById(id)?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (direction > 0 && current === instructions.length - 1) {
          location.assign("/recipes/1/");
          return;
        }
        current = Math.max(0, Math.min(instructions.length - 1, current + direction));
        renderStep();
      }, true);
    };
    bindNavigation("next-step-btn", 1);
    bindNavigation("alert-next-btn", 1);
    bindNavigation("prev-step-btn", -1);
    renderStep();
  }

  function renderProfileAvatar(avatar, user = {}) {
    if (!avatar) return;
    const fullName = String(user.full_name || sessionStorage.getItem(userNameKey) || email() || "NakEna").trim();
    const initial = fullName.charAt(0).toUpperCase() || "N";
    const avatarUrl = user.profile_image_url || user.avatar_url || user.photo_url;
    avatar.textContent = "";
    if (avatarUrl) {
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
    const avatar = document.querySelector("[data-user-avatar]");
    // Tampilkan huruf awal segera, lalu ganti dengan data profil setelah API selesai.
    renderProfileAvatar(avatar);
    try {
      const user = await api("/users/me");
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
      const fullNameInput = document.getElementById("input-fullname");
      if (fullNameInput) fullNameInput.value = user.full_name || "";
      const emailInput = document.getElementById("input-email");
      if (emailInput) emailInput.value = user.email || "";
      sessionStorage.setItem(userNameKey, String(user.full_name || ""));
      renderProfileAvatar(avatar, user);
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
    document.querySelectorAll('[data-action="logout"]').forEach((button) => {
      button.addEventListener("click", () => {
        sessionStorage.removeItem(tokenKey);
        sessionStorage.removeItem(emailKey);
        sessionStorage.removeItem(userNameKey);
        location.assign("/");
      });
    });
    document.querySelector("#logout-modal a[data-path='beranda']")?.addEventListener("click", (event) => {
      event.preventDefault();
      sessionStorage.removeItem(tokenKey);
      sessionStorage.removeItem(emailKey);
      sessionStorage.removeItem(userNameKey);
      sessionStorage.removeItem(recipeKey);
      location.assign("/");
    });
  }

  setPageLinks();
  setupAuth();
  const allowed = protectPages();
  if (allowed) {
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
