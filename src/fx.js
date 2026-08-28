/* ============================================================================
 * fx.js — Chuyển động của khối lúc ĐẶT XUỐNG board và lúc TRẢ VỀ KHAY.
 * ----------------------------------------------------------------------------
 * Ở đây CHỈ có trạng thái và thời gian. Việc vẽ nằm hết bên `render.js` — nó
 * đã giữ toàn bộ bộ vẽ gốm (đường bao, mạch vữa, vệt vát, viền sáng); tách ra
 * vẽ riêng là phải chép lần hai, rồi hai bản lệch nhau lúc nào không hay.
 *
 * BA CÚ, không hơn:
 *
 *   land    Khối vừa nằm xuống. KHÔNG rơi từ trên xuống — lúc kéo thả, khối đã
 *           nằm sẵn dưới ngón tay đúng ô đó rồi; cho nó rơi thêm một quãng là
 *           kể sai chuyện. Cái người chơi vừa làm là ẤN XUỐNG.
 *
 *   flyIn   Chạm chip rồi chạm board: khối BAY TỪ Ô KHAY LÊN, tới nơi mới
 *           `land`. Chỉ đường đặt này mới có, vì chỉ ở đây khối mới thật sự đi
 *           từ khay lên board. Kéo thả thì không — nó đã ở trên tay.
 *
 *   flyOut  Khối rời board về khay: chạm để gỡ (luật 8), bị đè đẩy ra (luật 6),
 *           kéo ra ngoài tranh, hoàn tác. Một cú duy nhất cho cả bốn đường.
 *
 * `flyIn`/`flyOut` GIỐNG NHAU ở cả bốn kiểu — đó là phần đã duyệt. Cái khác
 * nhau giữa bốn kiểu chỉ là `land`: khối đáp xuống ra sao.
 *
 * Khối đang bay vẽ trên `#dragLayer` (fixed, phủ cả viewport) chứ không phải
 * canvas board: canvas board dừng đúng ở mép tranh, bay tới khay là bị cắt cụt.
 *
 * Không giữ toạ độ pixel nào ở đây. Ô khay là DOM và co giãn theo khổ màn hình
 * nên vị trí phải hỏi `R.chipPoint()` lúc bắt đầu bay; vị trí trên board thì
 * render tự suy từ `idxs` mỗi khung hình — xoay ngang điện thoại giữa chừng
 * cũng không lệch.
 * ==========================================================================*/
(function(){

  /* -------------------------------------------------------------- BỐN KIỂU
   * `kind` quyết định cách khối đáp:
   *   spring — nén một chiều / phình chiều kia rồi dao động tắt dần.
   *            `ax`/`ay` là biên độ ngang/dọc; lệch nhau vì mắt bắt chiều dọc
   *            nhạy hơn, bằng nhau thì đọc ra "phóng to" chứ không ra "nện".
   *   press  — hiện ra to hơn rồi lún về đúng cỡ ô. Không quá đà, không nảy.
   *
   * `dust` 0 = không bụi. `ripple` 1 = các khối xung quanh lún theo thành sóng. */
  const PRESETS = [
    { id:'A', name:'Nén & bật',
      desc:'Khối nén dọc 15% / phình ngang 11% rồi bật lại, dao động tắt dần trong 260 ms, kèm bụi vữa ở chân.',
      land:260, kind:'spring', ax:0.11, ay:0.15, damp:4.2, freq:7.6, dust:1, ripple:0 },

    { id:'B', name:'Ấn vào vữa',
      desc:'Khối hiện ra to hơn 6% rồi lún về đúng cỡ ô trong 170 ms. Không quá đà, không nảy, không bụi.',
      land:170, kind:'press', from:1.06, dust:0, ripple:0 },

    { id:'C', name:'Nảy gốm',
      desc:'Như kiểu A nhưng mạnh tay: nén 23%, dao động lâu hơn, bụi bắn nhiều hơn. 320 ms.',
      land:320, kind:'spring', ax:0.17, ay:0.23, damp:3.5, freq:8.6, dust:1.7, ripple:0 },

    { id:'D', name:'Board rung theo',
      desc:'Khối đáp gọn trong 150 ms, rồi CÁC KHỐI XUNG QUANH lún theo thành sóng lan ra — khối càng xa vào càng chậm.',
      land:150, kind:'spring', ax:0.07, ay:0.10, damp:5.2, freq:8.2, dust:0, ripple:1 }
  ];

  /* Sóng của kiểu D. Đo TÂM tới TÂM chứ không phải mép tới mép: cả khối lún
   * xuống như MỘT đơn vị nên thứ quyết định lúc nó lún là tâm nó ở đâu. Đo từ
   * mép thì gần hết mọi khối đều "cách 1 ô" và sóng sụp thành một nhịp. */
  const RIPPLE = { stag:46, ms:150, depth:0.05, reach:6 };

  const MS = { flyIn:280, flyOut:320, dust:300 };

  /* KIỂU ĐANG DÙNG — 'A', đã duyệt. Ba kiểu kia giữ lại cho bản duyệt
   * `demo/anim-presets.html`; đổi mặc định là sửa đúng dòng dưới đây. */
  const DEFAULT = 'A';
  let P = PRESETS.filter(function(p){ return p.id === DEFAULT; })[0] || PRESETS[0];

  /* pid → mốc bắt đầu `land`. Mốc CÓ THỂ NẰM Ở TƯƠNG LAI: khối đang bay từ
   * khay lên thì đã có mặt trong `G.placements` nhưng chưa được vẽ ở board;
   * `xformOf` trả `hidden` cho tới đúng lúc nó đáp. */
  const lands  = new Map();
  const dips   = new Map();   // pid → { t0 } — khối lún theo sóng của kiểu D
  const flyers = [];          // { pid, shapeId, idxs, t0, ms, dir, pt, hand }
  const dusts  = [];          // { pid, t0, p }

  let T = 0;

  function tick(t){
    T = t;
    for(let k=flyers.length-1;k>=0;k--)
      if(t - flyers[k].t0 >= flyers[k].ms) flyers.splice(k,1);
    for(let k=dusts.length-1;k>=0;k--)
      if(t - dusts[k].t0 >= MS.dust) dusts.splice(k,1);
    lands.forEach(function(t0, pid){ if(t - t0 >= P.land) lands.delete(pid); });
    dips.forEach(function(d, pid){ if(t - d.t0 >= RIPPLE.ms) dips.delete(pid); });
  }

  /* Tâm khối theo Ô LƯỚI (không phải pixel) — chỉ dùng để xếp thứ tự sóng. */
  function centerOf(idxs, cols){
    let sr = 0, sc = 0;
    for(let k=0;k<idxs.length;k++){ sr += (idxs[k]/cols)|0; sc += idxs[k]%cols; }
    return [sr/idxs.length, sc/idxs.length];
  }

  function ripple(pid, at){
    const G = window.G;
    if(!G || !G.placements) return;
    const me = G.placements.get(pid);
    if(!me) return;
    const c0 = centerOf(me.idxs, G.cols);
    G.placements.forEach(function(pl){
      if(pl.id === pid) return;
      const c = centerOf(pl.idxs, G.cols);
      const d = Math.hypot(c[0]-c0[0], c[1]-c0[1]);
      if(d > RIPPLE.reach) return;
      dips.set(pl.id, { t0: at + 40 + Math.max(0, d-1)*RIPPLE.stag });
    });
  }

  function land(pid, at){
    const t0 = (at == null) ? T : at;
    lands.set(pid, t0);
    if(P.dust) dusts.push({ pid:pid, t0:t0, p:P.dust });
    if(P.ripple) ripple(pid, t0);
  }

  function flyIn(pid, shapeId, idxs, pt){
    if(!pt){ land(pid); return; }            // không tìm thấy ô khay: đáp luôn
    flyers.push({ pid:pid, shapeId:shapeId, idxs:idxs.slice(), t0:T,
                  ms:MS.flyIn, dir:'in', pt:pt, hand:null });
    land(pid, T + MS.flyIn);                 // đáp NGAY khi bay tới, không hở khung
  }

  /* `hand` là chỗ bắt đầu bay, theo toạ độ màn hình — dùng cho cú kéo khối ra
   * ngoài tranh: lúc đó khối đang ở đầu ngón tay chứ không còn ở chỗ cũ trên
   * board nữa, bay từ chỗ cũ ra là bay từ một nơi không có gì. */
  function flyOut(pid, shapeId, idxs, pt, hand){
    lands.delete(pid); dips.delete(pid);
    if(!pt) return;
    flyers.push({ pid:pid, shapeId:shapeId, idxs:idxs.slice(), t0:T,
                  ms:MS.flyOut, dir:'out', pt:pt, hand:hand || null });
  }

  /* Khối này đang co giãn thế nào? null = đứng yên, vẽ như thường. */
  function xformOf(pid){
    const t0 = lands.get(pid);
    if(t0 != null){
      if(T < t0) return { hidden:true };
      const u = (T - t0)/P.land;
      if(u < 1){
        if(P.kind === 'press'){
          const e = 1 - Math.pow(1-u, 3);
          const s = P.from - (P.from-1)*e;
          return { sx:s, sy:s };
        }
        const q = Math.exp(-P.damp*u)*Math.cos(P.freq*u);   // tắt dần, q(0)=1
        return { sx: 1 + P.ax*q, sy: 1 - P.ay*q };
      }
    }
    const d = dips.get(pid);
    if(d){
      const u = (T - d.t0)/RIPPLE.ms;
      if(u <= 0 || u >= 1) return null;
      const s = 1 - RIPPLE.depth*Math.sin(Math.PI*u);
      return { sx:s, sy:s };
    }
    return null;
  }

  function use(id){
    for(let k=0;k<PRESETS.length;k++) if(PRESETS[k].id === id){
      P = PRESETS[k]; clear(); return P;
    }
    return P;
  }
  function clear(){ lands.clear(); dips.clear(); flyers.length = 0; dusts.length = 0; }
  function active(){
    return flyers.length > 0 || dusts.length > 0 || lands.size > 0 || dips.size > 0;
  }

  window.FX = {
    MS:MS, tick:tick, now:function(){ return T; },
    land:land, flyIn:flyIn, flyOut:flyOut,
    xformOf:xformOf, clear:clear, active:active,
    use:use, presets:function(){ return PRESETS; }, current:function(){ return P; },
    flyers:function(){ return flyers; },
    dusts:function(){ return dusts; }
  };

})();
