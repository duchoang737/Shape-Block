/* Gộp index.html + src/*.js thành MỘT file tự chứa: CozyMosaic_playable.html
 * Chạy:  node build-playable.mjs
 * Mở file kết quả bằng trình duyệt bất kỳ (kể cả file://) là chơi được ngay. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* Nút là 9 file PNG rời. Ba bản dựng dưới đây đều là MỘT file nên ảnh phải
 * nhúng base64 — 128px × 9 ≈ 234KB, thành ~312KB base64. Nhúng trước khi gộp
 * JS để cả playable, artifact lẫn bản duyệt kiểu đều có nút. */
let inlined = 0;
html = html.replace(/url\("(assets\/btn\/[^"]+)"\)/g, function(_, file){
  inlined++;
  return 'url("data:image/png;base64,' +
         fs.readFileSync(path.join(ROOT, file)).toString('base64') + '")';
});
console.log('  nhúng ' + inlined + ' nút PNG');

html = html.replace(/<script src="(src\/[^"]+)"><\/script>/g, (_, src) => {
  const code = fs.readFileSync(path.join(ROOT, src), 'utf8');
  return '<script>\n/* ==== ' + src + ' ==== */\n' + code + '\n</script>';
});

const out = path.join(ROOT, 'CozyMosaic_playable.html');
fs.writeFileSync(out, html, 'utf8');
console.log('→ ' + out + '  (' + (fs.statSync(out).size / 1024).toFixed(1) + ' KB)');

/* Bản cho Artifact: trang web host sẵn, mở bằng trình duyệt là chơi.
 * Artifact tự bọc <!doctype><html><head><body> nên ở đây phải BỎ chúng đi,
 * chỉ để lại <title>, <style> và phần thân. */
const pick = (re) => (html.match(re) || [,''])[1];
const title = pick(/<title>([\s\S]*?)<\/title>/i);
const style = pick(/<style>([\s\S]*?)<\/style>/i);
const body  = pick(/<body>([\s\S]*?)<\/body>/i);
const art = '<title>' + title + '</title>\n<style>\n' + style + '\n</style>\n' + body;
const outArt = path.join(ROOT, 'CozyMosaic_artifact.html');
fs.writeFileSync(outArt, art, 'utf8');
console.log('→ ' + outArt + '  (' + (fs.statSync(outArt).size / 1024).toFixed(1) + ' KB)');

/* ---------------------------------------------------------------------------
 * Bản DUYỆT KIỂU: chính game đó, thêm một thanh đổi kiểu chuyển động nổi ở
 * góc. Không phải canvas dựng lại cho giống — là game thật, nên duyệt xong
 * không còn khoảng cách nào giữa "trong demo" và "trong game".
 *
 * Sinh ra từ bản artifact (đã bỏ doctype/html/head/body) nên vừa mở thẳng bằng
 * trình duyệt được, vừa đăng lên Artifact được.
 *
 * Thanh này CHỈ có ở đây. `CozyMosaic_playable.html` không dính gì tới nó. */
const bar = `
<style>
#fxbar{ position:fixed; left:50%; bottom:14px; transform:translateX(-50%); z-index:60;
  display:flex; flex-direction:column; gap:8px; align-items:center;
  background:rgba(255,253,248,.94); backdrop-filter:blur(8px);
  border:1px solid #D6CABA; border-radius:14px; padding:10px 12px;
  box-shadow:0 10px 30px -12px rgba(51,43,34,.45); max-width:min(520px, calc(100vw - 24px));
  font-family:"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif; }
#fxbar .row{ display:flex; gap:6px; flex-wrap:wrap; justify-content:center; }
#fxbar button{ font:inherit; font-size:12.5px; font-weight:500; cursor:pointer;
  padding:6px 12px; border-radius:999px; border:1px solid #D6CABA;
  background:transparent; color:#332B22; transition:background .14s, border-color .14s; }
#fxbar button:hover{ background:#EFE3D0; }
#fxbar button[aria-pressed="true"]{ background:#2F6F5E; border-color:#2F6F5E; color:#FFFDF8; }
#fxbar button:focus-visible{ outline:2px solid #2F6F5E; outline-offset:2px; }
#fxbar .desc{ font-size:12px; line-height:1.45; color:#7A6D5C; text-align:center;
  margin:0; max-width:46ch; }
#fxbar .desc b{ color:#332B22; font-weight:600; }
#fxbar .hint{ font-size:11px; color:#9A8B78; margin:0; }
@media (prefers-color-scheme: dark){
  #fxbar{ background:rgba(43,40,37,.94); border-color:#3A3632;
          box-shadow:0 12px 34px -14px rgba(0,0,0,.85); }
  #fxbar button{ border-color:#3A3632; color:#EFE7DA; }
  #fxbar button:hover{ background:#38342F; }
  #fxbar button[aria-pressed="true"]{ background:#79BCA5; border-color:#79BCA5; color:#1B2521; }
  #fxbar .desc{ color:#A6998A; } #fxbar .desc b{ color:#EFE7DA; } #fxbar .hint{ color:#8A7D6D; }
}
</style>
<div id="fxbar">
  <div class="row" id="fxrow" role="group" aria-label="Kiểu khối đáp xuống"></div>
  <p class="desc" id="fxdesc"></p>
  <p class="hint">Cú <b>bay từ khay lên</b> và <b>bay về khay</b> giống nhau ở cả bốn — chỉ khác lúc khối đáp.</p>
</div>
<script>
(function(){
  var row = document.getElementById('fxrow'), desc = document.getElementById('fxdesc');
  function paint(){
    var cur = FX.current();
    [].forEach.call(row.children, function(b){
      b.setAttribute('aria-pressed', String(b.dataset.id === cur.id));
    });
    desc.innerHTML = '<b>' + cur.id + ' · ' + cur.name + '</b> — ' + cur.desc;
  }
  FX.presets().forEach(function(p){
    var b = document.createElement('button');
    b.type = 'button'; b.dataset.id = p.id; b.textContent = p.id + ' · ' + p.name;
    b.onclick = function(){ FX.use(p.id); paint(); };
    row.appendChild(b);
  });
  paint();
})();
</script>`;
const outDemo = path.join(ROOT, 'demo', 'anim-presets.html');
fs.writeFileSync(outDemo, art.replace(/<title>[^<]*<\/title>/,
  '<title>Bốn Kiểu Khối Đáp Xuống</title>') + bar, 'utf8');
console.log('→ ' + outDemo + '  (' + (fs.statSync(outDemo).size / 1024).toFixed(1) + ' KB)');

/* ---------------------------------------------------------------------------
 * Cổng màu: màu tranh nào sát màu nền thì ô đã lấp trông y hệt ô còn trống.
 * Chạy mỗi lần build để không ai quên. */
const BG = { 'nền linen':'#EFE3D0', 'ô trống':'#F0E6D6', 'card giấy':'#FFFDF8' };
const rgb = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
const dist = (a, b) => {            // có trọng số theo độ nhạy của mắt
  const A = rgb(a), B = rgb(b);
  return Math.round(Math.sqrt(2*(A[0]-B[0])**2 + 4*(A[1]-B[1])**2 + 3*(A[2]-B[2])**2) / 3);
};
const picSrc = fs.readFileSync(path.join(ROOT, 'src/pictures.js'), 'utf8');
const g = { window:{} };
new Function('window', picSrc)(g.window);
let warn = 0;
for(const pic of g.window.PICTURES){
  const count = {};
  pic.art.join('').split('').forEach(c => count[c] = (count[c]||0) + 1);
  for(const ch in pic.palette){
    const n = count[ch] || 0;
    if(!n) continue;
    const near = Math.min(...Object.values(BG).map(b => dist(pic.palette[ch], b)));
    const floor = n >= 5 ? 45 : 25;
    if(near < floor){
      warn++;
      console.log(`  ⚠ ${pic.id}: '${ch}' ${pic.palette[ch]} (${n} ô) chỉ cách nền ${near} — cần ≥${floor}`);
    }
  }
}
console.log(warn ? `  ${warn} màu sát nền` : '  ✓ không màu nào trùng nền');
