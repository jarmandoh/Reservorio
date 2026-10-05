import http from 'node:http';
import https from 'node:https';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist/frontend/browser');
const port = Number(process.env.PORT || 4200);
const fallback = 'index.html';
const apiTarget = new URL(process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000');
const apiPath = apiTarget.pathname.replace(/\/$/, '');
const apiBasePath = apiPath.endsWith('/api') ? apiPath : `${apiPath}/api`;
const apiTransport = apiTarget.protocol === 'https:' ? https : http;

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
    const requestUrl = new URL(req.url ?? '/', 'http://x');
    const pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const targetPath = `${apiBasePath}${requestUrl.pathname.slice('/api'.length)}${requestUrl.search}`;
      const proxyRequest = apiTransport.request(
        {
          hostname: apiTarget.hostname,
          port: apiTarget.port || (apiTarget.protocol === 'https:' ? 443 : 80),
          path: targetPath,
          method: req.method,
          headers: { ...req.headers, host: apiTarget.host },
        },
        proxyResponse => {
          res.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers);
          proxyResponse.pipe(res);
        }
      );

      proxyRequest.on('error', error => {
        console.error('API proxy error:', error.message);
        if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('API proxy unavailable');
      });
      req.pipe(proxyRequest);
      return;
    }

    let filePath = path.resolve(root, '.' + pathname);
    if (!filePath.startsWith(root)) filePath = path.join(root, fallback);

    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) filePath = path.join(filePath, fallback);
    } catch {
      filePath = path.join(root, fallback);
    }

    const content = await fs.readFile(filePath);

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
