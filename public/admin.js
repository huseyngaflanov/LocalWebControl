const form = document.getElementById('admin-form');
const statusEl = document.getElementById('admin-status');

const ADMIN_WORD_KEY = 'admin_word';
let adminWord = sessionStorage.getItem(ADMIN_WORD_KEY) || '';

function requireAdminWord() {
  if (adminWord) {
    return true;
  }
  const entered = window.prompt('Enter admin access word:');
  if (!entered) {
    setStatus('Access denied.');
    return false;
  }
  adminWord = entered.trim();
  sessionStorage.setItem(ADMIN_WORD_KEY, adminWord);
  return true;
}

function setStatus(message) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('');

  if (!requireAdminWord()) {
    return;
  }

  const email = form.email?.value?.trim();
  const password = form.password?.value || '';
  const name = form.name?.value?.trim() || '';

  if (!email || !password) {
    setStatus('Email and password are required.');
    return;
  }

  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Word': adminWord },
      body: JSON.stringify({ email, password, name }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setStatus(payload.error || 'Unable to add user.');
      if (response.status === 403) {
        sessionStorage.removeItem(ADMIN_WORD_KEY);
        adminWord = '';
      }
      return;
    }

    form.reset();
    setStatus('User created.');
  } catch (error) {
    setStatus('Network error. Please try again.');
  }
});
