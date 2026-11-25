/* Scan page motion. Interactive UI: /static/js/app_ui.js. Backend integration: /static/js/api.js. */
(() => {
  'use strict';

  const states = {
    upload: document.getElementById('state-upload'),
    preview: document.getElementById('state-preview'),
    loading: document.getElementById('state-loading'),
  };
  if (!states.upload || !states.preview || !states.loading) return;

  const speech = document.querySelector('[data-scan-speech]');
  const messages = {
    upload: speech?.textContent.trim() || 'Foto bahanmu. Kita cari ide masakannya.',
    preview: 'Fotonya sudah siap. Tekan Scan bahan kalau sudah pas.',
    loading: 'Sebentar ya, aku sedang mengenali bahannya.',
  };
  const previewImage = states.preview.querySelector('img');
  const visualImage = states.loading.querySelector('[data-scan-visual]');
  let current = 'upload';

  const visibleState = () =>
    Object.keys(states).find((name) => !states[name].classList.contains('hidden')) || 'upload';

  const say = (text) => {
    if (!speech || speech.textContent === text) return;
    speech.textContent = text;
    speech.classList.remove('is-talking');
    void speech.offsetWidth; // restart the animation
    speech.classList.add('is-talking');
  };

  const sync = () => {
    const next = visibleState();
    if (next === current) return;
    current = next;
    if (next === 'loading' && visualImage) {
      const source = previewImage?.getAttribute('src');
      if (source) visualImage.src = source;
      states.loading.classList.toggle('has-image', Boolean(source));
    }
    say(messages[next]);
  };

  const observer = new MutationObserver(sync);
  Object.values(states).forEach((element) => {
    observer.observe(element, { attributes: true, attributeFilter: ['class'] });
  });
})();
