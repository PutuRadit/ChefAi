(() => {
  const passwordInput = document.getElementById('id_password');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const eyeIcon = document.getElementById('eyeIcon');

  togglePasswordBtn?.addEventListener('click', () => {
    const isPassword = passwordInput?.type === 'password';
    if (passwordInput) passwordInput.type = isPassword ? 'text' : 'password';
    if (eyeIcon) eyeIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
  });
})();
