const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

const mimeTypes = {
	'.html': 'text/html; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.js': 'application/javascript; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.json': 'application/json; charset=utf-8',
	'.ico': 'image/x-icon',
};

// Simple explicit route -> file mapping for extensionless URLs
const routeMap = {
	'/': 'index.html',
	'/index': 'index.html',

	// صفحات الأسعار
	'/pricing-page': 'pricing-page/pricing_page.html',
	'/pricing-page/style.css': 'pricing-page/pricing_page_style.css',

	// صفحة التواصل
	'/contact-page': 'contact-page/contact_page.html',
	'/contact-page/style.css': 'contact-page/contact_page_style.css',

	// صفحات تسجيل الدخول والتسجيل
	'/login': 'auth/login/login_page.html',
	'/login/style.css': 'auth/login/login_page_style.css',

	'/register': 'auth/signup/register_page.html',
	'/signup': 'auth/signup/register_page.html',
	'/register/style.css': 'auth/signup/register_page_style.css',
	'/signup/style.css': 'auth/signup/register_page_style.css',

	// ملف الـ CSS العام
	'/style.css': 'style.css',
};

function safeJoin(base, target) {
	const targetPath = '.' + path.normalize('/' + target);
	return path.resolve(base, targetPath);
}

function send404(res) {
	const custom404 = safeJoin(process.cwd(), '404.html');
	fs.stat(custom404, (err, stats) => {
		if (!err && stats.isFile()) {
			res.statusCode = 404;
			res.setHeader('Content-Type', 'text/html; charset=utf-8');
			// small caching for the 404 page
			res.setHeader('Cache-Control', 'public, max-age=3600');
			const stream = fs.createReadStream(custom404);
			stream.pipe(res);
			stream.on('error', () => {
				res.statusCode = 404;
				res.setHeader('Content-Type', 'text/plain; charset=utf-8');
				res.end('404 Not Found');
			});
		} else {
			res.statusCode = 404;
			res.setHeader('Content-Type', 'text/plain; charset=utf-8');
			res.end('404 Not Found');
		}
	});
}

function trySendFile(res, filePath) {
	fs.stat(filePath, (err, stats) => {
		if (err || !stats.isFile()) return send404(res);
		const ext = path.extname(filePath).toLowerCase();
		const contentType = mimeTypes[ext] || 'application/octet-stream';
		res.statusCode = 200;
		res.setHeader('Content-Type', contentType);
		// Add sensible caching for static assets (longer for images/CSS/JS)
		if (ext === '.css' || ext === '.js') {
			res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
		} else if (['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico'].includes(ext)) {
			res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 days
		}
		const stream = fs.createReadStream(filePath);
		stream.pipe(res);
		stream.on('error', () => send404(res));
	});
}

const server = http.createServer((req, res) => {
	try {
		const url = decodeURIComponent(req.url.split('?')[0]);
		// Prevent directory traversal
		if (url.includes('..')) return send404(res);

		// If explicit route mapping exists, serve it
		if (routeMap[url]) {
			const file = safeJoin(process.cwd(), routeMap[url]);
			return trySendFile(res, file);
		}

		// If the request targets a file (has an extension), try to serve it directly
		const ext = path.extname(url);
		if (ext) {
			const file = safeJoin(process.cwd(), url);
			return trySendFile(res, file);
		}

		// Try a few fallbacks for extensionless routes:
		// 1) <path>.html
		// 2) <path>/index.html
		// 3) <path>/<lastSegment>_page.html  (e.g., pricing-page -> pricing_page.html inside folder)
		const attempt1 = safeJoin(process.cwd(), url.replace(/^\//, '') + '.html');
		const attempt2 = safeJoin(process.cwd(), url.replace(/^\//, '') + '/index.html');
		const cleaned = url.replace(/^\//, '').replace(/\/$/, '');
		const lastSeg = cleaned.split('/').pop() || cleaned;
		const attempt3 = safeJoin(process.cwd(), cleaned + '/' + (lastSeg ? lastSeg.replace(/-/g, '_') + '_page.html' : 'index.html'));

		fs.stat(attempt1, (e1, s1) => {
			if (!e1 && s1.isFile()) return trySendFile(res, attempt1);
			fs.stat(attempt2, (e2, s2) => {
				if (!e2 && s2.isFile()) return trySendFile(res, attempt2);
				fs.stat(attempt3, (e3, s3) => {
					if (!e3 && s3.isFile()) return trySendFile(res, attempt3);
					// Last resort: 404
					send404(res);
				});
			});
		});
	} catch (err) {
		console.error('Server error', err);
		res.statusCode = 500;
		res.end('500 Internal Server Error');
	}
});

server.listen(PORT, () => {
	console.log(`Static server running at http://localhost:${PORT}/`);
	console.log('Mapped routes (extensionless):', Object.keys(routeMap).join(', '));
});

module.exports = server;

require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/virtufit';
const JWT_SECRET = process.env.JWT_SECRET || 'replace_me_with_strong_secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d'; // token expiry

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
	origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
	credentials: true
}));

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}).then(() => {
	console.log('MongoDB connected');
}).catch(err => {
	console.error('MongoDB connection error:', err);
});

// --- Auth routes ---
app.post('/api/auth/register', async (req, res) => {
	try {
		const { fullName, email, password } = req.body;
		if (!fullName || !email || !password) return res.status(400).json({ message: 'ارجع اكمل الحقول' });

		const existing = await User.findOne({ email: email.toLowerCase() });
		if (existing) return res.status(409).json({ message: 'البريد الإلكتروني مستخدم مسبقًا' });

		const saltRounds = 12;
		const passwordHash = await bcrypt.hash(password, saltRounds);

		const user = new User({
			fullName,
			email: email.toLowerCase(),
			passwordHash
		});

		await user.save();

		// issue token
		const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

		// set httpOnly cookie
		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
		});

		return res.status(201).json({ message: 'تم إنشاء الحساب', user: { id: user._id, fullName: user.fullName, email: user.email } });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'خطأ في الخادم' });
	}
});

app.post('/api/auth/login', async (req, res) => {
	try {
		const { email, password, remember } = req.body;
		if (!email || !password) return res.status(400).json({ message: 'ارجع اكمل الحقول' });

		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) return res.status(401).json({ message: 'بيانات غير صحيحة' });

		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return res.status(401).json({ message: 'بيانات غير صحيحة' });

		const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: remember ? '30d' : JWT_EXPIRES });

		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 24 * 7
		});

		return res.json({ message: 'تم تسجيل الدخول', user: { id: user._id, fullName: user.fullName, email: user.email } });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ message: 'خطأ في الخادم' });
	}
});

// auth status (example protected endpoint)
function authMiddleware(req, res, next) {
	const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
	if (!token) return res.status(401).json({ message: 'غير مسموح' });
	try {
		const payload = jwt.verify(token, JWT_SECRET);
		req.user = payload;
		next();
	} catch (err) {
		return res.status(401).json({ message: 'التوكن غير صالح' });
	}
}

app.get('/api/auth/me', authMiddleware, async (req, res) => {
	const user = await User.findById(req.user.id).select('-passwordHash');
	if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });
	res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
	res.clearCookie('token');
	res.json({ message: 'تم تسجيل الخروج' });
});

// --- Serve static files (your existing site) ---
app.use(express.static(path.join(process.cwd())));

// fallback to index.html for client routes if needed
app.get('*', (req, res) => {
	// only fallback for non-api requests
	if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not found' });
	res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Start server
app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
