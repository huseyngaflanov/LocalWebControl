const form = document.getElementById('admin-form');
const statusEl = document.getElementById('admin-status');
const dbSelect = document.getElementById('db-select');
const tableHead = document.getElementById('db-table-head');
const tableBody = document.getElementById('db-table-body');

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

function renderTable(data) {
  if (!tableHead || !tableBody) {
    return;
  }
  tableHead.innerHTML = '';
  tableBody.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    const emptyHead = document.createElement('th');
    emptyHead.textContent = 'empty';
    tableHead.appendChild(emptyHead);

    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.textContent = 'No rows available.';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
    return;
  }

  const columns = Array.from(
    data.reduce((acc, row) => {
      if (row && typeof row === 'object') {
        Object.keys(row).forEach((key) => acc.add(key));
      }
      return acc;
    }, new Set())
  );

  if (columns.length === 0) {
    const emptyHead = document.createElement('th');
    emptyHead.textContent = 'empty';
    tableHead.appendChild(emptyHead);
    return;
  }

  columns.forEach((col) => {
    const th = document.createElement('th');
    th.textContent = col;
    tableHead.appendChild(th);
  });

  data.forEach((row) => {
    const tr = document.createElement('tr');
    columns.forEach((col) => {
      const td = document.createElement('td');
      const value = row && typeof row === 'object' ? row[col] : '';
      td.textContent = value === undefined ? '' : String(value);
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
}

async function fetchDatabases() {
  if (!requireAdminWord()) {
    return [];
  }
  const response = await fetch('/api/admin/databases', {
    headers: { 'X-Admin-Word': adminWord },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    setStatus(payload.error || 'Unable to load databases.');
    if (response.status === 403) {
      sessionStorage.removeItem(ADMIN_WORD_KEY);
      adminWord = '';
    }
    return [];
  }
  return Array.isArray(payload.databases) ? payload.databases : [];
}

async function fetchDatabaseData(name) {
  if (!requireAdminWord()) {
    return;
  }
  const response = await fetch(`/api/admin/databases/${encodeURIComponent(name)}`, {
    headers: { 'X-Admin-Word': adminWord },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    setStatus(payload.error || 'Unable to load database.');
    if (response.status === 403) {
      sessionStorage.removeItem(ADMIN_WORD_KEY);
      adminWord = '';
    }
    return;
  }
  renderTable(payload.data);
}

async function initDatabases() {
  if (!dbSelect) {
    return;
  }
  const databases = await fetchDatabases();
  dbSelect.innerHTML = '';
  databases.forEach((name) => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    dbSelect.appendChild(option);
  });
  if (databases.length > 0) {
    dbSelect.value = databases[0];
    await fetchDatabaseData(databases[0]);
  } else {
    renderTable([]);
  }
}

dbSelect?.addEventListener('change', async (event) => {
  const selected = event.target.value;
  if (selected) {
    await fetchDatabaseData(selected);
  }
});

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
    await fetchDatabaseData('users');
  } catch (error) {
    setStatus('Network error. Please try again.');
  }
});

initDatabases();
