const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const store = require('./store');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ollacomun-dev-secret-change-me';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'administracionollacomun@gmail.com';
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || 'OllaComun';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const CAREERS = ['Arquitectura', 'Ingeniería', 'Salud', 'Medicina', 'Ing. Comercial', 'Derecho', 'Educación', 'Otra'];
const TYPES = ['Libros y guías', 'Calculadoras', 'Material de maqueta', 'Batas y laboratorio', 'Cables y tecnología', 'Instrumentos de dibujo', 'Otro'];
const FUNCTIONS = ['Estudio', 'Laboratorio', 'Taller', 'Uso diario', 'Otro'];
const STATUSES = ['disponible', 'reservado', 'vendido', 'no_disponible'];
const IMAGES = ['calculadora.jpg', 'reglas.jpg', 'libro.jpg', 'bata.jpg', 'cables.jpg', 'instrumentos.jpg'];
const ADMIN_EMAIL = 'joaq.almonacid@gmail.com';
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 1.6 * 1024 * 1024;

const SAMPLE_PRODUCTS = [
    {
        name: 'Calculadora Casio fx-991',
        description: 'Calculadora científica en excelente estado, usada solo en Cálculo I. Incluye funda.',
        price: 12000, carrera: 'Ingeniería', tipo: 'Calculadoras', funcionalidad: 'Estudio',
        place: 'Patio Central', image: 'calculadora.jpg', status: 'disponible'
    },
    {
        name: 'Set reglas + bisturí de maqueta',
        description: 'Kit completo de taller: regla escala, bisturí y cuchillas nuevas. Poco uso.',
        price: 8500, carrera: 'Arquitectura', tipo: 'Material de maqueta', funcionalidad: 'Taller',
        place: 'Taller de Arquitectura', image: 'reglas.jpg', status: 'reservado'
    },
    {
        name: 'Libro Cálculo I · Stewart',
        description: 'Edición internacional, sin subrayados. Ideal para el próximo semestre.',
        price: 15000, carrera: 'Ingeniería', tipo: 'Libros y guías', funcionalidad: 'Estudio',
        place: 'Biblioteca Central', image: 'libro.jpg', status: 'disponible'
    },
    {
        name: 'Bata de laboratorio',
        description: 'Bata blanca talla M, lavada y en buen estado. Lista para usar.',
        price: 9000, carrera: 'Salud', tipo: 'Batas y laboratorio', funcionalidad: 'Laboratorio',
        place: 'Facultad de Salud', image: 'bata.jpg', status: 'disponible'
    },
    {
        name: 'Cables y adaptadores',
        description: 'Set de cables USB-C, HDMI y adaptador. Funcionando perfectamente.',
        price: 6000, carrera: 'Ingeniería', tipo: 'Cables y tecnología', funcionalidad: 'Uso diario',
        place: 'Patio Central', image: 'cables.jpg', status: 'disponible'
    },
    {
        name: 'Set de instrumentos de dibujo',
        description: 'Compás, escuadras y lápices. Todo en buen estado para el próximo año.',
        price: 11000, carrera: 'Arquitectura', tipo: 'Instrumentos de dibujo', funcionalidad: 'Taller',
        place: 'Taller de Arquitectura', image: 'instrumentos.jpg', status: 'reservado'
    }
];

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '12mb' }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function normalizeImages(value, fallbackImage) {
    const raw = Array.isArray(value) ? value : [];
    if (raw.length > MAX_PHOTOS) return { error: `Máximo ${MAX_PHOTOS} fotos por producto` };

    const images = [];
    for (const item of raw) {
        const str = String(item || '');
        if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(str)) {
            return { error: 'Las fotos deben ser imágenes JPG, PNG o WebP' };
        }
        const bytes = Buffer.byteLength(str.split(',')[1], 'base64');
        if (bytes > MAX_PHOTO_BYTES) return { error: 'Cada foto debe pesar menos de 1.5 MB' };
        images.push(str);
    }

    return { images, image: images[0] || fallbackImage || IMAGES[0] };
}

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        apellido: user.apellido,
        email: user.email,
        carrera: user.carrera,
        telefono: user.telefono,
        createdAt: user.createdAt,
        isAdmin: user.email === ADMIN_EMAIL
    };
}

function publicProduct(product) {
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        carrera: product.carrera,
        tipo: product.tipo,
        funcionalidad: product.funcionalidad,
        place: product.place,
        image: product.image,
        images: Array.isArray(product.images) ? product.images : [],
        status: product.status,
        ownerId: product.ownerId,
        ownerName: product.ownerName,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
    };
}

async function sellerForProduct(product) {
    const owner = product.ownerId ? await store.findUserById(product.ownerId) : null;
    if (owner) {
        return {
            id: owner.id,
            email: owner.email,
            name: [owner.name, owner.apellido].filter(Boolean).join(' '),
            carrera: owner.carrera || ''
        };
    }
    return {
        id: product.ownerId || null,
        email: null,
        name: product.ownerName || 'Comunidad OllaComun',
        carrera: product.ownerCarrera || 'Comunidad UDD'
    };
}

function publicProductDetail(product, seller) {
    const { ownerId, ownerName, ...rest } = publicProduct(product);
    return {
        ...rest,
        seller: { name: seller.name, carrera: seller.carrera, isDemo: !seller.email }
    };
}

function adminProduct(product, owner) {
    const sellerName = owner
        ? [owner.name, owner.apellido].filter(Boolean).join(' ')
        : (product.ownerName || 'Comunidad OllaComun');
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        carrera: product.carrera,
        tipo: product.tipo,
        funcionalidad: product.funcionalidad,
        place: product.place,
        status: product.status,
        image: product.image,
        images: Array.isArray(product.images) ? product.images : [],
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        seller: {
            name: sellerName,
            email: owner ? owner.email : null,
            telefono: owner ? owner.telefono : null,
            carrera: owner ? owner.carrera : (product.ownerCarrera || '')
        }
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

function isAdminEmail(email) {
    return String(email || '').toLowerCase() === ADMIN_EMAIL;
}

function requireAdmin(req, res, next) {
    requireAuth(req, res, async () => {
        try {
            const user = await store.findUserById(req.auth.sub);
            if (!user || !isAdminEmail(user.email)) {
                return res.status(403).json({ error: 'No autorizado' });
            }
            req.admin = user;
            next();
        } catch (err) {
            next(err);
        }
    });
}

function validateProfile(body) {
    const data = {
        name: String(body.name || '').trim(),
        apellido: String(body.apellido || '').trim(),
        email: String(body.email || '').trim().toLowerCase(),
        carrera: String(body.carrera || '').trim(),
        telefono: String(body.telefono || '').trim()
    };
    if (data.name.length < 2) return { error: 'Ingresa tu nombre' };
    if (data.apellido.length < 2) return { error: 'Ingresa tu apellido' };
    if (!EMAIL_RE.test(data.email)) return { error: 'Ingresa un correo válido' };
    if (data.email !== ADMIN_EMAIL && !data.email.endsWith('@udd.cl')) {
        return { error: 'Debes usar tu correo institucional @udd.cl' };
    }
    if (data.carrera.length < 2) return { error: 'Ingresa tu carrera' };
    if (data.telefono.length < 6) return { error: 'Ingresa tu teléfono' };
    return { data };
}

async function sendWelcomeEmail(user) {
    if (!BREVO_API_KEY) return { sent: false, reason: 'BREVO_API_KEY no configurada' };

    const siteUrl = 'https://joaqalmonacid-star.github.io/PersaUDD/';
    const htmlContent = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#000027;line-height:1.6">
            <h1 style="color:#00295b;font-size:26px;margin:0 0 16px">¡Bienvenido/a a OllaComun, ${escapeHtml(user.name)} ${escapeHtml(user.apellido)}!</h1>
            <p>Tu cuenta se creó correctamente. Ya puedes buscar productos, publicar los tuyos y actualizar tu perfil.</p>
            <p style="margin:24px 0">
                <a href="${siteUrl}" style="background:#00295b;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block">Ir a OllaComun</a>
            </p>
            <p style="color:#005f02"><strong>Recuerda:</strong> OllaComun es solo para estudiantes de la universidad. Sin pagos en línea, sin productos prohibidos y 0% comisión.</p>
            <hr style="border:none;border-top:1px solid #dddddd;margin:28px 0 12px">
            <p style="font-size:12px;color:#666666">Recibiste este correo porque te registraste en OllaComun. ${escapeHtml(BREVO_SENDER_EMAIL)}</p>
        </div>`;
    const textContent = `¡Bienvenido/a a OllaComun, ${user.name} ${user.apellido}! Tu cuenta se creó correctamente. Ingresa en ${siteUrl} para comenzar.`;

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
                to: [{ email: user.email, name: user.name + ' ' + user.apellido }],
                subject: '¡Bienvenido/a a OllaComun! 🎉',
                htmlContent,
                textContent
            })
        });

        if (!response.ok) {
            console.error('Brevo rechazó el correo de confirmación:', response.status, await response.text());
            return { sent: false, reason: 'Brevo respondió ' + response.status };
        }
        return { sent: true };
    } catch (err) {
        console.error('Error al enviar correo de confirmación:', err.message);
        return { sent: false, reason: err.message };
    }
}

async function sendContactEmail(product, buyer, sellerEmail, isDemo) {
    if (!BREVO_API_KEY) return { sent: false, reason: 'BREVO_API_KEY no configurada' };

    const siteUrl = 'https://joaqalmonacid-star.github.io/PersaUDD/';
    const subject = `Contacto por "${product.name}" · OllaComun`;
    const buyerFullName = [buyer.name, buyer.apellido].filter(Boolean).join(' ');
    const demoNote = isDemo
        ? '<p style="font-size:13px;color:#666">Este producto es de demostración: el mensaje fue enviado al equipo OllaComun.</p>'
        : '';

    const htmlContent = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#000027;line-height:1.6">
            <h1 style="color:#00295b;font-size:24px;margin:0 0 12px">Te contactaron desde OllaComun</h1>
            <p>Una estudiante quiere saber más sobre tu publicación <strong>${escapeHtml(product.name)}</strong>.</p>
            <div style="background:#f5f9ff;border-left:4px solid #29abe2;padding:14px 18px;margin:18px 0">
                <p style="margin:0 0 6px"><strong>Datos de contacto de quien te escribió:</strong></p>
                <p style="margin:2px 0">Nombre: ${escapeHtml(buyer.name || '')}</p>
                <p style="margin:2px 0">Apellido: ${escapeHtml(buyer.apellido || '')}</p>
                <p style="margin:2px 0">Carrera: ${escapeHtml(buyer.carrera || '')}</p>
                <p style="margin:2px 0">Teléfono: ${escapeHtml(buyer.telefono || '')}</p>
            </div>
            ${demoNote}
            <p><strong>Producto:</strong> ${escapeHtml(product.name)} · $${Number(product.price).toLocaleString('es-CL')} · ${escapeHtml(product.place)}</p>
            <p style="color:#005f02"><strong>Recuerda:</strong> acuerda la entrega directamente en el campus. OllaComun no recibe pagos ni comisiones.</p>
            <p style="font-size:12px;color:#666666">${escapeHtml(buyerFullName)} usó OllaComun para contactarte: ${siteUrl}</p>
        </div>`;
    const textContent = `Te contactaron desde OllaComun por "${product.name}". ` +
        `Datos de contacto: ${buyerFullName}, ${buyer.carrera || ''}, ${buyer.telefono || ''}. ` +
        `Producto: ${product.name}, $${Number(product.price).toLocaleString('es-CL')}, ${product.place}.`;

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
                to: [{ email: sellerEmail }],
                replyTo: { email: buyer.email, name: buyerFullName },
                subject,
                htmlContent,
                textContent
            })
        });

        if (!response.ok) {
            console.error('Brevo rechazó el correo de contacto:', response.status, await response.text());
            return { sent: false, reason: 'Brevo respondió ' + response.status };
        }
        return { sent: true };
    } catch (err) {
        console.error('Error al enviar correo de contacto:', err.message);
        return { sent: false, reason: err.message };
    }
}

function mongoDiagnostics() {
    const uri = process.env.MONGODB_URI || '';
    let host = '';
    let userLength = 0;
    try {
        const parsed = new URL(uri);
        host = parsed.host;
        userLength = parsed.username.length;
    } catch (err) {
        host = '(URI no válida)';
    }
    const pwdMatch = uri.match(/:\/\/[^:/]+:([^@]*)@/);
    let password = pwdMatch ? pwdMatch[1] : '';
    try { password = decodeURIComponent(password); } catch (err) { /* se deja tal cual */ }
    return {
        mongoConfigured: Boolean(uri),
        mongoHost: host,
        mongoUserLength: userLength,
        mongoPasswordLength: password.length,
        mongoPasswordHasSpecialChars: /[^A-Za-z0-9]/.test(password),
        mongoUriHasQuotes: uri.includes('"') || uri.includes("'"),
        mongoUriHasPlaceholder: uri.includes('<'),
        mongoUriRedacted: uri.replace(/(\:\/\/[^:/]+:)[^@]*(@)/, '$1***$2')
    };
}

app.get('/health', (req, res) => res.json({
    status: 'ok',
    service: 'ollacomun-auth',
    storage: store.getMode(),
    dbError: store.getError(),
    ...mongoDiagnostics(),
    brevoConfigured: Boolean(BREVO_API_KEY),
    sender: BREVO_SENDER_EMAIL
}));

app.get('/api/categories', (req, res) => res.json({
    carreras: CAREERS,
    tipos: TYPES,
    funcionalidades: FUNCTIONS,
    estados: STATUSES,
    imagenes: IMAGES
}));

app.post('/api/register', async (req, res) => {
    const body = req.body || {};
    const check = validateProfile(body);
    if (check.error) return res.status(400).json({ error: check.error });
    const password = String(body.password || '');
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    if (await store.findUserByEmail(check.data.email)) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const user = {
        id: crypto.randomUUID(),
        ...check.data,
        passwordHash: bcrypt.hashSync(password, 10),
        createdAt: new Date().toISOString()
    };

    try {
        await store.createUser(user);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
        throw err;
    }

    const emailResult = await sendWelcomeEmail(user);
    res.status(201).json({ token: tokenFor(user), user: publicUser(user), emailSent: emailResult.sent });
});

app.post('/api/login', async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!EMAIL_RE.test(email) || !password) return res.status(400).json({ error: 'Ingresa correo y contraseña' });

    const user = await store.findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }
    res.json({ token: tokenFor(user), user: publicUser(user) });
});

app.get('/api/me', requireAuth, async (req, res) => {
    const user = await store.findUserById(req.auth.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: publicUser(user) });
});

app.put('/api/me', requireAuth, async (req, res) => {
    const check = validateProfile(req.body || {});
    if (check.error) return res.status(400).json({ error: check.error });

    const existing = await store.findUserByEmail(check.data.email);
    if (existing && existing.id !== req.auth.sub) {
        return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' });
    }

    const user = await store.updateUser(req.auth.sub, check.data);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ user: publicUser(user) });
});

app.get('/api/products', async (req, res) => {
    let products = await store.listProducts();
    const { q, carrera, tipo, funcionalidad, status, mine } = req.query;

    let userId = null;
    if (mine === 'true') {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) return res.status(401).json({ error: 'No autenticado' });
        try {
            userId = jwt.verify(token, JWT_SECRET).sub;
        } catch (err) {
            return res.status(401).json({ error: 'Sesión inválida o expirada' });
        }
        products = products.filter(p => p.ownerId === userId);
    }
    if (carrera) products = products.filter(p => p.carrera === carrera);
    if (tipo) products = products.filter(p => p.tipo === tipo);
    if (funcionalidad) products = products.filter(p => p.funcionalidad === funcionalidad);
    if (status) products = products.filter(p => p.status === status);

    if (q) {
        const term = String(q).toLowerCase().trim();
        products = products.filter(p => [p.name, p.description, p.carrera, p.tipo, p.funcionalidad]
            .join(' ').toLowerCase().includes(term));
    }

    res.json({ products: products.map(publicProduct) });
});

app.get('/api/admin/products', requireAdmin, async (req, res) => {
    const products = await store.listProducts();
    const result = [];
    for (const product of products) {
        const owner = product.ownerId && product.ownerId !== 'demo'
            ? await store.findUserById(product.ownerId)
            : null;
        result.push(adminProduct(product, owner));
    }
    res.json({ products: result });
});

app.get('/api/products/:id', async (req, res) => {
    const product = await store.findProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    const seller = await sellerForProduct(product);
    res.json({ product: publicProductDetail(product, seller) });
});

app.post('/api/products/:id/contact', requireAuth, async (req, res) => {
    const product = await store.findProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    const buyer = await store.findUserById(req.auth.sub);
    if (!buyer) return res.status(404).json({ error: 'Usuario no encontrado' });

    const seller = await sellerForProduct(product);
    if (seller.id && seller.id === buyer.id) {
        return res.status(400).json({ error: 'No puedes contactarte a ti mismo' });
    }

    const recipient = seller.email || BREVO_SENDER_EMAIL;
    if (!recipient) return res.status(400).json({ error: 'El vendedor no tiene correo disponible' });
    if (!BREVO_API_KEY) return res.status(503).json({ error: 'El correo no está disponible en este momento. Intenta más tarde.' });

    const result = await sendContactEmail(product, buyer, recipient, !seller.email);
    if (!result.sent) return res.status(502).json({ error: 'No se pudo enviar el correo. Intenta nuevamente.' });

    res.json({
        ok: true,
        emailSent: true,
        demo: !seller.email,
        message: !seller.email
            ? 'Producto de demostración: enviamos tu mensaje al equipo OllaComun.'
            : 'Enviamos tu nombre, apellido, carrera y teléfono al vendedor.'
    });
});

app.post('/api/products', requireAuth, async (req, res) => {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const price = Number(body.price);
    const carrera = String(body.carrera || '');
    const tipo = String(body.tipo || '');
    const funcionalidad = String(body.funcionalidad || '');
    const place = String(body.place || '').trim();
    const photoResult = normalizeImages(body.images, null);
    if (photoResult.error) return res.status(400).json({ error: photoResult.error });
    if (!photoResult.images.length) return res.status(400).json({ error: 'Sube al menos una foto del producto' });

    if (name.length < 3) return res.status(400).json({ error: 'Ingresa el nombre del producto' });
    if (description.length < 10) return res.status(400).json({ error: 'Describe el producto (mínimo 10 caracteres)' });
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Ingresa un precio válido' });
    if (!CAREERS.includes(carrera)) return res.status(400).json({ error: 'Selecciona una carrera' });
    if (!TYPES.includes(tipo)) return res.status(400).json({ error: 'Selecciona un tipo de producto' });
    if (!FUNCTIONS.includes(funcionalidad)) return res.status(400).json({ error: 'Selecciona una funcionalidad' });
    if (place.length < 3) return res.status(400).json({ error: 'Indica dónde se entrega' });

    const owner = await store.findUserById(req.auth.sub);
    if (!owner) return res.status(404).json({ error: 'Usuario no encontrado' });

    const now = new Date().toISOString();
    const product = {
        id: crypto.randomUUID(),
        name, description, price, carrera, tipo, funcionalidad, place,
        image: photoResult.image,
        images: photoResult.images,
        status: 'disponible',
        statusHistory: [{ status: 'disponible', at: now }],
        ownerId: owner.id,
        ownerName: owner.name + ' ' + owner.apellido,
        createdAt: now,
        updatedAt: now
    };

    await store.createProduct(product);
    res.status(201).json({ product: publicProduct(product) });
});

app.patch('/api/products/:id/status', requireAuth, async (req, res) => {
    const status = String(req.body.status || '');
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Estado no válido' });

    const product = await store.findProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.ownerId !== req.auth.sub) return res.status(403).json({ error: 'No puedes modificar este producto' });

    const now = new Date().toISOString();
    const updated = await store.updateProduct(product.id, {
        status,
        statusHistory: [...(product.statusHistory || []), { status, at: now }],
        updatedAt: now
    });
    res.json({ product: publicProduct(updated) });
});

app.put('/api/products/:id', requireAuth, async (req, res) => {
    const product = await store.findProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.ownerId !== req.auth.sub) return res.status(403).json({ error: 'No puedes modificar este producto' });

    const body = req.body || {};
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const price = Number(body.price);
    const carrera = String(body.carrera || '');
    const tipo = String(body.tipo || '');
    const funcionalidad = String(body.funcionalidad || '');
    const place = String(body.place || '').trim();
    const photoResult = normalizeImages(body.images, product.image);
    if (photoResult.error) return res.status(400).json({ error: photoResult.error });
    if (!photoResult.images.length) return res.status(400).json({ error: 'El producto debe tener al menos una foto' });
    const status = STATUSES.includes(body.status) ? body.status : product.status;
    const now = new Date().toISOString();
    const statusHistory = status === product.status
        ? (product.statusHistory || [])
        : [...(product.statusHistory || []), { status, at: now }];

    if (name.length < 3) return res.status(400).json({ error: 'Ingresa el nombre del producto' });
    if (description.length < 10) return res.status(400).json({ error: 'Describe el producto (mínimo 10 caracteres)' });
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'Ingresa un precio válido' });
    if (!CAREERS.includes(carrera) || !TYPES.includes(tipo) || !FUNCTIONS.includes(funcionalidad)) {
        return res.status(400).json({ error: 'Revisa las categorías seleccionadas' });
    }
    if (place.length < 3) return res.status(400).json({ error: 'Indica dónde se entrega' });

    const updated = await store.updateProduct(product.id, {
        name, description, price, carrera, tipo, funcionalidad, place,
        image: photoResult.image,
        images: photoResult.images,
        status,
        statusHistory,
        updatedAt: now
    });
    res.json({ product: publicProduct(updated) });
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
    const product = await store.findProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    if (product.ownerId !== req.auth.sub && !isAdminEmail(req.auth.email)) {
        return res.status(403).json({ error: 'No puedes eliminar este producto' });
    }
    const deleted = await store.deleteProduct(product.id);
    if (!deleted) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ok: true });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`OllaComun auth API escuchando en puerto ${PORT}`);
    store.init()
        .then(async () => {
            await store.seedProducts(SAMPLE_PRODUCTS);
            console.log('Almacenamiento listo: ' + store.getMode());
        })
        .catch(err => console.error('Error al inicializar el almacenamiento:', err.message));
});
