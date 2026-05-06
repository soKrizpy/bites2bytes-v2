const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = __dirname;
const port = Number(process.env.PORT || 4174);

const rewrites = new Map([
    ['/', '/landing-page/index.html'],
    ['/login', '/login/index.html'],
    ['/admin', '/admin-dashboard/index.html'],
    ['/teacher', '/teacher-dashboard/index.html'],
    ['/student', '/student-dashboard/index.html']
]);

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.zip': 'application/zip'
};

function resolvePath(requestPath) {
    const rewritten = rewrites.get(requestPath) || requestPath;
    const normalized = path.normalize(rewritten).replace(/^(\.\.[/\\])+/, '');
    let filePath = path.join(root, normalized);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    if (!path.extname(filePath) && fs.existsSync(`${filePath}.html`)) {
        filePath = `${filePath}.html`;
    }

    return filePath;
}

const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const filePath = resolvePath(pathname);

    if (!filePath.startsWith(root)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (error, data) => {
        if (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': contentTypes[ext] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        });
        res.end(data);
    });
});

server.listen(port, () => {
    console.log(`Bites2Bytes local server running at http://localhost:${port}`);
});
