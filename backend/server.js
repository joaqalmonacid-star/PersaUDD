const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ollacomun-dev-secret-change-me';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '20kb' }));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]', 'utf8');

function readUsers() {
    try {
        const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('No se pudo leer users.json:', err.message);
        return [];
    }
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        carrera: user.carrera || '',
        createdAt: user.createdAt
    };
}

function tokenFor(user) {
    return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    try {
        req.auth = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ollacomun-auth' }));

app.post('/api/register', (req, res) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const carrera = String(body.carrera || '').trim();

    if (name.length < 2) return res.status(400).json({ error: 'Ingresa tu nombre' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Ingresa un correo válido' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const users = readUsers();
    if (users.some(u => u.email === email)) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const user = {
        id: crypto.randomUUID(),
        name,
        email,
        carrera,
        passwordHash: bcrypt.hashSync(password, 10),
        createdAt: new Date().toISOString()
    };
    users.push(user);
    writeUsers(users);

    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!EMAIL_RE.test(email) || !password) {
        return res.status(400).json({ error: 'Ingresa correo y contraseña' });
    }

    const user = readUsers().find(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    res.json({ token: tokenFor(user), user: publicUser(user) });
});

app.get('/api/me', requireAuth, (req, res) => {
    const user = readUsers().find(u => u.id === req.auth.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: publicUser(user) });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`OllaComun auth API escuchando en puerto ${PORT}`);
});
