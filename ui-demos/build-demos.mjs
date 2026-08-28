/* ============================================================================
 * build-demos.mjs — sinh 4 demo UI để chọn hướng trước khi áp vào game.
 * ----------------------------------------------------------------------------
 *   node "Block Wow 5/ui-demos/build-demos.mjs"
 *
 * Bốn demo dùng CHUNG một bộ khung: layout, logic, và dữ liệu tranh thật lấy
 * từ src/pictures.js. Khác nhau đúng một thứ — LỚP DA: biến CSS + cách vẽ mặt
 * ô, nút, khung. Viết một chỗ nên sửa layout một lần là cả bốn demo đổi theo;
 * lúc chốt hướng thì chỉ việc bê khối CSS của hướng đó sang index.html.
 *
 * Ảnh trong assets/ do `codeb image` sinh (Nano Banana Pro cho mockup + logo,
 * Nano Banana Flash cho texture nền).
 * ==========================================================================*/
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------- dữ liệu */
/* Chép từ src/pictures.js — demo phải nhìn ra đúng bức tranh của game chứ
 * không phải một cái grid bịa ra cho đẹp ảnh. */
const PICS = `[
  { id:'cake',  name:'Bánh kem',
    palette:{ c:'#FFC93C', f:'#FF8FB1', p:'#F7B733', b:'#8A4B2A' },
    art:["..cc..","ffffff","pppppp","bbbbbb"] },
  { id:'gift',  name:'Hộp quà',
    palette:{ p:'#F27CA4', y:'#FBD24B', o:'#F2953C', t:'#4FA3C4', u:'#2F7FA6' },
    art:["..yy..","pppppp","touuot","touuot","tttttt"] },
  { id:'boba',  name:'Ly trà sữa',
    palette:{ l:'#E8483C', c:'#F2C14E', m:'#C98A5E', k:'#3A2A18' },
    art:["llllll","cccccc","cccccc","mmmmmm","mkmmkm","mmmmmm"] },
  { id:'owl',   name:'Con cú',
    palette:{ g:'#6FA88C', b:'#7A5CA8', w:'#FBD24B', o:'#F2953C', c:'#C4794A' },
    art:["gbbbbbg","bbwbwbb","bbboobb","bcccccb","bcccccb","gbbbbbg"] },
  { id:'whale', name:'Cá voi con',
    palette:{ s:'#1F5F8F', b:'#7FC8E8', k:'#12212C', m:'#A9DCF2' },
    art:["ssssssss","ssbbbbss","sbbkbbbs","sbbbbbbs","ssmmmmss","ssssssss"] },
  { id:'heart', name:'Trái tim',
    palette:{ d:'#A81F42', r:'#E32B58', w:'#FA7B9C' },
    art:[".dd.dd.","dwwrrrd","dwrrrrd","drrrrrd",".drrrd.","..drd..","...d..."] }
]`;

/* ------------------------------------------------------------- CSS khung */
/* Chỉ bố cục + hành vi. Mọi thứ nhìn thấy được đi qua biến; hướng nào đè
 * biến đó. Vẽ mặt ô / nút / khung là việc của khối CSS từng hướng. */
const BASE_CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%}
body{background:#211E1B;color:#E7DFD2;overflow:hidden;
     font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
     display:flex;flex-direction:column;user-select:none}

/* ---- thanh điều khiển của DEMO (không thuộc game) --------------------- */
.demobar{flex:0 0 auto;display:flex;align-items:center;gap:16px;flex-wrap:wrap;
         padding:9px 16px;background:#191714;border-bottom:1px solid rgba(255,255,255,.07)}
.db-name b{display:block;font:600 15px/1.2 system-ui}
.db-name span{display:block;color:#9E9384;font-size:11.5px}
.db-tabs{display:flex;gap:4px;background:#242019;padding:3px;border-radius:10px}
.db-tabs button{border:0;background:none;color:#9E9384;font:500 12px system-ui;
                padding:6px 11px;border-radius:7px;cursor:pointer}
.db-tabs button.on{background:#3A342A;color:#F3ECE0}
.db-act{margin-left:auto;display:flex;gap:8px}
.db-act button,.db-act a{border:1px solid rgba(255,255,255,.14);background:#242019;color:#CFC5B4;
        font:500 12px system-ui;padding:7px 12px;border-radius:9px;cursor:pointer;text-decoration:none}
.db-act button:hover,.db-act a:hover{background:#2E2921;color:#fff}
.db-act .go{background:#4A7C4E;border-color:#5E9463;color:#F2FBF2}

/* ---- khung điện thoại -------------------------------------------------- */
.stagewrap{flex:1 1 auto;display:grid;place-items:center;overflow:hidden;padding:12px}
.phone{width:400px;height:844px;position:relative;overflow:hidden;flex:0 0 auto;
       border-radius:40px;box-shadow:0 26px 60px rgba(0,0,0,.55),0 0 0 9px #15130F,0 0 0 10px #322C24;
       transform:scale(var(--ps,1));transform-origin:center}
.screen{position:absolute;inset:0;display:none;flex-direction:column;
        padding:30px 0 16px;background:var(--bg);color:var(--ink)}
.screen.on{display:flex}
.screen::before{content:'';position:absolute;inset:0;pointer-events:none;
                background:var(--bg-fx,none) center/var(--bg-fx-size,cover) no-repeat;
                opacity:var(--bg-fx-o,1)}
.screen>*{position:relative;z-index:1}

/* ---- màn CHƠI ---------------------------------------------------------- */
.hd{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:0 16px 10px}
.hd-nav,.hd-mini{border:0;cursor:pointer;color:inherit;display:grid;place-items:center;
                 font-style:normal;padding:0;transition:transform .1s,box-shadow .1s}
.hd-nav{width:38px;height:38px;border-radius:50%;font-size:19px;flex:0 0 auto}
.hd-mini{width:34px;height:34px;border-radius:50%;font-size:14px;flex:0 0 auto}
.hd-mini.off{opacity:.38}
.hd-nav:active,.hd-mini:active{transform:translateY(2px)}
.hd-title{flex:1;text-align:center;line-height:1.02;min-width:0}
.hd-title span{display:block;font:600 9px/1 system-ui;letter-spacing:.26em;opacity:.55}
.hd-title b{display:block;font:var(--f-num);margin-top:3px}
.stage{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;
       align-items:center;justify-content:center;gap:11px;padding:0 13px}
.board-card{width:100%;position:relative;overflow:hidden}
.board{display:grid;grid-template-columns:repeat(var(--w),1fr);width:100%;margin:0 auto}
.cell{position:relative;aspect-ratio:1}
.cell>i{position:absolute;inset:var(--grout);border-radius:var(--tr);
        transform:rotate(calc(var(--rot,0deg) * var(--rot-k,0)));
        transition:inset .5s cubic-bezier(.4,0,.2,1),border-radius .5s,transform .5s,
                   background .45s ease,box-shadow .35s,opacity .3s}
.board.done .cell>i{inset:var(--grout-done);border-radius:var(--tr-done);transform:none}
.cell.empty{cursor:pointer}
.cap{font:var(--f-cap);opacity:.6;text-align:center}
/* Bản game hiện tại không cho biết còn bao nhiêu ô — thanh này lấp luôn khoảng
 * trống giữa board và khay, thứ luôn thừa ra khi bức tranh nằm ngang. */
.stage .boardprog{width:52%;height:8px;margin-top:1px}
/* vệt sáng quét ngang đúng lúc mạch vữa khép lại */
.board-card.sheen::after{content:'';position:absolute;inset:0;pointer-events:none;z-index:2;
  background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.6) 50%,transparent 62%);
  transform:translateX(-130%);animation:sw 1s cubic-bezier(.3,0,.2,1)}
@keyframes sw{to{transform:translateX(130%)}}

/* ---- khay -------------------------------------------------------------- */
.deck-wrap{flex:0 0 auto;padding:10px 12px 0;display:flex;justify-content:center}
.deck{display:flex;gap:var(--chip-gap,8px);justify-content:center;align-items:center}
.chip{position:relative;width:var(--chip-w,64px);height:var(--chip-h,70px);cursor:grab;
      border:0;padding:0;color:inherit;background:none;
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
      transition:transform .14s,box-shadow .18s,opacity .2s,filter .2s}
.chip-art{display:grid;gap:1.6px;place-content:center}
.pip{width:var(--pip,9px);height:var(--pip,9px);border-radius:var(--pip-r,2px);
     background:var(--pip-bg,#C79A6B)}
.chip-n{font:var(--f-chip)}
.chip.gone{opacity:.3;filter:grayscale(.7)}
.chip:not(.gone):active{transform:translateY(-4px) scale(1.04)}

/* ---- nút công cụ ------------------------------------------------------- */
.tools{flex:0 0 auto;display:flex;justify-content:center;gap:var(--tool-gap,26px);padding:14px 16px 0}
.tool{position:relative;background:none;border:0;padding:0;cursor:pointer;color:inherit;
      display:flex;flex-direction:column;align-items:center;gap:7px}
.tool i{width:var(--tool-d,56px);height:var(--tool-d,56px);border-radius:50%;
        display:grid;place-items:center;font-style:normal;font-size:22px;
        transition:transform .1s,box-shadow .1s,filter .15s}
.tool em{font:var(--f-tool);font-style:normal;opacity:.72}
.tool .badge{position:absolute;top:-4px;right:2px;min-width:20px;height:20px;padding:0 5px;
        border-radius:10px;display:grid;place-items:center;font:700 11px system-ui;
        background:var(--badge-bg,#C4794A);color:var(--badge-ink,#fff)}

/* ---- màn CHÍNH --------------------------------------------------------- */
.home{flex:1;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:16px;padding:0 26px;text-align:center}
/* Tên game vẽ bằng chữ chứ không phải ảnh: sắc nét ở mọi mật độ điểm ảnh,
 * đổi màu theo hướng, và không kéo theo 900KB PNG vào bản build. */
.wordmark{display:flex;flex-direction:column;align-items:center;line-height:.9;
          position:relative;margin-bottom:4px}
.wordmark span{font:var(--f-wm-s);letter-spacing:.36em;text-indent:.36em;opacity:.75}
.wordmark b{font:var(--f-wm-b);letter-spacing:var(--wm-ls,.01em)}
.picframe{position:relative}
.home-pic{width:148px}
.home-cta{width:100%;display:flex;flex-direction:column;gap:10px;margin-top:2px}
.btn-primary{width:100%;border:0;cursor:pointer;padding:15px 18px;color:inherit;
             display:flex;flex-direction:column;align-items:center;gap:2px;
             transition:transform .1s,box-shadow .1s}
.btn-primary b{font:var(--f-btn)}
.btn-primary span{font:600 11.5px system-ui;opacity:.78;letter-spacing:.03em}
.home-row{display:flex;gap:10px;width:100%}
.btn-soft{flex:1;border:0;cursor:pointer;padding:12px 10px;color:inherit;
          display:flex;flex-direction:column;align-items:center;gap:6px;
          transition:transform .1s,box-shadow .1s}
.btn-soft i{font-style:normal;font-size:19px;line-height:1}
.btn-soft span{font:600 11px system-ui;letter-spacing:.02em}
.prog{width:100%;display:flex;flex-direction:column;gap:7px;align-items:center;margin-top:4px}
.prog-bar{width:100%;height:10px;border-radius:6px;overflow:hidden}
.prog-bar>i{display:block;height:100%;border-radius:6px;transition:width .6s}
.prog span{font:600 11px system-ui;letter-spacing:.04em;opacity:.66}

/* ---- phòng tranh + cài đặt --------------------------------------------- */
.sheet-hd{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:0 16px 14px}
.sheet-hd b{flex:1;text-align:center;font:var(--f-h2)}
.gal{flex:1;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(3,1fr);
     gap:11px;padding:2px 16px 16px;align-content:start}
.frame{margin:0;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 6px 7px}
.frame small{font:600 9.5px/1.2 system-ui;letter-spacing:.02em;opacity:.66;text-align:center}
.frame.lock{opacity:.4}
.lockbox{width:100%;aspect-ratio:1;display:grid;place-items:center;font-size:16px;opacity:.55;
         border-radius:8px;background:repeating-linear-gradient(45deg,rgba(0,0,0,.08) 0 5px,transparent 5px 10px)}
.setlist{flex:1;display:flex;flex-direction:column;gap:10px;padding:4px 18px}
.setrow{display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;
        border:0;color:inherit;text-align:left;transition:transform .1s}
.setrow i{font-style:normal;font-size:17px;width:22px;text-align:center}
.setrow b{flex:1;font:600 13.5px system-ui}
.setrow em{font:600 12px system-ui;font-style:normal;opacity:.6}
.setrow:active{transform:scale(.99)}
.sw{width:46px;height:27px;border-radius:14px;position:relative;flex:0 0 auto;
    background:var(--sw-off);transition:background .2s}
.sw::after{content:'';position:absolute;top:3px;left:3px;width:21px;height:21px;border-radius:50%;
           background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.32);transition:transform .2s}
.setrow.on .sw{background:var(--sw-on)}
.setrow.on .sw::after{transform:translateX(19px)}

/* ---- lớp phủ thắng ------------------------------------------------------ */
.ov{position:absolute;inset:0;z-index:9;display:none;align-items:center;justify-content:center;
    padding:26px;background:var(--ov-bg)}
.ov.on{display:flex}
.panel{width:100%;padding:22px 20px 20px;text-align:center;
       animation:rise .34s cubic-bezier(.2,.9,.3,1.15) both}
@keyframes rise{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}
.win-pic{width:76%;margin:0 auto 14px}
.home-pic.picframe,.win-pic.picframe{box-sizing:content-box}
.win-name{font:var(--f-h2)}
.win-sub{font:600 11px system-ui;letter-spacing:.03em;opacity:.6;margin-top:5px}
.prow{display:flex;gap:10px;margin-top:18px;align-items:stretch}
.prow .btn-primary{flex:1 1 0;width:auto;min-width:0}
.btn-ghost{width:58px;border:0;cursor:pointer;font-size:19px;color:inherit;
           transition:transform .1s,box-shadow .1s}
.btn-ghost:active,.btn-primary:active,.btn-soft:active{transform:translateY(2px)}
`;

/* ============================================================================
 * BỐN HƯỚNG
 * ==========================================================================*/
const THEMES = [

/* ------------------------------------------------------------------- A --- */
{ key:'a', file:'demo-1-gom-vai.html',
  name:'Gốm & Vải thô', en:'Ceramic & Linen',
  logo:'logo-A.png', shot:'dir-A-ceramic.png',
  pitch:'Đúng tinh thần bản hiện tại nhưng chỉnh cho ra dáng game: nền vải lanh thật, ô gốm men mờ, nút kem viền nâu có gờ dày.',
  bullets:['Giữ nguyên bảng màu game đang dùng — đổi UI mà không phải vẽ lại tranh',
           'Nút có gờ nổi 3px nên bấm ra tiếng, khác hẳn nút phẳng hiện tại',
           'Không huy hiệu, không sao, không thanh máu — hợp luật "không điểm số"'],
  fonts:'Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700',
  css:`
:root{
  --bg:#EFE3D0; --bg-fx:url("assets/tex-A-linen.png"); --bg-fx-o:.5;
  --ink:#5B4B34; --slot:#E7D7BC;
  --grout:2.4px; --grout-done:.5px; --tr:17%; --tr-done:5%;
  --ov-bg:rgba(91,75,52,.12);
  --f-num:600 30px/1 'Fraunces',Georgia,serif;
  --f-cap:600 11.5px/1.2 system-ui; --f-chip:600 10.5px system-ui;
  --f-tool:600 10px system-ui; --f-btn:600 19px 'Fraunces',Georgia,serif;
  --f-h2:600 21px 'Fraunces',Georgia,serif;
  --sw-off:#DCCAAC; --sw-on:#8CA86E; --tool-d:56px;
  --f-wm-s:600 14px 'Fraunces',Georgia,serif;
  --f-wm-b:600 44px/1 'Fraunces',Georgia,serif; --bg-fx-o:.22; --bg-fx-size:300% auto;
}
.screen::before{mix-blend-mode:multiply}
.wordmark span{color:#A0855C}
.wordmark b{color:#8A5A34}
.wordmark::after{content:'';position:absolute;bottom:-9px;width:74px;height:3px;
  border-radius:2px;background:#C4794A;opacity:.55}
/* Khối trong khay giữ MÀU ĐẤT — luật của game: màu thuộc ô board, không
 * thuộc block. Bốn hướng đều phải tôn luật này. */
.chip .pip{background:#CBAA7E;box-shadow:inset 0 1px 0 rgba(255,255,255,.45),
  inset 0 -2px 2px rgba(0,0,0,.12)}
.board-card{background:#FFFDF8;border-radius:24px;padding:14px 11px;
  box-shadow:0 10px 26px rgba(91,75,52,.15),0 1px 0 rgba(255,255,255,.9) inset}
.cell.empty>i{background:var(--slot);box-shadow:inset 0 1.5px 2px rgba(91,75,52,.17)}
.board.tint .cell.empty>i{background:color-mix(in srgb,var(--c) 15%,var(--slot))}
.cell.fill>i{background:var(--c);
  box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),inset 0 -2.5px 3px rgba(0,0,0,.13)}
.cell.hole>i{background:var(--c);filter:saturate(.82) brightness(.9);
  box-shadow:inset 0 2.5px 4px rgba(0,0,0,.42)}
.hd-nav,.hd-mini{background:#FBF3E6;border:1.5px solid #7A6647;
  box-shadow:0 2.5px 0 #7A6647,0 4px 8px rgba(91,75,52,.18)}
.hd-nav:active,.hd-mini:active{box-shadow:0 .5px 0 #7A6647}
.deck-wrap>.deck{background:#F6EDDD;border-radius:20px;padding:9px 11px;
  box-shadow:0 3px 0 #D9C7A8,0 7px 14px rgba(91,75,52,.14)}
.chip{background:#FFFDF8;border-radius:15px;box-shadow:0 2px 0 #DCCBAE,0 3px 6px rgba(91,75,52,.12)}
.chip.sel{box-shadow:0 0 0 2.5px #C4794A,0 2px 0 #A5603A}
.chip.hint{animation:pulseA 1.1s ease-in-out infinite}
@keyframes pulseA{50%{box-shadow:0 0 0 3px rgba(196,121,74,.55),0 2px 0 #DCCBAE}}
.tool i{background:#FBF3E6;border:2px solid #7A6647;color:#5B4B34;
  box-shadow:0 3.5px 0 #7A6647,0 6px 11px rgba(91,75,52,.22)}
.tool:active i{transform:translateY(3px);box-shadow:0 .5px 0 #7A6647}
.btn-primary{background:#C4794A;color:#FFF7EC;border-radius:19px;
  box-shadow:0 4px 0 #9C5C36,0 8px 16px rgba(91,75,52,.24)}
.btn-primary:active{box-shadow:0 1px 0 #9C5C36}
.btn-soft{background:#FFFDF8;border-radius:17px;
  box-shadow:0 3px 0 #DCCBAE,0 5px 10px rgba(91,75,52,.13)}
.btn-soft:active{box-shadow:0 1px 0 #DCCBAE}
.btn-ghost{background:#F3E8D6;border-radius:17px;box-shadow:0 3px 0 #D6C2A2}
.prog-bar{background:#DCCBAE;box-shadow:inset 0 1px 2px rgba(91,75,52,.2)}
.prog-bar>i{background:linear-gradient(90deg,#C4794A,#D9945F)}
.frame{background:#FFFDF8;border-radius:14px;box-shadow:0 2px 0 #DCCBAE,0 4px 9px rgba(91,75,52,.12)}
.setrow{background:#FFFDF8;border-radius:16px;box-shadow:0 2px 0 #DCCBAE}
.panel{background:#FFFDF8;border-radius:26px;box-shadow:0 22px 48px rgba(91,75,52,.3)}
.picframe{padding:10px;background:#F6EDDD;border-radius:14px;
  box-shadow:inset 0 0 0 1.5px #E0CDAE,0 4px 12px rgba(91,75,52,.16)}
` },

/* ------------------------------------------------------------------- B --- */
{ key:'b', file:'demo-2-go-ngoc.html',
  name:'Gỗ & Ngọc bích', en:'Carved Wood & Jade',
  logo:'logo-B.png', shot:'dir-B-wood.png',
  pitch:'Ngôn ngữ chuẩn của dòng block puzzle đang ăn khách: khung gỗ chạm, viền đồng, chữ vàng. Người chơi nhìn ảnh store là biết ngay thể loại.',
  bullets:['Quen mắt nhất với người chơi block puzzle — dễ đọc ở icon store',
           'Nền tối làm màu tranh bật lên mạnh nhất trong bốn hướng',
           'Đổi cả tông game: từ "sổ tay ban ngày" sang "bàn gỗ buổi tối"'],
  fonts:'Playfair+Display:wght@600;700',
  css:`
:root{
  --bg:#3A2718; --bg-fx:url("assets/tex-B-wood.png"); --bg-fx-o:.85;
  --ink:#F3E3C6; --slot:rgba(0,0,0,.34);
  --grout:2.2px; --grout-done:.5px; --tr:15%; --tr-done:4%;
  --ov-bg:rgba(20,12,6,.55);
  --f-num:600 27px/1 'Playfair Display',Georgia,serif;
  --f-cap:600 11.5px/1.2 system-ui; --f-chip:700 10.5px system-ui;
  --f-tool:700 9.5px system-ui;
  --f-btn:600 19px 'Playfair Display',Georgia,serif; --f-h2:600 20px 'Playfair Display',Georgia,serif;
  --sw-off:#5A3F27; --sw-on:#6E9B78;
  --f-wm-s:600 14px 'Playfair Display',Georgia,serif;
  --f-wm-b:700 44px/1 'Playfair Display',Georgia,serif;
  --badge-bg:#D8A85B; --badge-ink:#3A2614; --tool-d:56px; --bg-fx-o:.62; --bg-fx-size:300% auto;
}
.wordmark span{color:#C79A5E}
.wordmark b{background:linear-gradient(180deg,#F7E3B4,#C8963F 62%,#8F6524);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 2px 0 rgba(0,0,0,.45))}
.wordmark::after{content:'';position:absolute;bottom:-10px;width:118px;height:2px;
  background:linear-gradient(90deg,transparent,#D8A85B,transparent)}
.screen::before{box-shadow:inset 0 0 130px 46px rgba(16,9,4,.8)}
.chip .pip{background:#E2BE8B;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),
  inset 0 -2px 3px rgba(0,0,0,.3)}
.board-card{border-radius:20px;padding:13px;
  background:linear-gradient(160deg,#6A4728,#4A3320);
  box-shadow:0 0 0 2px #D8A85B inset,0 0 0 3px rgba(0,0,0,.35),
             0 14px 30px rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.14)}
.board{border-radius:10px;overflow:hidden;box-shadow:inset 0 0 18px rgba(0,0,0,.55)}
.cell.empty>i{background:var(--slot);box-shadow:inset 0 2px 4px rgba(0,0,0,.6)}
.board.tint .cell.empty>i{background:color-mix(in srgb,var(--c) 24%,#2A1B0F)}
.cell.fill>i{background:var(--c);
  box-shadow:inset 0 2px 0 rgba(255,255,255,.38),inset 0 -3px 4px rgba(0,0,0,.32),
             0 1px 2px rgba(0,0,0,.35)}
.cell.hole>i{background:var(--c);filter:brightness(.6) saturate(.85);
  box-shadow:inset 0 3px 6px rgba(0,0,0,.7)}
.hd-nav,.hd-mini{background:linear-gradient(180deg,#7A5433,#523620);color:#F2D9A0;
  border:2px solid #D8A85B;box-shadow:0 3px 0 #2A1B0F,0 5px 10px rgba(0,0,0,.45)}
.hd-nav:active,.hd-mini:active{box-shadow:0 0 0 #2A1B0F}
.hd-title{background:linear-gradient(180deg,#5C3E25,#432C19);border:1.5px solid #D8A85B;
  border-radius:11px;padding:5px 4px 7px;box-shadow:0 3px 0 rgba(0,0,0,.4)}
.hd-title b{color:#F2D9A0;text-shadow:0 1px 0 rgba(0,0,0,.5)}
.deck-wrap>.deck{background:linear-gradient(180deg,#6A4728,#4A3320);border-radius:16px;
  padding:9px 11px;border:1.5px solid rgba(216,168,91,.5);
  box-shadow:0 4px 0 rgba(0,0,0,.35),inset 0 2px 0 rgba(255,255,255,.12)}
.chip{background:rgba(0,0,0,.3);border-radius:11px;
  box-shadow:inset 0 3px 6px rgba(0,0,0,.55),inset 0 -1px 0 rgba(255,255,255,.09)}
.chip .pip{box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -2px 3px rgba(0,0,0,.28)}
.chip-n{color:#E8C795}
.chip.sel{box-shadow:0 0 0 2px #D8A85B,inset 0 3px 6px rgba(0,0,0,.5)}
.chip.hint{animation:pulseB 1.1s ease-in-out infinite}
@keyframes pulseB{50%{box-shadow:0 0 0 3px rgba(216,168,91,.7),inset 0 3px 6px rgba(0,0,0,.5)}}
.tool i{background:linear-gradient(180deg,#7A5433,#523620);color:#F2D9A0;
  border:2.5px solid #D8A85B;box-shadow:0 4px 0 #2A1B0F,0 7px 13px rgba(0,0,0,.5)}
.tool:active i{transform:translateY(3px);box-shadow:0 1px 0 #2A1B0F}
.tool em{color:#E8C795}
.btn-primary{background:linear-gradient(180deg,#E6BC72,#B5813C);color:#3A2614;border-radius:15px;
  border:1.5px solid #F0D49A;box-shadow:0 5px 0 #6E4B22,0 9px 18px rgba(0,0,0,.45)}
.btn-primary:active{box-shadow:0 1px 0 #6E4B22}
.btn-soft{background:linear-gradient(180deg,#6A4728,#4A3320);color:#F3E3C6;border-radius:14px;
  border:1.5px solid rgba(216,168,91,.55);box-shadow:0 4px 0 rgba(0,0,0,.4)}
.btn-soft:active{box-shadow:0 1px 0 rgba(0,0,0,.4)}
.btn-ghost{background:linear-gradient(180deg,#6A4728,#4A3320);color:#F3E3C6;border-radius:14px;
  border:1.5px solid rgba(216,168,91,.55);box-shadow:0 4px 0 rgba(0,0,0,.4)}
.prog-bar{background:rgba(0,0,0,.42);box-shadow:inset 0 2px 4px rgba(0,0,0,.5)}
.prog-bar>i{background:linear-gradient(90deg,#B5813C,#E6BC72)}
.frame{background:linear-gradient(180deg,#5C3E25,#432C19);border-radius:12px;
  border:1.5px solid rgba(216,168,91,.45);box-shadow:0 4px 9px rgba(0,0,0,.4)}
.setrow{background:linear-gradient(180deg,#5C3E25,#432C19);border-radius:14px;
  border:1.5px solid rgba(216,168,91,.35)}
.panel{background:linear-gradient(180deg,#6A4728,#4A3320);border-radius:22px;
  border:2px solid #D8A85B;box-shadow:0 24px 50px rgba(0,0,0,.6)}
.picframe{padding:9px;background:rgba(0,0,0,.3);border-radius:10px;
  box-shadow:inset 0 0 0 2px #D8A85B,inset 0 0 16px rgba(0,0,0,.6)}
.win-name{color:#F2D9A0}
` },

/* ------------------------------------------------------------------- C --- */
{ key:'c', file:'demo-3-giay-thu-cong.html',
  name:'Giấy thủ công', en:'Papercraft Scrapbook',
  logo:'logo-C.png', shot:'dir-C-paper.png',
  pitch:'Giấy cắt dán nhiều lớp, mép rách, nút dán sticker. Ô gạch nghiêng lệch vài độ lúc chơi rồi tự nắn thẳng khi khép mạch — cú kết màn nằm ngay trong chất liệu.',
  bullets:['Khác biệt nhất trên store — không đụng hàng block puzzle nào',
           'Ô nghiêng → thẳng lúc thắng: một hiệu ứng không hướng nào khác làm được',
           'Nút sticker ba màu giúp phân biệt công cụ nhanh hơn ba nút cùng màu'],
  fonts:'Patrick+Hand&family=Nunito:wght@600;700;800',
  css:`
:root{
  --bg:#FBF4E6; --bg-fx:url("assets/tex-C-paper.png"); --bg-fx-o:.7;
  --ink:#4A4036; --slot:#E7DCC6;
  --grout:2.6px; --grout-done:.6px; --tr:10%; --tr-done:4%;
  --ov-bg:rgba(74,64,54,.16);
  --f-num:400 30px/1 'Patrick Hand',Georgia,serif;
  --f-cap:600 12px/1.2 'Nunito',system-ui; --f-chip:700 10.5px 'Nunito',system-ui;
  --f-tool:700 10px 'Nunito',system-ui;
  --f-btn:400 22px 'Patrick Hand',Georgia,serif; --f-h2:400 24px 'Patrick Hand',Georgia,serif;
  --sw-off:#D9C9AB; --sw-on:#6E9BB5; --rot-k:2.4;
  --f-wm-s:400 17px 'Patrick Hand',Georgia,serif;
  --f-wm-b:400 50px/1 'Patrick Hand',Georgia,serif; --wm-ls:.02em;
  --badge-bg:#E8B04B; --badge-ink:#4A4036; --tool-d:58px; --tool-gap:24px;
  --bg-fx-o:.55; --bg-fx-size:230% auto;
}
body[data-theme="c"] .setrow b,body[data-theme="c"] .btn-soft span,
body[data-theme="c"] .prog span,body[data-theme="c"] .frame small{font-family:'Nunito',system-ui}
.screen::before{mix-blend-mode:multiply}
.wordmark{transform:rotate(-1.6deg)}
.wordmark span{color:#6E9BB5}
.wordmark b{color:#E8776A;text-shadow:3px 3px 0 #FFFCF3,5px 5px 0 rgba(74,64,54,.14)}
.wordmark::before{content:'';position:absolute;top:-12px;left:-26px;width:74px;height:21px;
  background:#E8B04B;opacity:.75;transform:rotate(-14deg);
  box-shadow:0 2px 4px rgba(74,64,54,.2)}
.chip .pip{background:#C89B62;box-shadow:0 1px 0 rgba(74,64,54,.2)}
/* Tờ giấy thứ hai lấp ló sau tờ trước. Vẽ bằng box-shadow chứ không phải lớp
 * con: .board-card có overflow:hidden (để giữ vệt sáng lúc kết màn) nên lớp
 * con lệch ra ngoài sẽ bị cắt mất. */
.board-card{background:#FFFCF3;border-radius:5px;padding:15px 12px;transform:rotate(-.5deg);
  box-shadow:7px 9px 0 -2px #EFE2C8,0 3px 0 rgba(74,64,54,.06),0 15px 24px rgba(74,64,54,.16)}
.stage{padding-top:6px}
.cell.empty>i{background:var(--slot);box-shadow:inset 0 2px 3px rgba(74,64,54,.16)}
.board.tint .cell.empty>i{background:color-mix(in srgb,var(--c) 16%,var(--slot))}
.cell.fill>i{background:var(--c);box-shadow:0 1.5px 0 rgba(74,64,54,.16),
  inset 0 -3px 5px rgba(0,0,0,.09),inset 0 1px 0 rgba(255,255,255,.28)}
.cell.hole>i{background:var(--c);filter:brightness(.86);
  box-shadow:inset 0 2px 4px rgba(0,0,0,.4)}
.hd-nav,.hd-mini{background:#6E9BB5;color:#FFFCF3;border:3px solid #FFFCF3;
  box-shadow:0 3px 6px rgba(74,64,54,.28)}
.hd-mini:nth-of-type(2){background:#E8B04B}
.hd-title b{display:inline-block;background:#EFE2C8;border-radius:2px;padding:1px 16px 3px;
  transform:rotate(-1.4deg);box-shadow:0 2px 5px rgba(74,64,54,.2)}
.deck-wrap>.deck{background:#E6D4B0;border-radius:4px;padding:10px 12px;transform:rotate(.5deg);
  box-shadow:0 3px 10px rgba(74,64,54,.18)}
.chip{background:#FFFCF3;border-radius:4px;box-shadow:0 2px 5px rgba(74,64,54,.2)}
.chip:nth-child(2n){transform:rotate(-1.4deg)}
.chip:nth-child(3n){transform:rotate(1.6deg)}
.chip .pip{box-shadow:0 1px 0 rgba(74,64,54,.18)}
.chip.sel{box-shadow:0 0 0 3px #E8776A,0 3px 7px rgba(74,64,54,.25)}
.chip.hint{animation:pulseC 1.1s ease-in-out infinite}
@keyframes pulseC{50%{box-shadow:0 0 0 3px rgba(232,176,75,.9),0 3px 7px rgba(74,64,54,.25)}}
.tool i{border:4px solid #FFFCF3;color:#FFFCF3;box-shadow:0 4px 8px rgba(74,64,54,.3)}
.tool:nth-child(1) i{background:#6E9BB5}
.tool:nth-child(2) i{background:#E8B04B}
.tool:nth-child(3) i{background:#E8776A}
.tool:active i{transform:translateY(3px) rotate(-4deg);box-shadow:0 1px 4px rgba(74,64,54,.3)}
.btn-primary{background:#E8776A;color:#FFFCF3;border-radius:6px;border:3px solid #FFFCF3;
  box-shadow:0 4px 10px rgba(74,64,54,.3);transform:rotate(-.6deg)}
.btn-soft{background:#FFFCF3;border-radius:5px;box-shadow:0 3px 7px rgba(74,64,54,.18)}
.btn-soft:nth-child(2){transform:rotate(1deg)}
.btn-ghost{background:#EFE2C8;border-radius:5px;box-shadow:0 3px 7px rgba(74,64,54,.2)}
.prog-bar{background:#E6D4B0;border-radius:3px}
.prog-bar>i{background:#6E9BB5;border-radius:3px}
.frame{background:#FFFCF3;border-radius:4px;box-shadow:0 3px 8px rgba(74,64,54,.18)}
.frame:nth-child(3n+2){transform:rotate(-1.2deg)}
.frame:nth-child(3n){transform:rotate(1deg)}
.setrow{background:#FFFCF3;border-radius:5px;box-shadow:0 3px 7px rgba(74,64,54,.16)}
.panel{background:#FFFCF3;border-radius:6px;box-shadow:0 20px 40px rgba(74,64,54,.3)}
.panel::before{content:'';position:absolute;top:-12px;left:50%;width:96px;height:26px;
  transform:translateX(-50%) rotate(-2.5deg);background:#E8B04B;opacity:.85;
  box-shadow:0 2px 5px rgba(74,64,54,.25)}
.picframe{padding:10px;background:#EFE2C8;border-radius:3px;
  box-shadow:0 3px 9px rgba(74,64,54,.2)}
` },

/* ------------------------------------------------------------------- D --- */
{ key:'d', file:'demo-4-keo-mem.html',
  name:'Kẹo mềm hiện đại', en:'Modern Soft-Pop',
  logo:'logo-D.png', shot:'dir-D-softpop.png',
  pitch:'Bộ mặt casual đang phổ biến nhất 2025: nút bo tròn dày có gờ dưới, chữ đậm bo tròn, nền gradient pastel. Bấm nút nào cũng nảy.',
  bullets:['Dễ bán nhất cho người chơi casual mới — mọi thứ tự nói "bấm vào tôi"',
           'Chỗ nhấn to rõ nhất: nút chính 3D, badge số lượt gợi ý',
           'Rủi ro: pastel dễ nuốt mất màu tranh, phải giữ card trắng làm nền'],
  fonts:'Baloo+2:wght@600;700;800&family=Nunito:wght@600;700;800',
  css:`
:root{
  --bg:linear-gradient(170deg,#FFE2CF 0%,#F6DDEE 46%,#E2DCF7 100%);
  --bg-fx:url("assets/tex-D-pastel.png"); --bg-fx-o:.35;
  --ink:#4B3B57; --slot:rgba(120,100,150,.13);
  --grout:2.4px; --grout-done:.6px; --tr:26%; --tr-done:8%;
  --ov-bg:rgba(75,59,87,.24);
  --f-num:700 28px/1 'Baloo 2',system-ui;
  --f-cap:700 12px/1.2 'Nunito',system-ui; --f-chip:800 10.5px 'Nunito',system-ui;
  --f-tool:800 10px 'Nunito',system-ui;
  --f-btn:700 20px 'Baloo 2',system-ui; --f-h2:700 24px 'Baloo 2',system-ui;
  --sw-off:#DCD3EC; --sw-on:#8ED0B4; --badge-bg:#F0899B; --badge-ink:#fff; --bg-fx-o:.25;
  --f-wm-s:800 13px 'Nunito',system-ui;
  --f-wm-b:800 46px/1 'Baloo 2',system-ui; --wm-ls:.005em;
  --tool-d:60px; --tool-gap:22px; --chip-w:62px; --chip-h:72px;
}
body[data-theme="d"] .setrow b,body[data-theme="d"] .btn-soft span,
body[data-theme="d"] .prog span{font-family:'Nunito',system-ui}
.wordmark span{color:#8B79A6}
.wordmark b{color:#5B4A69;text-shadow:0 4px 0 #E0D6F0,0 6px 10px rgba(96,74,124,.25)}
.chip .pip{background:#CFC2E4;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.6),
  0 1.5px 0 rgba(75,59,87,.15)}
.board-card{background:rgba(255,255,255,.78);border-radius:30px;padding:16px 13px;
  box-shadow:0 12px 28px rgba(96,74,124,.18),inset 0 1.5px 0 rgba(255,255,255,.95)}
.cell.empty>i{background:var(--slot)}
.board.tint .cell.empty>i{background:color-mix(in srgb,var(--c) 22%,#FFFFFF)}
.cell.fill>i{background:var(--c);
  box-shadow:inset 0 2.5px 0 rgba(255,255,255,.55),0 2.5px 0 rgba(75,59,87,.16)}
.board.done .cell>i{box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.cell.hole>i{background:var(--c);filter:saturate(.6) brightness(.86);
  box-shadow:inset 0 2px 5px rgba(75,59,87,.45)}
.hd-nav,.hd-mini{background:#fff;color:#4B3B57;box-shadow:0 4px 0 #D9CFE9,0 6px 12px rgba(96,74,124,.16)}
.hd-nav:active,.hd-mini:active{box-shadow:0 1px 0 #D9CFE9}
.hd-title{background:#fff;border-radius:18px;padding:5px 10px 8px;
  box-shadow:0 4px 0 #D9CFE9,0 7px 14px rgba(96,74,124,.16)}
.deck-wrap>.deck{padding:2px}
.chip{background:#fff;border-radius:18px;box-shadow:0 4.5px 0 #DFD6EE,0 8px 14px rgba(96,74,124,.14)}
.chip .pip{box-shadow:inset 0 1.5px 0 rgba(255,255,255,.6),0 1.5px 0 rgba(75,59,87,.15)}
.chip.sel{box-shadow:0 0 0 3px #F0899B,0 4.5px 0 #DFD6EE}
.chip.hint{animation:pulseD 1.05s ease-in-out infinite}
@keyframes pulseD{50%{box-shadow:0 0 0 4px rgba(142,208,180,.85),0 4.5px 0 #DFD6EE}}
.tool i{color:#fff;font-size:24px}
.tool:nth-child(1) i{background:#F7B48C;box-shadow:0 5px 0 #D08B62,0 9px 15px rgba(96,74,124,.2)}
.tool:nth-child(2) i{background:#8ED0B4;box-shadow:0 5px 0 #63A88C,0 9px 15px rgba(96,74,124,.2)}
.tool:nth-child(3) i{background:#C4AEE8;box-shadow:0 5px 0 #9A83C4,0 9px 15px rgba(96,74,124,.2)}
.tool:active i{transform:translateY(4px)}
.tool:nth-child(1):active i{box-shadow:0 1px 0 #D08B62}
.tool:nth-child(2):active i{box-shadow:0 1px 0 #63A88C}
.tool:nth-child(3):active i{box-shadow:0 1px 0 #9A83C4}
.btn-primary{background:#8ED0B4;color:#fff;border-radius:24px;
  text-shadow:0 1.5px 0 rgba(75,59,87,.22);box-shadow:0 6px 0 #63A88C,0 11px 18px rgba(96,74,124,.22)}
.btn-primary:active{box-shadow:0 2px 0 #63A88C}
.btn-soft{background:#fff;border-radius:20px;box-shadow:0 4.5px 0 #DFD6EE,0 8px 14px rgba(96,74,124,.14)}
.btn-soft:active{box-shadow:0 1px 0 #DFD6EE}
.btn-ghost{background:#F3EEFA;border-radius:20px;box-shadow:0 4.5px 0 #DFD6EE}
.prog-bar{background:rgba(255,255,255,.75);box-shadow:inset 0 1.5px 3px rgba(96,74,124,.16)}
.prog-bar>i{background:linear-gradient(90deg,#8ED0B4,#B5E3D0)}
.frame{background:#fff;border-radius:18px;box-shadow:0 4px 0 #E4DCF0,0 7px 12px rgba(96,74,124,.12)}
.setrow{background:#fff;border-radius:20px;box-shadow:0 4px 0 #E4DCF0}
.panel{background:#fff;border-radius:30px;box-shadow:0 24px 50px rgba(75,59,87,.28)}
.picframe{padding:11px;background:#F6F1FC;border-radius:22px;
  box-shadow:inset 0 0 0 2px #E7DEF5}
` }
];

/* ------------------------------------------------------------------ HTML */
const SCREENS = `
  <div class="screen on" id="scHome">
    <div class="home">
      <div class="wordmark"><span>COZY</span><b>MOSAIC</b></div>
      <div class="home-pic picframe board" id="homePic"></div>
      <div class="home-cta">
        <button class="btn-primary" data-go="game"><b>Chơi tiếp</b><span>MÀN 7 · CON CÚ</span></button>
      </div>
      <div class="home-row">
        <button class="btn-soft" data-go="gal"><i>▦</i><span>Phòng tranh</span></button>
        <button class="btn-soft" data-go="set"><i>⚙</i><span>Cài đặt</span></button>
      </div>
      <div class="prog">
        <div class="prog-bar"><i style="width:38%"></i></div>
        <span>ĐÃ KHẢM 6 / 16 BỨC</span>
      </div>
    </div>
  </div>

  <div class="screen" id="scGame">
    <header class="hd">
      <button class="hd-nav" data-go="home">‹</button>
      <div class="hd-title"><span>MÀN</span><b>7</b></div>
      <button class="hd-mini" id="btnTint" title="Tranh mờ dẫn đường">◉</button>
      <button class="hd-mini" data-go="gal" title="Phòng tranh">▦</button>
    </header>
    <div class="stage">
      <div class="board-card" id="boardCard"><div class="board tint" id="board"></div></div>
      <div class="cap" id="cap">Con cú · còn 18 ô</div>
      <div class="prog-bar boardprog"><i id="capBar"></i></div>
    </div>
    <div class="deck-wrap"><div class="deck" id="deck"></div></div>
    <div class="tools">
      <button class="tool" id="btnUndo"><i>↩</i><em>Hoàn tác</em></button>
      <button class="tool" id="btnHint"><i>💡</i><em>Gợi ý</em><span class="badge">3</span></button>
      <button class="tool" id="btnRe"><i>↺</i><em>Làm lại</em></button>
    </div>
    <div class="ov" id="ovWin">
      <div class="panel">
        <div class="win-pic picframe board" id="winPic"></div>
        <div class="win-name">Con cú</div>
        <div class="win-sub">BỨC THỨ 7 · ĐÃ VÀO PHÒNG TRANH</div>
        <div class="prow">
          <button class="btn-ghost" id="winAgain">↺</button>
          <button class="btn-primary" id="winNext"><b>Màn sau</b><span>MÀN 8 · CÁ VOI CON</span></button>
        </div>
      </div>
    </div>
  </div>

  <div class="screen" id="scGal">
    <div class="sheet-hd">
      <button class="hd-nav" data-go="home">‹</button>
      <b>Phòng tranh</b>
      <span style="width:38px"></span>
    </div>
    <div class="gal" id="gal"></div>
  </div>

  <div class="screen" id="scSet">
    <div class="sheet-hd">
      <button class="hd-nav" data-go="home">‹</button>
      <b>Cài đặt</b>
      <span style="width:38px"></span>
    </div>
    <div class="setlist">
      <button class="setrow on" data-sw><i>♪</i><b>Âm thanh</b><span class="sw"></span></button>
      <button class="setrow on" data-sw><i>≈</i><b>Rung</b><span class="sw"></span></button>
      <button class="setrow on" data-sw><i>◉</i><b>Tranh mờ dẫn đường</b><span class="sw"></span></button>
      <button class="setrow" data-sw><i>♬</i><b>Nhạc nền</b><span class="sw"></span></button>
      <button class="setrow"><i>⚐</i><b>Ngôn ngữ</b><em>Tiếng Việt ›</em></button>
      <button class="setrow"><i>⌫</i><b>Xoá tiến độ</b><em>›</em></button>
    </div>
  </div>
`;

/* -------------------------------------------------------------------- JS */
/* Viết bằng nối chuỗi, không dùng template literal — file này đã nằm trong
 * một template literal rồi, thêm backtick nữa là phải escape khắp nơi. */
const APP = `
const PICS = ${PICS};
const CUR  = PICS[3];                       /* Con cú — bức của màn demo */
const HOLE = 'w';                           /* mắt cú = ô khảm sẵn */
const MASK = ["1111...","111....","11111..","1111...","111....","1111..."];

/* --------------------------------------------------------- vẽ một board */
function paint(el, pic, opt){
  opt = opt || {};
  const art = pic.art, W = art[0].length, H = art.length;
  const cx = (W-1)/2, cy = (H-1)/2, maxD = Math.hypot(cx,cy) || 1;
  el.style.setProperty('--w', W);
  let html = '';
  for(let y=0; y<H; y++){
    for(let x=0; x<W; x++){
      const ch = art[y][x];
      if(ch === '.'){ html += '<span class="cell void"></span>'; continue; }
      const col = pic.palette[ch] || '#CCC';
      const hole = !opt.all && opt.hole && ch === opt.hole;
      /* mask = trạng thái chơi dở của màn demo; frac = khung "đang khảm" trong
       * phòng tranh, dùng cho bức có kích thước khác mask. */
      let on = opt.all || hole;
      if(!on && opt.mask && opt.mask[y]) on = opt.mask[y][x] === '1';
      else if(!on && opt.frac)           on = (y + (x % 2) * 0.5) < H * opt.frac;
      const cls  = hole ? 'hole' : (on ? 'fill' : 'empty');
      /* Trễ theo khoảng cách tới tâm — màu loang từ giữa ra rìa lúc kết màn. */
      const d = Math.round(Math.hypot(x-cx, y-cy) / maxD * 620);
      const rot = ((x*7 + y*13) % 5 - 2) * 0.5;
      html += '<span class="cell ' + cls + '" style="--c:' + col +
              ';--rot:' + rot + 'deg;transition-delay:' + d + 'ms"><i></i></span>';
    }
  }
  el.innerHTML = html;
}

/* ------------------------------------------------------------------ khay */
const CHIPS = [
  { g:[[1,0],[1,0],[1,1]], n:2, c:'#F2A25C' },
  { g:[[1,1,1],[0,1,0]],   n:1, c:'#8ED0B4' },
  { g:[[1],[1],[1]],       n:3, c:'#F0CE6A' },
  { g:[[1,1],[1,1]],       n:1, c:'#C4AEE8' },
  { g:[[0,1,1],[1,1,0]],   n:0, c:'#8FB8DA' }
];
function buildDeck(el){
  el.innerHTML = CHIPS.map(function(s, i){
    let art = '<div class="chip-art" style="grid-template-columns:repeat(' +
              s.g[0].length + ',var(--pip,9px))">';
    for(const row of s.g) for(const v of row)
      art += v ? '<span class="pip"></span>' : '<span></span>';
    art += '</div>';
    return '<button class="chip' + (s.n ? '' : ' gone') + (i === 1 ? ' sel' : '') +
           (i === 3 ? ' hint' : '') + '" style="--pip-bg:' + s.c + '">' +
           art + '<span class="chip-n">×' + s.n + '</span></button>';
  }).join('');
  el.querySelectorAll('.chip').forEach(function(c){
    c.onclick = function(){
      if(c.classList.contains('gone')) return;
      el.querySelectorAll('.chip').forEach(function(o){ o.classList.remove('sel'); });
      c.classList.add('sel');
    };
  });
}

/* ---------------------------------------------------------- phòng tranh */
function buildGal(el){
  let html = '';
  PICS.forEach(function(p, i){
    html += '<figure class="frame"><div class="board' + (i < 5 ? ' done' : '') +
            '" data-pic="' + i + '"></div><small>' + p.name + '</small></figure>';
  });
  for(let i = 0; i < 3; i++)
    html += '<figure class="frame lock"><div class="lockbox">🔒</div><small>Chưa mở</small></figure>';
  el.innerHTML = html;
  el.querySelectorAll('[data-pic]').forEach(function(b){
    const i = +b.dataset.pic;
    paint(b, PICS[i], i < 5 ? { all:true } : { frac:.55 });
  });
}

/* ------------------------------------------------------------ điều hướng */
const SCR = { home:'scHome', game:'scGame', gal:'scGal', set:'scSet' };
function go(k){
  Object.values(SCR).forEach(function(id){ document.getElementById(id).classList.remove('on'); });
  document.getElementById(SCR[k]).classList.add('on');
  document.querySelectorAll('.db-tabs button').forEach(function(b){
    b.classList.toggle('on', b.dataset.tab === k);
  });
}

/* ------------------------------------------------------------- cú kết màn */
const board = document.getElementById('board');
const card  = document.getElementById('boardCard');
const cap   = document.getElementById('cap');

function left(){ return board.querySelectorAll('.cell.empty').length; }
function updCap(){
  const n = left(), all = board.querySelectorAll('.cell.fill,.cell.hole,.cell.empty').length;
  cap.textContent = n ? 'Con cú · còn ' + n + ' ô' : 'Con cú · xong rồi';
  document.getElementById('capBar').style.width = Math.round((all - n) / all * 100) + '%';
}
function finish(){
  board.classList.remove('tint');
  board.classList.add('done');
  card.classList.add('sheen');
  setTimeout(function(){ card.classList.remove('sheen'); }, 1000);
  setTimeout(function(){ document.getElementById('ovWin').classList.add('on'); }, 1250);
}
function runWin(){
  go('game');
  document.getElementById('ovWin').classList.remove('on');
  const cells = Array.prototype.slice.call(board.querySelectorAll('.cell.empty'));
  cells.forEach(function(c, i){
    setTimeout(function(){
      c.classList.remove('empty'); c.classList.add('fill'); updCap();
    }, i * 70);
  });
  setTimeout(finish, cells.length * 70 + 220);
}
function reset(){
  paint(board, CUR, { mask:MASK, hole:HOLE });
  board.classList.remove('done');
  board.classList.add('tint');
  document.getElementById('ovWin').classList.remove('on');
  updCap();
}

/* ------------------------------------------------------------------ khởi */
paint(document.getElementById('homePic'), CUR, { all:true });
document.getElementById('homePic').classList.add('done');
paint(document.getElementById('winPic'), CUR, { all:true });
document.getElementById('winPic').classList.add('done');
buildDeck(document.getElementById('deck'));
buildGal(document.getElementById('gal'));
reset();

board.onclick = function(e){
  const c = e.target.closest('.cell');
  if(!c || !c.classList.contains('empty') || board.classList.contains('done')) return;
  c.classList.remove('empty'); c.classList.add('fill');
  updCap();
  if(!left()) finish();
};
document.getElementById('btnTint').onclick = function(){
  board.classList.toggle('tint');
  this.classList.toggle('off', !board.classList.contains('tint'));
};
document.getElementById('btnRe').onclick = reset;
document.getElementById('winAgain').onclick = reset;
document.getElementById('winNext').onclick = reset;
document.getElementById('btnUndo').onclick = function(){
  const f = board.querySelectorAll('.cell.fill');
  if(f.length){ const c = f[f.length-1]; c.classList.remove('fill'); c.classList.add('empty'); updCap(); }
};
document.getElementById('btnHint').onclick = function(){
  const e = board.querySelector('.cell.empty');
  if(!e) return;
  e.animate([{opacity:1},{opacity:.25},{opacity:1}], {duration:600, iterations:2});
};
document.querySelectorAll('[data-go]').forEach(function(b){
  b.onclick = function(){ go(b.dataset.go); };
});
document.querySelectorAll('[data-sw]').forEach(function(b){
  b.onclick = function(){ b.classList.toggle('on'); };
});
document.querySelectorAll('.db-tabs button').forEach(function(b){
  b.onclick = function(){ go(b.dataset.tab); };
});
document.getElementById('dbWin').onclick = runWin;
document.getElementById('dbReset').onclick = function(){ reset(); go('game'); };

/* Khung máy 400×844 phải vừa cửa sổ — thu nhỏ chứ không cắt. */
function fit(){
  const wrap = document.querySelector('.stagewrap');
  const s = Math.min(1, (wrap.clientHeight - 20) / 844, (wrap.clientWidth - 20) / 400);
  document.querySelector('.phone').style.setProperty('--ps', s);
}
addEventListener('resize', fit); fit();

/* Deep-link để soi nhanh: demo-1-gom-vai.html#game / #gal / #set */
function hashGo(){
  const k = location.hash.slice(1);
  if(k === 'win'){ go('game'); board.classList.remove('tint'); board.classList.add('done');
                   board.querySelectorAll('.cell.empty').forEach(function(c){
                     c.classList.remove('empty'); c.classList.add('fill'); });
                   updCap(); document.getElementById('ovWin').classList.add('on'); return; }
  if(SCR[k]) go(k);
}
hashGo();
addEventListener('hashchange', hashGo);
`;

/* --------------------------------------------------------------- ghi file */
function page(t){
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Demo UI ${t.key.toUpperCase()} — ${t.name} · Cozy Mosaic</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${t.fonts}&display=swap" rel="stylesheet">
<style>${BASE_CSS}${t.css}</style>
</head>
<body data-theme="${t.key}">

<div class="demobar">
  <div class="db-name"><b>Hướng ${t.key.toUpperCase()} · ${t.name}</b><span>${t.en}</span></div>
  <div class="db-tabs">
    <button data-tab="home" class="on">Trang chủ</button>
    <button data-tab="game">Chơi</button>
    <button data-tab="gal">Phòng tranh</button>
    <button data-tab="set">Cài đặt</button>
  </div>
  <div class="db-act">
    <button class="go" id="dbWin">▶ Chạy cú kết màn</button>
    <button id="dbReset">↺ Đặt lại</button>
    <a href="index.html">‹ 4 hướng</a>
  </div>
</div>

<div class="stagewrap">
  <div class="phone">
${SCREENS}
  </div>
</div>

<script>${APP}</script>
</body>
</html>
`;
}

/* ------------------------------------------------------- trang chọn hướng */
function indexPage(){
  const cards = THEMES.map(t => `
    <a class="card" href="${t.file}">
      <img src="assets/${t.shot}" alt="${t.name}">
      <div class="cbody">
        <b><span>${t.key.toUpperCase()}</span> ${t.name}</b>
        <em>${t.en}</em>
        <p>${t.pitch}</p>
        <ul>${t.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        <img class="logo" src="assets/${t.logo}" alt="logo ${t.name}" loading="lazy">
        <span class="open">Mở demo chạy được ›</span>
      </div>
    </a>`).join('');
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cozy Mosaic — 4 hướng UI</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#1B1916;color:#E9E1D4;
     font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{padding:34px 30px 8px;max-width:1500px;margin:0 auto}
h1{margin:0 0 6px;font:600 27px/1.2 "Segoe UI",system-ui,sans-serif;letter-spacing:-.01em}
header p{margin:0;color:#9E9384;max-width:78ch}
header p b{color:#D6C9B3;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));
      gap:20px;padding:24px 30px 46px;max-width:1500px;margin:0 auto}
.card{display:flex;flex-direction:column;background:#242019;border:1px solid rgba(255,255,255,.08);
      border-radius:18px;overflow:hidden;text-decoration:none;color:inherit;
      transition:transform .16s,border-color .16s,box-shadow .16s}
.card:hover{transform:translateY(-4px);border-color:rgba(216,168,91,.5);
            box-shadow:0 16px 34px rgba(0,0,0,.45)}
.card img{width:100%;aspect-ratio:9/16;object-fit:cover;object-position:top;display:block;
          background:#15130F}
.cbody{padding:15px 17px 18px;display:flex;flex-direction:column;gap:7px}
.cbody b{font:600 18px/1.2 "Segoe UI",system-ui,sans-serif;display:flex;align-items:center;gap:9px}
.cbody b span{width:24px;height:24px;border-radius:7px;background:#3A342A;color:#E8C795;
              display:grid;place-items:center;font:700 12px system-ui}
.cbody em{color:#8E8474;font-style:normal;font-size:12px;letter-spacing:.05em;text-transform:uppercase}
.cbody p{margin:4px 0 0;color:#BFB4A1;font-size:13.5px}
.cbody ul{margin:2px 0 0;padding-left:17px;color:#9E9384;font-size:12.5px}
.cbody li{margin:3px 0}
.cbody .logo{width:100%;height:96px;object-fit:cover;object-position:center;border-radius:10px;
             margin-top:8px;background:#15130F}
.open{margin-top:8px;color:#E8C795;font:600 13px system-ui}
footer{padding:0 30px 44px;max-width:1500px;margin:0 auto;color:#7E7566;font-size:12.5px}
footer code{background:#242019;padding:2px 6px;border-radius:5px;color:#BFB4A1}
</style>
</head>
<body>
<header>
  <h1>Cozy Mosaic — 4 hướng UI để chọn</h1>
  <p>Ảnh lớn là <b>art direction do codeb sinh</b>; bấm vào thẻ để mở <b>demo chạy được</b> dựng
     bằng HTML/CSS thật, có đủ 4 màn hình (trang chủ · chơi · phòng tranh · cài đặt) và cả
     <b>cú kết màn</b>. Board trong demo dùng đúng dữ liệu tranh của game. Chốt một hướng rồi
     mình áp thẳng vào <code>index.html</code>.</p>
</header>
<div class="grid">${cards}</div>
<footer>
  Sinh lại: <code>node "Block Wow 5/ui-demos/build-demos.mjs"</code> ·
  Ảnh: <code>codeb image</code> (Nano Banana Pro cho mockup + logo, Flash cho texture).
</footer>
</body>
</html>
`;
}

for(const t of THEMES){
  writeFileSync(join(OUT, t.file), page(t), 'utf8');
  console.log('  ✓ ' + t.file + '  (' + t.name + ')');
}
writeFileSync(join(OUT, 'index.html'), indexPage(), 'utf8');
console.log('  ✓ index.html  (trang chọn hướng)');
