/* Static server nhỏ để test trên điện thoại cùng Wi-Fi:  node serve.js  */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = __dirname, PORT = process.env.PORT || 5177;
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
               '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
               '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
                         'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, () => {
  const ips = [].concat(...Object.values(os.networkInterfaces()))
    .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('  http://localhost:' + PORT);
  ips.forEach(ip => console.log('  http://' + ip + ':' + PORT + '   ← mở link này trên điện thoại'));
});
