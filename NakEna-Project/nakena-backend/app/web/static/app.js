const TOKEN_KEY = "nakena_access_token";
const USER_KEY = "nakena_user_email";

function readSession() {
  return {
    token: sessionStorage.getItem(TOKEN_KEY),
    email: sessionStorage.getItem(USER_KEY),
  };
}

function updateAuthLinks() {
  const { token } = readSession();
  document.querySelectorAll("[data-auth-link]").forEach((link) => {
    if (token) {
      link.textContent = "Akun saya";
      link.setAttribute("href", "/login");
    }
  });
}

function showSignedInState(container, email) {
  container.innerHTML = `
    <div class="signed-in">
      <span class="signed-in-mark" aria-hidden="true">✓</span>
      <span class="section-kicker">LOGIN BERHASIL</span>
      <h2>Halo, selamat datang.</h2>
      <p>Kamu masuk sebagai <strong></strong>. Sesi login ini tersimpan di tab browser ini.</p>
      <a class="button button-dark" href="/">Kembali ke beranda <span aria-hidden="true">↗</span></a>
      <br>
      <button class="signout-button" type="button">Keluar dari akun</button>
    </div>
  `;
  container.querySelector("strong").textContent = email;
  container.querySelector(".signout-button").addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    window.location.reload();
  });
}

function showLoginForm() {
  const form = document.querySelector("#login-form");
  if (!form) return;

  const container = document.querySelector("#login-content");
  const { token, email } = readSession();
  if (token && email) {
    showSignedInState(container, email);
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    const message = document.querySelector("#login-message");
    const formData = new FormData(form);
    const emailValue = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    button.disabled = true;
    message.textContent = "";
    message.classList.remove("success");

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? "Periksa kembali format email dan password."
          : data.detail;
        throw new Error(detail || "Login gagal. Silakan coba lagi.");
      }
      if (!data.access_token) throw new Error("Server tidak mengirim token login.");

      sessionStorage.setItem(TOKEN_KEY, data.access_token);
      sessionStorage.setItem(USER_KEY, emailValue);
      showSignedInState(container, emailValue);
      updateAuthLinks();
    } catch (error) {
      message.textContent = error instanceof TypeError
        ? "Tidak dapat menghubungi server. Pastikan backend masih berjalan."
        : error.message;
      button.disabled = false;
    }
  });
}

updateAuthLinks();
showLoginForm();
