import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist/frontend/browser');
const port = Number(process.env.PORT || 4200);
const fallback = 'index.html';
const apiUrl = process.env.API_URL || '/api';

const configScript = `<script>window.__APP_CONFIG__ = window.__APP_CONFIG__ || {}; window.__APP_CONFIG__.apiUrl = ${JSON.stringify(apiUrl)};</script>`;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let filePath = path.resolve(root, '.' + pathname);
    if (!filePath.startsWith(root)) filePath = path.join(root, fallback);

    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, fallback);
    } catch {
      filePath = path.join(root, fallback);
    }

    const isHtml = filePath === path.join(root, fallback) || path.extname(filePath).toLowerCase() === '.html';
    let content = await fs.readFile(filePath);

    if (isHtml) {
      let html = content.toString('utf8');
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${configScript}\n  </head>`);
      } else {
        html = `${configScript}\n${html}`;
      }
      content = Buffer.from(html, 'utf8');
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(content);
  } catch (err) {
    if (err) {
      console.error('serve-dist error:', err.message);
    }
    if (!res.headersSent) res.writeHead(500);
    res.end(String(err));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});