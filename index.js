import express from 'express';
import cors from 'cors';
import { Firestore } from '@google-cloud/firestore';

const app = express();

// Улучшенный CORS с поддержкой всех необходимых заголовков
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}));

app.use(express.json());

// Создаем инстанс Firestore
const db = new Firestore();

// Middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Internal Server Error',
        message: err.message 
    });
});

// Добавляем обработку OPTIONS для CORS
app.options('*', cors()); // Важно для preflight requests

// --- USERS ---
app.post('/api/register', async (req, res) => {
    const { username, password, vk } = req.body;
    const userRef = db.collection('users').doc(username);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
        return res.json({ success: false, message: 'Пользователь уже существует!' });
    }
    await userRef.set({ password, vk, created: Date.now() });
    res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const userDoc = await db.collection('users').doc(username).get();
    if (!userDoc.exists || userDoc.data().password !== password) {
        return res.json({ success: false });
    }
    res.json({ success: true });
});

// --- THEME ---
app.post('/api/saveTheme', async (req, res) => {
    const { username, theme } = req.body;
    await db.collection('themes').doc(username).set({ theme });
    res.json({ success: true });
});
app.post('/api/getTheme', async (req, res) => {
    try {
        const { username } = req.body;
        // Для ping-запросов возвращаем успешный ответ без обращения к БД
        if (username === '__ping__') {
            return res.json({ success: true, theme: 'dark' });
        }
        const doc = await db.collection('themes').doc(username).get();
        res.json({ success: true, theme: doc.exists ? doc.data().theme : 'dark' });
    } catch (err) {
        console.error('getTheme error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'Database error',
            message: err.message 
        });
    }
});

// --- LAWSUITS ---
app.post('/api/addLawsuit', async (req, res) => {
    const { username, url, plaintiff, defendant, note, status, created } = req.body;
    const ref = db.collection('lawsuits').doc();
    await ref.set({ username, url, plaintiff, defendant, note, status, created, id: ref.id });
    res.json({ success: true });
});
app.post('/api/getLawsuits', async (req, res) => {
    const { username } = req.body;
    const snap = await db.collection('lawsuits').where('username', '==', username).get();
    const lawsuits = [];
    snap.forEach(doc => lawsuits.push(doc.data()));
    res.json({ lawsuits });
});
app.post('/api/updateLawsuit', async (req, res) => {
    const { username, id, status } = req.body;
    const ref = db.collection('lawsuits').doc(id);
    const doc = await ref.get();
    if (doc.exists && doc.data().username === username) {
        await ref.update({ status });
    }
    res.json({ success: true });
});
app.post('/api/deleteLawsuit', async (req, res) => {
    const { username, id } = req.body;
    const ref = db.collection('lawsuits').doc(id);
    const doc = await ref.get();
    if (doc.exists && doc.data().username === username) {
        await ref.delete();
    }
    res.json({ success: true });
});

// --- USER DOCS ---
app.post('/api/addUserDoc', async (req, res) => {
    const { username, title, url } = req.body;
    await db.collection('userdocs').add({ username, title, url });
    res.json({ success: true });
});
app.post('/api/getUserDocs', async (req, res) => {
    const { username } = req.body;
    const snap = await db.collection('userdocs').where('username', '==', username).get();
    const links = [];
    snap.forEach(doc => links.push({ title: doc.data().title, url: doc.data().url }));
    res.json({ links });
});

// Исправляем путь для health check
app.post('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// --- Запуск ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));