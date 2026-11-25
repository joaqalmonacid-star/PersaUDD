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
let activeMode = 'file';
let lastError = null;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) writeJson(USERS_FILE, []);
if (!fs.existsSync(PRODUCTS_FILE)) writeJson(PRODUCTS_FILE, []);

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
    if (!USE_MONGO) {
        console.warn('MONGODB_URI no configurada: usando archivos JSON locales (solo desarrollo).');
        return activeMode;
    }

    try {
        client = new MongoClient(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
        });
        await client.connect();
        const db = client.db(process.env.MONGODB_DB || 'ollacomun');
        usersCol = db.collection('users');
        productsCol = db.collection('products');
        await usersCol.createIndex({ email: 1 }, { unique: true });
        await productsCol.createIndex({ createdAt: -1 });
        activeMode = 'mongo';
        lastError = null;
        console.log('Conectado a MongoDB (' + (process.env.MONGODB_DB || 'ollacomun') + ').');
    } catch (err) {
        lastError = err.message;
        console.error('No se pudo conectar a MongoDB. Se usa almacenamiento local temporal:', err.message);
    }
    return activeMode;
}

function isMongo() { return activeMode === 'mongo'; }
function getMode() { return activeMode; }
function getError() { return lastError; }

async function findUserByEmail(email) {
    if (isMongo()) return usersCol.findOne({ email });
    return readJson(USERS_FILE).find(u => u.email === email) || null;
}

async function findUserById(id) {
    if (isMongo()) return usersCol.findOne({ id });
    return readJson(USERS_FILE).find(u => u.id === id) || null;
}

async function createUser(user) {
    if (isMongo()) return usersCol.insertOne(user);
    const users = readJson(USERS_FILE);
    users.push(user);
    writeJson(USERS_FILE, users);
    return user;
}

async function updateUser(id, patch) {
    if (isMongo()) {
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
    if (isMongo()) return productsCol.find({}).sort({ createdAt: -1 }).toArray();
    return readJson(PRODUCTS_FILE).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function findProductById(id) {
    if (isMongo()) return productsCol.findOne({ id });
    return readJson(PRODUCTS_FILE).find(p => p.id === id) || null;
}

async function createProduct(product) {
    if (isMongo()) return productsCol.insertOne(product);
    const products = readJson(PRODUCTS_FILE);
    products.push(product);
    writeJson(PRODUCTS_FILE, products);
    return product;
}

async function updateProduct(id, patch) {
    if (isMongo()) {
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

async function deleteProduct(id) {
    if (isMongo()) {
        const result = await productsCol.deleteOne({ id });
        return result.deletedCount > 0;
    }
    const products = readJson(PRODUCTS_FILE);
    const next = products.filter(p => p.id !== id);
    if (next.length === products.length) return false;
    writeJson(PRODUCTS_FILE, next);
    return true;
}

async function seedProducts(samples) {
    const existing = isMongo() ? await productsCol.countDocuments() : readJson(PRODUCTS_FILE).length;
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

    if (isMongo()) {
        await productsCol.insertMany(seeded);
    } else {
        writeJson(PRODUCTS_FILE, seeded);
    }
}

module.exports = {
    USE_MONGO,
    init,
    getMode,
    getError,
    findUserByEmail,
    findUserById,
    createUser,
    updateUser,
    listProducts,
    findProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    seedProducts
};
