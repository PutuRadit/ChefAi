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
  const scanTip = document.querySelector('.scan-panel .tip-line p');
  if (scanTip) scanTip.textContent = 'Gunakan cahaya yang cukup dan beri jarak antar bahan. Disarankan scan maksimal 3 jenis bahan agar hasil lebih akurat.';
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
  if (camera) camera.accept = 'image/*';
  let cameraStream = null;
  const cameraButton = document.querySelector('[data-open-camera]');
  const cameraDialog = document.createElement('dialog');
  cameraDialog.className = 'scan-camera-dialog';
  cameraDialog.setAttribute('aria-labelledby', 'scanCameraTitle');
  cameraDialog.innerHTML = '<div class="scan-camera-dialog__content"><h2 id="scanCameraTitle">Ambil foto bahan</h2><video autoplay playsinline muted aria-label="Pratinjau kamera"></video><p class="scan-camera-dialog__message" role="status">Arahkan kamera ke bahan makanan.</p><div class="button-row"><button type="button" class="btn btn-secondary" data-camera-cancel>Batal</button><button type="button" class="btn btn-primary" data-camera-capture>Ambil foto</button></div></div>';
  document.body.append(cameraDialog);
  const cameraVideo = cameraDialog.querySelector('video');
  const cameraMessage = cameraDialog.querySelector('.scan-camera-dialog__message');
  const captureButton = cameraDialog.querySelector('[data-camera-capture]');
  const stopCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    cameraStream = null;
    cameraVideo.srcObject = null;
  };
  window.addEventListener('pagehide', stopCamera, { once: true });
  cameraDialog.addEventListener('close', stopCamera);
  cameraDialog.querySelector('[data-camera-cancel]').addEventListener('click', () => cameraDialog.close());
  captureButton.addEventListener('click', () => {
    if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) {
      cameraMessage.textContent = 'Kamera belum siap. Coba lagi sebentar.';
      return;
    }
    captureButton.disabled = true;
    const scale = Math.min(1, 2000 / Math.max(cameraVideo.videoWidth, cameraVideo.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cameraVideo.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(cameraVideo.videoHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      captureButton.disabled = false;
      cameraMessage.textContent = 'Kamera tidak dapat mengambil foto. Coba lagi.';
      return;
    }
    context.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) {
        captureButton.disabled = false;
        cameraMessage.textContent = 'Foto tidak berhasil dibuat. Coba ambil ulang.';
        return;
      }
      cameraDialog.close();
      setFile(new File([blob], 'foto-bahan.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
  cameraButton?.addEventListener('click', async event => {
    event.stopPropagation();
    if (!navigator.mediaDevices?.getUserMedia) {
      camera?.click();
      return;
    }
    cameraMessage.textContent = 'Meminta izin kamera…';
    if (!cameraDialog.open) cameraDialog.showModal();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1600 },
          height: { ideal: 1200 },
        },
      });
      if (!cameraDialog.open) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      cameraStream = stream;
      cameraVideo.srcObject = cameraStream;
      cameraMessage.textContent = 'Arahkan kamera ke bahan, lalu tekan Ambil foto.';
    } catch {
      cameraDialog.close();
      notice('Kamera tidak dapat dibuka. Izinkan akses kamera atau pilih foto dari galeri.');
      camera?.click();
    }
  });
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
