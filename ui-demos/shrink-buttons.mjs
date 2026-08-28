/* ============================================================================
 * shrink-buttons.mjs — thu 9 nút gốc 1024px xuống 128px.
 * ----------------------------------------------------------------------------
 *   node "Block Wow 5/ui-demos/shrink-buttons.mjs"
 *
 * Ảnh `codeb image` trả về luôn là 1024×1024, mỗi file ~1MB. Nút thật chỉ vẽ
 * 44px, mà bản playable là MỘT file HTML nên ảnh phải nhúng base64 — 9MB ảnh
 * thì không nhúng nổi. 128px là đủ cho màn hình 3x.
 *
 * Máy này không có thư viện xử lý ảnh, nên dùng luôn Chrome: nạp ảnh, vẽ vào
 * canvas 128×128, lấy dataURL, rồi node giải base64 ghi ra file.
 * ==========================================================================*/
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC  = join(HERE, 'assets', 'btn');
const OUT  = join(SRC, '128');
const SIZE = 128;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
if(!CHROME) throw new Error('Không tìm thấy Chrome/Edge để dựng canvas.');

const names = readdirSync(SRC).filter(f => f.endsWith('.png')).map(f => f.slice(0, -4));
if(!names.length) throw new Error('assets/btn/ chưa có file .png nào.');

/* Trang trung gian: vẽ từng ảnh vào canvas rồi nhét dataURL vào #out. Chrome
 * chỉ trả DOM về được, nên kết quả phải nằm trong DOM chứ không ghi file. */
const page = `<!doctype html><meta charset="utf-8"><body><pre id="out"></pre><script>
const NAMES = ${JSON.stringify(names)}, S = ${SIZE};
Promise.all(NAMES.map(n => new Promise(res => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, S, S);
    res([n, c.toDataURL('image/png')]);
  };
  img.onerror = () => res([n, null]);
  img.src = n + '.png';
}))).then(pairs => {
  document.getElementById('out').textContent = JSON.stringify(Object.fromEntries(pairs));
  document.title = 'DONE';
});
</script>`;
const tmp = join(SRC, '_shrink.html');
writeFileSync(tmp, page, 'utf8');

const dom = execFileSync(CHROME, [
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  '--virtual-time-budget=8000', '--dump-dom', pathToFileURL(tmp).href,
], { encoding:'utf8', maxBuffer: 64 * 1024 * 1024 });

const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if(!m) throw new Error('Chrome không trả về dataURL — xem lại _shrink.html.');

const data = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
mkdirSync(OUT, { recursive:true });

let total = 0;
for(const [name, url] of Object.entries(data)){
  if(!url){ console.log('  ✗ ' + name + ' — không nạp được'); continue; }
  const buf = Buffer.from(url.split(',')[1], 'base64');
  writeFileSync(join(OUT, name + '.png'), buf);
  total += buf.length;
  console.log('  ✓ ' + name + '.png  ' + (buf.length / 1024).toFixed(1) + ' KB');
}
console.log('  → ' + Object.keys(data).length + ' nút, tổng ' + (total / 1024).toFixed(0) + ' KB, ở assets/btn/128/');
