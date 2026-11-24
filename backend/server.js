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
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'administracionollacomun@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'OllaComun';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

if (!BREVO_API_KEY) {
    console.warn('BREVO_API_KEY no configurada: el registro no enviará correo de confirmación.');
}

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

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

async function sendWelcomeEmail(user) {
    if (!BREVO_API_KEY) return { sent: false, reason: 'BREVO_API_KEY no configurada' };

    const siteUrl = 'https://joaqalmonacid-star.github.io/PersaUDD/';
    const safeName = escapeHtml(user.name);
    const htmlContent = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#000027;line-height:1.6">
            <h1 style="color:#00295b;font-size:26px;margin:0 0 16px">¡Bienvenido/a a OllaComun, ${safeName}!</h1>
            <p>Tu cuenta se creó correctamente. Ya puedes entrar con tu correo y contraseña.</p>
            <p style="margin:24px 0">
                <a href="${siteUrl}" style="background:#00295b;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">Ir a OllaComun</a>
            </p>
            <p style="color:#005f02"><strong>Recuerda:</strong> OllaComun es solo para estudiantes de la universidad. Sin pagos en línea, sin productos prohibidos y 0% comisión.</p>
            <hr style="border:none;border-top:1px solid #dddddd;margin:28px 0 12px">
            <p style="font-size:12px;color:#666666">Recibiste este correo porque te registraste en OllaComun. ${escapeHtml(BREVO_SENDER_EMAIL)}</p>
        </div>`;
    const textContent = `¡Bienvenido/a a OllaComun, ${user.name}! Tu cuenta se creó correctamente. Ingresa en ${siteUrl} para comenzar.`;

    try {
        const response = await fetch(BREVO_API_URL, {
            method: 'POST',
            headers: {
                'api-key': BREVO_API_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL },
                to: [{ email: user.email, name: user.name }],
                subject: '¡Bienvenido/a a OllaComun! 🎉',
                htmlContent,
                textContent
            })
        });

        if (!response.ok) {
            const detail = await response.text();
            console.error('Brevo rechazó el correo de confirmación:', response.status, detail);
            return { sent: false, reason: 'Brevo respondió ' + response.status };
        }

        return { sent: true };
    } catch (err) {
        console.error('Error al enviar correo de confirmación:', err.message);
        return { sent: false, reason: err.message };
    }
}

app.get('/health', (req, res) => res.json({
    status: 'ok',
    service: 'ollacomun-auth',
    brevoConfigured: Boolean(BREVO_API_KEY),
    sender: BREVO_SENDER_EMAIL
}));

app.post('/api/register', async (req, res) => {
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

    const emailResult = await sendWelcomeEmail(user);
    res.status(201).json({ token: tokenFor(user), user: publicUser(user), emailSent: emailResult.sent });
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
