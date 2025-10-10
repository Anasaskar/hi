require('dotenv').config();
console.log(" Current MONGO_URI:", process.env.MONGO_URI);
const FormData = require('form-data');
const axios = require('axios');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const fs = require('fs');
const { promisify } = require('util');
const User = require('./models/User');
const fetch = global.fetch || require('node-fetch');
const multer = require('multer');
const { Configuration, OpenAIApi } = require('openai');

// Import modular authentication
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');

const { ensureAuth, requirePaid, verifyToken } = require('./middleware/auth');

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

// Session configuration for Passport
app.use(session({
	secret: process.env.SESSION_SECRET || 'your-session-secret-key',
	resave: false,
	saveUninitialized: false,
	cookie: { 
		secure: process.env.NODE_ENV === 'production', // HTTPS only in production
		maxAge: 24 * 60 * 60 * 1000 // 24 hours
	}
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// i18n removed: site is English-only now

// الاتصال بقاعدة البيانات
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/virtufit';
mongoose.connect(MONGO_URI)
	.then(() => console.log(' MongoDB connected'))
	.catch(err => console.error('MongoDB error:', err));

// Multer configuration for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

// ========= MIDDLEWARE DEFINITIONS - NOW IN middleware/auth.js =========
// Middleware functions are imported from ./middleware/auth.js

// ========= FITROOM API CONFIGURATION =========

const FITROOM_API_KEY = process.env.FITROOM_API_KEY;
const FITROOM_API_BASE = 'https://platform.fitroom.app';

// Helper function to check model image with FitRoom API
async function checkModelImage(imageBuffer) {
	try {
		const formData = new FormData();
		formData.append('input_image', imageBuffer, {
			filename: 'model.jpg',
			contentType: 'image/jpeg'
		});

		const response = await axios.post(
			`${FITROOM_API_BASE}/api/tryon/input_check/v1/model`,
			formData,
			{
				headers: {
					'X-API-KEY': FITROOM_API_KEY,
					...formData.getHeaders()
				}
			}
		);

		return response.data;
	} catch (error) {
		console.error('Model check error:', error.response?.data || error.message);
		throw error;
	}
}

// Helper function to check clothes image with FitRoom API
async function checkClothesImage(imageBuffer) {
	try {
		const formData = new FormData();
		formData.append('input_image', imageBuffer, {
			filename: 'clothes.jpg',
			contentType: 'image/jpeg'
		});

		const response = await axios.post(
			`${FITROOM_API_BASE}/api/tryon/input_check/v1/clothes`,
			formData,
			{
				headers: {
					'X-API-KEY': FITROOM_API_KEY,
					...formData.getHeaders()
				}
			}
		);

		return response.data;
	} catch (error) {
		console.error('Clothes check error:', error.response?.data || error.message);
		throw error;
	}
}

// Helper function to create try-on task
async function createTryOnTask(modelBuffer, clothBuffer, clothType = 'upper', hdMode = true) {
	try {
		const formData = new FormData();
		formData.append('model_image', modelBuffer, {
			filename: 'model.jpg',
			contentType: 'image/jpeg'
		});
		formData.append('cloth_image', clothBuffer, {
			filename: 'cloth.jpg',
			contentType: 'image/jpeg'
		});
		formData.append('cloth_type', clothType);
		if (hdMode) {
			formData.append('hd_mode', 'true');
		}

		const response = await axios.post(
			`${FITROOM_API_BASE}/api/tryon/v2/tasks`,
			formData,
			{
				headers: {
					'X-API-KEY': FITROOM_API_KEY,
					...formData.getHeaders()
				}
			}
		);

		return response.data;
	} catch (error) {
		console.error('Create task error:', error.response?.data || error.message);
		throw error;
	}
}

// Helper function to get task status
async function getTaskStatus(taskId) {
	try {
		const response = await axios.get(
			`${FITROOM_API_BASE}/api/tryon/v2/tasks/${taskId}`,
			{
				headers: {
					'X-API-KEY': FITROOM_API_KEY
				}
			}
		);

		return response.data;
	} catch (error) {
		console.error('Get task status error:', error.response?.data || error.message);
		throw error;
	}
}

// Helper function to poll task until completion
async function pollTaskUntilComplete(taskId, maxAttempts = 30, delayMs = 2000) {
	for (let i = 0; i < maxAttempts; i++) {
		const status = await getTaskStatus(taskId);

		if (status.status === 'COMPLETED') {
			return {
				success: true,
				imageUrl: status.download_signed_url,
				progress: 100
			};
		} else if (status.status === 'FAILED') {
			return {
				success: false,
				error: status.error || 'Task failed',
				progress: status.progress || 0
			};
		}

		// Wait before next poll
		await new Promise(resolve => setTimeout(resolve, delayMs));
	}

	return {
		success: false,
		error: 'Task timeout - took too long to complete',
		progress: 0
	};
}

// ========= ZOHO CONFIGURATION =========

const ZOHO_DOMAIN = process.env.ZOHO_DOMAIN || 'accounts.zoho.com';
const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID || '1000.Z4YYFRL5ZXSAJD3QQ9WCWI0ST3F25N';
const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET || 'b7eb8518fff2a76320025176e8d3ca9c076357d74a';
const ZOHO_REDIRECT_URI = process.env.ZOHO_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/oauth/callback`;

const ZOHO_TOKEN_FILE = path.join(__dirname, 'secrets', 'zoho_tokens.json');
// ensure secrets dir
try { if (!fs.existsSync(path.dirname(ZOHO_TOKEN_FILE))) fs.mkdirSync(path.dirname(ZOHO_TOKEN_FILE), { recursive: true }); } catch (e) { }

function saveZohoTokens(obj) {
	fs.writeFileSync(ZOHO_TOKEN_FILE, JSON.stringify(obj, null, 2));
}

function loadZohoTokens() {
	try {
		if (!fs.existsSync(ZOHO_TOKEN_FILE)) return null;
		const raw = fs.readFileSync(ZOHO_TOKEN_FILE, 'utf8');
		return JSON.parse(raw);
	} catch (err) {
		console.error('Failed to load Zoho tokens', err);
		return null;
	}
}

async function exchangeCodeForTokens(code) {
	const url = `https://${ZOHO_DOMAIN}/oauth/v2/token`;
	const params = new URLSearchParams();
	params.append('grant_type', 'authorization_code');
	params.append('client_id', ZOHO_CLIENT_ID);
	params.append('client_secret', ZOHO_CLIENT_SECRET);
	params.append('redirect_uri', ZOHO_REDIRECT_URI);
	params.append('code', code);

	const res = await fetch(url, { method: 'POST', body: params });
	const data = await res.json();
	if (!res.ok) throw new Error(JSON.stringify(data));

	const tokens = {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
		expires_in: data.expires_in,
		expires_at: Date.now() + (data.expires_in * 1000) - 60000
	};
	saveZohoTokens(tokens);
	return tokens;
}

async function refreshAccessToken(refreshToken) {
	const url = `https://${ZOHO_DOMAIN}/oauth/v2/token`;
	const params = new URLSearchParams();
	params.append('grant_type', 'refresh_token');
	params.append('client_id', ZOHO_CLIENT_ID);
	params.append('client_secret', ZOHO_CLIENT_SECRET);
	params.append('refresh_token', refreshToken);

	const res = await fetch(url, { method: 'POST', body: params });
	const data = await res.json();
	if (!res.ok) throw new Error(JSON.stringify(data));

	const tokens = loadZohoTokens() || {};
	tokens.access_token = data.access_token;
	tokens.expires_in = data.expires_in;
	tokens.expires_at = Date.now() + (data.expires_in * 1000) - 60000;
	if (data.refresh_token) tokens.refresh_token = data.refresh_token;
	saveZohoTokens(tokens);
	return tokens;
}

async function ensureAccessToken() {
	let tokens = loadZohoTokens();
	if (!tokens) throw new Error('No Zoho tokens saved. Complete OAuth flow first.');
	if (!tokens.access_token || !tokens.expires_at || Date.now() > tokens.expires_at) {
		if (!tokens.refresh_token) throw new Error('No refresh token available to renew access token.');
		tokens = await refreshAccessToken(tokens.refresh_token);
	}
	return tokens.access_token;
}

function mailApiBase() {
	if (ZOHO_DOMAIN.endsWith('.eu')) return 'https://mail.zoho.eu';
	if (ZOHO_DOMAIN.endsWith('.in')) return 'https://mail.zoho.in';
	return 'https://mail.zoho.com';
}

// ========= STATIC FILES =========
app.use(express.static(path.join(__dirname)));

// ========= AUTHENTICATION ROUTES (Modular) =========
app.use('/api/auth', authRoutes);

// ========= PAGE ROUTES =========

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/pricing-page', (req, res) => {
	res.sendFile(path.join(__dirname, 'pricing-page', 'pricing_page.html'));
});

app.get('/contact-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'contact-page', 'contact_page.html'));
});

app.get('/gallery', ensureAuth, async (req, res) => {
    // Only paid users should access their gallery
    if (req.user.type !== 'pay') {
        return res.redirect('/pricing-page');
    }
    res.sendFile(path.join(__dirname, 'gallery-page', 'gallery_page.html'));
});

app.get('/login', async (req, res) => {
	try {
		const token = req.cookies.token;
		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
			const user = await User.findById(decoded.id);
			if (user) {
				return res.redirect('/dashboard');
			}
		}
	} catch (err) {
		// ignore and show login page
	}
	res.sendFile(path.join(__dirname, 'auth', 'login', 'login_page.html'));
});

app.get(['/register', '/signup'], async (req, res) => {
	try {
		const token = req.cookies.token;
		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
			const user = await User.findById(decoded.id);
			if (user) {
				return res.redirect('/');
			}
		}
	} catch (err) {
		// ignore and show register page
	}
	res.sendFile(path.join(__dirname, 'auth', 'signup', 'register_page.html'));
});

// Protected route for dashboard (requires paid subscription)
app.get('/dashboard', ensureAuth, async (req, res) => {
    // Check if user has paid subscription
    if (req.user.type !== 'pay') {
        return res.redirect('/pricing-page');
    }
    res.sendFile(path.join(__dirname, 'dashboard-page', 'dashboard_page.html'));
});

// ========= LOGOUT ROUTE =========
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    if (typeof req.logout === 'function') {
        req.logout(function (err) {
            if (err) {
                console.error('Logout error:', err);
            }
            return res.redirect('/');
        });
    } else {
        return res.redirect('/');
    }
});

// ========= VIRTUAL TRY-ON API =========
// Accepts either:
// - modelId + clothImage
// - modelImage (file) + clothImage
app.post('/api/tryon/process', verifyToken, requirePaid, upload.fields([
    { name: 'clothImage', maxCount: 1 },
    { name: 'modelImage', maxCount: 1 }
]), async (req, res) => {
    try {
        const { modelId, hdMode = false } = req.body;
        const clothFile = req.files?.clothImage?.[0];
        const customModelFile = req.files?.modelImage?.[0];

        // Validate required inputs
        if (!clothFile) {
            return res.status(400).json({ ok: false, message: 'No cloth image uploaded' });
        }
        if (!customModelFile && !modelId) {
            return res.status(400).json({ ok: false, message: 'Provide either modelImage or modelId' });
        }

        let modelImageBuffer;
        if (customModelFile) {
            // Use uploaded model image
            modelImageBuffer = customModelFile.buffer;
        } else {
            // Use predefined model by ID
            const modelsDir = path.join(__dirname, 'modelsImages');
            const files = fs.readdirSync(modelsDir).filter(f => /\.(jpe?g|png)$/i.test(f));
            const index = parseInt(String(modelId).replace(/[^0-9]/g, ''), 10) - 1;
            const modelFile = files[index];
            if (!modelFile) {
                return res.status(400).json({ ok: false, message: 'Model not found' });
            }
            const modelImagePath = path.join(modelsDir, modelFile);
            modelImageBuffer = fs.readFileSync(modelImagePath);
        }

        const clothBuffer = clothFile.buffer;

        // Validate images
        const modelCheck = await checkModelImage(modelImageBuffer);
        if (!modelCheck.is_good) {
            return res.status(400).json({ ok: false, message: 'Model image validation failed', errorCode: modelCheck.error_code });
        }

        const clothesCheck = await checkClothesImage(clothBuffer);
        if (!clothesCheck.is_clothes) {
            return res.status(400).json({ ok: false, message: 'Invalid clothing image', clothType: clothesCheck.clothes_type });
        }

        // Create try-on task
        const taskResponse = await createTryOnTask(
            modelImageBuffer,
            clothBuffer,
            clothesCheck.clothes_type || 'upper',
            hdMode === 'true' || hdMode === true
        );

        if (!taskResponse.task_id) {
            throw new Error('No task ID received from FitRoom API');
        }

        const taskId = taskResponse.task_id;
        const result = await pollTaskUntilComplete(taskId);

        if (!result.success) {
            return res.status(500).json({ ok: false, message: result.error || 'Try-on processing failed' });
        }

        // Save order to user's history
        const user = await User.findById(req.user._id);
        const order = {
            tshirtImage: `data:image/jpeg;base64,${clothBuffer.toString('base64')}`,
            processedImage: result.imageUrl,
            modelId: modelId,
            status: 'Done',
            createdAt: new Date()
        };
        user.orders.push(order);
        await user.save();

        res.json({ ok: true, processedImageUrl: result.imageUrl, imageUrl: result.imageUrl, taskId });
    } catch (error) {
        console.error('Process try-on error:', error);
        res.status(500).json({ ok: false, message: 'Processing failed', error: error.message });
    }
});

// Endpoint to check task status (for manual checking)
app.get('/api/tryon/status/:taskId', verifyToken, requirePaid, async (req, res) => {
    try {
        const { taskId } = req.params;
        const status = await getTaskStatus(taskId);
        res.json(status);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ ok: false, message: 'Failed to check status', error: error.message });
    }
});

app.get('/api/user/info', verifyToken, (req, res) => {
    res.json({ fullName: req.user.fullName, email: req.user.email, type: req.user.type });
});

app.get('/api/models', verifyToken, requirePaid, async (req, res) => {
    try {
        const readdir = promisify(fs.readdir);
        const modelsPath = path.join(__dirname, 'modelsImages');
        if (!fs.existsSync(modelsPath)) fs.mkdirSync(modelsPath);

        const files = await readdir(modelsPath);
        const modelImages = files.filter(file => file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg') || file.toLowerCase().endsWith('.png'));
        const models = modelImages.map((file, index) => ({ id: `model${index + 1}`, name: `Model ${index + 1}`, image: `/modelsImages/${file}` }));
        res.json(models);
    } catch (error) {
        console.error('Error reading models directory:', error);
        res.status(500).json({ message: 'Error loading models' });
    }
});

app.get('/api/orders', verifyToken, requirePaid, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('orders');
        res.json({ ok: true, orders: user.orders || [] });
    } catch (err) {
        console.error('Failed to fetch orders', err);
        res.status(500).json({ ok: false, message: 'Failed to fetch orders' });
    }
});

// ========= DOWNLOAD PROXY (to avoid CORS and force Content-Disposition) =========
app.get('/api/download', verifyToken, requirePaid, async (req, res) => {
    try {
        const { url, filename = 'image.jpg' } = req.query;
        if (!url) return res.status(400).json({ ok: false, message: 'Missing url' });

        // Basic SSRF protection
        let parsed;
        try {
            parsed = new URL(url);
        } catch (e) {
            return res.status(400).json({ ok: false, message: 'Invalid URL' });
        }
        const blockedHosts = ['localhost', '127.0.0.1'];
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return res.status(400).json({ ok: false, message: 'Unsupported protocol' });
        }
        if (blockedHosts.includes(parsed.hostname) || parsed.hostname.endsWith('.local')) {
            return res.status(400).json({ ok: false, message: 'Blocked host' });
        }

        const upstream = await fetch(url);
        if (!upstream.ok) {
            const text = await upstream.text().catch(() => '');
            return res.status(502).json({ ok: false, message: 'Failed to fetch file', status: upstream.status, body: text });
        }

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        // Support both Node streams and Web ReadableStreams
        const body = upstream.body;
        if (body && typeof body.pipe === 'function') {
            body.pipe(res);
        } else {
            const arrayBuf = await upstream.arrayBuffer();
            res.end(Buffer.from(arrayBuf));
        }
    } catch (err) {
        console.error('Download proxy error:', err);
        res.status(500).json({ ok: false, message: 'Download failed' });
    }
});

// ========= 404 HANDLER =========
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ========= START SERVER =========
app.listen(PORT, () => {
	console.log(`🚀 Server running at http://localhost:${PORT}`);
});