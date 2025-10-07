const http = require('http');
const fs = require('fs');
const path = require('path');

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
