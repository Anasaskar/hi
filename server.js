require('dotenv').config();
console.log("🧩 Current MONGO_URI:", process.env.MONGO_URI);

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');
const { promisify } = require('util');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات عامة
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
	origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
	credentials: true
}));

// الاتصال بقاعدة البيانات
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/virtufit';
mongoose.connect(MONGO_URI)
	.then(() => console.log('✅ MongoDB connected'))
	.catch(err => console.error('MongoDB error:', err));

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.redirect('/login');
		}
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
		const user = await User.findById(decoded.id);
		if (!user) {
			return res.redirect('/login');
		}
		req.user = user;
		next();
	} catch (err) {
		res.redirect('/login');
	}
};

// ===== Routes frontend =====

// الملفات الثابتة (CSS, JS, صور..)
app.use(express.static(path.join(__dirname)));

// الصفحة الرئيسية
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

// صفحة الأسعار
app.get('/pricing-page', (req, res) => {
	res.sendFile(path.join(__dirname, 'pricing-page', 'pricing_page.html'));
});

// صفحة التواصل
app.get('/contact-page', (req, res) => {
	res.sendFile(path.join(__dirname, 'contact-page', 'contact_page.html'));
});

// صفحة تسجيل الدخول
app.get('/login', (req, res) => {
	res.sendFile(path.join(__dirname, 'auth', 'login', 'login_page.html'));
});

// صفحة التسجيل
app.get(['/register', '/signup'], (req, res) => {
	res.sendFile(path.join(__dirname, 'auth', 'signup', 'register_page.html'));
});

// صفحة لوحة التحكم
app.get('/dashboard', verifyToken, (req, res) => {
	res.sendFile(path.join(__dirname, 'dashboard-page', 'dashboard_page.html'));
});

// تسجيل الخروج
app.post('/api/auth/logout', (req, res) => {
	res.clearCookie('token');
	res.json({ message: 'تم تسجيل الخروج بنجاح' });
});

// الحصول على معلومات المستخدم
app.get('/api/user/info', verifyToken, (req, res) => {
	res.json({
		fullName: req.user.fullName,
		email: req.user.email
	});
});

// Get available models from modelsImages folder
app.get('/api/models', async (req, res) => {
	try {
		const readdir = promisify(fs.readdir);
		const modelsPath = path.join(__dirname, 'modelsImages');

		// Create directory if it doesn't exist
		if (!fs.existsSync(modelsPath)) {
			fs.mkdirSync(modelsPath);
		}

		const files = await readdir(modelsPath);
		const modelImages = files.filter(file =>
			file.toLowerCase().endsWith('.jpg') ||
			file.toLowerCase().endsWith('.jpeg') ||
			file.toLowerCase().endsWith('.png')
		);

		const models = modelImages.map((file, index) => ({
			id: `model${index + 1}`,
			name: `موديل ${index + 1}`,
			image: `/modelsImages/${file}`
		}));

		res.json(models);
	} catch (error) {
		console.error('Error reading models directory:', error);
		res.status(500).json({ message: 'Error loading models' });
	}
});

// ===== API Routes =====

// تسجيل مستخدم جديد
app.post('/api/auth/register', async (req, res) => {
	try {
		const { fullName, email, password } = req.body;
		if (!fullName || !email || !password)
			return res.status(400).json({ message: 'ارجع اكمل الحقول' });

		const existing = await User.findOne({ email: email.toLowerCase() });
		if (existing)
			return res.status(409).json({ message: 'البريد الإلكتروني مستخدم مسبقًا' });

		const passwordHash = await bcrypt.hash(password, 12);
		const user = new User({ fullName, email: email.toLowerCase(), passwordHash });
		await user.save();
		console.log("✅ New user saved:", user);


		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
		res.cookie('token', token, { httpOnly: true });

		res.status(201).json({ message: 'تم إنشاء الحساب بنجاح' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: 'خطأ في الخادم' });
	}
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
	try {
		const { email, password } = req.body;
		console.log("📩 محاولة تسجيل دخول:", email);

		const user = await User.findOne({ email: email.trim().toLowerCase() });
		console.log("🧩 نتيجة البحث:", user ? "تم العثور على المستخدم" : "❌ المستخدم غير موجود");

		if (!user) {
			return res.status(401).json({ message: 'لا يوجد مستخدم بهذا البريد الإلكتروني' });
		}

		const isMatch = await bcrypt.compare(password, user.passwordHash);
		console.log("🔑 مطابقة كلمة المرور:", isMatch);

		if (!isMatch) {
			return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
		}

		const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
		res.cookie('token', token, { httpOnly: true });

		console.log("✅ تسجيل الدخول ناجح للمستخدم:", user.email);
		res.json({ message: 'تم تسجيل الدخول بنجاح' });
	} catch (err) {
		console.error("💥 خطأ في تسجيل الدخول:", err);
		res.status(500).json({ message: 'خطأ في الخادم' });
	}
});


// ===== تشغيل السيرفر =====
app.listen(PORT, () => {
	console.log(`🚀 Server running at http://localhost:${PORT}`);
});
