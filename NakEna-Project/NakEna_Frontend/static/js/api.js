(() => {
  const tokenKey = "nakena_access_token";
  const emailKey = "nakena_user_email";
  const userNameKey = "nakena_user_name";
  const userRoleKey = "nakena_user_role";
  const uploadKey = "nakena_last_upload";
  const recipeKey = "nakena_latest_recipe";
  const recipeNoticeKey = "nakena_recipe_notice";
  const moreRecipesKey = "nakena_more_recipe_request";
  const appAuthStorage = window.NakEnaTts ? window.localStorage : null;
  const getAuthItem = (key) => {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue && appAuthStorage && !appAuthStorage.getItem(key)) {
      appAuthStorage.setItem(key, sessionValue);
    }
    return sessionValue || appAuthStorage?.getItem(key) || null;
  };
  const setAuthItem = (key, value) => {
    sessionStorage.setItem(key, value);
    appAuthStorage?.setItem(key, value);
  };
  const removeAuthItem = (key) => {
    sessionStorage.removeItem(key);
    appAuthStorage?.removeItem(key);
  };
  if (window.NakEnaTts && /^\/login\/?$/.test(location.pathname)
    && new URLSearchParams(location.search).get("app_start") === "1") {
    [tokenKey, emailKey, userNameKey, userRoleKey].forEach(removeAuthItem);
    [uploadKey, recipeKey, recipeNoticeKey, moreRecipesKey].forEach((key) => sessionStorage.removeItem(key));
    history.replaceState(history.state, "", location.pathname);
  }
  const apiBaseUrl = (document.currentScript?.dataset.apiBase || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const token = () => getAuthItem(tokenKey);
  let currentRole = "guest";
  let currentUser = null;
  const email = () => getAuthItem(emailKey) || "guest";
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
      person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
      home: "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10Z",
      logout: "M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7",
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

  function initializeProfileMenu(profile, index) {
    if (profile.dataset.profileMenuReady) return;

    const wrapper = uiElement("div", "profile-menu");
    const toggle = uiElement("button", "account-profile");
    toggle.type = "button";
    toggle.dataset.headerProfile = "";
    toggle.dataset.profileMenuReady = "true";
    toggle.hidden = profile.hidden;
    toggle.setAttribute("aria-label", "Buka menu profil");
    toggle.setAttribute("aria-expanded", "false");

    const panel = uiElement("div", "profile-menu-panel");
    panel.id = `profile-menu-${index + 1}`;
    panel.hidden = true;
    panel.setAttribute("aria-label", "Menu akun");
    toggle.setAttribute("aria-controls", panel.id);

    const avatar = profile.querySelector("[data-user-avatar]");
    if (avatar) toggle.append(avatar);
    else toggle.append(...profile.childNodes);

    const homeLink = uiElement("a", "profile-menu-item");
    homeLink.href = "/";
    homeLink.append(uiIcon("home"), document.createTextNode("Beranda"));

    const navigationLinks = [
      ["Scan bahan", "/scan/", "camera"],
      ["Riwayat", "/history/", "clock"],
      ["Favorit", "/favorites/", "heart"],
    ];
    const additionalLinks = navigationLinks.map(([label, href, icon]) => {
      const link = uiElement("a", "profile-menu-item");
      link.href = href;
      link.append(uiIcon(icon), document.createTextNode(label));
      return link;
    });

    const profileLink = uiElement("a", "profile-menu-item");
    profileLink.href = "/profile/";
    const profileIcon = uiIcon("person");
    profileLink.append(profileIcon, document.createTextNode("Profil"));

    const logoutButton = uiElement("button", "profile-menu-item", "Keluar");
    logoutButton.type = "button";
    logoutButton.dataset.action = "logout";
    logoutButton.prepend(uiIcon("logout"));

    panel.append(homeLink, ...additionalLinks, profileLink, logoutButton);
    wrapper.append(toggle, panel);
    profile.replaceWith(wrapper);

    const close = (restoreFocus = false) => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (restoreFocus) toggle.focus();
    };

    toggle.addEventListener("click", () => {
      const open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
      if (open) profileLink.focus();
    });
    panel.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) close();
    });
    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) close();
    });
    document.addEventListener("focusin", (event) => {
      if (!wrapper.contains(event.target)) close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        event.stopPropagation();
        close(true);
      }
    });
  }

  function setupHeaderAccount() {
    const accounts = document.querySelectorAll("[data-header-account]");
    if (!accounts.length) return;
    const sync = (detail = {}) => {
      const authenticated = Boolean(token()) && ["user", "admin"].includes(detail.role || currentRole);
      const next = encodeURIComponent(`${location.pathname}${location.search}`);
      accounts.forEach((account) => {
        const guest = account.querySelector("[data-header-guest]");
        let profile = account.querySelector("[data-header-profile]");
        if (profile && profile.tagName !== "BUTTON") {
          initializeProfileMenu(profile, [...accounts].indexOf(account));
          profile = account.querySelector("[data-header-profile]");
        }
        if (guest) guest.hidden = authenticated;
        if (profile) profile.hidden = !authenticated || (detail.role || currentRole) === "admin";
        account.querySelectorAll("[data-header-member-only]").forEach((element) => {
          element.hidden = true;
        });
        const login = account.querySelector("[data-header-login]");
        const register = account.querySelector("[data-header-register]");
        if (login) login.href = `/login/?next=${next}`;
        if (register) register.href = `/register/?next=${next}`;
        const avatar = account.querySelector("[data-user-avatar]");
        if (authenticated) renderProfileAvatar(avatar, { full_name: detail.fullName });
        else if (avatar) avatar.replaceChildren();
      });
      configureRoleNavigation(detail.role || currentRole);
    };
    // Keep the guest controls until the stored session has been verified.
    sync();
    window.addEventListener("nakena:auth-changed", (event) => sync(event.detail));
  }

  async function api(path, options = {}) {
    const {
      quietAccessFailure = false,
      accessToken = null,
      ...requestOptions
    } = options;
    const headers = new Headers(options.headers || {});
    const bearerToken = accessToken || token();
    if (bearerToken) headers.set("Authorization", `Bearer ${bearerToken}`);
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    const endpoint = `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(endpoint, { ...requestOptions, headers });
    const data = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) {
        [tokenKey, emailKey, userNameKey, userRoleKey].forEach(removeAuthItem);
        currentRole = "guest";
        currentUser = null;
        window.dispatchEvent(new CustomEvent("nakena:auth-changed", { detail: { authenticated: false, role: "guest" } }));
      }
      const detail = data?.detail;
      const message = Array.isArray(detail) ? "Periksa kembali data yang dimasukkan." : detail || "Permintaan ke server gagal.";
      if (!quietAccessFailure && [401, 403].includes(response.status)) {
        showAccessWarning(message, response.status === 401 ? "/login/" : "/");
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
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

  function showAccessWarning(message, actionPath = "/login/", redirectPath = "") {
    document.getElementById("accessWarningDialog")?.remove();
    if (!document.getElementById("access-warning-styles")) {
      const style = document.createElement("link");
      style.id = "access-warning-styles";
      style.rel = "stylesheet";
      style.href = "/static/css/access_notice.css";
      document.head.append(style);
    }
    const overlay = document.createElement("div");
    overlay.id = "accessWarningDialog";
    overlay.className = "access-warning-overlay";
    overlay.setAttribute("role", "presentation");
    const dialog = uiElement("section", "access-warning-dialog");
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "accessWarningTitle");
    const heading = uiElement("h2", "", "Peringatan akses");
    heading.id = "accessWarningTitle";
    const detail = uiElement("p", "", message);
    const actions = uiElement("div", "access-warning-actions");
    const action = uiElement("a", "btn btn-primary", actionPath === "/" ? "Ke beranda" : "Masuk");
    action.href = actionPath;
    const close = uiElement("button", "btn btn-secondary", "Tutup");
    close.type = "button";
    actions.append(action, close);
    dialog.append(heading, detail, actions);
    overlay.append(dialog);
    document.body.append(overlay);
    const dismiss = () => {
      clearTimeout(overlay.redirectTimer);
      overlay.remove();
    };
    close.addEventListener("click", dismiss);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) dismiss();
    });
    close.focus();
    if (redirectPath) {
      overlay.redirectTimer = setTimeout(() => location.replace(redirectPath), 1800);
    }
  }

  function confirmManyDetectedIngredients(count) {
    return new Promise((resolve) => {
      const dialog = document.createElement("dialog");
      dialog.className = "detection-warning-dialog";
      dialog.setAttribute("aria-labelledby", "detectionWarningTitle");
      dialog.innerHTML = `
        <section>
          <h2 id="detectionWarningTitle">Bahan terdeteksi lebih dari 3 jenis</h2>
          <p>Teridentifikasi ${count} jenis bahan. Jika bahan dalam foto terlalu banyak, hasil scan mungkin kurang akurat. Kamu bisa tetap lanjut atau scan ulang dengan bahan lebih sedikit.</p>
          <div class="button-row">
            <button type="button" class="btn btn-secondary" data-retake>Scan ulang</button>
            <button type="button" class="btn btn-primary" data-continue>Lanjutkan</button>
          </div>
        </section>`;
      document.body.append(dialog);
      let settled = false;
      const finish = (shouldContinue) => {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(shouldContinue);
      };
      dialog.querySelector("[data-retake]").addEventListener("click", () => finish(false));
      dialog.querySelector("[data-continue]").addEventListener("click", () => finish(true));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        finish(false);
      });
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) finish(false);
      });
      dialog.showModal();
      dialog.querySelector("[data-retake]").focus();
    });
  }

  function captureSubmit(form, handler) {
    if (!form) return;
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      handler(event);
    }, true);
  }

  function saveToken(data, userEmail, user) {
    setAuthItem(tokenKey, data.access_token);
    setAuthItem(emailKey, userEmail);
    setAuthItem(userNameKey, user.full_name);
    setAuthItem(userRoleKey, user.role);
    currentRole = user.role;
    currentUser = user;
    sessionStorage.removeItem("nakena_guest_mode");
    window.dispatchEvent(new CustomEvent("nakena:auth-changed", {
      detail: { authenticated: true, role: user.role, fullName: user.full_name, email: user.email },
    }));
  }

  function setupRememberedLogin(form) {
    if (!form) return null;
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="password"]');
    const passwordField = passwordInput?.closest(".field");
    if (!emailInput || !passwordInput || !passwordField) return null;

    emailInput.autocomplete = "username";
    passwordInput.autocomplete = "current-password";

    const label = document.createElement("label");
    label.className = "choice-chip remember-login";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "remember_login";
    checkbox.id = "remember-login";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "icon");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.8");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    iconPath.setAttribute("d", "M12 5v14M5 12h14");
    icon.append(iconPath);
    const text = document.createElement("span");
    text.textContent = "Ingat email & kata sandi";
    label.append(checkbox, icon, text);
    passwordField.after(label);

    const updateIcon = () => {
      iconPath.setAttribute("d", checkbox.checked ? "m5 12 4 4L19 6" : "M12 5v14M5 12h14");
    };
    checkbox.addEventListener("change", () => {
      updateIcon();
      if (!checkbox.checked && typeof window.NakEnaTts?.saveRememberedCredentials === "function"
        && !window.NakEnaTts.saveRememberedCredentials("", "", false)) {
        setNotice("Login tersimpan tidak dapat dihapus dari perangkat ini.");
      }
    });

    const applyCredentials = (credentials) => {
      if (!credentials || typeof credentials.email !== "string" || !credentials.email
        || typeof credentials.password !== "string" || !credentials.password
        || emailInput.value || passwordInput.value) return;
      emailInput.value = credentials.email;
      passwordInput.value = credentials.password;
      checkbox.checked = true;
      updateIcon();
    };

    if (typeof window.NakEnaTts?.getRememberedCredentials === "function") {
      try {
        const saved = window.NakEnaTts.getRememberedCredentials();
        if (saved) {
          const credentials = JSON.parse(saved);
          if (credentials.error) setNotice("Login tersimpan tidak dapat dibaca. Silakan masukkan kembali.");
          else applyCredentials(credentials);
        }
      } catch {
        setNotice("Login tersimpan tidak dapat dibaca. Silakan masukkan kembali.");
      }
    } else if (window.PasswordCredential && navigator.credentials?.get) {
      navigator.credentials.get({ password: true, mediation: "silent" })
        .then((credential) => {
          if (credential?.type === "password") {
            applyCredentials({ email: credential.id, password: credential.password });
          }
        })
        .catch((error) => {
          if (!["NotAllowedError", "NotSupportedError"].includes(error.name)) {
            setNotice("Browser tidak dapat membaca login tersimpan.");
          }
        });
    }

    return checkbox;
  }

  async function persistRememberedLogin(checkbox, userEmail, password) {
    const remember = checkbox?.checked === true;
    try {
      if (typeof window.NakEnaTts?.saveRememberedCredentials === "function") {
        if (!window.NakEnaTts.saveRememberedCredentials(userEmail, password, remember)) {
          setNotice("Login berhasil, tetapi kata sandi tidak dapat disimpan di perangkat ini.");
        }
        return;
      }
      if (!remember) {
        await navigator.credentials?.preventSilentAccess?.();
        return;
      }
      if (window.PasswordCredential && navigator.credentials?.store) {
        await navigator.credentials.store(new window.PasswordCredential({
          id: userEmail,
          password,
          name: userEmail,
        }));
      }
    } catch {
      setNotice("Login berhasil, tetapi browser tidak dapat menyimpan kata sandi.");
    }
  }

  function setupAuth() {
    const loginForm = document.getElementById("login-form");
    const rememberLogin = setupRememberedLogin(loginForm);
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
        const user = await api("/users/me", { accessToken: data.access_token });
        saveToken(data, userEmail, user);
        await persistRememberedLogin(rememberLogin, userEmail, password);
        const next = new URLSearchParams(location.search).get("next");
        const target = next?.startsWith("/") && !next.startsWith("//")
          ? next
          : user.role === "admin" ? "/admin-dashboard/" : "/scan/";
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
      const passwordValid = password.length >= 8 && password.length <= 64
        && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)
        && password.toLowerCase() !== userEmail.toLowerCase();
      if (!fullName || !userEmail || !passwordValid || password !== confirmation) {
        const message = document.getElementById("globalErrorMessage");
        const alert = document.getElementById("globalErrorAlert");
        if (message) message.textContent = "Lengkapi data. Kata sandi harus 8–64 karakter, memiliki huruf besar, huruf kecil, angka, tidak sama dengan email, dan konfirmasi harus cocok.";
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
        const user = await api("/users/me", { accessToken: data.access_token });
        saveToken(data, userEmail, user);
        const next = new URLSearchParams(location.search).get("next");
        const target = next?.startsWith("/") && !next.startsWith("//")
          ? next
          : user.role === "admin" ? "/admin-dashboard/" : "/scan/";
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

  function isRegularUserPath(path) {
    return ["/scan", "/recipes", "/history", "/favorites", "/profile"].some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  function isAdminPath(path) {
    return path === "/admin-dashboard" || path === "/admin-dashboard/";
  }

  function configureRoleNavigation(role) {
    document.querySelectorAll(".site-header .header-inner").forEach((header) => {
      let nav = header.querySelector(".site-nav");
      if (!nav) {
        nav = document.createElement("nav");
        nav.className = "site-nav";
        nav.setAttribute("aria-label", "Navigasi utama");
        header.insertBefore(nav, header.querySelector(".header-account"));
      }
      nav.querySelectorAll("[data-role-generated]").forEach((item) => item.remove());
      const addLink = (label, href) => {
        const link = uiElement("a", "", label);
        link.href = href;
        link.dataset.roleGenerated = "true";
        nav.append(link);
      };
      nav.hidden = role === "user" && location.pathname !== "/";
      if (role === "user" && /^\/scan\/?$/.test(location.pathname)) {
        document.querySelector(".page-scan .breadcrumb")?.remove();
      }
      if (role === "admin") {
        addLink("Admin Dashboard", "/admin-dashboard/");
      }
      nav.querySelectorAll("a[href]").forEach((link) => {
        const path = new URL(link.href, location.origin).pathname;
        if (role === "admin" && isRegularUserPath(path)) link.hidden = true;
        else if (role === "user" && isAdminPath(path)) link.hidden = true;
        else link.hidden = false;
      });

      const account = header.querySelector(".header-account");
      if (account && role === "admin") {
        const avatar = account.querySelector("[data-header-profile]");
        if (avatar) avatar.hidden = true;
      }

      if (location.pathname === "/" && role === "admin") {
        const actions = document.querySelector(".home-hero .button-row");
        if (actions && !actions.querySelector("[data-admin-home-link]")) {
          const quickLink = uiElement("a", "btn btn-primary", "Buka Admin Dashboard");
          quickLink.href = "/admin-dashboard/";
          quickLink.dataset.adminHomeLink = "true";
          actions.append(quickLink);
        }
      } else {
        document.querySelector("[data-admin-home-link]")?.remove();
      }
      if (location.pathname === "/" && role === "admin") {
        document.querySelectorAll('.home-hero a[href^="/scan"], .home-cta a[href^="/scan"]').forEach((link) => {
          link.hidden = true;
        });
      }
    });
  }

  function protectPages() {
    const path = location.pathname;
    const publicPath = path === "/" || /^\/(login|register)\/?$/.test(path);
    if (currentRole === "guest" && !publicPath) {
      [uploadKey, recipeKey, recipeNoticeKey, moreRecipesKey, "nakena_preview_image", "nakena_guest_mode"]
        .forEach((key) => sessionStorage.removeItem(key));
      showAccessWarning(
        "Anda harus login terlebih dahulu untuk memindai bahan makanan dan membuat resep.",
        "/login/",
        "/login/",
      );
      return false;
    }
    if (currentRole === "user" && isAdminPath(path)) {
      showAccessWarning("Akses ditolak. Halaman ini hanya untuk Admin.", "/", "/");
      return false;
    }
    if (currentRole === "admin" && path !== "/" && !isAdminPath(path)) {
      showAccessWarning(
        "Akun Admin hanya dapat mengakses Beranda dan Admin Dashboard.",
        "/",
        "/",
      );
      return false;
    }
    document.body.style.visibility = "";
    return true;
  }

  function setupAccessNavigationGuard() {
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link || link.target === "_blank") return;
      let target;
      try {
        target = new URL(link.href, location.origin);
      } catch {
        return;
      }
      if (target.origin !== location.origin) return;
      const path = target.pathname;
      if (currentRole === "guest" && isRegularUserPath(path)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showAccessWarning(
          "Anda harus login terlebih dahulu untuk memindai bahan makanan dan membuat resep.",
          "/login/",
        );
      } else if (currentRole === "user" && isAdminPath(path)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showAccessWarning("Akses ditolak. Halaman Admin hanya tersedia untuk Admin.", "/");
      } else if (currentRole === "admin" && isRegularUserPath(path)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showAccessWarning("Akun Admin tidak diizinkan memproses gambar atau membuat resep.", "/");
      }
    }, true);
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
        const upload = await api("/uploads", { method: "POST", body: formData });
        const detection = await api(`/uploads/${upload.id}/detect`, { method: "POST" });
        const ingredientTypes = new Set(
          (Array.isArray(detection.detections) ? detection.detections : [])
            .map((item) => String(item.name || "").trim().toLocaleLowerCase("id-ID"))
            .filter(Boolean),
        );
        if (ingredientTypes.size > 3) {
          const shouldContinue = await confirmManyDetectedIngredients(ingredientTypes.size);
          if (!shouldContinue) {
            try {
              await api(`/uploads/${upload.id}`, { method: "DELETE" });
            } catch (error) {
              setNotice(`Foto lama tidak dapat dihapus: ${error.message}`);
            }
            sessionStorage.removeItem(uploadKey);
            sessionStorage.removeItem("nakena_preview_image");
            input.value = "";
            const cameraInput = document.getElementById("cameraInput");
            if (cameraInput) cameraInput.value = "";
            document.querySelector("#state-preview img")?.removeAttribute("src");
            window.switchState?.("upload");
            uploadInFlight = false;
            return;
          }
        }
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
      const key = String(detection.name || "").trim().toLocaleLowerCase("id-ID");
      if (!key) return;
      const previous = detectionsByName.get(key);
      if (!previous || detection.confidence > previous.confidence) {
        detectionsByName.set(key, detection);
      }
    });
    const detections = Array.from(detectionsByName.values())
      .sort((left, right) => right.confidence - left.confidence);
    upload.detections = detections;
    const ingredients = detections.map((detection) => detection.name);
    const confirmationForm = document.getElementById("ingredientsConfirmationForm");
    if (confirmationForm) confirmationForm.dataset.scanStatus = detections.length ? "detected" : "no_detections";
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
      : "Belum ada bahan yang terdeteksi. Silakan foto ulang.";
    if (ingredientList) ingredientList.classList.toggle("hidden", detections.length === 0);
    if (emptyState) {
      emptyState.classList.toggle("hidden", detections.length > 0);
      emptyState.classList.toggle("flex", detections.length === 0);
      const emptyMessage = emptyState.querySelector("p");
      if (emptyMessage) emptyMessage.textContent = "Foto ini mungkin bukan bahan makanan atau kurang jelas. Silakan foto ulang.";
    }
    const message = document.querySelector("#ingredientsConfirmationForm aside .text-slate-400");
    if (message) message.textContent = detections.length
      ? `${detections.length} objek bahan terdeteksi. Periksa hasilnya sebelum membuat resep.`
      : "Foto ini mungkin bukan bahan makanan atau kurang jelas. Silakan foto ulang.";
    const detectedBadge = document.querySelector("#ingredientsConfirmationForm aside .text-amber-400.text-xs.font-bold");
    if (detectedBadge) detectedBadge.textContent = `${detections.length} Bahan Terdeteksi`;
    if (!detections.length && confirmationForm) {
      emptyState?.classList.add("hidden");
      const controls = confirmationForm.querySelector(".confirmation-controls");
      if (controls) controls.hidden = true;
      const aside = confirmationForm.querySelector(".confirmation-layout > aside");
      if (aside && !aside.querySelector("[data-no-detections]")) {
        const warning = uiElement("section", "panel");
        warning.dataset.noDetections = "true";
        warning.setAttribute("role", "alert");
        const heading = uiElement("h2", "", "Bahan belum terdeteksi");
        const explanation = uiElement(
          "p",
          "muted",
          "Foto ini mungkin bukan bahan makanan atau kurang jelas. Gunakan cahaya yang cukup, foto bahan dengan jelas, lalu coba lagi. Jika lebih dari 3 jenis bahan terdeteksi, kamu tetap bisa memilih untuk melanjutkan.",
        );
        explanation.style.marginTop = "8px";
        const retake = uiElement("a", "btn btn-primary", "Foto ulang");
        retake.href = "/scan/";
        retake.style.marginTop = "16px";
        warning.append(heading, explanation, retake);
        aside.append(warning);
      }
    }
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
      if ((payload.diet || "").length > 300) return setNotice("Pilih pola makan dengan total nama maksimal 300 karakter.");
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
        setAuthItem(userNameKey, user.full_name);
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
    api("/users/me/preferences").then((preferences) => {
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
      if (preferences.preferred_cuisine) pick("cuisine_type", preferences.preferred_cuisine.toLowerCase() === "berkuah" ? "Kuah Hangat" : preferences.preferred_cuisine);
      if (preferences.default_servings) document.getElementById("servingsInput").value = String(preferences.default_servings);
      document.dispatchEvent(new Event("nakena:preferences-loaded"));
    }).catch(() => { /* The visible manual choices remain available if saved defaults cannot be loaded. */ });
    captureSubmit(form, async () => {
      if (form.dataset.scanStatus === "no_detections") {
        setNotice("Belum ada bahan yang terdeteksi. Silakan foto ulang dengan gambar bahan yang jelas.");
        return;
      }
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
      link.href = "/static/css/recipe_images.css?v=6";
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
    let imageUrl;
    try {
      const assetKey = String(photo.asset_key || "");
      const apiUrl = new URL(apiBaseUrl);
      const apiPath = apiUrl.pathname.replace(/\/+$/, "");
      imageUrl = new URL(`recipes/image/assets/${assetKey}`, `${apiBaseUrl}/`);
      valid = /^[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(assetKey)
        && imageUrl.origin === apiUrl.origin
        && imageUrl.pathname === `${apiPath}/recipes/image/assets/${assetKey}`;
    } catch {}
    if (photo.status !== "ok" || !valid) {
      fallback();
      return;
    }
    let sourceUrl;
    try { sourceUrl = new URL(photo.photo_url); } catch {}
    if (!sourceUrl || sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "pixabay.com") {
      fallback();
      return;
    }
    const source = document.createElement("a");
    source.href = sourceUrl.href;
    source.textContent = "Pixabay";
    source.target = "_blank";
    source.rel = "noopener";
    image.onload = async () => {
      try {
        if (typeof image.decode === "function") await image.decode();
      } catch {
        fallback();
        return;
      }
      if (image.dataset.recipePhotoKey !== key) return;
      credit.replaceChildren(
        document.createTextNode("Ilustrasi · Foto: " + (photo.photographer || "Kontributor") + " / "),
        source,
      );
      finishLoading("ready");
    };
    image.onerror = fallback;
    image.alt = photo.alt || ("Ilustrasi " + recipe.title);
    image.src = imageUrl.href;
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
    if (!raw?.text && !raw?.recipe_text) {
      try { raw = (await api("/recipes/history"))[0] || null; } catch (error) { setNotice(error.message); }
    }
    let generatedMore = false;
    if (new URLSearchParams(location.search).get("more") === "1") {
      const pending = storedJSON(moreRecipesKey);
      sessionStorage.removeItem(moreRecipesKey);
      history.replaceState(null, "", location.pathname);
      if (pending?.request && Array.isArray(pending.request.ingredients) && pending.request.ingredients.length) {
        const request = {
          ...pending.request,
          count: 5,
          exclude_titles: Array.isArray(pending.excludeTitles) ? pending.excludeTitles : [],
        };
        try {
          setNotice("Sedang menyiapkan 5 resep alternatif baru...");
          const result = await api("/recipes/generate", { method: "POST", body: JSON.stringify(request) });
          const saved = await saveGeneratedRecipes(result, request.ingredients, request.category);
          const excludedTitles = [...new Set([
            ...request.exclude_titles,
            ...saved.recipes.map((recipe) => recipe.title),
          ])];
          saved.recipes.forEach((recipe) => {
            recipe.request = pending.request;
            recipe.category = request.category;
            recipe.excludedTitles = excludedTitles;
          });
          raw = {
            ...saved.recipes[0],
            options: saved.recipes,
            request: pending.request,
            category: request.category,
            excludedTitles,
          };
          sessionStorage.setItem(recipeKey, JSON.stringify(raw));
          if (saved.errors.length) {
            sessionStorage.setItem(recipeNoticeKey, "Resep dibuat, tetapi belum semuanya tersimpan. " + saved.errors.join(" "));
          }
          generatedMore = true;
        } catch (error) {
          setNotice(`Resep alternatif belum dapat dibuat. ${error.message}`);
        }
      } else {
        setNotice("Data resep sebelumnya tidak tersedia. Silakan buat rekomendasi resep terlebih dahulu.");
      }
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
    try { (await api("/recipes/favorites")).forEach((item) => favorites.set(item.title, item)); updateSavedCount(favorites.size); }
    catch (error) { setNotice(error.message); }
    const favorite = async (recipe, button) => {
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
    if (new URLSearchParams(location.search).get("review") === "saved") {
      setNotice("Review tersimpan. Berikut resep alternatif yang sudah direkomendasikan.", true);
      history.replaceState(null, "", `${location.pathname}${location.hash}`);
      if (!otherSection.hidden) otherSection.scrollIntoView({ block: "start" });
    }
    if (generatedMore && !otherSection.hidden) otherSection.scrollIntoView({ block: "start" });
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
    const description = document.querySelector(".page-banner p");
    if (description) description.textContent = "Di sini hanya ada resep yang sudah selesai kamu masak.";
    document.getElementById("historyTypeFilter")?.remove();
    const emptyDescription = document.querySelector("#emptyState p");
    if (emptyDescription) emptyDescription.textContent = "Resep yang selesai dimasak akan muncul di sini.";
    let history;
    try { history = await api("/recipes/history"); }
    catch (error) { status.textContent = "Riwayat belum dapat dimuat."; setNotice(error.message); return; }
    const summary = document.getElementById("historySummary");
    summary.append(uiElement("span", "small-badge", `${history.length} resep dimasak`));
    const records = [];
    history.forEach((entry) => {
      const recipe = normalizeRecipe(entry);
      const node = recipeCard(recipe, { label: `SUDAH DIMASAK · ${dateLabel(entry.created_at)}` });
      const rating = Number(entry.review?.rating);
      if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
        const body = node.querySelector(".recipe-card-body");
        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
        body?.append(uiElement("span", "small-badge", `Rating kamu: ${rating}/5 · ${stars}`));
        if (entry.review.comment) body?.append(uiElement("p", "muted", entry.review.comment));
      }
      grid.append(node); records.push({ recipe, node, kind: "recipe", created: entry.created_at });
    });
    status.hidden = true; bindCollectionFilters(records, grid, document.getElementById("emptyState"));
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
    button.disabled = true;
    try { const favorites = await api("/recipes/favorites"); favorite = favorites.find((entry) => entry.title === recipe.title); updateSavedCount(favorites.length); update(); }
    catch (error) { setNotice(error.message); }
    finally { button.disabled = false; }
    button.addEventListener("click", async () => {
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
    document.getElementById("show-more-recipes-btn")?.addEventListener("click", (event) => {
      event.preventDefault();
      const originalRequest = recipe.request || {};
      const ingredients = Array.isArray(originalRequest.ingredients)
        ? originalRequest.ingredients
        : Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      if (!ingredients.length) {
        setNotice("Bahan resep sebelumnya tidak tersedia untuk membuat alternatif.");
        return;
      }
      const options = Array.isArray(recipe.options) ? recipe.options : [recipe];
      const excludeTitles = [...new Set([
        ...(Array.isArray(recipe.excludedTitles) ? recipe.excludedTitles : []),
        ...options.map((item) => item.title),
        recipe.title,
      ].filter((title) => typeof title === "string" && title.trim()))];
      const request = {
        ingredients,
        preferences: originalRequest.preferences || "",
        allergies: Array.isArray(originalRequest.allergies) ? originalRequest.allergies : [],
        servings: originalRequest.servings || 2,
        category: originalRequest.category || recipe.category || "Rumahan",
      };
      sessionStorage.setItem(moreRecipesKey, JSON.stringify({ request, excludeTitles }));
      location.assign("/recipes/?more=1");
    });
    const parsed = parseRecipeContent(recipeText, recipe.ingredients);
    const instructions = recipeInstructions(parsed, recipe.title);
    window.addEventListener("nakena:save-cooked-recipe", async (event) => {
      const resolve = event.detail?.resolve;
      if (typeof resolve !== "function") return;
      try {
        const entryId = String(recipe.id || "");
        const saved = entryId.startsWith("pending-")
          ? await api("/recipes/history/complete", {
            method: "POST",
            body: JSON.stringify({
              title: recipe.title,
              recipe_text: recipeText,
              ingredients: recipe.ingredients,
            }),
          })
          : await api(`/recipes/history/${encodeURIComponent(entryId)}/complete`, { method: "POST" });
        recipe.id = saved.id;
        recipe.is_history = true;
        recipe.createdAt = saved.created_at;
        sessionStorage.setItem(recipeKey, JSON.stringify(recipe));
        resolve({ success: true });
      } catch (error) {
        const message = error.status === 404 && error.message === "Not Found"
          ? "Backend server belum diperbarui untuk menyimpan resep yang selesai. Perbarui backend lalu coba lagi."
          : error.message;
        resolve({ success: false, message });
      }
    });
    window.addEventListener("nakena:submit-cooking-review", async (event) => {
      const rating = Number(event.detail?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        window.dispatchEvent(new CustomEvent("nakena:cooking-review-error", {
          detail: { message: "Pilih rating bintang dari 1 sampai 5." },
        }));
        return;
      }
      try {
        await api(`/recipes/history/${encodeURIComponent(recipe.id)}/review`, {
          method: "POST",
          body: JSON.stringify({
            rating,
            comment: String(event.detail?.comment || "").trim(),
          }),
        });
        window.dispatchEvent(new CustomEvent("nakena:cooking-review-saved"));
      } catch (error) {
        window.dispatchEvent(new CustomEvent("nakena:cooking-review-error", {
          detail: { message: error.message },
        }));
      }
    });
    window.dispatchEvent(new CustomEvent("nakena:guided-recipe", {
      detail: {
        title: recipe.title || "Resep pilihanmu",
        instructions,
        ingredientGroups: parsed.sections.filter((item) => item.kind === "ingredients")
          .map((item) => ({ label: item.label, items: item.items })),
        time: parsed.time,
        tips: parsed.sections.filter((item) => item.kind === "tips").map((item) => item.text),
        id: recipe.id,
      },
    }));
  }

  function renderProfileAvatar(avatar, user = {}) {
    if (!avatar) return;
    const fullName = [user.full_name, getAuthItem(userNameKey), getAuthItem(emailKey), "NakEna"]
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
      setAuthItem(userNameKey, String(user.full_name || ""));
      renderProfileAvatar(avatar, user);
      window.dispatchEvent(new CustomEvent("nakena:auth-changed", {
        detail: { authenticated: true, fullName: user.full_name || "", email: user.email || "" },
      }));
    } catch (error) {
      if (location.pathname.startsWith("/profile/")) setNotice(error.message);
    }
  }

  async function setupAdminDashboard() {
    if (!isAdminPath(location.pathname)) return;
    const main = document.querySelector("main");
    if (!main) return;
    main.classList.add("hidden");
    try {
      const user = await api("/users/me");
      if (user.role !== "admin") {
        showAccessWarning("Akses ditolak. Halaman ini hanya untuk Admin.", "/", "/");
        return;
      }
      main.replaceChildren();
      const section = document.createElement("section");
      section.className = "admin-dashboard-shell";

      const header = document.createElement("div");
      header.className = "admin-dashboard-header";
      const titleGroup = document.createElement("div");
      const heading = document.createElement("h1");
      heading.textContent = "Dashboard Admin";
      const detail = document.createElement("p");
      detail.textContent = "Pantau pertumbuhan pengguna, resep, dan pengalaman memasak.";
      titleGroup.append(heading, detail);

      const refreshButton = document.createElement("button");
      refreshButton.type = "button";
      refreshButton.className = "admin-refresh-button";
      refreshButton.textContent = "Perbarui data";
      const exportButton = document.createElement("button");
      exportButton.type = "button";
      exportButton.className = "admin-export-button";
      exportButton.disabled = true;
      const exportIcon = document.createElement("span");
      exportIcon.className = "material-symbols-outlined";
      exportIcon.setAttribute("aria-hidden", "true");
      exportIcon.textContent = "download";
      exportButton.append(exportIcon, document.createTextNode("Ekspor CSV"));
      const headerActions = document.createElement("div");
      headerActions.className = "admin-dashboard-actions";
      headerActions.append(exportButton, refreshButton);
      header.append(titleGroup, headerActions);

      const status = document.createElement("p");
      status.className = "admin-dashboard-status";
      status.setAttribute("role", "status");
      const analyticsStatus = document.createElement("p");
      analyticsStatus.className = "admin-dashboard-status";
      analyticsStatus.setAttribute("role", "status");

      const statsGrid = document.createElement("div");
      statsGrid.className = "admin-stats-grid";
      const chartsGrid = document.createElement("div");
      chartsGrid.className = "admin-charts-grid";
      const makePanel = (title, description = "") => {
        const panel = document.createElement("section");
        panel.className = "admin-dashboard-card";
        const panelHeading = document.createElement("div");
        panelHeading.className = "admin-card-heading";
        const panelTitle = document.createElement("h2");
        panelTitle.textContent = title;
        panelHeading.append(panelTitle);
        if (description) {
          const panelDescription = document.createElement("p");
          panelDescription.textContent = description;
          panelHeading.append(panelDescription);
        }
        panel.append(panelHeading);
        return panel;
      };
      const makeView = (id, title, description) => {
        const view = document.createElement("section");
        view.id = id;
        view.className = "admin-view";
        view.hidden = id !== "admin-view-overview";
        const viewHeading = document.createElement("div");
        viewHeading.className = "admin-view-heading";
        const viewTitle = document.createElement("h2");
        viewTitle.textContent = title;
        const viewDescription = document.createElement("p");
        viewDescription.textContent = description;
        viewHeading.append(viewTitle, viewDescription);
        view.append(viewHeading);
        return view;
      };
      const makeReadOnlyTable = (headers) => {
        const wrap = document.createElement("div");
        wrap.className = "admin-users-table-wrap";
        const table = document.createElement("table");
        table.className = "admin-users-table admin-data-table";
        const head = document.createElement("thead");
        const row = document.createElement("tr");
        headers.forEach((label) => {
          const cell = document.createElement("th");
          cell.scope = "col";
          cell.textContent = label;
          row.append(cell);
        });
        head.append(row);
        const body = document.createElement("tbody");
        table.append(head, body);
        wrap.append(table);
        return { wrap, body };
      };
      const addTableRow = (body, values) => {
        const row = document.createElement("tr");
        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = String(value);
          row.append(cell);
        });
        body.append(row);
      };

      const activityPanel = makePanel("Aktivitas 7 hari", "Pengguna baru dan resep yang tersimpan.");
      const activityChart = document.createElement("div");
      activityChart.className = "admin-activity-chart";
      activityPanel.append(activityChart);
      const activityLegend = document.createElement("div");
      activityLegend.className = "admin-chart-legend";
      [["Pengguna baru", "user"], ["Resep tersimpan", "recipe"]].forEach(([label, kind]) => {
        const item = document.createElement("span");
        item.className = "admin-legend-item";
        const marker = document.createElement("i");
        marker.className = `admin-legend-marker is-${kind}`;
        item.append(marker, document.createTextNode(label));
        activityLegend.append(item);
      });
      activityPanel.append(activityLegend);
      chartsGrid.append(activityPanel);

      const ratingPanel = makePanel("Distribusi rating", "Jumlah review pada setiap nilai bintang.");
      const ratingChart = document.createElement("div");
      ratingChart.className = "admin-rating-chart";
      ratingPanel.append(ratingChart);
      chartsGrid.append(ratingPanel);

      const reviewPanel = makePanel("Review terbaru", "Komentar yang diberikan pengguna setelah memasak.");
      reviewPanel.classList.add("admin-reviews-panel");
      const reviewList = document.createElement("div");
      reviewList.className = "admin-review-list";
      reviewPanel.append(reviewList);

      const usersHeading = document.createElement("div");
      usersHeading.className = "admin-users-heading";
      const usersTitle = document.createElement("h2");
      usersTitle.textContent = "Daftar Pengguna";
      const usersDescription = document.createElement("p");
      usersDescription.textContent = "Kelola akun pengguna yang terdaftar.";
      usersHeading.append(usersTitle, usersDescription);

      const tableWrap = document.createElement("div");
      tableWrap.className = "admin-users-table-wrap";
      const table = document.createElement("table");
      table.className = "admin-users-table";
      const tableHead = document.createElement("thead");
      const headRow = document.createElement("tr");
      ["Nama", "Email", "Role", "Terdaftar", "Aksi"].forEach((label) => {
        const cell = document.createElement("th");
        cell.scope = "col";
        cell.textContent = label;
        headRow.append(cell);
      });
      tableHead.append(headRow);
      const tableBody = document.createElement("tbody");
      table.append(tableHead, tableBody);
      tableWrap.append(table);

      const overviewView = makeView(
        "admin-view-overview",
        "Ringkasan",
        "Ringkasan data yang tersimpan pada NakEna.",
      );
      overviewView.append(statsGrid, chartsGrid);

      const detectionView = makeView(
        "admin-view-detection-monitoring",
        "Pemantauan Scan Bahan",
        "Status pemindaian dan unggahan terbaru dari pengguna.",
      );
      const uploadStatusGrid = document.createElement("div");
      uploadStatusGrid.className = "admin-upload-status-grid";
      const uploadTable = makeReadOnlyTable(["Waktu", "Nama file", "Pengguna", "Status", "Foto"]);
      detectionView.append(uploadStatusGrid, uploadTable.wrap);

      const recipeView = makeView(
        "admin-view-recipe-monitoring",
        "Pemantauan Resep",
        "Resep yang baru disimpan pengguna.",
      );
      const recipeTable = makeReadOnlyTable(["Waktu", "Resep", "Pengguna"]);
      recipeView.append(recipeTable.wrap);

      const userView = makeView(
        "admin-view-user-activity",
        "Aktivitas Pengguna",
        "Akun pengguna dan tanggal mereka bergabung.",
      );
      userView.append(usersHeading, status, tableWrap);

      const feedbackView = makeView(
        "admin-view-feedback",
        "Feedback Pengguna",
        "Review yang diberikan setelah pengguna menyelesaikan resep.",
      );
      feedbackView.append(reviewPanel);

      const logsView = makeView(
        "admin-view-system-logs",
        "System Logs",
        "Log teknis belum disimpan oleh aplikasi saat ini.",
      );
      const logsEmpty = document.createElement("p");
      logsEmpty.className = "admin-empty-state admin-logs-empty";
      logsEmpty.textContent = "Belum ada log sistem yang tersedia untuk ditampilkan.";
      logsView.append(logsEmpty);

      const imageDialog = document.createElement("dialog");
      imageDialog.className = "admin-image-dialog";
      const imageDialogContent = document.createElement("div");
      imageDialogContent.className = "admin-image-dialog-content";
      const imageDialogHeader = document.createElement("div");
      imageDialogHeader.className = "admin-image-dialog-header";
      const imageDialogTitle = document.createElement("h2");
      imageDialogTitle.textContent = "Foto unggahan";
      const closeImageButton = document.createElement("button");
      closeImageButton.type = "button";
      closeImageButton.className = "admin-image-close";
      closeImageButton.textContent = "Tutup";
      closeImageButton.addEventListener("click", () => imageDialog.close());
      imageDialogHeader.append(imageDialogTitle, closeImageButton);
      const imageStatus = document.createElement("p");
      imageStatus.className = "admin-image-status";
      imageStatus.setAttribute("role", "status");
      const imagePreview = document.createElement("img");
      imagePreview.className = "admin-upload-preview";
      imagePreview.alt = "Pratinjau foto bahan yang diunggah pengguna";
      imagePreview.hidden = true;
      imageDialogContent.append(imageDialogHeader, imageStatus, imagePreview);
      imageDialog.append(imageDialogContent);

      const pagination = document.createElement("div");
      pagination.className = "admin-pagination";
      const pageLabel = document.createElement("span");
      const previousButton = document.createElement("button");
      previousButton.type = "button";
      previousButton.className = "admin-page-button";
      previousButton.textContent = "Sebelumnya";
      const nextButton = document.createElement("button");
      nextButton.type = "button";
      nextButton.className = previousButton.className;
      nextButton.textContent = "Berikutnya";
      const pageActions = document.createElement("div");
      pageActions.className = "admin-page-actions";
      pageActions.append(previousButton, nextButton);
      pagination.append(pageLabel, pageActions);
      userView.append(pagination);
      section.append(header, analyticsStatus, overviewView, detectionView, recipeView, userView, feedbackView, logsView, imageDialog);
      main.append(section);
      main.classList.remove("hidden");

      const adminViews = new Map([
        ["overview", overviewView],
        ["detection-monitoring", detectionView],
        ["recipe-monitoring", recipeView],
        ["user-activity", userView],
        ["feedback", feedbackView],
        ["system-logs", logsView],
      ]);
      const operationsNav = [...document.querySelectorAll("aside nav")].find(
        (nav) => nav.querySelector('a[data-path="overview"]'),
      );
      if (operationsNav) {
        const activeClasses = (operationsNav.dataset.activeClasses || "").split(/\s+/).filter(Boolean);
        const operationLinks = [...operationsNav.querySelectorAll("a[data-path]")];
        const activateAdminView = (key, updateHistory = true) => {
          const activeView = adminViews.get(key);
          if (!activeView) return;
          adminViews.forEach((view) => { view.hidden = view !== activeView; });
          operationLinks.forEach((link) => {
            link.classList.remove(...activeClasses);
            link.removeAttribute("aria-current");
            if (link.dataset.path === key) {
              link.classList.add(...activeClasses);
              link.setAttribute("aria-current", "page");
            }
          });
          if (updateHistory) history.replaceState(null, "", `#${key}`);
        };
        operationLinks.forEach((link) => {
          if (!adminViews.has(link.dataset.path)) return;
          link.href = `#${link.dataset.path}`;
          link.setAttribute("aria-controls", adminViews.get(link.dataset.path).id);
          link.addEventListener("click", (event) => {
            event.preventDefault();
            activateAdminView(link.dataset.path);
          });
        });
        activateAdminView(location.hash.slice(1) || "overview", false);
      }

      const pageSize = 50;
      let offset = 0;
      let loading = false;
      let currentPageCount = 0;
      let dashboardData = null;
      let imageObjectUrl = null;
      const clearImagePreview = () => {
        if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
        imageObjectUrl = null;
        imagePreview.removeAttribute("src");
        imagePreview.hidden = true;
      };
      imageDialog.addEventListener("close", clearImagePreview);
      const openUploadImage = async (upload) => {
        clearImagePreview();
        imageDialogTitle.textContent = upload.filename;
        imageStatus.textContent = "Memuat foto…";
        imageDialog.showModal();
        try {
          const headers = new Headers();
          const accessToken = token();
          if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
          const response = await fetch(
            `${apiBaseUrl}/admin/uploads/${encodeURIComponent(upload.id)}/image`,
            { headers },
          );
          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const detail = data?.detail;
            throw new Error(typeof detail === "string" ? detail : "Foto tidak dapat dimuat.");
          }
          const blob = await response.blob();
          if (!["image/jpeg", "image/png"].includes(blob.type)) {
            throw new Error("Respons server bukan file gambar yang didukung.");
          }
          if (!imageDialog.open) return;
          imageObjectUrl = URL.createObjectURL(blob);
          imagePreview.src = imageObjectUrl;
          imagePreview.hidden = false;
          imageStatus.textContent = `Unggahan oleh ${upload.user_name} (${upload.user_email}).`;
        } catch (error) {
          imageStatus.textContent = `Foto tidak dapat dibuka: ${error.message}`;
        }
      };
      const renderAnalytics = (data) => {
        const totals = data.totals;
        const metrics = [
          ["Pengguna", totals.users, "Akun pengguna terdaftar", "users"],
          ["Resep", totals.recipes, "Resep tersimpan di riwayat", "recipes"],
          ["Review", totals.reviews, "Ulasan dari hasil memasak", "reviews"],
          ["Scan", totals.uploads, "Foto bahan yang diunggah", "uploads"],
          ["Rata-rata rating", `${Number(totals.average_rating).toFixed(1)} / 5`, "Dari seluruh review", "rating"],
        ];
        statsGrid.replaceChildren();
        metrics.forEach(([label, value, caption, kind]) => {
          const card = document.createElement("article");
          card.className = "admin-stat-card";
          card.classList.add(`is-${kind}`);
          const cardLabel = document.createElement("span");
          cardLabel.className = "admin-stat-label";
          cardLabel.textContent = label;
          const cardValue = document.createElement("strong");
          cardValue.className = "admin-stat-value";
          cardValue.textContent = String(value);
          const cardCaption = document.createElement("span");
          cardCaption.className = "admin-stat-caption";
          cardCaption.textContent = caption;
          card.append(cardLabel, cardValue, cardCaption);
          statsGrid.append(card);
        });

        const svgNs = "http://www.w3.org/2000/svg";
        const svgElement = (tag, attributes = {}, text = "") => {
          const element = document.createElementNS(svgNs, tag);
          Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, String(value)));
          if (text) element.textContent = text;
          return element;
        };
        const dailyActivity = data.daily_activity || [];
        const chart = svgElement("svg", {
          viewBox: "0 0 720 235",
          role: "img",
          "aria-label": "Grafik aktivitas pengguna baru dan resep selama tujuh hari",
        });
        const maxValue = Math.max(1, ...dailyActivity.flatMap((day) => [day.users, day.recipes]));
        [0, 0.5, 1].forEach((ratio) => {
          const y = 174 - ratio * 126;
          chart.append(svgElement("line", { x1: 34, y1: y, x2: 706, y2: y, class: "admin-chart-gridline" }));
          if (ratio > 0) {
            chart.append(svgElement("text", { x: 25, y: y + 4, class: "admin-chart-axis-label", "text-anchor": "end" }, String(Math.ceil(maxValue * ratio))));
          }
        });
        dailyActivity.forEach((day, index) => {
          const x = 56 + index * 94;
          const date = new Date(`${day.date}T12:00:00`);
          const label = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("id-ID", { weekday: "short" });
          [
            { value: day.users, x, className: "admin-chart-bar is-user" },
            { value: day.recipes, x: x + 27, className: "admin-chart-bar is-recipe" },
          ].forEach((bar) => {
            const height = bar.value ? Math.max(4, (bar.value / maxValue) * 126) : 0;
            chart.append(svgElement("rect", {
              x: bar.x,
              y: 174 - height,
              width: 19,
              height,
              rx: 5,
              class: bar.className,
            }));
          });
          chart.append(svgElement("text", { x: x + 23, y: 204, class: "admin-chart-day-label", "text-anchor": "middle" }, label));
        });
        activityChart.replaceChildren(chart);

        const ratingCounts = data.rating_distribution || [];
        const maxRatingCount = Math.max(1, ...ratingCounts.map((item) => item.count));
        ratingChart.replaceChildren();
        ratingCounts.slice().reverse().forEach((item) => {
          const row = document.createElement("div");
          row.className = "admin-rating-row";
          const label = document.createElement("span");
          label.className = "admin-rating-label";
          label.textContent = `${item.rating} ★`;
          const track = document.createElement("div");
          track.className = "admin-rating-track";
          const fill = document.createElement("span");
          fill.className = "admin-rating-fill";
          fill.style.width = `${(item.count / maxRatingCount) * 100}%`;
          track.append(fill);
          const count = document.createElement("span");
          count.className = "admin-rating-count";
          count.textContent = String(item.count);
          row.append(label, track, count);
          ratingChart.append(row);
        });

        uploadStatusGrid.replaceChildren();
        const statusLabels = {
          uploaded: "Menunggu deteksi",
          detected: "Bahan terdeteksi",
          no_detections: "Tidak terdeteksi",
          failed: "Gagal",
        };
        (data.upload_status_counts || []).forEach((item) => {
          const statusCard = document.createElement("div");
          statusCard.className = "admin-upload-status";
          const statusCount = document.createElement("strong");
          statusCount.textContent = String(item.count);
          const statusName = document.createElement("span");
          statusName.textContent = statusLabels[item.status] || item.status;
          statusCard.append(statusCount, statusName);
          uploadStatusGrid.append(statusCard);
        });
        uploadTable.body.replaceChildren();
        if (!data.recent_uploads.length) {
          const row = document.createElement("tr");
          const cell = document.createElement("td");
          cell.colSpan = 5;
          cell.className = "admin-table-empty";
          cell.textContent = "Belum ada unggahan bahan.";
          row.append(cell);
          uploadTable.body.append(row);
        } else {
          data.recent_uploads.forEach((upload) => {
            const row = document.createElement("tr");
            [
              dateLabel(upload.created_at),
              upload.filename,
              `${upload.user_name} (${upload.user_email})`,
              statusLabels[upload.status] || upload.status,
            ].forEach((value) => {
              const cell = document.createElement("td");
              cell.textContent = value;
              row.append(cell);
            });
            const actionCell = document.createElement("td");
            const openButton = document.createElement("button");
            openButton.type = "button";
            openButton.className = "admin-view-upload-button";
            openButton.textContent = "Lihat foto";
            openButton.setAttribute("aria-label", `Lihat foto ${upload.filename}`);
            openButton.addEventListener("click", () => openUploadImage(upload));
            actionCell.append(openButton);
            row.append(actionCell);
            uploadTable.body.append(row);
          });
        }

        recipeTable.body.replaceChildren();
        if (!data.recent_recipes.length) {
          const row = document.createElement("tr");
          const cell = document.createElement("td");
          cell.colSpan = 3;
          cell.className = "admin-table-empty";
          cell.textContent = "Belum ada resep yang tersimpan.";
          row.append(cell);
          recipeTable.body.append(row);
        } else {
          data.recent_recipes.forEach((recipe) => {
            addTableRow(recipeTable.body, [
              dateLabel(recipe.created_at),
              recipe.title,
              `${recipe.user_name} (${recipe.user_email})`,
            ]);
          });
        }

        reviewList.replaceChildren();
        if (!data.recent_reviews.length) {
          const empty = document.createElement("p");
          empty.className = "admin-empty-state";
          empty.textContent = "Belum ada review dari pengguna.";
          reviewList.append(empty);
          return;
        }
        data.recent_reviews.forEach((review) => {
          const item = document.createElement("article");
          item.className = "admin-review-item";
          const details = document.createElement("div");
          details.className = "admin-review-details";
          const identity = document.createElement("div");
          identity.className = "admin-review-identity";
          const name = document.createElement("strong");
          name.textContent = review.user_name;
          const email = document.createElement("span");
          email.textContent = review.user_email;
          identity.append(name, email);
          const recipe = document.createElement("p");
          recipe.className = "admin-review-recipe";
          recipe.textContent = `Resep: ${review.recipe_title}`;
          details.append(identity, recipe);

          const rating = document.createElement("div");
          rating.className = "admin-review-rating";
          rating.setAttribute("aria-label", `Rating ${review.rating} dari 5`);
          rating.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`;
          const date = document.createElement("time");
          date.className = "admin-review-date";
          date.dateTime = review.created_at;
          date.textContent = dateLabel(review.created_at);
          const comment = document.createElement("p");
          comment.className = "admin-review-comment";
          comment.textContent = review.comment || "Pengguna tidak menambahkan komentar.";
          item.append(details, rating, date, comment);
          reviewList.append(item);
        });
      };
      const loadDashboardAnalytics = async () => {
        analyticsStatus.textContent = "Memuat statistik dan review…";
        try {
          const data = await api("/admin/dashboard");
          dashboardData = data;
          exportButton.disabled = false;
          renderAnalytics(data);
          analyticsStatus.textContent = "Statistik diperbarui dari data tersimpan.";
        } catch (error) {
          analyticsStatus.textContent = `Statistik tidak dapat dimuat: ${error.message}`;
        }
      };
      const exportDashboardCsv = () => {
        if (!dashboardData) return;
        const rows = [
          ["Kategori", "Metrik", "Nilai", "Tanggal"],
          ["Ringkasan", "Pengguna", dashboardData.totals.users, ""],
          ["Ringkasan", "Resep", dashboardData.totals.recipes, ""],
          ["Ringkasan", "Review", dashboardData.totals.reviews, ""],
          ["Ringkasan", "Scan", dashboardData.totals.uploads, ""],
          ["Ringkasan", "Rata-rata rating", dashboardData.totals.average_rating, ""],
        ];
        dashboardData.daily_activity.forEach((day) => {
          rows.push(
            ["Aktivitas harian", "Pengguna baru", day.users, day.date],
            ["Aktivitas harian", "Resep tersimpan", day.recipes, day.date],
          );
        });
        dashboardData.rating_distribution.forEach((rating) => {
          rows.push(["Distribusi rating", `${rating.rating} bintang`, rating.count, ""]);
        });
        dashboardData.upload_status_counts.forEach((upload) => {
          rows.push(["Status scan", upload.status, upload.count, ""]);
        });

        const csv = rows
          .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
          .join("\r\n");
        const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = `nakena-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      };
      const loadUsers = async () => {
        if (loading) return;
        loading = true;
        previousButton.disabled = nextButton.disabled = true;
        status.textContent = "Memuat daftar pengguna…";
        try {
          const users = await api(`/admin/users?limit=${pageSize}&offset=${offset}`);
          currentPageCount = users.length;
          tableBody.replaceChildren();
          users.forEach((listedUser) => {
            const row = document.createElement("tr");
            row.className = "bg-surface-container-lowest/40";
            const nameCell = document.createElement("td");
            nameCell.className = "px-4 py-4 font-medium text-on-surface";
            nameCell.textContent = listedUser.full_name;
            const emailCell = document.createElement("td");
            emailCell.className = "px-4 py-4 text-on-surface-variant";
            emailCell.textContent = listedUser.email;
            const roleCell = document.createElement("td");
            roleCell.className = "px-4 py-4 text-on-surface-variant";
            roleCell.textContent = listedUser.role;
            const dateCell = document.createElement("td");
            dateCell.className = "px-4 py-4 text-on-surface-variant";
            const createdAt = new Date(listedUser.created_at);
            dateCell.textContent = Number.isNaN(createdAt.getTime()) ? "-" : createdAt.toLocaleDateString("id-ID");
            const actionCell = document.createElement("td");
            actionCell.className = "px-4 py-4";
            if (listedUser.role === "admin" || listedUser.id === user.id) {
              const protectedLabel = document.createElement("span");
              protectedLabel.className = "text-xs text-on-surface-variant";
              protectedLabel.textContent = listedUser.id === user.id ? "Akun Anda" : "Admin dilindungi";
              actionCell.append(protectedLabel);
            } else {
              const deleteButton = document.createElement("button");
              deleteButton.type = "button";
              deleteButton.className = "rounded-lg bg-error-container/30 px-3 py-2 text-xs font-semibold text-error hover:bg-error-container/60 disabled:opacity-50";
              deleteButton.textContent = "Hapus";
              deleteButton.addEventListener("click", async () => {
                if (!window.confirm(`Hapus akun ${listedUser.full_name} (${listedUser.email})? Data akun, resep, dan upload terkait akan ikut dihapus.`)) return;
                deleteButton.disabled = true;
                try {
                  await api(`/admin/users/${listedUser.id}`, { method: "DELETE" });
                  status.textContent = `Akun ${listedUser.email} berhasil dihapus.`;
                  if (currentPageCount === 1 && offset > 0) offset -= pageSize;
                  await loadUsers();
                } catch (error) {
                  status.textContent = error.message;
                  deleteButton.disabled = false;
                }
              });
              actionCell.append(deleteButton);
            }
            row.append(nameCell, emailCell, roleCell, dateCell, actionCell);
            tableBody.append(row);
          });
          status.textContent = users.length
            ? `Menampilkan ${offset + 1}–${offset + users.length} pengguna pada halaman ini.`
            : offset === 0 ? "Belum ada pengguna terdaftar." : "Tidak ada pengguna pada halaman ini.";
          pageLabel.textContent = `Halaman ${Math.floor(offset / pageSize) + 1}`;
          previousButton.disabled = offset === 0;
          nextButton.disabled = users.length < pageSize;
        } catch (error) {
          tableBody.replaceChildren();
          status.textContent = `Gagal memuat daftar pengguna: ${error.message}`;
          pageLabel.textContent = `Halaman ${Math.floor(offset / pageSize) + 1}`;
          previousButton.disabled = offset === 0;
          nextButton.disabled = true;
        } finally {
          loading = false;
        }
      };
      const refreshDashboard = async () => {
        refreshButton.disabled = true;
        await Promise.all([loadDashboardAnalytics(), loadUsers()]);
        refreshButton.disabled = false;
      };
      refreshButton.addEventListener("click", refreshDashboard);
      exportButton.addEventListener("click", exportDashboardCsv);
      previousButton.addEventListener("click", () => {
        offset = Math.max(0, offset - pageSize);
        loadUsers();
      });
      nextButton.addEventListener("click", () => {
        offset += pageSize;
        loadUsers();
      });
      await Promise.all([loadDashboardAnalytics(), loadUsers()]);
    } catch (error) {
      setNotice(error.message);
    }
  }

  function setupLogout() {
    const clearSession = () => {
      [tokenKey, emailKey, userNameKey, userRoleKey].forEach(removeAuthItem);
      [uploadKey, recipeKey, recipeNoticeKey, moreRecipesKey, "nakena_preview_image", "nakena_guest_mode"]
        .forEach((key) => sessionStorage.removeItem(key));
      currentRole = "guest";
      currentUser = null;
      window.dispatchEvent(new CustomEvent("nakena:auth-changed", {
        detail: { authenticated: false, role: "guest" },
      }));
    };
    document.addEventListener("click", (event) => {
      const button = event.target.closest?.('[data-action="logout"], a[data-path="logout"]');
      if (button) {
        event.preventDefault();
        clearSession();
        location.assign(window.NakEnaTts ? "/login/" : "/");
      }
    });
    document.querySelector("#logout-modal a[data-path='beranda']")?.addEventListener("click", (event) => {
      event.preventDefault();
      clearSession();
      location.assign(window.NakEnaTts ? "/login/" : "/");
    });
  }

  async function initialize() {
    setPageLinks();
    setupAuth();
    setupHeaderAccount();
    setupAccessNavigationGuard();
    setupLogout();

    if (token()) {
      try {
        currentUser = await api("/users/me", { quietAccessFailure: true });
        currentRole = currentUser.role;
        setAuthItem(userRoleKey, currentRole);
        setAuthItem(userNameKey, currentUser.full_name || "");
        window.dispatchEvent(new CustomEvent("nakena:auth-changed", {
          detail: {
            authenticated: true,
            role: currentRole,
            fullName: currentUser.full_name,
            email: currentUser.email,
          },
        }));
      } catch (error) {
        if (error.status === 401) {
          currentRole = "guest";
          currentUser = null;
        } else {
          document.body.style.visibility = "hidden";
          showAccessWarning(
            "Sesi belum dapat diverifikasi. Periksa koneksi backend lalu masuk kembali.",
            "/login/",
          );
          return;
        }
      }
    } else {
      currentRole = "guest";
      currentUser = null;
      removeAuthItem(userRoleKey);
      [uploadKey, recipeKey, recipeNoticeKey, moreRecipesKey, "nakena_preview_image", "nakena_guest_mode"]
        .forEach((key) => sessionStorage.removeItem(key));
    }

    if (window.NakEnaTts && currentRole !== "guest" && /^\/login\/?$/.test(location.pathname)) {
      location.replace(currentRole === "admin" ? "/admin-dashboard/" : "/scan/");
      return;
    }

    configureRoleNavigation(currentRole);
    if (!protectPages()) return;
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
  }

  initialize().catch((error) => {
    document.body.style.visibility = "";
    showAccessWarning(`Gagal memuat halaman: ${error.message}`, "/");
  });
})();
