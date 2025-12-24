const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const port = 3000;

const USERS_PATH = path.join(__dirname, 'data', 'users.json');
const ADMIN_WORD = process.env.ADMIN_WORD || 'letmein';
const DATA_DIR = path.join(__dirname, 'data');

async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeUsers(users) {
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
}

async function signInUser(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const users = await readUsers();
  const user = users.find((entry) => String(entry.email || '').toLowerCase() === normalizedEmail);
  if (!user) {
    return null;
  }
  if (String(user.password || '') !== String(password || '')) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

// Middleware to parse JSON bodies
app.use(express.json());

// host htmls in public folder
app.use(express.static('public'));

app.post('/api/sign-in', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await signInUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to sign in.' });
  }
});

app.post('/api/admin/users', async (req, res) => {
  try {
    const adminWord = req.header('x-admin-word');
    if (adminWord !== ADMIN_WORD) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const users = await readUsers();
    const exists = users.some(
      (entry) => String(entry.email || '').toLowerCase() === normalizedEmail
    );
    if (exists) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    const newUser = {
      id: Date.now().toString(36),
      email: String(email).trim(),
      password: String(password),
      name: name ? String(name).trim() : '',
    };

    users.push(newUser);
    await writeUsers(users);
    return res.status(201).json({ user: { id: newUser.id, email: newUser.email, name: newUser.name } });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to add user.' });
  }
});

app.get('/api/admin/databases', async (req, res) => {
  try {
    const adminWord = req.header('x-admin-word');
    if (adminWord !== ADMIN_WORD) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const files = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const databases = files
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => entry.name.replace(/\.json$/, ''));
    return res.json({ databases });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load databases.' });
  }
});

app.get('/api/admin/databases/:name', async (req, res) => {
  try {
    const adminWord = req.header('x-admin-word');
    if (adminWord !== ADMIN_WORD) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
    const rawName = String(req.params.name || '').trim();
    if (!/^[a-z0-9_-]+$/i.test(rawName)) {
      return res.status(400).json({ error: 'Invalid database name.' });
    }
    const filePath = path.join(DATA_DIR, `${rawName}.json`);
    const raw = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(raw);
    return res.json({ data });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Database not found.' });
    }
    return res.status(500).json({ error: 'Unable to load database.' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

module.exports = app;
