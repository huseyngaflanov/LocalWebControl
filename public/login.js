const form = document.getElementById('login-form');
const errorEl = document.getElementById('login-error');

function setError(message) {
  if (!errorEl) {
    return;
  }
  errorEl.textContent = message;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setError('');

  const email = form.email?.value?.trim();
  const password = form.password?.value || '';

  if (!email || !password) {
    setError('Email and password are required.');
    return;
  }

  try {
    const response = await fetch('/api/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error || 'Unable to sign in.');
      return;
    }

    localStorage.setItem('user', JSON.stringify(payload.user));
    window.location.href = '/index.html';
  } catch (error) {
    setError('Network error. Please try again.');
  }
});
