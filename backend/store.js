const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const USE_MONGO = Boolean(process.env.MONGODB_URI);
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

let client = null;
let usersCol = null;
let productsCol = null;

function readJson(file) {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        return Array.isArray(data) ? data : [];
    } catch (err) {
        console.error('No se pudo leer', path.basename(file), err.message);
        return [];
    }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

async function init() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);
    if (!fs.existsSync(PRODUCTS_FILE)) writeJson(PRODUCTS_FILE, []);

    if (!USE_MONGO) {
        console.warn('MONGODB_URI no configurada: usando archivos JSON locales (solo para desarrollo).');
        return 'file';
    }

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DB || 'ollacomun');
    usersCol = db.collection('users');
    productsCol = db.collection('products');
    await usersCol.createIndex({ email: 1 }, { unique: true });
    await productsCol.createIndex({ createdAt: -1 });
    console.log('Conectado a MongoDB (' + (process.env.MONGODB_DB || 'ollacomun') + ').');
    return 'mongo';
}

async function findUserByEmail(email) {
    if (USE_MONGO) return usersCol.findOne({ email });
    return readJson(USERS_FILE).find(u => u.email === email) || null;
}

async function findUserById(id) {
    if (USE_MONGO) return usersCol.findOne({ id });
    return readJson(USERS_FILE).find(u => u.id === id) || null;
}

async function createUser(user) {
    if (USE_MONGO) return usersCol.insertOne(user);
    const users = readJson(USERS_FILE);
    users.push(user);
    writeJson(USERS_FILE, users);
    return user;
}

async function updateUser(id, patch) {
    if (USE_MONGO) {
        await usersCol.updateOne({ id }, { $set: patch });
        return usersCol.findOne({ id });
    }
    const users = readJson(USERS_FILE);
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...patch };
    writeJson(USERS_FILE, users);
    return users[index];
}

async function listProducts() {
    if (USE_MONGO) return productsCol.find({}).sort({ createdAt: -1 }).toArray();
    return readJson(PRODUCTS_FILE).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function findProductById(id) {
    if (USE_MONGO) return productsCol.findOne({ id });
    return readJson(PRODUCTS_FILE).find(p => p.id === id) || null;
}

async function createProduct(product) {
    if (USE_MONGO) return productsCol.insertOne(product);
    const products = readJson(PRODUCTS_FILE);
    products.push(product);
    writeJson(PRODUCTS_FILE, products);
    return product;
}

async function updateProduct(id, patch) {
    if (USE_MONGO) {
        await productsCol.updateOne({ id }, { $set: patch });
        return productsCol.findOne({ id });
    }
    const products = readJson(PRODUCTS_FILE);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...patch };
    writeJson(PRODUCTS_FILE, products);
    return products[index];
}

async function seedProducts(samples) {
    const existing = USE_MONGO ? await productsCol.countDocuments() : readJson(PRODUCTS_FILE).length;
    if (existing > 0) return;

    const now = new Date().toISOString();
    const seeded = samples.map((sample, index) => ({
        ...sample,
        id: 'demo-' + (index + 1),
        ownerId: 'demo',
        ownerName: 'Comunidad OllaComun',
        statusHistory: [{ status: sample.status, at: now }],
        createdAt: now,
        updatedAt: now
    }));

    if (USE_MONGO) {
        await productsCol.insertMany(seeded);
    } else {
        writeJson(PRODUCTS_FILE, seeded);
    }
}

module.exports = {
    USE_MONGO,
    init,
    findUserByEmail,
    findUserById,
    createUser,
    updateUser,
    listProducts,
    findProductById,
    createProduct,
    updateProduct,
    seedProducts
};
