/* Login and register motion. Form logic lives in /static/js/api.js and
   /static/js/app_ui.js; this file only watches the page and adds feedback. */
(() => {
  'use strict';
  const card = document.querySelector('.auth-card');
  if (!card) return;

  const restartClass = (element, name) => {
    element.classList.remove(name);
    void element.offsetWidth; // restart the animation
    element.classList.add(name);
  };

  // Shake the card each time an error is shown, even if the text repeats.
  const errorBox = card.querySelector('.form-error');
  if (errorBox) {
    new MutationObserver(() => {
      if (!errorBox.classList.contains('hidden')) restartClass(card, 'is-shaking');
    }).observe(errorBox, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true, characterData: true });
  }

  // Register only: live password checklist matching the rules in api.js.
  const form = document.getElementById('registerForm');
  const password = form?.querySelector('input[name=password]');
  const confirm = form?.querySelector('input[name=password_confirm]');
  const email = form?.querySelector('input[name=email]');
  if (!form || !password || !confirm) return;

  const rules = [
    ['length', '8–64 karakter', (value) => value.length >= 8 && value.length <= 64],
    ['upper', 'Huruf besar', (value) => /[A-Z]/.test(value)],
    ['lower', 'Huruf kecil', (value) => /[a-z]/.test(value)],
    ['digit', 'Angka', (value) => /[0-9]/.test(value)],
    ['email', 'Tidak sama dengan email', (value) =>
      value.length > 0 && value.toLowerCase() !== String(email?.value || '').trim().toLowerCase()],
  ];

  const wrapper = document.createElement('div');
  wrapper.className = 'password-rules';
  wrapper.id = 'password-rules';
  const list = document.createElement('ul');
  list.setAttribute('aria-label', 'Syarat kata sandi');
  const items = rules.map(([key, label]) => {
    const item = document.createElement('li');
    item.dataset.rule = key;
    item.textContent = label;
    list.append(item);
    return item;
  });
  wrapper.append(list);
  password.closest('.field')?.after(wrapper);
  password.setAttribute('aria-describedby', wrapper.id);

  const match = document.createElement('p');
  match.className = 'password-match';
  match.setAttribute('aria-live', 'polite');
  match.hidden = true;
  confirm.closest('.field')?.after(match);

  const update = () => {
    const value = password.value;
    rules.forEach(([, , test], index) => items[index].classList.toggle('is-met', test(value)));
    wrapper.classList.toggle('is-active', document.activeElement === password || value.length > 0);
    const typed = confirm.value.length > 0;
    match.hidden = !typed;
    const same = typed && confirm.value === value;
    match.classList.toggle('is-met', same);
    match.classList.toggle('is-mismatch', typed && !same);
    match.textContent = same ? 'Kata sandi cocok' : 'Kata sandi belum cocok';
  };
  [password, confirm, email].forEach((input) => input?.addEventListener('input', update));
  password.addEventListener('focus', update);
  password.addEventListener('blur', update);
  update();
})();
