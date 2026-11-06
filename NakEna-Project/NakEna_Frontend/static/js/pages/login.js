function togglePasswordVisibility() {
    const pwdInput = document.getElementById('id_password');
    const eyeIcon = document.getElementById('password-eye-icon');
    if (!pwdInput || !eyeIcon) return;

    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      eyeIcon.textContent = 'visibility_off';
    } else {
      pwdInput.type = 'password';
      eyeIcon.textContent = 'visibility';
    }
  }
