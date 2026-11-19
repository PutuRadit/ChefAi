(() => {
  const sidebar = document.getElementById("adminSidebar");
  const toggle = document.getElementById("adminMenuToggle");
  const backdrop = document.getElementById("adminSidebarBackdrop");

  if (!sidebar || !toggle || !backdrop) {
    return;
  }

  const mobileViewport = window.matchMedia("(max-width: 900px)");
  const icon = toggle.querySelector(".material-symbols-outlined");

  const setMenuOpen = (isOpen, restoreFocus = true) => {
    sidebar.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("admin-menu-open", isOpen);
    backdrop.hidden = !isOpen;
    sidebar.inert = mobileViewport.matches && !isOpen;
    sidebar.setAttribute("aria-hidden", String(mobileViewport.matches && !isOpen));
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Tutup navigasi" : "Buka navigasi");

    if (icon) {
      icon.textContent = isOpen ? "close" : "menu";
    }

    if (isOpen) {
      const firstLink = sidebar.querySelector("a[href]");
      if (firstLink) firstLink.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  };

  toggle.addEventListener("click", () => {
    setMenuOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  backdrop.addEventListener("click", () => setMenuOpen(false));

  sidebar.addEventListener("click", (event) => {
    if (mobileViewport.matches && event.target.closest("a[href]")) {
      setMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!sidebar.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      setMenuOpen(false);
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = sidebar.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  mobileViewport.addEventListener("change", () => setMenuOpen(false, false));

  setMenuOpen(false, false);
})();
