import express from 'express';
import cors from 'cors';
import { Firestore } from '@google-cloud/firestore';

const app = express();

// Настраиваем CORS для всех запросов
const corsOptions = {
    origin: [
        'https://magnificent-sunflower-d07b82.netlify.app',
        'http://localhost:3000',
        'http://localhost:5000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 204 // Изменено на 204
};

// Применяем CORS ко всем маршрутам
app.use(cors(corsOptions));

// Отдельно обрабатываем preflight запросы
app.options('*', cors(corsOptions));

// Добавляем промежуточное ПО для всех запросов
app.use((req, res, next) => {
    // Устанавливаем заголовки CORS для каждого ответа
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Логируем запрос
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    
    // Для OPTIONS запросов сразу отправляем успешный ответ
    if (req.method === 'OPTIONS') {
        return res.status(204).end(); // Изменено на 204
    }
    
    next();
});

app.use(express.json());

// Создаем инстанс Firestore
const db = new Firestore();

// Middleware для обработки ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Internal Server Error',
        message: err.message 
    });
});

// --- USERS ---
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, vk } = req.body;
        const userRef = db.collection('users').doc(username);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            return res.status(400).json({ success: false, message: 'Пользователь уже существует!' });
        }
        await userRef.set({ password, vk, created: Date.now() });
        res.json({ success: true });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userDoc = await db.collection('users').doc(username).get();
        if (!userDoc.exists || userDoc.data().password !== password) {
            return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- THEME ---
app.post('/api/saveTheme', async (req, res) => {
    try {
        const { username, theme } = req.body;
        await db.collection('themes').doc(username).set({ theme });
        res.json({ success: true });
    }  catch (err) {
        console.error('saveTheme error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
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
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- LAWSUITS ---
app.post('/api/addLawsuit', async (req, res) => {
    try {
        const { username, url, plaintiff, defendant, note, status, created } = req.body;
        const ref = db.collection('lawsuits').doc();
        await ref.set({ username, url, plaintiff, defendant, note, status, created, id: ref.id });
        res.json({ success: true });
    }  catch (err) {
        console.error('addLawsuit error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/getLawsuits', async (req, res) => {
    try {
        const { username } = req.body;
        const snap = await db.collection('lawsuits').where('username', '==', username).get();
        const lawsuits = [];
        snap.forEach(doc => lawsuits.push(doc.data()));
        res.json({ lawsuits });
    }  catch (err) {
        console.error('getLawsuits error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/updateLawsuit', async (req, res) => {
    try {
        const { username, id, status } = req.body;
        const ref = db.collection('lawsuits').doc(id);
        const doc = await ref.get();
        if (doc.exists && doc.data().username === username) {
            await ref.update({ status });
        }
        res.json({ success: true });
    }  catch (err) {
        console.error('updateLawsuit error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/deleteLawsuit', async (req, res) => {
    try {
        const { username, id } = req.body;
        const ref = db.collection('lawsuits').doc(id);
        const doc = await ref.get();
        if (doc.exists && doc.data().username === username) {
            await ref.delete();
        }
        res.json({ success: true });
    }  catch (err) {
        console.error('deleteLawsuit error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- USER DOCS ---
app.post('/api/addUserDoc', async (req, res) => {
    try {
        const { username, title, url } = req.body;
        await db.collection('userdocs').add({ username, title, url });
        res.json({ success: true });
    }  catch (err) {
        console.error('addUserDoc error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/getUserDocs', async (req, res) => {
    try {
        const { username } = req.body;
        const snap = await db.collection('userdocs').where('username', '==', username).get();
        const links = [];
        snap.forEach(doc => links.push({ title: doc.data().title, url: doc.data().url }));
        res.json({ links });
    }  catch (err) {
        console.error('getUserDocs error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Исправляем путь для health check
app.post('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// --- Запуск ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));