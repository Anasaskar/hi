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
const fetch = global.fetch || require('node-fetch');
const multer = require('multer');
const { Configuration, OpenAIApi } = require('openai');

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

// ----- Zoho OAuth configuration (use env vars in production) -----
const ZOHO_DOMAIN = process.env.ZOHO_DOMAIN || 'accounts.zoho.com'; // change to accounts.zoho.eu or accounts.zoho.in as needed
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
		expires_at: Date.now() + (data.expires_in * 1000) - 60000 // renew 60s early
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
	// Zoho may not return refresh_token on refresh flow; keep existing one
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

// Helper: get a preferred fromAddress for the given accountId (or from accounts list)
async function getPreferredFromAddress(acctId, accessToken) {
	try {
		const mailBase = mailApiBase();
		if (!acctId) {
			// fetch accounts list and pick first
			const accountsRes = await fetch(`${mailBase}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
			let accountsData;
			try { accountsData = await accountsRes.json(); } catch (e) { accountsData = await accountsRes.text(); }
			if (accountsRes.ok && Array.isArray(accountsData) && accountsData.length) {
				acctId = accountsData[0].accountId || accountsData[0].id || accountsData[0].account_id;
			} else if (accountsData && accountsData.data && Array.isArray(accountsData.data) && accountsData.data.length) {
				acctId = accountsData.data[0].accountId || accountsData.data[0].id || accountsData.data[0].account_id;
			}
			// persist accountId
			if (acctId) {
				try { const t = loadZohoTokens() || {}; t.accountId = acctId; saveZohoTokens(t); } catch (e) { }
			}
		}

		if (!acctId) return null;

		const detailRes = await fetch(`${mailBase}/api/accounts/${acctId}`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
		let acctDetail;
		try { acctDetail = await detailRes.json(); } catch (e) { acctDetail = await detailRes.text(); }
		// acctDetail may include data object with details
		const info = (acctDetail && acctDetail.data) ? acctDetail.data : acctDetail;
		if (!info) return null;
		// try common fields
		const candidates = [];
		if (info.primaryEmailAddress) candidates.push(info.primaryEmailAddress);
		if (info.mailboxAddress) candidates.push(info.mailboxAddress);
		if (info.incomingUserName) candidates.push(info.incomingUserName);
		if (info.emailAddress && Array.isArray(info.emailAddress)) {
			info.emailAddress.forEach(e => { if (e.mailId) candidates.push(e.mailId); });
		}
		if (info.sendMailDetails && Array.isArray(info.sendMailDetails)) {
			info.sendMailDetails.forEach(s => { if (s.fromAddress) candidates.push(s.fromAddress); if (s.userName) candidates.push(s.userName); });
		}
		// return first non-empty candidate and persist it
		for (const c of candidates) {
			if (c && typeof c === 'string' && c.includes('@')) {
				try { const t = loadZohoTokens() || {}; t.preferredFrom = c; saveZohoTokens(t); } catch (e) { }
				return c;
			}
		}
		return null;
	} catch (err) {
		console.error('getPreferredFromAddress error', err);
		return null;
	}
}

function mailApiBase() {
	// Map accounts domain to mail API host
	if (ZOHO_DOMAIN.endsWith('.eu')) return 'https://mail.zoho.eu';
	if (ZOHO_DOMAIN.endsWith('.in')) return 'https://mail.zoho.in';
	return 'https://mail.zoho.com';
}

// ----- Zoho OAuth routes -----
app.get('/oauth/start', (req, res) => {
	// scopes: adjust as needed; using ZohoMail.messages.CREATE per instruction
	// include accounts.READ so we can list mail accounts (needed to fetch accountId)
	const scope = encodeURIComponent('ZohoMail.messages.CREATE,ZohoMail.accounts.READ');
	const url = `https://${ZOHO_DOMAIN}/oauth/v2/auth?scope=${scope}&client_id=${encodeURIComponent(ZOHO_CLIENT_ID)}&response_type=code&access_type=offline&redirect_uri=${encodeURIComponent(ZOHO_REDIRECT_URI)}`;
	res.redirect(url);
});

app.get('/oauth/callback', async (req, res) => {
	const { code, error, error_description } = req.query;
	if (error) return res.status(400).send(`OAuth error: ${error} - ${error_description}`);
	if (!code) return res.status(400).send('No authorization code provided');
	try {
		const tokens = await exchangeCodeForTokens(code);
		res.send(`Tokens saved. Access token expires in ${tokens.expires_in} seconds. Refresh token saved (keep it secret).`);
	} catch (err) {
		console.error('Failed to exchange code', err);
		res.status(500).send('Failed to exchange authorization code for tokens. See server logs.');
	}
});

// Send a test email using Zoho Mail API (must have tokens saved)
app.post('/api/zoho/send-test-email', async (req, res) => {
	try {
		const accessToken = await ensureAccessToken();
		const mailBase = mailApiBase();

		// prefer accountId provided in body, otherwise fetch first account
		const { accountId, fromAddress, toAddress, subject, content } = req.body || {};
		let acctId = accountId;

		if (!acctId) {
			// fetch accounts
			const accountsRes = await fetch(`${mailBase}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
			const accountsData = await accountsRes.json();
			if (!accountsRes.ok) return res.status(400).json({ message: 'Failed to fetch accounts', detail: accountsData });
			if (!Array.isArray(accountsData) || accountsData.length === 0) return res.status(400).json({ message: 'No mail accounts found for this user' });
			acctId = accountsData[0].accountId || accountsData[0].id || accountsData[0].account_id;
		}

		if (!acctId) return res.status(400).json({ message: 'No accountId available — provide one in the request body' });

		// pick fromAddress from request or from Zoho account
		let fromAddr = fromAddress || null;
		if (!fromAddr) {
			const tokens = loadZohoTokens() || {};
			fromAddr = await getPreferredFromAddress(tokens.accountId, accessToken);
		}
		const payload = {
			fromAddress: fromAddr || 'no-reply@yourdomain.com',
			toAddress: Array.isArray(toAddress) ? toAddress : [(toAddress || 'user@example.com')],
			subject: subject || 'تأكيد البريد الإلكتروني',
			content: content || 'اضغط هنا لتأكيد حسابك: https://yourdomain.com/confirm?token=...'
		};

		const sendRes = await fetch(`${mailBase}/api/accounts/${acctId}/messages`, {
			method: 'POST',
			headers: {
				Authorization: `Zoho-oauthtoken ${accessToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		});

		const sendData = await sendRes.json().catch(() => null);
		if (!sendRes.ok) return res.status(500).json({ message: 'Failed to send email', detail: sendData });

		res.json({ message: 'Email sent (Zoho API responded)', detail: sendData });
	} catch (err) {
		console.error('Error sending Zoho test email', err);
		res.status(500).json({ message: 'Error sending test email', error: err.message });
	}
});

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
		// Block banned users immediately
		if (user.type === 'Baned') {
			// clear cookie and redirect to login (or show banned page)
			res.clearCookie('token');
			return res.status(403).send('Account banned. Contact support.');
		}

		// Block users who haven't confirmed email
		if (!user.emailConfirmed) {
			res.clearCookie('token');
			// redirect to confirm page with email param
			return res.redirect(`/auth/confirm/confirm_page.html?email=${encodeURIComponent(user.email)}`);
		}

		req.user = user;
		next();
	} catch (err) {
		res.redirect('/login');
	}
};

// Middleware to ensure user has paid access
const requirePaid = (req, res, next) => {
	// verifyToken should have already populated req.user
	if (!req.user) return res.redirect('/login');

	if (req.user.type !== 'pay') {
		// If user is unpaid, redirect to pricing page
		return res.redirect('/pricing-page');
	}
	next();
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
app.get('/login', async (req, res) => {
	try {
		const token = req.cookies.token;
		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
			const user = await User.findById(decoded.id);
			if (user) {
				// already logged in -> go to home
				return res.redirect('/');
			}
		}
	} catch (err) {
		// ignore and show login page
	}
	res.sendFile(path.join(__dirname, 'auth', 'login', 'login_page.html'));
});

// صفحة التسجيل
app.get(['/register', '/signup'], async (req, res) => {
	try {
		const token = req.cookies.token;
		if (token) {
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
			const user = await User.findById(decoded.id);
			if (user) {
				// already logged in -> go to home
				return res.redirect('/');
			}
		}
	} catch (err) {
		// ignore and show register page
	}
	res.sendFile(path.join(__dirname, 'auth', 'signup', 'register_page.html'));
});

// صفحة لوحة التحكم
app.get('/dashboard', verifyToken, requirePaid, (req, res) => {
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
		email: req.user.email,
		type: req.user.type // 'pay' | 'unpay' | 'Baned'
	});
});

// Get available models from modelsImages folder (paid feature)
app.get('/api/models', verifyToken, requirePaid, async (req, res) => {
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

// Endpoint to process try-on requests: accepts modelId and a cloth image upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB limit

app.post('/api/process-tryon', verifyToken, requirePaid, upload.single('cloth'), async (req, res) => {
	try {
		console.log('/api/process-tryon called by user:', req.user && req.user.email);
		const modelId = req.body.modelId;
		console.log('modelId:', modelId);
		if (!modelId) return res.status(400).json({ message: 'Missing modelId' });

		// Find model image path from modelsImages
		const modelsDir = path.join(__dirname, 'modelsImages');
		const files = fs.readdirSync(modelsDir).filter(f => /\.(jpe?g|png)$/i.test(f));
		const index = parseInt(modelId.replace(/[^0-9]/g, ''), 10) - 1;
		const modelFile = files[index];
		if (!modelFile) return res.status(400).json({ message: 'Model not found' });

		const modelImagePath = path.join(modelsDir, modelFile);
		console.log('modelImagePath:', modelImagePath);
		const modelImageBuffer = fs.readFileSync(modelImagePath);

		if (!req.file) return res.status(400).json({ message: 'No cloth image uploaded' });
		const clothBuffer = req.file.buffer;

		// Prepare base64 data URIs
		const modelBase64 = modelImageBuffer.toString('base64');
		const clothBase64 = clothBuffer.toString('base64');

		// Use GitHub Models via OpenAI client with GitHub token (set GITHUB_TOKEN in env)
		const token = process.env.GITHUB_TOKEN;
		console.log('GITHUB_TOKEN present?', !!token);

		// If no token is configured, return a simulated successful response so the UI/demo still works.
		let processedImageUrl = null;
		if (!token) {
			console.warn('GITHUB_TOKEN not set — returning simulated response for /api/process-tryon');
			processedImageUrl = 'https://via.placeholder.com/600x800/28a745?text=Done';
		} else {
			const endpoint = 'https://models.github.ai/inference';
			const modelName = process.env.GH_MODEL_NAME || 'openai/gpt-4o';

			console.log('Calling OpenAI model:', modelName);
			const configuration = new Configuration({ apiKey: token, basePath: endpoint });
			const openai = new OpenAIApi(configuration);

			// Build messages with image inputs as data urls
			const modelDataUrl = `data:image/jpeg;base64,${modelBase64}`;
			const clothDataUrl = `data:image/jpeg;base64,${clothBase64}`;

			const prompt = 'make this model wear this cloth';

			try {
				// Call chat completions create (following examples)
				const response = await openai.createChatCompletion({
					model: modelName,
					messages: [
						{ role: 'system', content: 'You are an assistant that composes instructions for an image generation/processing pipeline.' },
						{
							role: 'user',
							content: [
								{ type: 'text', text: prompt },
								{ type: 'image_url', image_url: { url: modelDataUrl, details: 'model image' } },
								{ type: 'image_url', image_url: { url: clothDataUrl, details: 'cloth image' } }
							]
						}
					],
					temperature: 0.7,
					max_tokens: 1000
				});

				console.log('OpenAI response received');
				// log raw response safe subset
				try { console.log('OpenAI response keys:', Object.keys(response.data || {})); } catch (e) { }

				// Currently we expect a text response; if the model returns a data URL or an image URL, extract it.
				const assistantMessage = response.data?.choices?.[0]?.message?.content || null;
				// Try to find data:image in the assistant message as a fallback
				if (assistantMessage && typeof assistantMessage === 'string' && assistantMessage.includes('data:image')) {
					const match = assistantMessage.match(/(data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+)/);
					if (match) processedImageUrl = match[1];
				}
				// If response included usage or other fields, log for debugging
				if (!processedImageUrl) console.log('No processed image found in assistant message');
			} catch (openaiErr) {
				console.error('OpenAI call failed', openaiErr);
				// If the error has response data, include it in server log
				if (openaiErr.response && openaiErr.response.data) console.error('OpenAI error data:', openaiErr.response.data);
				throw openaiErr; // will be caught by outer catch
			}
		}



		// Save a new order in the user's account (tshirt image stored as data URL) and return it
		try {
			const user = req.user;
			const newOrder = {
				tshirtImage: `data:image/jpeg;base64,${clothBase64}`,
				processedImage: processedImageUrl || 'https://via.placeholder.com/600x800/a7f300?text=Processing...',
				modelId: modelId,
				status: processedImageUrl ? 'Done' : 'Processing',
				createdAt: Date.now()
			};
			user.orders = user.orders || [];
			user.orders.unshift(newOrder); // add newest first
			// limit stored orders to last 20
			user.orders = user.orders.slice(0, 20);
			await user.save();

			res.json({ ok: true, processedImageUrl: newOrder.processedImage, order: newOrder });
		} catch (err) {
			console.error('Failed to save order to user', err);
			res.status(500).json({ message: 'Failed to save order', error: err.message });
		}
	} catch (err) {
		console.error('process-tryon error', err);
		res.status(500).json({ message: 'Processing failed', error: err.message });
	}
});

// DEV ONLY: unauthenticated version to help debugging locally (disabled in production)
if (process.env.NODE_ENV !== 'production') {
	app.post('/dev/process-tryon-unauth', upload.single('cloth'), async (req, res) => {
		// reuse the same handler code path roughly
		try {
			// fake a req.user for logging
			req.user = { email: 'dev-debug' };
			// delegate to same logic by calling internal function is complex; instead copy minimal steps
			const modelId = req.body.modelId;
			if (!modelId) return res.status(400).json({ message: 'Missing modelId' });
			const modelsDir = path.join(__dirname, 'modelsImages');
			const files = fs.readdirSync(modelsDir).filter(f => /\.(jpe?g|png)$/i.test(f));
			const index = parseInt(modelId.replace(/[^0-9]/g, ''), 10) - 1;
			const modelFile = files[index];
			if (!modelFile) return res.status(400).json({ message: 'Model not found' });
			const modelImagePath = path.join(modelsDir, modelFile);
			const modelImageBuffer = fs.readFileSync(modelImagePath);
			if (!req.file) return res.status(400).json({ message: 'No cloth image uploaded' });
			const clothBuffer = req.file.buffer;
			const modelBase64 = modelImageBuffer.toString('base64');
			const clothBase64 = clothBuffer.toString('base64');
			// return simulated processed image
			const processedImageUrl = 'https://via.placeholder.com/600x800/28a745?text=DevDone';
			// Save to a fake user store? Skip DB, return result for debug
			return res.json({ ok: true, processedImageUrl });
		} catch (err) {
			console.error('dev process tryon error', err);
			res.status(500).json({ message: 'Dev Processing failed', error: err.message });
		}
	});
}

// Get current user's orders
app.get('/api/orders', verifyToken, requirePaid, async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select('orders');
		res.json({ ok: true, orders: user.orders || [] });
	} catch (err) {
		console.error('Failed to fetch orders', err);
		res.status(500).json({ ok: false, message: 'Failed to fetch orders' });
	}
});

// If models are a paid feature, require paid users
app.get('/api/models-paid', verifyToken, requirePaid, async (req, res) => {
	try {
		const readdir = promisify(fs.readdir);
		const modelsPath = path.join(__dirname, 'modelsImages');

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
		// create email confirm token
		const confirmToken = require('crypto').randomBytes(20).toString('hex');
		const confirmExpires = Date.now() + 24 * 3600 * 1000; // 24 hours

		const user = new User({ fullName, email: email.toLowerCase(), passwordHash, emailConfirmToken: confirmToken, emailConfirmExpires: confirmExpires });
		await user.save();
		console.log("✅ New user saved:", user);

		const confirmUrl = `${req.protocol}://${req.get('host')}/auth/confirm/confirm_page.html?token=${confirmToken}&email=${encodeURIComponent(user.email)}`;
		console.log('Confirmation URL:', confirmUrl);

		// attempt to send via Zoho Mail API directly (best-effort)
		try {
			const accessToken = await ensureAccessToken();
			const mailBaseUrl = mailApiBase();
			// prefer saved accountId in tokens file
			let acctId = null;
			try {
				const tokens = loadZohoTokens();
				if (tokens && tokens.accountId) acctId = tokens.accountId;
			} catch (ignore) { }
			// fetch accounts if we don't already have acctId
			if (!acctId) {
				const accountsRes = await fetch(`${mailBaseUrl}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
				let accountsData;
				try { accountsData = await accountsRes.json(); } catch (e) { accountsData = await accountsRes.text(); }
				if (accountsRes.ok && Array.isArray(accountsData) && accountsData.length) {
					acctId = accountsData[0].accountId || accountsData[0].id || accountsData[0].account_id;
				} else if (accountsData && accountsData.data && Array.isArray(accountsData.data) && accountsData.data.length) {
					acctId = accountsData.data[0].accountId || accountsData.data[0].id || accountsData.data[0].account_id;
				}
				if (acctId) {
					try { const tokens = loadZohoTokens() || {}; tokens.accountId = acctId; saveZohoTokens(tokens); } catch (e) { }
				}
			}
			if (acctId) {
				const payload = {
					fromAddress: `no-reply@yourdomain.com`,
					toAddress: [user.email],
					subject: 'تأكيد البريد الإلكتروني',
					content: `اضغط على الرابط التالي لتأكيد بريدك: ${confirmUrl}`
				};
				const sendRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}/messages`, {
					method: 'POST',
					headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				let sendData;
				try { sendData = await sendRes.json(); } catch (e) { sendData = await sendRes.text(); }
				if (!sendRes.ok) {
					const moreInfo = sendData && sendData.data && sendData.data.moreInfo ? sendData.data.moreInfo : null;
					if (moreInfo && typeof moreInfo === 'string' && moreInfo.includes('FromAddress not exists')) {
						try {
							const acctDetailRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
							let acctDetail;
							try { acctDetail = await acctDetailRes.json(); } catch (e) { acctDetail = await acctDetailRes.text(); }
							let fallbackFrom = null;
							if (acctDetail && acctDetail.email) fallbackFrom = acctDetail.email;
							if (!fallbackFrom && acctDetail && acctDetail.data && Array.isArray(acctDetail.data) && acctDetail.data[0]) {
								fallbackFrom = acctDetail.data[0].email || acctDetail.data[0].fromAddress || null;
							}
							if (fallbackFrom) {
								payload.fromAddress = fallbackFrom;
								const retryRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}/messages`, {
									method: 'POST', headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
								});
								let retryData;
								try { retryData = await retryRes.json(); } catch (e) { retryData = await retryRes.text(); }
								if (retryRes.ok) console.log('Zoho send succeeded with fallback fromAddress'); else console.error('Zoho send retry failed', retryData);
							}
						} catch (err) { console.error('Fallback fromAddress attempt failed', err); }
					}
					console.error('Zoho send failed:', sendData);
				}
			} else {
				console.error('No Zoho mail accountId found for sending confirmation');
			}
		} catch (err) {
			console.error('Zoho direct send failed (ok to ignore in dev):', err);
		}

		// Inform client that they must confirm email
		res.status(201).json({ message: 'تم إنشاء الحساب بنجاح. يجب تأكيد البريد الإلكتروني. تم إرسال رسالة التأكيد.' });
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

		if (!user.emailConfirmed) {
			return res.status(403).json({ message: 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول. تحقق من صندوق الوارد أو أعد إرسال رسالة التأكيد.' });
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

// Upgrade current user to paid (simulate payment callback)
app.post('/api/auth/upgrade', verifyToken, async (req, res) => {
	try {
		const user = req.user;
		if (!user) return res.status(401).json({ message: 'غير مسموح' });

		user.type = 'pay';
		await user.save();
		res.json({ message: 'تم تفعيل الخطة المدفوعة' });
	} catch (err) {
		console.error('Error upgrading user:', err);
		res.status(500).json({ message: 'خطأ في الخادم' });
	}
});

// Confirm email endpoint
app.post('/api/auth/confirm', async (req, res) => {
	try {
		const { email, token } = req.body;
		if (!email || !token) return res.status(400).json({ message: 'Missing email or token' });
		const user = await User.findOne({ email: email.toLowerCase(), emailConfirmToken: token });
		if (!user) return res.status(400).json({ message: 'Invalid token or email' });
		if (user.emailConfirmExpires && Date.now() > user.emailConfirmExpires) return res.status(400).json({ message: 'Token expired' });
		user.emailConfirmed = true;
		user.emailConfirmToken = undefined;
		user.emailConfirmExpires = undefined;
		await user.save();
		res.json({ message: 'Email confirmed' });
	} catch (err) {
		console.error('Confirm error', err);
		res.status(500).json({ message: 'Server error' });
	}
});

// Resend confirmation
app.post('/api/auth/resend-confirm', async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) return res.status(400).json({ message: 'Missing email' });
		const user = await User.findOne({ email: email.toLowerCase() });
		if (!user) return res.status(404).json({ message: 'No user' });
		if (user.emailConfirmed) return res.status(400).json({ message: 'Already confirmed' });
		const confirmToken = require('crypto').randomBytes(20).toString('hex');
		user.emailConfirmToken = confirmToken;
		user.emailConfirmExpires = Date.now() + 24 * 3600 * 1000;
		await user.save();
		const confirmUrl = `${req.protocol}://${req.get('host')}/auth/confirm/confirm_page.html?token=${confirmToken}&email=${encodeURIComponent(user.email)}`;
		console.log('Resend Confirmation URL:', confirmUrl);
		// attempt to send via Zoho Mail API directly
		try {
			const accessToken = await ensureAccessToken();
			const mailBaseUrl = mailApiBase();
			// prefer saved accountId in tokens file
			let acctId = null;
			try {
				const tokens = loadZohoTokens();
				if (tokens && tokens.accountId) acctId = tokens.accountId;
			} catch (ignore) { }
			if (!acctId) {
				const accountsRes = await fetch(`${mailBaseUrl}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
				let accountsData;
				try { accountsData = await accountsRes.json(); } catch (e) { accountsData = await accountsRes.text(); }
				if (accountsRes.ok && Array.isArray(accountsData) && accountsData.length) {
					acctId = accountsData[0].accountId || accountsData[0].id || accountsData[0].account_id;
				} else if (accountsData && accountsData.data && Array.isArray(accountsData.data) && accountsData.data.length) {
					acctId = accountsData.data[0].accountId || accountsData.data[0].id || accountsData.data[0].account_id;
				}
				if (acctId) {
					try { const tokens = loadZohoTokens() || {}; tokens.accountId = acctId; saveZohoTokens(tokens); } catch (e) { }
				}
			}
			if (acctId) {
				const payload = {
					fromAddress: `no-reply@yourdomain.com`,
					toAddress: [user.email],
					subject: 'إعادة إرسال تأكيد البريد',
					content: `اضغط على الرابط التالي لتأكيد بريدك: ${confirmUrl}`
				};
				const sendRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}/messages`, {
					method: 'POST',
					headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				});
				let sendData;
				try { sendData = await sendRes.json(); } catch (e) { sendData = await sendRes.text(); }
				if (!sendRes.ok) {
					const moreInfo = sendData && sendData.data && sendData.data.moreInfo ? sendData.data.moreInfo : null;
					if (moreInfo && typeof moreInfo === 'string' && moreInfo.includes('FromAddress not exists')) {
						try {
							const acctDetailRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
							let acctDetail;
							try { acctDetail = await acctDetailRes.json(); } catch (e) { acctDetail = await acctDetailRes.text(); }
							let fallbackFrom = null;
							if (acctDetail && acctDetail.email) fallbackFrom = acctDetail.email;
							if (!fallbackFrom && acctDetail && acctDetail.data && Array.isArray(acctDetail.data) && acctDetail.data[0]) {
								fallbackFrom = acctDetail.data[0].email || acctDetail.data[0].fromAddress || null;
							}
							if (fallbackFrom) {
								payload.fromAddress = fallbackFrom;
								const retryRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}/messages`, {
									method: 'POST', headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
								});
								let retryData;
								try { retryData = await retryRes.json(); } catch (e) { retryData = await retryRes.text(); }
								if (retryRes.ok) console.log('Zoho resend succeeded with fallback fromAddress'); else console.error('Zoho resend retry failed', retryData);
							}
						} catch (err) { console.error('Fallback fromAddress attempt failed', err); }
					}
					console.error('Zoho resend failed:', sendData);
				}
			} else {
				console.error('No Zoho mail accountId found for resend');
			}
		} catch (err) {
			console.error('Zoho direct resend failed:', err);
		}
		res.json({ message: 'Confirmation resent' });
	} catch (err) {
		console.error('Resend error', err);
		res.status(500).json({ message: 'Server error' });
	}
});


// ===== تشغيل السيرفر =====
app.listen(PORT, () => {
	console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// ----- Admin debug endpoints for Zoho (dev only) -----
app.get('/admin/zoho/status', (req, res) => {
	try {
		const tokens = loadZohoTokens();
		if (!tokens) return res.json({ ok: false, message: 'No tokens saved' });
		const safe = { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token, expires_at: tokens.expires_at };
		res.json({ ok: true, tokens: safe });
	} catch (err) {
		res.status(500).json({ ok: false, error: err.message });
	}
});

app.post('/admin/zoho/send-test', express.json(), async (req, res) => {
	try {
		const toAddress = req.body && req.body.to ? req.body.to : null;
		if (!toAddress) return res.status(400).json({ ok: false, message: 'Provide to in JSON body' });
		// ensure access token
		let accessToken;
		try {
			accessToken = await ensureAccessToken();
		} catch (err) {
			return res.status(400).json({ ok: false, message: 'No valid access token', detail: err.message });
		}

		const mailBaseUrl = mailApiBase();
		// get accountId - prefer saved accountId in tokens file
		let acctId = null;
		try {
			const tokens = loadZohoTokens();
			if (tokens && tokens.accountId) {
				acctId = tokens.accountId;
			}
		} catch (ignore) { }

		if (!acctId) {
			const accountsRes = await fetch(`${mailBaseUrl}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
			let accountsData;
			try { accountsData = await accountsRes.json(); } catch (e) { accountsData = await accountsRes.text(); }
			if (!accountsRes.ok) return res.status(500).json({ ok: false, message: 'Failed to fetch accounts', detail: accountsData });
			// accountsData may be an array or wrapped; try to extract first accountId
			if (Array.isArray(accountsData) && accountsData.length) {
				acctId = accountsData[0].accountId || accountsData[0].id || accountsData[0].account_id;
			} else if (accountsData && accountsData.data && Array.isArray(accountsData.data) && accountsData.data.length) {
				acctId = accountsData.data[0].accountId || accountsData.data[0].id || accountsData.data[0].account_id;
			}
			if (!acctId) return res.status(500).json({ ok: false, message: 'No accountId found in Zoho accounts response', detail: accountsData });
			// persist accountId for convenience
			try {
				const tokens = loadZohoTokens() || {};
				tokens.accountId = acctId;
				saveZohoTokens(tokens);
			} catch (err) { /* ignore */ }
		}

		// determine a preferred fromAddress from Zoho account if not provided
		let fromAddr = req.body.from || null;
		if (!fromAddr) {
			const tokens = loadZohoTokens() || {};
			fromAddr = await getPreferredFromAddress(tokens.accountId, accessToken);
		}
		const payload = {
			fromAddress: fromAddr || 'no-reply@yourdomain.com',
			toAddress: Array.isArray(toAddress) ? toAddress : [toAddress],
			subject: req.body.subject || 'Test from local server',
			content: req.body.content || 'This is a test email sent from the local server via Zoho.'
		};

		const sendRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}/messages`, { method: 'POST', headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
		let sendData;
		try { sendData = await sendRes.json(); } catch (e) { sendData = await sendRes.text(); }
		if (!sendRes.ok) {
			// if Zoho complains about FromAddress, try to fetch account default email and retry
			const moreInfo = sendData && sendData.data && sendData.data.moreInfo ? sendData.data.moreInfo : null;
			if (moreInfo && typeof moreInfo === 'string' && moreInfo.includes('FromAddress not exists')) {
				try {
					const acctDetailRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
					let acctDetail;
					try { acctDetail = await acctDetailRes.json(); } catch (e) { acctDetail = await acctDetailRes.text(); }
					// Try to find an email address from account detail
					let fallbackFrom = null;
					if (acctDetail && acctDetail.email) fallbackFrom = acctDetail.email;
					// some responses may include data array
					if (!fallbackFrom && acctDetail && acctDetail.data && Array.isArray(acctDetail.data) && acctDetail.data[0]) {
						fallbackFrom = acctDetail.data[0].email || acctDetail.data[0].fromAddress || null;
					}
					if (fallbackFrom) {
						payload.fromAddress = fallbackFrom;
						const retryRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}/messages`, {
							method: 'POST', headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
						});
						let retryData;
						try { retryData = await retryRes.json(); } catch (e) { retryData = await retryRes.text(); }
						if (retryRes.ok) return res.json({ ok: true, message: 'Send succeeded with fallback fromAddress', detail: retryData });
						// include account detail and persisted preferredFrom to help debugging
						const tokens = loadZohoTokens() || {};
						return res.status(500).json({ ok: false, message: 'Send failed even with fallback fromAddress', detail: retryData, accountDetail: acctDetail, preferredFrom: tokens.preferredFrom });
					}
				} catch (err) {
					console.error('Fallback fromAddress attempt failed', err);
				}
			}
			const tokens = loadZohoTokens() || {};
			return res.status(500).json({ ok: false, message: 'Send failed', detail: sendData, accountDetail: acctDetail || null, preferredFrom: tokens.preferredFrom });
		}
		res.json({ ok: true, message: 'Send response', detail: sendData });
	} catch (err) {
		console.error('Admin send error', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

// Admin: fetch Zoho account list and account detail for the saved accountId
app.get('/admin/zoho/account-details', async (req, res) => {
	try {
		const accessToken = await ensureAccessToken();
		const mailBaseUrl = mailApiBase();
		// fetch accounts
		const accountsRes = await fetch(`${mailBaseUrl}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
		let accountsData;
		try { accountsData = await accountsRes.json(); } catch (e) { accountsData = await accountsRes.text(); }
		if (!accountsRes.ok) return res.status(500).json({ ok: false, message: 'Failed to fetch accounts', detail: accountsData });

		// prefer saved accountId
		let acctId = null;
		try { const t = loadZohoTokens(); if (t && t.accountId) acctId = t.accountId; } catch (e) { }

		let acctDetail = null;
		if (!acctId && Array.isArray(accountsData) && accountsData.length) {
			acctId = accountsData[0].accountId || accountsData[0].id || accountsData[0].account_id;
		}
		if (acctId) {
			const detailRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
			try { acctDetail = await detailRes.json(); } catch (e) { acctDetail = await detailRes.text(); }
			// persist a preferredFrom if possible
			try {
				const info = acctDetail && acctDetail.data ? acctDetail.data : acctDetail;
				const candidate = info && (info.mailboxAddress || info.primaryEmailAddress || info.incomingUserName) || null;
				if (candidate) { const t = loadZohoTokens() || {}; t.preferredFrom = candidate; saveZohoTokens(t); }
			} catch (e) { }
		}

		res.json({ ok: true, accountId: acctId, accounts: accountsData, accountDetail: acctDetail });
	} catch (err) {
		console.error('account-details error', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});

// Admin: list candidate from-addresses for sending (helps fix "FromAddress not exists" errors)
app.get('/admin/zoho/from-addresses', async (req, res) => {
	try {
		const accessToken = await ensureAccessToken();
		const mailBaseUrl = mailApiBase();
		const tokens = loadZohoTokens() || {};
		let acctId = tokens.accountId || null;
		const accountsRes = await fetch(`${mailBaseUrl}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
		let accountsData;
		try { accountsData = await accountsRes.json(); } catch (e) { accountsData = await accountsRes.text(); }
		if (Array.isArray(accountsData) && accountsData.length && !acctId) acctId = accountsData[0].accountId || accountsData[0].id || accountsData[0].account_id;

		const candidates = new Set();
		// try accounts list
		if (Array.isArray(accountsData)) {
			accountsData.forEach(a => {
				if (a.email) candidates.add(a.email);
				if (a.fromAddress) candidates.add(a.fromAddress);
				if (a.accountId) candidates.add(a.accountId);
			});
		} else if (accountsData && accountsData.data && Array.isArray(accountsData.data)) {
			accountsData.data.forEach(a => {
				if (a.email) candidates.add(a.email);
				if (a.fromAddress) candidates.add(a.fromAddress);
			});
		}

		let acctDetail = null;
		if (acctId) {
			const detailRes = await fetch(`${mailBaseUrl}/api/accounts/${acctId}`, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });
			try { acctDetail = await detailRes.json(); } catch (e) { acctDetail = await detailRes.text(); }
			if (acctDetail) {
				if (acctDetail.email) candidates.add(acctDetail.email);
				if (acctDetail.fromAddress) candidates.add(acctDetail.fromAddress);
				if (acctDetail.data && Array.isArray(acctDetail.data)) {
					acctDetail.data.forEach(d => { if (d.email) candidates.add(d.email); if (d.fromAddress) candidates.add(d.fromAddress); });
				}
			}
		}

		res.json({ ok: true, accountId: acctId, candidates: Array.from(candidates).filter(Boolean), accounts: accountsData, accountDetail: acctDetail });
	} catch (err) {
		console.error('from-addresses error', err);
		res.status(500).json({ ok: false, error: err.message });
	}
});
