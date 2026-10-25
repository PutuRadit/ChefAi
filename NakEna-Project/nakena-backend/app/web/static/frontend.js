(() => {
  const tokenKey = "nakena_access_token";
  const emailKey = "nakena_user_email";
  const userNameKey = "nakena_user_name";
  const uploadKey = "nakena_last_upload";
  const recipeKey = "nakena_latest_recipe";
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
    const protectedPaths = ["/scan/", "/scan/result/", "/recipes/", "/history/", "/favorites/", "/profile/"];
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
    if (!storedUpload || !document.getElementById("ingredientsConfirmationForm")) return;
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
    const preview = document.querySelector("#ingredientsConfirmationForm aside img");
    const imageData = sessionStorage.getItem("nakena_preview_image");
    if (preview && imageData) preview.src = imageData;
    const ingredientList = document.getElementById("ingredientsListContainer");
    const emptyState = document.getElementById("emptyIngredientsState");
    const itemTemplate = ingredientList?.querySelector(".ingredient-item")?.cloneNode(true);
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
      const item = itemTemplate.cloneNode(true);
      item.dataset.id = `detected-${index}`;
      const name = item.querySelector(".ingredient-name");
      const confidence = item.querySelector(".ingredient-name + span");
      const description = item.querySelector(".min-w-0 > .text-xs.text-slate-400");
      if (name) name.textContent = detection.name;
      if (confidence) confidence.textContent = `${Math.round(detection.confidence * 100)}% yakin`;
      if (description) description.textContent = "Bahan terdeteksi oleh model NakEna.";
      ingredientList.append(item);
    });
    const hidden = document.getElementById("detectedIngredientsInput");
    if (hidden) hidden.value = ingredients.join(", ");
    const count = document.getElementById("detectedCount");
    if (count) count.textContent = String(detections.length);
    if (ingredientList) ingredientList.classList.toggle("hidden", detections.length === 0);
    if (emptyState) {
      emptyState.classList.toggle("hidden", detections.length > 0);
      emptyState.classList.toggle("flex", detections.length === 0);
      const emptyMessage = emptyState.querySelector("p");
      if (emptyMessage) emptyMessage.textContent = "Model belum menemukan bahan pada foto. Tambahkan bahan secara manual untuk melanjutkan.";
      const restoreButton = document.getElementById("restoreDefaultsBtn");
      if (restoreButton) restoreButton.classList.add("hidden");
    }
    const message = document.querySelector("#ingredientsConfirmationForm aside .text-slate-400");
    if (message) message.textContent = detections.length
      ? `${detections.length} objek bahan terdeteksi. Periksa hasilnya sebelum membuat resep.`
      : "Tidak ada bahan terdeteksi. Tambahkan bahan secara manual sebelum membuat resep.";
    const detectedBadge = document.querySelector("#ingredientsConfirmationForm aside .text-amber-400.text-xs.font-bold");
    if (detectedBadge) detectedBadge.textContent = `${detections.length} Bahan Terdeteksi`;
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
      staple_ingredients: [],
      default_max_cook_minutes: cookMinutes,
      default_difficulty: difficulty,
      default_servings: portion,
      preferred_cuisine: selectedCuisine || null,
    };
  }

  function setupProfile() {
    const form = document.getElementById("preferences-form");
    if (!form || !token()) return;
    api("/users/me/preferences").then((preferences) => {
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
    }).catch((error) => setNotice(error.message));

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
    document.getElementById("btn-save-preferences")?.addEventListener("click", save, true);
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
        `Masakan: ${String(values.get("cuisine_type") || "Rumahan")}`,
        `Waktu memasak: ${String(values.get("cooking_time") || "15_to_30")}`,
        `Tingkat kesulitan: ${String(values.get("difficulty") || "Sangat Mudah")}`,
      ].join("; ");
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
          }),
        });
        const text = String(result.recipe || "").trim();
        if (!text) throw new Error("Gemini tidak mengembalikan teks resep.");
        const title = (text.split("\n").find((line) => line.trim()) || "Resep NakEna")
          .replace(/^#+\s*/, "")
          .slice(0, 200);
        const recipe = {
          title,
          text,
          ingredients: uniqueIngredients,
          createdAt: new Date().toISOString(),
        };
        const saved = await api("/recipes/history", {
          method: "POST",
          body: JSON.stringify({
            title: recipe.title,
            recipe_text: recipe.text,
            ingredients: recipe.ingredients,
          }),
        });
        recipe.id = saved.id;
        sessionStorage.setItem(recipeKey, JSON.stringify(recipe));
        location.assign("/recipes/");
      } catch (error) {
        setNotice(error.message);
        if (button) button.disabled = false;
        overlay?.classList.add("opacity-0", "pointer-events-none");
      }
    });
  }

  function setupRecipes() {
    if (location.pathname !== "/recipes/") return;
    const recipe = JSON.parse(sessionStorage.getItem(recipeKey) || "null");
    if (recipe && location.pathname === "/recipes/") {
      const main = document.querySelector("main");
      const featured = main?.querySelector("article");
      const title = featured?.querySelector("h2");
      const description = featured?.querySelector("p");
      if (title) title.textContent = recipe.title;
      if (description) description.textContent = "Resep dibuat oleh NakEna berdasarkan bahan dan preferensi yang kamu pilih.";
      if (featured) {
        const details = document.createElement("pre");
         details.className = "mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface-variant";
        details.textContent = recipe.text;
         const content = Array.from(featured.querySelectorAll("div")).find((element) => element.classList.contains("lg:col-span-7"));
         content?.append(details);
         main?.querySelectorAll("article").forEach((article) => {
           if (article !== featured) article.classList.add("hidden");
         });
         featured.querySelectorAll("button").forEach((button) => {
           if (button.getAttribute("onclick")?.startsWith("toggleFav")) {
             button.addEventListener("click", (event) => {
               event.preventDefault();
               event.stopImmediatePropagation();
               window.toggleFav(button, recipe.title);
             }, true);
           }
           if (!button.textContent.toLowerCase().includes("detail resep")) return;
           button.addEventListener("click", (event) => {
             event.preventDefault();
             event.stopImmediatePropagation();
             location.assign("/recipes/1/");
           }, true);
         });
      }
    }

    api("/recipes/favorites").then((favorites) => {
      const savedTitles = new Set(favorites.map((item) => item.title));
      document.querySelectorAll("[onclick^=\"toggleFav\"]").forEach((button) => {
        const title = button.getAttribute("onclick")?.match(/toggleFav\(this,\s*'([^']+)'\)/)?.[1];
        if (title && savedTitles.has(title)) {
          const icon = button.querySelector(".bookmark-icon, .material-symbols-outlined");
          if (icon) icon.textContent = "favorite";
        }
      });
      const count = document.getElementById("savedCountHeader");
      if (count) count.textContent = favorites.length;
    }).catch(() => {});

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
              recipe_text: recipe?.title === title ? recipe.text : "",
              ingredients: recipe?.title === title ? recipe.ingredients : [],
            }),
          });
        }
        const icon = button?.querySelector(".bookmark-icon, .material-symbols-outlined");
        if (icon) icon.textContent = existing ? "favorite_border" : "favorite";
        const count = document.getElementById("savedCountHeader");
        if (count) count.textContent = existing ? favorites.length - 1 : favorites.length + 1;
      } catch (error) {
        setNotice(error.message);
      }
    };
  }

  async function setupFavorites() {
    const grid = document.getElementById("recipeCardsGrid");
    if (!grid) return;
    let favorites;
    try {
      favorites = await api("/recipes/favorites");
    } catch (error) {
      setNotice(error.message);
      return;
    }
    const saved = new Set(favorites.map((item) => item.title));
    const cards = Array.from(grid.querySelectorAll(".recipe-item"));
    cards.forEach((card) => {
      const title = card.getAttribute("data-title") || card.querySelector("h3, h4")?.textContent.trim();
      card.classList.toggle("hidden", !saved.has(title));
    });
    const empty = document.getElementById("emptyFavoriteState");
    if (empty) empty.classList.toggle("hidden", favorites.length > 0);
    if (favorites.length && cards.length) {
      favorites.forEach((favorite) => {
        if (cards.some((card) => (card.getAttribute("data-title") || card.querySelector("h3, h4")?.textContent.trim()) === favorite.title)) return;
        const card = cards[0].cloneNode(true);
        card.setAttribute("data-title", favorite.title);
        card.setAttribute("data-entry-id", favorite.id);
        const heading = card.querySelector("h3, h4");
        if (heading) heading.textContent = favorite.title;
        card.classList.remove("hidden");
        grid.append(card);
      });
    }
    const badge = document.getElementById("recipeCounterBadge");
    if (badge) badge.textContent = `${favorites.length} Resep Tersimpan`;
    favorites.forEach((favorite) => {
      const card = Array.from(grid.querySelectorAll(".recipe-item")).find((item) => item.getAttribute("data-title") === favorite.title);
      if (card) {
        card.setAttribute("data-entry-id", favorite.id);
        card.querySelectorAll("button").forEach((button) => {
          if (!button.textContent.toLowerCase().includes("detail resep")) return;
          button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopImmediatePropagation();
            sessionStorage.setItem(recipeKey, JSON.stringify({
              id: favorite.id,
              title: favorite.title,
              text: favorite.recipe_text,
              ingredients: favorite.ingredients,
            }));
            location.assign("/recipes/1/");
          }, true);
        });
      }
    });
    window.toggleFavorite = async (button, title) => {
      const card = button?.closest(".recipe-item");
      const entryId = card?.getAttribute("data-entry-id");
      if (!entryId) return;
      try {
        await api(`/recipes/favorites/${entryId}`, { method: "DELETE" });
        card.remove();
        const remaining = grid.querySelectorAll(".recipe-item:not(.hidden)").length;
        const count = document.getElementById("recipeCounterBadge");
        if (count) count.textContent = `${remaining} Resep Tersimpan`;
        if (!remaining) empty?.classList.remove("hidden");
      } catch (error) {
        setNotice(error.message);
      }
    };
  }

  async function setupHistory() {
    const grid = document.getElementById("activityGrid");
    if (!grid) return;
    let history;
    try {
      history = await api("/recipes/history");
    } catch (error) {
      setNotice(error.message);
      return;
    }
    const cards = Array.from(grid.querySelectorAll(".activity-card"));
    const empty = document.getElementById("emptyStateView");
    cards.forEach((card) => card.remove());
    history.forEach((entry) => {
      if (!cards.length) return;
      const card = cards[0].cloneNode(true);
      card.classList.remove("hidden");
      const title = card.querySelector("h2, h3, h4, [data-title]");
      if (title) title.textContent = entry.title;
      card.setAttribute("data-title", entry.title);
      card.setAttribute("data-type", "resep");
      card.setAttribute("data-status", "selesai");
      const text = card.querySelector("p");
      if (text) text.textContent = new Date(entry.created_at).toLocaleString("id-ID");
      card.addEventListener("click", () => {
        sessionStorage.setItem(recipeKey, JSON.stringify({
          id: entry.id,
          title: entry.title,
          text: entry.recipe_text,
          ingredients: entry.ingredients,
        }));
        location.assign("/recipes/1/");
      });
      grid.append(card);
    });
    if (empty) empty.classList.toggle("hidden", history.length > 0);
  }

  function setupRecipeDetail() {
    if (!location.pathname.match(/^\/recipes\/\d+\/$/)) return;
    const recipe = JSON.parse(sessionStorage.getItem(recipeKey) || "null");
    if (!recipe) return;
    const main = document.querySelector("main");
    if (!main) return;
    const heading = main.querySelector("h1, h2");
    if (heading) heading.textContent = recipe.title;
    const details = document.createElement("pre");
    details.className = "whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface-variant";
    details.textContent = recipe.text;
    main.prepend(details);
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
    const name = document.querySelector("[data-user-name]");
    const avatar = document.querySelector("[data-user-avatar]");
    // Tampilkan huruf awal segera, lalu ganti dengan data profil setelah API selesai.
    renderProfileAvatar(avatar);
    try {
      const user = await api("/users/me");
      if (name) name.textContent = user.full_name;
      sessionStorage.setItem(userNameKey, String(user.full_name || ""));
      renderProfileAvatar(avatar, user);
    } catch (error) {
      if (location.pathname.startsWith("/profile/")) setNotice(error.message);
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
    hydrateProfile();
    setupLogout();
  }
})();
