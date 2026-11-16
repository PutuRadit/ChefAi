(() => {
  'use strict';

  const header = document.querySelector('.site-header');
  const menuButton = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  const desktop = window.matchMedia('(min-width: 1024px)');
  const links = [...document.querySelectorAll('header nav a[href^="#"]')];
  const sections = ['beranda', 'cara-kerja', 'fitur', 'testimoni', 'tentang']
    .map((id) => document.getElementById(id)).filter(Boolean);

  // Use the existing authentication session and profile request from api.js.
  // No extra profile request or separate login state is needed on the home page.
  function syncAccount(identity = {}) {
    const authenticated = identity.authenticated ?? Boolean(sessionStorage.getItem('nakena_access_token'));
    const fullName = String(identity.fullName || sessionStorage.getItem('nakena_user_name') || '').trim();
    const userEmail = identity.email || sessionStorage.getItem('nakena_user_email') || '';
    const displayName = fullName || userEmail.split('@')[0] || 'Profil';
    const words = displayName.match(/[\p{L}\p{N}]+/gu) || [];
    const initial = words.length
      ? (Array.from(words[0])[0] + (words.length > 1 ? Array.from(words.at(-1))[0] : '')).toLocaleUpperCase('id-ID')
      : 'U';

    document.querySelectorAll('[data-home-auth]').forEach((element) => {
      element.hidden = authenticated;
    });
    document.querySelectorAll('[data-home-profile]').forEach((element) => {
      element.hidden = !authenticated;
      element.setAttribute('aria-label', `Buka profil ${displayName}`);
      element.title = displayName;
    });
    document.querySelectorAll('[data-home-profile-initial]').forEach((element) => {
      element.textContent = initial;
    });
    document.querySelectorAll('[data-home-profile-name]').forEach((element) => {
      element.textContent = displayName;
    });
  }
  window.addEventListener('nakena:auth-changed', (event) => syncAccount(event.detail));
  window.addEventListener('pageshow', () => syncAccount());
  window.addEventListener('focus', () => syncAccount());
  syncAccount();

  function setMenu(open, restoreFocus = false) {
    if (!menu || !menuButton) return;
    menu.hidden = !open;
    menu.classList.toggle('hidden', !open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
    if (restoreFocus) menuButton.focus();
  }
  menuButton?.addEventListener('click', () => setMenu(menu.hidden));
  menu?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu && !menu.hidden) setMenu(false, true);
  });
  document.addEventListener('click', (event) => {
    if (menu && !menu.hidden && header && !header.contains(event.target)) setMenu(false);
  });
  desktop.addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });

  function updateNavigation() {
    header?.classList.toggle('is-scrolled', window.scrollY > 20);
    let activeId = sections[0]?.id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 160) activeId = section.id;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      activeId = sections.at(-1)?.id;
    }
    for (const link of links) {
      const active = link.hash === `#${activeId}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  let pendingFrame = false;
  function scheduleUpdate() {
    if (pendingFrame) return;
    pendingFrame = true;
    window.requestAnimationFrame(() => {
      updateNavigation();
      pendingFrame = false;
    });
  }
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  updateNavigation();
  document.querySelectorAll('[data-current-year]').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
})();
