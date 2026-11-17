(() => {
  'use strict';
  document.querySelectorAll('[data-password-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const input = button.closest('.input-wrap')?.querySelector('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      button.setAttribute('aria-pressed', String(show));
    });
  });
  const next = new URLSearchParams(location.search).get('next');
  if (next?.startsWith('/') && !next.startsWith('//')) {
    document.querySelectorAll('[data-auth-switch]').forEach(link => {
      const url = new URL(link.href, location.origin);
      url.searchParams.set('next', next);
      link.href = url.pathname + url.search;
    });
  }
  function syncChoices() {
    document.querySelectorAll('.choice-chip').forEach(chip => {
      const input = chip.querySelector('input');
      const path = chip.querySelector('svg path');
      if (input && path) path.setAttribute('d', input.checked ? 'm5 12 4 4L19 6' : 'M12 5v14M5 12h14');
    });
  }
  document.addEventListener('change', event => { if (event.target.closest?.('.choice-chip')) syncChoices(); });
  document.addEventListener('nakena:preferences-loaded', syncChoices);
  syncChoices();
  const input = document.getElementById('fileInput');
  if (!input) return;
  window.switchState = (name) => {
    ['upload', 'preview', 'loading'].forEach(key => {
      document.getElementById('state-' + key)?.classList.toggle('hidden', key !== name);
    });
  };
  const validFile = file => file && ['image/jpeg', 'image/png'].includes(file.type) && file.size <= 5 * 1024 * 1024;
  const notice = message => {
    const box = document.getElementById('appNotice');
    box.textContent = message; box.hidden = false; box.classList.add('is-error');
  };
  const setFile = file => {
    if (!validFile(file)) { notice('Pilih foto JPG atau PNG dengan ukuran maksimal 5 MB.'); return; }
    const transfer = new DataTransfer(); transfer.items.add(file); input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  document.querySelectorAll('[data-open-upload]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); input.click(); }));
  const camera = document.getElementById('cameraInput');
  document.querySelector('[data-open-camera]')?.addEventListener('click', event => { event.stopPropagation(); camera.click(); });
  camera?.addEventListener('change', () => { if (camera.files[0]) setFile(camera.files[0]); });
  const drop = document.getElementById('dropzone');
  drop?.addEventListener('click', event => { if (!event.target.closest('button')) input.click(); });
  drop?.addEventListener('keydown', event => { if (event.target === drop && ['Enter', ' '].includes(event.key)) { event.preventDefault(); input.click(); } });
  ['dragenter', 'dragover'].forEach(name => drop?.addEventListener(name, event => { event.preventDefault(); drop.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach(name => drop?.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('is-dragging'); if (name === 'drop') setFile(event.dataTransfer.files[0]); }));
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    if (!validFile(file)) { input.value = ''; notice('Pilih foto JPG atau PNG dengan ukuran maksimal 5 MB.'); window.switchState('upload'); return; }
    document.getElementById('appNotice').hidden = true;
    window.switchState('preview');
  });
  document.querySelector('[data-reset-scan]')?.addEventListener('click', () => { input.value = ''; camera.value = ''; window.switchState('upload'); });
})();
