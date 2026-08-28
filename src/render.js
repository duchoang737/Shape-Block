/* ============================================================================
 * render.js — Board vẽ bằng canvas, khay (deck) là DOM.
 * ----------------------------------------------------------------------------
 * Chất liệu là GỐM, không phải nhựa bóng: mặt mờ, mạch vữa giữa các ô, mỗi ô
 * lệch sắc độ nhẹ một chút để tranh xong không phẳng như vector (Cozy Mosaic §06).
 *
 * MÀU THUỘC Ô BOARD. Khối kéo từ khay là màu đất trung tính; đặt xuống thì ô
 * hiện màu tranh của chính nó. Một khối nằm vắt qua hai vùng màu là chuyện
 * bình thường.
 * ==========================================================================*/
(function(){

  const T = {
    linen:'#EFE3D0', paper:'#FFFDF8', slot:'#F0E6D6',
    block:'#D8C2A4', accent:'#C4794A', ink:'#5B4B34'
  };
  window.THEME = T;

  /* Bề rộng mạch vữa, tính theo % cạnh ô, mỗi bên. Khe nhìn thấy giữa hai ô kề
   * nhau = 2×GROUT. Chỉnh một chỗ này là đổi cả board, khối đang kéo lẫn khay.
   * Bo góc để ở 9% cạnh ô — đủ mềm để không sắc lẹm, nhưng ô đọc ra là VUÔNG. */
  const GROUT = 0.022;

  /* Khối vừa đặt xuống có lên màu tranh ngay không?
   *   true  — đặt tới đâu tranh hiện tới đó (mô típ tô màu theo số).
   *   false — giữ màu đất, màu chỉ đến khi lấp kín (luật trong prompt bàn giao).
   * Chủ tài liệu chơi thử thấy board không lên màu là mất hứng, nên để true.
   * Cú kết màn vẫn còn: mạch vữa khép lại loang từ tâm ra. */
  const COLOR_ON_PLACE = true;

  /* Độ mềm của MÉP GIỮA HAI VÙNG MÀU trong tranh, tính theo phần cạnh ô, mỗi
   * bên. 0 = mép sắc hoàn toàn. Xem `blendPicture()` ở cuối file. */
  const EDGE_SOFT = 0.05;


  const L = { w:0, h:0, cell:0, bx:0, by:0, boardW:0, boardH:0 };
  window.L = L;

  /* ------------------------------------------------------------- KHUNG NHÌN
   * Bình thường khung nhìn là CẢ BOARD. Màn có tường chia vùng thì mỗi lượt chỉ
   * soi MỘT vùng: khung nhìn co vào đúng hình chữ nhật bao vùng đó, ô to hẳn
   * lên, mấy vùng còn lại trôi ra ngoài mép canvas.
   *
   * Không đụng tới cỡ canvas — chỉ đổi `L.cell` / `L.bx` / `L.by`. Mọi thứ
   * khác (vẽ board, bắt toạ độ chạm qua `boardIndexAt`, khối đang kéo) đều đọc
   * ba biến đó nên tự đi theo, không phải sửa chỗ nào nữa.
   *
   * Đây cũng là chỗ khiến TƯỜNG KHÔNG CẦN VẼ RA: mép khung nhìn chính là bức
   * tường. Cái nét dài cắt ngang bức tranh — lý do tường từng bị tắt — biến
   * mất, mà cơ chế chia vùng vẫn nguyên. */
  const VIEW_MS = 640;
  let vFrom = null, vTo = null, vT = 1, vT0 = 0;

  function fullView(){
    const G = window.G;
    return { r0:0, c0:0, r1:G.rows-1, c1:G.cols-1 };
  }
  function curView(){
    if(!vTo) return fullView();
    if(vT >= 1 || !vFrom) return vTo;
    const e = 1 - Math.pow(1 - vT, 3);
    return { r0: vFrom.r0 + (vTo.r0 - vFrom.r0)*e,
             c0: vFrom.c0 + (vTo.c0 - vFrom.c0)*e,
             r1: vFrom.r1 + (vTo.r1 - vFrom.r1)*e,
             c1: vFrom.c1 + (vTo.c1 - vFrom.c1)*e };
  }
  /* `rect` null = xem cả board. `animate` false = nhảy thẳng (lúc nạp màn). */
  function setView(rect, animate){
    const G = window.G;
    if(!G || !G.level) return;
    const to = rect ? { r0:rect.r0, c0:rect.c0, r1:rect.r1, c1:rect.c1 } : fullView();
    vFrom = animate ? curView() : to;
    vTo   = to;
    vT    = animate ? 0 : 1;
    vT0   = (typeof performance !== 'undefined' ? performance.now() : 0);
  }
  function viewBusy(){ return vT < 1; }
  function zoomed(){
    const G = window.G;
    if(!vTo || !G || !G.level) return false;
    return (vTo.c1 - vTo.c0 + 1) < G.cols || (vTo.r1 - vTo.r0 + 1) < G.rows;
  }

  let cv, ctx, dg, dctx, deckEl;

  function bind(boardCanvas, dragCanvas, deckContainer){
    cv = boardCanvas;  ctx  = cv.getContext('2d');
    dg = dragCanvas;   dctx = dg.getContext('2d');
    deckEl = deckContainer;
    /* Ô khay dùng hết thì co về bề rộng 0 trong 0,24 s — khay hết tràn lúc nào
     * chỉ `transitionend` mới biết, `syncDeck()` gọi trước đó thì còn quá sớm. */
    deckEl.addEventListener('scroll', deckEdges, { passive:true });
    deckEl.addEventListener('transitionend', deckEdges);
    window.addEventListener('resize', deckEdges);
  }

  /* --------------------------------------------------------------- colours */
  function hexRGB(h){
    h = h.replace('#','');
    if(h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  function toHex(r,g,b){
    const c = function(n){ return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2,'0'); };
    return '#'+c(r)+c(g)+c(b);
  }
  /* Trả HEX chứ không phải 'rgb(...)': kết quả còn được đem đi mix() tiếp, mà
   * hexRGB() chỉ đọc được hex. Trả rgb() thì vòng hai ra NaN và canvas lặng lẽ
   * giữ nguyên fillStyle cũ — lỗi không ném exception nào. */
  function mix(a, b, t){
    const A = hexRGB(a), B = hexRGB(b);
    return toHex(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t);
  }
  function shade(hex, amt){
    const c = hexRGB(hex);
    return toHex(c[0]+255*amt, c[1]+255*amt, c[2]+255*amt);
  }
  function rgba(hex, a){ const c = hexRGB(hex); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }

  /* Lệch sắc độ theo từng ô — tất định theo chỉ số ô, không dùng Math.random
   * (nếu không thì mỗi khung hình một màu, board sẽ nhấp nháy). */
  function jitter(i){
    const h = Math.imul(i ^ 0x9e3779b9, 2654435761) >>> 0;
    return ((h % 1000) / 1000 - 0.5) * 0.055;
  }

  /* ------------------------------------------------------------ primitives */
  function rr(c, x, y, w, h, r){
    r = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r);
    c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r);
    c.arcTo(x,y,x+w,y,r);
    c.closePath();
  }

  /* Chữ nhật bo TẮNG GÓC MỘT KHÁC NHAU, chỉ NỐI vào path đang mở (không
   * beginPath). Dùng cho bóng khối: góc nào giáp viên cùng khối thì bán kính 0,
   * nên mấy viên hợp lại thành một mảng liền chứ không phải mấy ô rời. */
  function rrSub(c, x, y, w, h, tl, tr, br, bl){
    const m = Math.min(w,h)/2;
    tl=Math.min(tl,m); tr=Math.min(tr,m); br=Math.min(br,m); bl=Math.min(bl,m);
    c.moveTo(x+tl, y);
    c.lineTo(x+w-tr, y);   c.arcTo(x+w, y,   x+w, y+h, tr);
    c.lineTo(x+w, y+h-br); c.arcTo(x+w, y+h, x,   y+h, br);
    c.lineTo(x+bl, y+h);   c.arcTo(x,   y+h, x,   y,   bl);
    c.lineTo(x, y+tl);     c.arcTo(x,   y,   x+w, y,   tl);
    c.closePath();
  }

  /* MỘT VIÊN ĐÃ NHẬP VÀO KHỐI. `nb` cho biết bốn phía có phải viên CÙNG KHỐI
   * không; phía nào có thì bỏ mạch vữa và bỏ bo góc, nên mấy viên hợp lại thành
   * MỘT mảng liền — nhìn là biết đâu đến đâu là một khối, gỡ thì gỡ cả mảng đó.
   *
   * `eps` nới thêm ra ngoài ở cạnh đã nhập để hai viên ĐÈ nhau nửa pixel. Hai
   * mảng tô sát nhau thì mép chung chỉ được phủ một nửa, hằn ra sợi chỉ màu nền
   * chạy giữa thân khối — đúng cái cần bỏ đi.
   *
   * Chỉ NỐI vào path đang mở; người gọi tự beginPath và fill. */
  function meshRect(c, x, y, s, nb, gapK, eps, rad){
    const g = s*gapK;
    const x0 = x     + (nb.L ? -eps : g), x1 = x + s - (nb.R ? -eps : g);
    const y0 = y     + (nb.U ? -eps : g), y1 = y + s - (nb.D ? -eps : g);
    if(x1-x0 <= 0.5 || y1-y0 <= 0.5) return;
    rrSub(c, x0, y0, x1-x0, y1-y0,
      (nb.U||nb.L)?0:rad, (nb.U||nb.R)?0:rad, (nb.D||nb.R)?0:rad, (nb.D||nb.L)?0:rad);
  }

  /* Ô gốm: mặt mờ, chỉ một vệt sáng rất nhẹ ở mép trên và một vệt tối ở mép
   * dưới. `gapK` là bề rộng mạch vữa — khép về 0 lúc kết màn. */
  /* `opts.flat` 0→1: mức HOÀ LIỀN. Khép khe vữa thôi chưa đủ để thành một bức
   * tranh liền — góc bo vẫn hở ra màu card ở bốn góc mỗi ô, và vệt sáng riêng
   * của từng viên vẫn cắt ảnh thành ô. Nên `flat` tắt cả hai thứ đó. */
  function tile(c, x, y, s, color, gapK, opts){
    opts = opts || {};
    const flat = opts.flat || 0;
    const g = s*(gapK == null ? GROUT : gapK), S = s-2*g, r = s*0.09*(1-flat);
    if(S <= 0.5) return;
    const X = x+g, Y = y+g;
    rr(c, X, Y, S, S, r);
    c.fillStyle = color; c.fill();
    if(flat >= 0.995) return;              // đã liền hẳn: không vẽ vát nữa
    c.save();
    c.globalAlpha = (c.globalAlpha == null ? 1 : c.globalAlpha) * (1-flat);
    if(opts.sunken){
      // khối đặt sẵn: lõm xuống, bóng đổ vào trong, không có mép sáng
      c.save(); c.clip();
      const gr = c.createLinearGradient(X, Y, X, Y+S);
      gr.addColorStop(0, 'rgba(0,0,0,.20)');
      gr.addColorStop(0.35, 'rgba(0,0,0,.02)');
      gr.addColorStop(1, 'rgba(255,255,255,.10)');
      c.fillStyle = gr; c.fillRect(X, Y, S, S);
      c.restore();
    } else {
      c.save(); c.clip();
      const gr = c.createLinearGradient(X, Y, X, Y+S);
      gr.addColorStop(0, 'rgba(255,255,255,.20)');
      gr.addColorStop(0.5, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(0,0,0,.10)');
      c.fillStyle = gr; c.fillRect(X, Y, S, S);
      c.restore();
    }
    c.restore();
  }

  /* ---------------------------------------------------------------- layout */
  function fit(canvas, c){
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if(canvas.width !== Math.round(w*dpr) || canvas.height !== Math.round(h*dpr)){
      canvas.width  = Math.round(w*dpr);
      canvas.height = Math.round(h*dpr);
    }
    c.setTransform(dpr,0,0,dpr,0,0);
    return [w,h];
  }

  function layout(){
    const G = window.G;
    const wh = fit(cv, ctx);
    L.w = wh[0]; L.h = wh[1];
    if(!G || !G.level) return;
    if(vTo && vT < 1)
      vT = Math.min(1, ((typeof performance !== 'undefined' ? performance.now() : 0) - vT0)/VIEW_MS);
    const V  = curView();
    const vw = (V.c1 - V.c0 + 1), vh = (V.r1 - V.r0 + 1);
    /* Vùng soi cần lề rộng hơn cả board, không thì ô rìa dính sát mép canvas
     * và không đọc ra là "đang soi một mảnh". */
    const pad = zoomed() ? 26 : 8;
    L.cell = Math.max(8, Math.min((L.w-pad)/vw, (L.h-pad)/vh));
    L.boardW = L.cell*G.cols; L.boardH = L.cell*G.rows;
    L.bx = (L.w - vw*L.cell)/2 - V.c0*L.cell;
    L.by = (L.h - vh*L.cell)/2 - V.r0*L.cell;
  }

  /* Canvas co vừa khít board. Phần trống còn lại do #stage căn giữa, nên nó
   * chia đều trên–dưới. */
  function fitBoard(){
    const G = window.G;
    if(!G || !G.level) return;
    const boardCard = cv.parentElement;
    const stage = boardCard.parentElement;
    const capH = 0;                    // game không chữ: không còn caption
    const PAD_X = 7, PAD_MIN = 12, PAD_MAX = 54;

    const availW = stage.clientWidth - PAD_X*2;
    const availH = stage.clientHeight - capH - PAD_MIN*2 - 8;
    if(availW <= 0 || availH <= 0) return;

    const cell = Math.max(8, Math.floor(Math.min(availW/G.cols, availH/G.rows)));
    const boardH = cell*G.rows;

    /* Board bị giới hạn bởi CHIỀU NGANG nên tranh 9 hàng để thừa cả trăm px
     * chiều dọc. Đổ một phần chỗ thừa đó vào đệm dọc của card giấy — thành cái
     * passe-partout của bức tranh, thay vì để nó trôi giữa khoảng trống. */
    const slack = stage.clientHeight - capH - 8 - boardH;
    const padY = Math.max(PAD_MIN, Math.min(PAD_MAX, Math.round(slack*0.34)));
    boardCard.style.padding = padY + 'px ' + PAD_X + 'px';
    cv.style.height = (boardH + 6) + 'px';
  }

  function boardIndexAt(px, py){
    const G = window.G;
    const c = Math.floor((px - L.bx)/L.cell), r = Math.floor((py - L.by)/L.cell);
    if(r<0||r>=G.rows||c<0||c>=G.cols) return -1;
    const i = r*G.cols+c;
    return G.inPic[i] ? i : -1;      // o kham van tra ve, noi goi tu loc
  }

  /* ------------------------------------------------------------ board draw */
  function draw(now){
    const G = window.G;
    layout();
    ctx.clearRect(0,0,L.w,L.h);
    if(!G || !G.level) return;

    const cell = L.cell;
    const rev  = G.revealT;
    const ease = rev<=0 ? 0 : (rev>=1 ? 1 : 1-Math.pow(1-rev,3));

    /* Màu tranh LOANG TỪ TÂM RA RÌA. Bán kính vượt maxD một chút để rìa kịp
     * lên màu trọn vẹn trước khi hết animation. */
    const cr = (G.rows-1)/2, cc0 = (G.cols-1)/2;
    let maxD = 1;
    for(let i=0;i<G.inPic.length;i++){
      if(!G.inPic[i]) continue;
      const r=(i/G.cols)|0, c=i%G.cols;
      const d = Math.sqrt((r-cr)*(r-cr) + (c-cc0)*(c-cc0));
      if(d > maxD) maxD = d;
    }
    /* Bán kính đi theo smoothstep của t THẲNG, không dùng `ease` (ease-out mũ 3
     * đã đạt 0,83 khi t mới 0,45 — vòng loang phủ hết board ngay lập tức, nhìn
     * không ra là đang loang). */
    const tR = rev<=0 ? 0 : (rev>=1 ? 1 : rev*rev*(3-2*rev));
    const radius = tR * (maxD + 2.2);

    const snapSet = G.drag && G.drag.snap ? new Set(G.drag.snap.idxs) : null;

    /* Khối đang BAY TỪ KHAY LÊN đã nằm trong `G.placements` rồi (nước đi ghi
     * xong ngay lúc chạm, không đợi hiệu ứng) nhưng chưa được vẽ ở board — nó
     * đang ở trên #dragLayer. Ô của nó phải hiện ra là ô TRỐNG, không thì thủng
     * một mảng nền linen giữa bức tranh. */
    const hidden = new Set();
    if(window.FX) G.placements.forEach(function(pl){
      const fx = window.FX.xformOf(pl.id);
      if(fx && fx.hidden) hidden.add(pl.id);
    });

    const evictSet = new Set();
    if(G.drag && G.drag.evict)
      for(let k=0;k<G.drag.evict.length;k++)
        for(let q=0;q<G.drag.evict[k].length;q++) evictSet.add(G.drag.evict[k][q]);

    for(let i=0;i<G.inPic.length;i++){
      if(!G.inPic[i]) continue;
      const r=(i/G.cols)|0, c=i%G.cols;
      const x=L.bx+c*cell, y=L.by+r*cell;

      /* Ô KHẢM: luôn màu tranh đầy đủ, vẽ lõm, KHÔNG khép mạch vữa — đọc ra
       * ngay "chỗ này khảm sẵn rồi, không đặt được". */
      if(G.mosaic[i]){
        /* Ô khảm cũng hoà liền lúc kết màn: bức tranh xong phải là MỘT ảnh
         * liền mạch, không còn thấy viên nào tách ra. */
        const dm = Math.sqrt((r-cr)*(r-cr) + (c-cc0)*(c-cc0));
        const km = ease <= 0 ? 0 : Math.max(0, Math.min(1, (radius - dm)/1.6 + 0.5));
        tile(ctx, x, y, cell, shade(G.colorAt[i], jitter(i)*(1-0.7*km)),
             GROUT*(1-km), { sunken:true, flat:km });
        continue;
      }

      const pid = G.fill[i];
      if(pid < 0 || hidden.has(pid)){
        const base = G.showTint ? mix(T.slot, G.colorAt[i], 0.12) : T.slot;
        tile(ctx, x, y, cell, base, GROUT);
        continue;
      }

      /* Ô đã có khối: KHÔNG vẽ ở đây. Cả khối được vẽ một lượt trong
       * `drawBlocks` — một đường bao, một lần cắt, một vệt vát. */
    }

    drawBlocks(cr, cc0, radius, ease, evictSet, hidden);

    if(snapSet) drawGhost(G.drag.snap.idxs);
    /* Đang soi một vùng thì tường là thứ THỪA: mép khung nhìn đã nói hết. Vẽ
     * thêm nét rào vào giữa bức tranh chỉ tổ bẩn. */
    if(!zoomed()) drawWalls(1 - ease);
    drawDust();
    drawVeil();
  }

  /* Phủ mờ MỌI THỨ NGOÀI vùng đang soi. Zoom đã đẩy phần lớn vùng khác ra
   * ngoài mép, nhưng vùng kề bên vẫn ló vào một hai ô — không phủ thì người
   * chơi tưởng chúng cũng đang chơi được. Phủ bằng chính màu nền linen nên
   * trông như bức tranh chưa mở tới đó, không phải như bị che. */
  function drawVeil(){
    const G = window.G;
    const cells = G.regionCells;
    if(!cells || !cells.length || !zoomed()) return;
    const cell = L.cell;

    /* Khoét đúng HÌNH CỦA VÙNG, không phải khung chữ nhật bao nó.
     *
     * Vùng do tường chia ra gần như không bao giờ vuông vắn — khung chữ nhật
     * bao nó liếm sang cả ô của vùng bên cạnh, thành ra người chơi thấy sáng
     * mấy ô mà đặt vào lại không được. Khoét theo đúng đường bao thì vùng sáng
     * CHÍNH LÀ vùng tường đã chia: sáng tới đâu đặt được tới đó. */
    const pts = outline(cells, G.cols, G.rows, cell, L.bx, L.by, -cell*0.055);
    /* Đường bao để KẺ VIỀN. Vùng rời hoặc có lỗ thì `outline()` bó tay (nó chỉ
     * đi được MỘT vòng bao) — lúc đó kẻ từng CẠNH BIÊN một. Xấu hơn nhưng vẫn
     * đúng là đường bao, chứ không thành cái lưới ô như khi vẽ từng ô vuông. */
    const inSet = new Set(cells);
    const strokePath = function(){
      ctx.beginPath();
      if(pts){ tracePath(ctx, pts, cell*0.16); return; }
      for(let q=0;q<cells.length;q++){
        const i = cells[q], r = (i/G.cols)|0, c = i%G.cols;
        const x = L.bx + c*cell, y = L.by + r*cell;
        if(!inSet.has(i-G.cols)){ ctx.moveTo(x, y);           ctx.lineTo(x+cell, y); }
        if(!inSet.has(i+G.cols)){ ctx.moveTo(x, y+cell);      ctx.lineTo(x+cell, y+cell); }
        if(c === 0        || !inSet.has(i-1)){ ctx.moveTo(x, y);      ctx.lineTo(x, y+cell); }
        if(c+1 >= G.cols  || !inSet.has(i+1)){ ctx.moveTo(x+cell, y); ctx.lineTo(x+cell, y+cell); }
      }
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, L.w, L.h);
    if(pts) tracePath(ctx, pts, cell*0.16);
    else for(let q=0;q<cells.length;q++){
      const i = cells[q], r = (i/G.cols)|0, c = i%G.cols;
      ctx.rect(L.bx + c*cell, L.by + r*cell, cell, cell);
    }
    ctx.fillStyle = 'rgba(239,227,208,.86)';
    ctx.fill('evenodd');
    ctx.restore();

    /* CỘT MỐC. Đây là bức tường, vẽ thành một đường bao liền quanh ổ đang mở.
     * Không có nó thì người chơi không biết phải lấp tới đâu mới là xong ổ —
     * chỉ nhìn màn phủ mờ thì ranh giới đọc ra mập mờ, mà "xong" là khái niệm
     * phải rõ tuyệt đối vì lấp kín ổ là chuyển lượt ngay. */
    ctx.save();
    strokePath();
    ctx.lineWidth   = Math.max(2, cell*0.075);
    ctx.strokeStyle = 'rgba(150,118,80,.90)';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    ctx.restore();
  }

  /* Bụi vữa bắn ra ở CHÂN khối vừa đáp. Vị trí tất định theo chỉ số hạt, không
   * dùng Math.random — mỗi khung hình một chỗ thì thành nhiễu chứ không thành
   * bụi. Vẽ sau cùng trên canvas board: bụi nằm trên mặt tranh, không phải
   * dưới. */
  function drawDust(){
    const FX = window.FX;
    if(!FX) return;
    const list = FX.dusts();
    if(!list.length) return;
    const G = window.G, cell = L.cell, nowT = FX.now();

    for(let k=0;k<list.length;k++){
      const pl = G.placements.get(list[k].pid);
      if(!pl) continue;                          // khối đã bị gỡ giữa chừng
      const u = (nowT - list[k].t0)/FX.MS.dust;
      if(u <= 0 || u >= 1) continue;
      const pw = list[k].p || 1;                 // kiểu nào bụi mạnh hơn thì to hơn

      let x0=Infinity, x1=-Infinity, y1=-Infinity;
      for(let q=0;q<pl.idxs.length;q++){
        const i = pl.idxs[q], r=(i/G.cols)|0, c=i%G.cols;
        const x = L.bx + c*cell, y = L.by + r*cell;
        if(x < x0) x0 = x;
        if(x+cell > x1) x1 = x+cell;
        if(y+cell > y1) y1 = y+cell;
      }
      ctx.save();
      for(let q=0;q<9;q++){
        /* Trải đều theo bề NGANG chân khối, nảy lên rồi rơi xuống. */
        const f  = (q+0.5)/9;
        const sp = 0.55 + ((q*37)%11)/22;
        const px = x0 + (x1-x0)*f + (f-0.5)*cell*1.1*u*sp*pw;
        const py = y1 - cell*0.10 - Math.sin(Math.PI*Math.min(1,u*1.3))*cell*0.30*sp*pw
                 + u*u*cell*0.22;
        ctx.globalAlpha = (1-u)*(1-u)*0.42*Math.min(1.4, pw);
        ctx.beginPath();
        ctx.arc(px, py, cell*0.052*(1-u*0.45)*Math.min(1.35, pw), 0, Math.PI*2);
        ctx.fillStyle = shade(T.linen, -0.07);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* ĐƯỜNG BAO của một mảng ô, dựng bằng cách ĐI VÒNG QUANH MÉP — không phải
   * ghép mấy hình chữ nhật lại.
   *
   * Ghép chữ nhật thì ở MỖI GÓC LÕM còn thừa một cái mấu vuông to bằng đúng bề
   * rộng mạch vữa: viên nằm ở góc trong phủ kín ô của nó, còn hai viên kề lại
   * thụt vào một mạch. Cái mấu ~1px đó chính là thứ làm khối trông như MẤY
   * MIẾNG ĐẮP LẠI chứ không phải một miếng đúc liền.
   *
   * Đi vòng thì được đúng một đa giác, lại bo được CẢ góc lồi LẪN góc lõm.
   *
   * Trả về danh sách đỉnh đã ăn vào `inset`, hoặc null nếu mảng ô có lỗ hay tự
   * chạm chính nó ở một điểm (không shape nào trong game bị, nhưng cứ phòng). */
  function outline(idxs, cols, rows, cell, bx, by, inset){
    const set = new Set(idxs);
    const has = function(r, c){
      return r>=0 && r<rows && c>=0 && c<cols && set.has(r*cols+c);
    };
    const from = new Map();                     // "x,y" -> [ [x2,y2], ... ]
    const push = function(x1, y1, x2, y2){
      const k = x1+','+y1;
      if(!from.has(k)) from.set(k, []);
      from.get(k).push([x2, y2]);
    };
    for(let q=0;q<idxs.length;q++){
      const i = idxs[q], r = (i/cols)|0, c = i%cols;
      if(!has(r-1,c)) push(c,   r,   c+1, r  );   // mép trên, đi sang phải
      if(!has(r,c+1)) push(c+1, r,   c+1, r+1);   // mép phải, đi xuống
      if(!has(r+1,c)) push(c+1, r+1, c,   r+1);   // mép dưới, đi sang trái
      if(!has(r,c-1)) push(c,   r+1, c,   r  );   // mép trái, đi lên
    }
    const first = from.keys().next();
    if(first.done) return null;

    let cur = first.value.split(',').map(Number);
    const pts = [];
    let guard = idxs.length*4 + 8;
    while(guard-- > 0){
      const list = from.get(cur[0]+','+cur[1]);
      if(!list || !list.length) break;
      pts.push(cur);
      cur = list.shift();
      if(cur[0]===pts[0][0] && cur[1]===pts[0][1]) break;
    }
    if(pts.length < 4) return null;
    let left = 0; from.forEach(function(v){ left += v.length; });
    if(left) return null;                       // còn cạnh chưa đi hết

    const keep = [];                            // bỏ đỉnh thẳng hàng
    for(let t=0;t<pts.length;t++){
      const a = pts[(t-1+pts.length)%pts.length], b = pts[t], d = pts[(t+1)%pts.length];
      if((a[0]===b[0] && b[0]===d[0]) || (a[1]===b[1] && b[1]===d[1])) continue;
      keep.push(b);
    }
    if(keep.length < 4) return null;

    /* Ăn vào `inset`: mỗi cạnh dịch vào theo pháp tuyến trong, đỉnh mới là giao
     * của hai cạnh đã dịch. Vòng đi theo chiều kim đồng hồ (trục y hướng xuống)
     * nên pháp tuyến trong của cạnh hướng (dx,dy) là (-dy,dx). Công thức này
     * đúng cho cả góc lồi lẫn góc lõm. */
    const out = [];
    for(let t=0;t<keep.length;t++){
      const a = keep[(t-1+keep.length)%keep.length], b = keep[t], d = keep[(t+1)%keep.length];
      const d1x = Math.sign(b[0]-a[0]), d1y = Math.sign(b[1]-a[1]);
      const d2x = Math.sign(d[0]-b[0]), d2y = Math.sign(d[1]-b[1]);
      const nx = -d1y + -d2y, ny = d1x + d2x;
      out.push([ bx + b[0]*cell + nx*inset, by + b[1]*cell + ny*inset ]);
    }
    return out;
  }

  /* Vẽ đa giác đã bo góc: bắt đầu ở giữa một cạnh rồi arcTo qua từng đỉnh —
   * arcTo bo được cả góc lồi lẫn góc lõm, không phải tách nhánh. */
  function tracePath(c, pts, rad){
    const n = pts.length;
    const mid = function(a, b){ return [(a[0]+b[0])/2, (a[1]+b[1])/2]; };
    const m0 = mid(pts[n-1], pts[0]);
    c.moveTo(m0[0], m0[1]);
    for(let t=0;t<n;t++){
      const prev = pts[(t-1+n)%n], cur = pts[t], nxt = pts[(t+1)%n];
      const m = mid(cur, nxt);
      const lenA = Math.hypot(cur[0]-prev[0], cur[1]-prev[1]);
      const lenB = Math.hypot(nxt[0]-cur[0], nxt[1]-cur[1]);
      const r = Math.max(0, Math.min(rad, lenA/2, lenB/2));
      c.arcTo(cur[0], cur[1], m[0], m[1], r);
      c.lineTo(m[0], m[1]);
    }
    c.closePath();
  }

  /* KHỐI ĐÃ ĐẶT — vẽ từng KHỐI một, không phải từng ô:
   *   1. một đường bao liền, bo cả góc lồi lẫn góc lõm  → cắt (clip)
   *   2. đổ màu tranh theo từng nhóm màu, có đè nhau nửa pixel
   *   3. làm mềm chỗ đổi màu NẰM TRONG khối — để hai vuông màu khác nhau trong
   *      cùng một viên ghép trông như một lớp men chuyển màu
   *   4. một vệt vát chạy suốt cả khối + một viền sáng bám theo đường bao
   *
   * Lúc kết màn `kAvg` đưa mạch vữa và bo góc về 0, cả board nhập thành một bức
   * ảnh liền; đồng thời tắt làm mềm để tranh xong có mép màu sắc nét. */
  const faceCol = [];

  function drawBlocks(cr, cc0, radius, ease, evictSet, hidden){
    const G = window.G, cell = L.cell;
    if(!G.placements || !G.placements.size) return;
    const g = cell*GROUT;
    faceCol.length = 0;
    const ranh = [];

    G.placements.forEach(function(pl){
      if(hidden && hidden.has(pl.id)) return;         // đang bay, vẽ ở dragLayer
      const idxs = pl.idxs;
      const kOf = [];
      let kSum = 0;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for(let q=0;q<idxs.length;q++){
        const i = idxs[q], row = (i/G.cols)|0, c = i%G.cols;
        const d = Math.sqrt((row-cr)*(row-cr) + (c-cc0)*(c-cc0));
        const k = ease <= 0 ? 0 : Math.max(0, Math.min(1, (radius - d)/1.6 + 0.5));
        kOf.push(k); kSum += k;
        const x = L.bx + c*cell, y = L.by + row*cell;
        if(x < x0) x0 = x;
        if(x+cell > x1) x1 = x+cell;
        if(y < y0) y0 = y;
        if(y+cell > y1) y1 = y+cell;
      }
      const kAvg = kSum/idxs.length;
      const rad  = cell*0.09*(1-kAvg);
      const pts  = outline(idxs, G.cols, G.rows, cell, L.bx, L.by, g*(1-kAvg));

      /* KHỐI VỪA ĐÁP XUỐNG: nén rồi bật, quanh chính tâm nó. Đặt ở đây — sau
       * khi có khung bao, trước mọi nét vẽ — nên cả mặt khối, vệt vát lẫn viền
       * sáng cùng co giãn thành MỘT miếng gốm, không phải mấy lớp trượt nhau. */
      const fx = window.FX ? window.FX.xformOf(pl.id) : null;
      if(fx){
        ctx.save();
        const mx = (x0+x1)/2, my = (y0+y1)/2;
        ctx.translate(mx, my); ctx.scale(fx.sx, fx.sy); ctx.translate(-mx, -my);
      }

      /* --- 1. nhóm ô theo màu ------------------------------------------- */
      const groups = new Map();
      for(let q=0;q<idxs.length;q++){
        const i = idxs[q], k = kOf[q];
        /* Lúc đang chơi, CẢ KHỐI dùng chung một độ lệch sắc — lệch theo từng ô
         * thì mỗi ô một sắc, khối trông như vá chắp. Tranh xong mới trả lại
         * lệch theo ô để bức tranh không phẳng như vector. */
        const jit  = jitter(pl.id*1013)*(1-k) + jitter(i)*k*0.30;
        const full = shade(G.colorAt[i], jit);
        const col  = COLOR_ON_PLACE ? mix(full, shade(full, 0.02), k)
                                    : (k > 0 ? mix(T.block, full, k) : T.block);
        if(!groups.has(col)) groups.set(col, []);
        groups.get(col).push(i);
        faceCol[i] = col;
      }
      const paint = function(darken){
        groups.forEach(function(list, col){
          ctx.beginPath();
          for(let q=0;q<list.length;q++){
            const i = list[q], row = (i/G.cols)|0, c = i%G.cols;
            ctx.rect(L.bx+c*cell-0.5, L.by+row*cell-0.5, cell+1, cell+1);
          }
          ctx.fillStyle = darken ? shade(col, darken) : col;
          ctx.fill();
        });
      };

      /* --- 2. VỮA dưới khối --------------------------------------------------
       * Khối được ăn vào một mạch nên giữa hai khối kề nhau hở ra 2px. Nếu dưới
       * đó không có gì thì lộ giấy card gần như TRẮNG — một vạch sáng chém
       * ngang bức tranh, nhìn chói hơn bất cứ đường kẻ tối nào.
       *
       * Nên lót sẵn chính màu tranh của ô đó, tối đi một chút. Khe giữa hai
       * khối thành một RÃNH nông cùng tông với tranh: vẫn đọc ra ranh giới,
       * nhưng không còn cắt bức tranh làm đôi. */
      ctx.save();
      ctx.beginPath();
      const mort = outline(idxs, G.cols, G.rows, cell, L.bx, L.by, 0);
      if(mort) tracePath(ctx, mort, cell*0.05*(1-kAvg));
      else for(let q=0;q<idxs.length;q++){
        const i = idxs[q], row = (i/G.cols)|0, c = i%G.cols;
        ctx.rect(L.bx+c*cell, L.by+row*cell, cell, cell);
      }
      ctx.clip();
      paint(-0.085);
      ctx.restore();
      /* Khối đang nén-bật thì BỎ rãnh ranh: rãnh được vẽ sau cùng, ngoài phép
       * co giãn này, nên nó sẽ đứng yên trong khi mặt khối nhúc nhích — hằn ra
       * một cái viền lệch khỏi thân khối. Rãnh chỉ đậm 11%, vắng 260 ms không
       * ai thấy; viền lệch thì thấy ngay. */
      if(mort && pts && !fx) ranh.push({ ngoai:mort, trong:pts, rad:rad, mo:1-kAvg });

      /* --- 3. mặt khối ---------------------------------------------------- */
      ctx.save();
      ctx.beginPath();
      if(pts) tracePath(ctx, pts, rad);
      else for(let q=0;q<idxs.length;q++){       // phòng hờ: quay về ghép ô
        const i = idxs[q], row = (i/G.cols)|0, c = i%G.cols;
        meshRect(ctx, L.bx+c*cell, L.by+row*cell, cell, sameBlock(i, pl.id),
                 GROUT*(1-kAvg), 0.6, rad);
      }
      ctx.clip();

      paint(0);

      /* --- 5. vệt vát chạy suốt khối ------------------------------------- */
      const alpha = 1 - kAvg;
      if(alpha > 0.01){
        ctx.globalAlpha = alpha;
        const gr = ctx.createLinearGradient(0, y0, 0, y1);
        gr.addColorStop(0,   'rgba(255,255,255,.20)');
        gr.addColorStop(0.5, 'rgba(255,255,255,0)');
        gr.addColorStop(1,   'rgba(0,0,0,.10)');
        ctx.fillStyle = gr; ctx.fillRect(x0, y0, x1-x0, y1-y0);
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      /* Viền sáng bám theo ĐƯỜNG BAO, không phải theo khung chữ nhật. Đây là
       * thứ khiến cả mảng nổi lên như MỘT miếng gốm dày. */
      if(pts && alpha > 0.01){
        const w = Math.max(1, cell*0.032);
        const inner = outline(idxs, G.cols, G.rows, cell, L.bx, L.by, g*(1-kAvg)+w);
        if(inner){
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          tracePath(ctx, pts,   rad);
          tracePath(ctx, inner, Math.max(0, rad-w));
          const gr2 = ctx.createLinearGradient(0, y0, 0, y1);
          /* Nhẹ tay: viền càng chói thì mép khối càng thành một cái vạch. Đủ
           * để mảng có độ dày, chưa tới mức kẻ một đường sáng quanh mỗi khối. */
          gr2.addColorStop(0,    'rgba(255,255,255,.17)');
          gr2.addColorStop(0.55, 'rgba(255,255,255,0)');
          gr2.addColorStop(1,    'rgba(74,58,40,.11)');
          ctx.fillStyle = gr2; ctx.fill('evenodd');
          ctx.restore();
        }
      }

      /* --- sắp bị đẩy về khay -------------------------------------------- */
      let anyEvict = false;
      for(let q=0;q<idxs.length;q++) if(evictSet.has(idxs[q])) anyEvict = true;
      if(anyEvict && pts){
        ctx.save(); ctx.globalAlpha = 0.60;
        ctx.beginPath(); tracePath(ctx, pts, rad);
        ctx.fillStyle = '#C4794A'; ctx.fill();
        ctx.restore();
      }

      if(fx) ctx.restore();
    });

    blendPicture(ease);

    /* RÃNH ranh khối — vẽ SAU CÙNG.
     *
     * Lót vữa tối bên dưới thôi thì chưa đủ: lớp pha màu ở trên phủ lên chính
     * cái rãnh đó và kéo nó sáng lại gần bằng mặt khối, đo ra chỉ còn sâu 1/255.
     * Nên rãnh phải nằm trên cùng, mới cầm được độ đậm của nó.
     *
     * Đủ đậm để nhìn là biết khối tới đâu, chưa đủ để thành một cái vạch chém
     * ngang bức tranh. Mờ dần theo độ loang nên lúc lắp xong không còn rãnh. */
    for(let t=0;t<ranh.length;t++){
      const z = ranh[t];
      if(z.mo <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = 0.11*z.mo;
      ctx.beginPath();
      tracePath(ctx, z.ngoai, cell*0.05*z.mo);
      tracePath(ctx, z.trong, z.rad);
      ctx.fillStyle = '#4A3A28';
      ctx.fill('evenodd');
      ctx.restore();
    }
  }

  /* Hai vuông màu tranh khác nhau nằm cạnh nhau thì mép giữa chúng là một đường
   * thẳng sắc lẹm — đủ để mắt đọc ra "hai miếng dán lại". Kéo một dải chuyển màu
   * vắt qua mép đó, mỗi bên nửa ô: hai bên cùng tiến tới 50% màu của nhau ở đúng
   * mép nên nối liền, trông như một lớp men đổi màu.
   *
   * PHA CHO CẢ BOARD, không phải riêng từng khối. Trước đây chỉ pha trong lòng
   * khối, nên cùng một ranh giới màu của bức tranh lại mềm ở đoạn này và gắt ở
   * đoạn kia — đúng chỗ nó cắt qua ranh khối. Cái gắt lên gắt xuống đó mới là
   * thứ đọc ra thành VẠCH, chứ không phải bản thân ranh khối.
   *
   * Ranh khối vẫn đọc được: rãnh vữa tối bên dưới không bị dải pha xoá đi.
   *
   * Cắt trong vùng ô ĐÃ LẮP nên không loang sang ô còn trống. */
  function blendPicture(ease){
    const G = window.G, cell = L.cell;
    const strength = 1 - (ease <= 0 ? 0 : ease);
    /* Loang bao nhiêu phần ô mỗi bên.
     *
     * Từng để 0,20. Nghe thì nhỏ, nhưng ô cao 50px là dải pha rộng 20px vắt qua
     * mép — mà hai bên cùng tiến tới 50% màu của nhau, nên bên SẪM có hẳn một
     * vệt sáng chạy dọc mép, bên SÁNG có một vệt tối. Mắt đọc vệt đó ra thành
     * một cái BẬC NỔI: một khối liền vắt qua hai vùng màu bỗng trông như hai
     * miếng chồng lên nhau. Đúng cái phải tránh — vùng màu của bức tranh phải
     * ra vùng màu, không được ra gờ nổi.
     *
     * 0,05 chỉ còn là một nét khử răng cưa (~2px), mép màu sắc gọn như trong
     * một bức tranh thật. Muốn mềm lại thì tăng con số này, chứ đừng đụng vào
     * chỗ khác. */
    const sp = cell*EDGE_SOFT*strength;
    if(sp < 0.5) return;

    /* Ô ĐƠN ĐỘC thì KHÔNG pha. Dải pha rộng 0,20 ô mỗi bên; ô nào bốn phía đều
     * khác màu sẽ bị ăn từ cả bốn hướng, lõi chỉ còn 60% và mép nhoè hết —
     * đúng cái làm hạt trân châu thành lỗ thủng và hạt cốm thành vệt bẩn.
     *
     * Mắt, mũi, hạt… vốn là chi tiết MỘT ô: nó phải sắc mới ra chi tiết. Còn
     * ranh giới giữa hai MẢNG màu (vùng nào cũng có ô cùng màu kề bên) vẫn pha
     * y như cũ — đó mới là chỗ dải pha sinh ra để làm mềm.
     *
     * So bằng `colorAt` (màu tranh gốc) chứ không bằng `faceCol`: faceCol có
     * lệch sắc theo từng ô lúc lên màu nên hai ô cùng vùng vẫn khác chuỗi. */
    const lone = new Uint8Array(G.fill.length);
    for(let i=0;i<G.fill.length;i++){
      const ci = G.colorAt[i];
      if(!ci) continue;
      const row = (i/G.cols)|0, c = i%G.cols;
      const same = (c > 0          && G.colorAt[i-1]       === ci)
                || (c+1 < G.cols   && G.colorAt[i+1]       === ci)
                || (row > 0        && G.colorAt[i-G.cols]  === ci)
                || (row+1 < G.rows && G.colorAt[i+G.cols]  === ci);
      if(!same) lone[i] = 1;
    }

    let any = false;
    ctx.save();
    ctx.beginPath();
    for(let i=0;i<G.fill.length;i++){
      if(G.fill[i] < 0 || !faceCol[i]) continue;
      const row = (i/G.cols)|0, c = i%G.cols;
      ctx.rect(L.bx+c*cell, L.by+row*cell, cell, cell);
      any = true;
    }
    if(!any){ ctx.restore(); return; }
    ctx.clip();

    for(let i=0;i<G.fill.length;i++){
      const ci = faceCol[i];
      if(G.fill[i] < 0 || !ci) continue;
      const row = (i/G.cols)|0, c = i%G.cols;
      const x = L.bx + c*cell, y = L.by + row*cell;

      if(c+1 < G.cols && faceCol[i+1] && faceCol[i+1] !== ci
         && !lone[i] && !lone[i+1]){
        const cr2 = faceCol[i+1];
        let gr = ctx.createLinearGradient(x+cell-sp, 0, x+cell, 0);
        gr.addColorStop(0, rgba(cr2, 0)); gr.addColorStop(1, rgba(cr2, 0.5));
        ctx.fillStyle = gr; ctx.fillRect(x+cell-sp, y, sp, cell);
        gr = ctx.createLinearGradient(x+cell+sp, 0, x+cell, 0);
        gr.addColorStop(0, rgba(ci, 0));  gr.addColorStop(1, rgba(ci, 0.5));
        ctx.fillStyle = gr; ctx.fillRect(x+cell, y, sp, cell);
      }
      if(row+1 < G.rows && faceCol[i+G.cols] && faceCol[i+G.cols] !== ci
         && !lone[i] && !lone[i+G.cols]){
        const cd = faceCol[i+G.cols];
        let gr = ctx.createLinearGradient(0, y+cell-sp, 0, y+cell);
        gr.addColorStop(0, rgba(cd, 0)); gr.addColorStop(1, rgba(cd, 0.5));
        ctx.fillStyle = gr; ctx.fillRect(x, y+cell-sp, cell, sp);
        gr = ctx.createLinearGradient(0, y+cell+sp, 0, y+cell);
        gr.addColorStop(0, rgba(ci, 0)); gr.addColorStop(1, rgba(ci, 0.5));
        ctx.fillStyle = gr; ctx.fillRect(x, y+cell, cell, sp);
      }
    }
    ctx.restore();
  }

  /* BỐN PHÍA của ô `i` có phải viên cùng khối `pid` không. */
  function sameBlock(i, pid){
    const G = window.G, row = (i/G.cols)|0, c = i%G.cols;
    const q = function(dr, dc){
      const r2 = row+dr, c2 = c+dc;
      return r2>=0 && r2<G.rows && c2>=0 && c2<G.cols && G.fill[r2*G.cols + c2] === pid;
    };
    return { L:q(0,-1), R:q(0,1), U:q(-1,0), D:q(1,0) };
  }

  /* BÓNG KHỐI lúc kéo — vệt LIỀN MỘT MẢNG đúng hình khối sắp rơi xuống, trùng
   * khít ô sẽ vào. Viên nào giáp viên cùng khối thì bỏ mạch vữa và bỏ bo góc ở
   * phía đó, nên đọc ra là MỘT khối chứ không phải mấy ô tối rời nhau.
   *
   * BÓNG MANG MÀU TRANH CỦA CHÍNH Ô NÓ ĐANG RÀ TỚI: rà sang chỗ khác thì bóng
   * đổi màu theo.
   *
   * Tô THEO NHÓM MÀU, mỗi nhóm một path một lần `fill`. Tô từng ô thì hai ô cùng
   * màu kề nhau chồng màu nửa trong ở mép chung, hằn ra sợi chỉ giữa thân khối.
   *
   * Vẽ ĐÈ LÊN cả ô đã có khối, không chỉ ô trống: đặt đè lên khiến khối cũ
   * bật về khay, nên bóng phải cho thấy TRỌN hình khối sắp chiếm chỗ. */
  /* Ba núm chỉnh ĐỘ LỘ của bóng. Càng lộ thì càng dễ xem trước cả bức
   * tranh chỉ bằng cách quét khối khắp board — mà luật gốc là chưa lắp xong thì
   * chưa được biết tranh. Để ở mức đủ đọc ra màu thuộc họ nào, chưa đủ để
   * chép lại bức tranh trong đầu.
   *   TOWARD  kéo màu về nâu tối bao nhiêu phần — cao thì màu nhạt đi
   *   ALPHA   độ đục của mảng màu
   *   VEIL    lớp nâu phủ cuối, buộc các mảng màu lại thành MỘT cái bóng
   * Muốn lộ hơn: hạ TOWARD, nâng ALPHA. Muốn kín hơn: làm ngược lại. */
  const GHOST_TOWARD = 0.50, GHOST_ALPHA = 0.52, GHOST_VEIL = 0.14;

  function drawGhost(idxs){
    const G = window.G, cell = L.cell;
    const set = new Set(idxs);
    const g = cell*GROUT, rad = cell*0.09;

    ctx.save();
    ctx.beginPath();
    for(let q=0;q<idxs.length;q++){
      const i = idxs[q], row = (i/G.cols)|0, c = i%G.cols;
      const has = function(dr, dc){
        const r2 = row+dr, c2 = c+dc;
        return r2>=0 && r2<G.rows && c2>=0 && c2<G.cols && set.has(r2*G.cols + c2);
      };
      const Lx=has(0,-1), Rx=has(0,1), Ux=has(-1,0), Dx=has(1,0);
      const x0 = L.bx + c*cell     + (Lx?0:g), x1 = L.bx + (c+1)*cell   - (Rx?0:g);
      const y0 = L.by + row*cell   + (Ux?0:g), y1 = L.by + (row+1)*cell - (Dx?0:g);
      rrSub(ctx, x0, y0, x1-x0, y1-y0,
        (Ux||Lx)?0:rad, (Ux||Rx)?0:rad, (Dx||Rx)?0:rad, (Dx||Lx)?0:rad);
    }
    ctx.clip();

    const groups = new Map();
    for(let q=0;q<idxs.length;q++){
      const key = G.colorAt[idxs[q]] || T.slot;
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(idxs[q]);
    }
    ctx.globalAlpha = GHOST_ALPHA;
    groups.forEach(function(list, key){
      ctx.beginPath();
      for(let q=0;q<list.length;q++){
        const i = list[q], row = (i/G.cols)|0, c = i%G.cols;
        ctx.rect(L.bx + c*cell, L.by + row*cell, cell, cell);
      }
      ctx.fillStyle = mix(key, '#4A3A28', GHOST_TOWARD);
      ctx.fill();
    });

    /* Một lớp nâu rất mỏng phủ hết — buộc mấy mảng màu khác nhau lại thành một
     * cái bóng, thay vì trông như tranh đã hiện sẵn ở đó. */
    ctx.globalAlpha = GHOST_VEIL;
    ctx.fillStyle = '#4A3A28';
    ctx.fillRect(L.bx, L.by, G.cols*cell, G.rows*cell);
    ctx.restore();
  }

  /* TƯỜNG nằm TRÊN CẠNH giữa hai ô, không chiếm ô nào — đúng luật bản gốc.
   * Vẽ như một gờ vữa nổi: viền đất sẫm bọc ngoài, mặt sáng ở giữa. */
  function drawWalls(alpha){
    const G = window.G, cell = L.cell;
    const W = G.level.walls;
    if(!W || !W.count || alpha <= 0.02) return;
    /* Gờ mảnh, ôm sát đường lưới: dày 13% cạnh ô thì nó đè hẳn lên khe 2px và
     * đẩy hai ô hai bên ra xa nhau trông thấy. 6,5% vừa đủ đọc ra là có rào. */
    const t   = Math.max(1.6, cell*0.065);
    const pad = cell*0.04;
    ctx.save();
    ctx.globalAlpha = alpha;
    for(let i=0;i<W.R.length;i++){
      const r = (i/G.cols)|0, c = i%G.cols;
      if(W.R[i]) ridge(L.bx+(c+1)*cell - t/2, L.by+r*cell + pad, t, cell - pad*2);
      if(W.D[i]) ridge(L.bx+c*cell + pad, L.by+(r+1)*cell - t/2, cell - pad*2, t);
    }
    ctx.restore();
  }
  function ridge(x, y, w, h){
    const r = Math.min(w,h)/2;
    rr(ctx, x-0.7, y-0.7, w+1.4, h+1.4, r+0.7);
    ctx.fillStyle = '#9C7B4E'; ctx.fill();
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = '#C9A87C'; ctx.fill();
  }

  /* ------------------------------------------------- khối đang kéo (overlay) */
  /* Khối ĐANG TRÊN TAY luôn là màu đất — MÀU TRANH CHỈ HIỆN KHI ĐÃ ĐẶT XUỐNG.
   * Màu đất `#D8C2A4` trên nền linen `#EFE3D0` là beige trên beige, nên khối
   * trên tay được viền mực bao quanh để vẫn đọc ra được (xem cuối hàm). */
  /* Bốn phía của một ô trong shape — dùng chung cho khối trên tay và ô khay. */
  function shapeNb(sh, q){
    if(!sh._nb){
      const set = new Set();
      for(let t=0;t<sh.cells.length;t++) set.add(sh.cells[t][0]+':'+sh.cells[t][1]);
      sh._nb = sh.cells.map(function(p){
        return { U:set.has((p[0]-1)+':'+p[1]), D:set.has((p[0]+1)+':'+p[1]),
                 L:set.has(p[0]+':'+(p[1]-1)), R:set.has(p[0]+':'+(p[1]+1)) };
      });
    }
    return sh._nb[q];
  }


  /* Đường bao liền của một SHAPE (khay / khối trên tay), dùng chung bộ đi vòng
   * với khối đã đặt trên board — nên ba chỗ ra đúng một hình. */
  function shapeOutline(sh, ox, oy, cell, inset){
    if(!sh._idx) sh._idx = sh.cells.map(function(p){ return p[0]*sh.w + p[1]; });
    return outline(sh._idx, sh.w, sh.h, cell, ox, oy, inset);
  }

  /* KHỐI ĐANG CẦM TRÊN TAY — cũng phải là MỘT miếng liền, giống ô khay nó vừa
   * rời ra và giống mảng nó sẽ thành khi đặt xuống. Ba cái đó trùng hình nhau
   * thì người chơi mới nối được: cái này lấy từ đâu, gỡ ra thì mất gì. */
  /* Tâm hình vẽ trong Ô KHAY của một khối, theo TOẠ ĐỘ MÀN HÌNH — khối đang
   * bay được vẽ trên #dragLayer mà lớp đó phủ cả viewport. Trả kèm tỉ lệ thu
   * nhỏ, để bay tới nơi thì khối vừa đúng cỡ hình trong ô khay chứ không phải
   * đột ngột đổi cỡ ở khung cuối.
   *
   * Nhắm vào `.chip-art` chứ không phải cả cái chip: chip còn một dòng "×N" ở
   * dưới nên tâm chip nằm thấp hơn tâm hình vẽ. */
  function chipPoint(shapeId){
    const G = window.G;
    let idx = -1;
    for(let k=0;k<G.deck.length;k++)
      if(G.deck[k].shapeId === shapeId){ idx = k; break; }
    const chip = idx >= 0 ? deckEl.children[idx] : null;
    const el = (chip && chip.querySelector('.chip-art')) || chip || deckEl;
    if(!el) return null;
    const b = el.getBoundingClientRect();
    if(!b.width && !b.height) return null;           // khay đang ẩn
    const sh = window.SHAPES[shapeId];
    const px = chipPx(sh);
    return { x: b.left + b.width/2, y: b.top + b.height/2,
             scale: L.cell > 0 ? px/L.cell : 0.4 };
  }

  /* MỘT KHỐI ĐANG BAY giữa khay và board. Toạ độ màn hình, cỡ ô tuỳ ý, tâm
   * khối đặt đúng vào (cx, cy) — nên thu nhỏ là thu quanh chính nó chứ không
   * trượt về góc board.
   *
   * `earth` 0→1 kéo màu tranh về màu đất `T.block` của khay: khối rời board thì
   * nhạt dần thành đúng món hàng trên khay, bay lên thì lên màu tranh. Không có
   * đoạn chuyển đó thì hai đầu đường bay là hai khối khác nhau. */
  function drawFlyer(c, idxs, pid, cell, cx, cy, earth, alpha){
    const G = window.G;
    let minR=Infinity, maxR=-Infinity, minC=Infinity, maxC=-Infinity;
    for(let q=0;q<idxs.length;q++){
      const r=(idxs[q]/G.cols)|0, cc=idxs[q]%G.cols;
      if(r<minR) minR=r;   if(r>maxR) maxR=r;
      if(cc<minC) minC=cc; if(cc>maxC) maxC=cc;
    }
    const bx = cx - (minC+maxC+1)/2*cell, by = cy - (minR+maxR+1)/2*cell;
    const g = cell*GROUT, rad = cell*0.09;
    const pts  = outline(idxs, G.cols, G.rows, cell, bx, by, g);
    const mort = outline(idxs, G.cols, G.rows, cell, bx, by, 0);
    const bb = [bx + minC*cell, by + minR*cell,
                bx + (maxC+1)*cell, by + (maxR+1)*cell];

    const paint = function(darken){
      const groups = new Map();
      for(let q=0;q<idxs.length;q++){
        const i = idxs[q];
        const full = shade(G.colorAt[i], jitter(pid*1013));
        const col  = earth > 0 ? mix(full, T.block, earth) : full;
        if(!groups.has(col)) groups.set(col, []);
        groups.get(col).push(i);
      }
      groups.forEach(function(list, col){
        c.beginPath();
        for(let q=0;q<list.length;q++){
          const i=list[q], r=(i/G.cols)|0, cc=i%G.cols;
          c.rect(bx+cc*cell-0.5, by+r*cell-0.5, cell+1, cell+1);
        }
        c.fillStyle = darken ? shade(col, darken) : col;
        c.fill();
      });
    };
    const path = function(p, r){
      c.beginPath();
      if(p) tracePath(c, p, r);
      else for(let q=0;q<idxs.length;q++){
        const i=idxs[q], row=(i/G.cols)|0, cc=i%G.cols;
        c.rect(bx+cc*cell, by+row*cell, cell, cell);
      }
    };

    c.save();
    c.globalAlpha = alpha;

    /* Bóng đổ: khối đang bay thì nó ở TRÊN mặt tranh, phải có bóng mới đọc ra
     * là bay. Tô mặt khối một lượt để canvas hắt bóng, mặt thật vẽ đè lên sau. */
    c.save();
    c.shadowColor = 'rgba(91,75,52,.34)';
    c.shadowBlur = Math.max(6, cell*0.42); c.shadowOffsetY = Math.max(3, cell*0.18);
    path(pts, rad);
    c.fillStyle = T.block; c.fill();
    c.restore();

    c.save(); path(mort, cell*0.05); c.clip(); paint(-0.085); c.restore();

    c.save(); path(pts, rad); c.clip();
    paint(0);
    const gr = c.createLinearGradient(0, bb[1], 0, bb[3]);
    gr.addColorStop(0,   'rgba(255,255,255,.20)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    gr.addColorStop(1,   'rgba(0,0,0,.10)');
    c.fillStyle = gr; c.fillRect(bb[0], bb[1], bb[2]-bb[0], bb[3]-bb[1]);
    c.restore();

    if(pts){
      const w = Math.max(1, cell*0.032);
      const inner = outline(idxs, G.cols, G.rows, cell, bx, by, g+w);
      if(inner){
        c.beginPath(); tracePath(c, pts, rad); tracePath(c, inner, Math.max(0, rad-w));
        const gr2 = c.createLinearGradient(0, bb[1], 0, bb[3]);
        gr2.addColorStop(0,    'rgba(255,255,255,.17)');
        gr2.addColorStop(0.55, 'rgba(255,255,255,0)');
        gr2.addColorStop(1,    'rgba(74,58,40,.11)');
        c.fillStyle = gr2; c.fill('evenodd');
      }
    }
    c.restore();
  }

  /* Đường bay: một VÒNG CUNG chứ không phải đường thẳng. Khay nằm ngay dưới
   * board nên đường thẳng gần như thẳng đứng, nhìn ra "biến mất rồi hiện lại"
   * chứ không ra "đi từ đây tới kia". */
  function drawFlyers(){
    const FX = window.FX;
    if(!FX) return;
    const list = FX.flyers();
    if(!list.length) return;
    const G = window.G, cell = L.cell;
    if(!cell) return;
    const b = cv.getBoundingClientRect(), nowT = FX.now();

    for(let k=0;k<list.length;k++){
      const f = list[k];
      const t = Math.max(0, Math.min(1, (nowT - f.t0)/f.ms));

      let minR=Infinity, maxR=-Infinity, minC=Infinity, maxC=-Infinity;
      for(let q=0;q<f.idxs.length;q++){
        const r=(f.idxs[q]/G.cols)|0, cc=f.idxs[q]%G.cols;
        if(r<minR) minR=r;   if(r>maxR) maxR=r;
        if(cc<minC) minC=cc; if(cc>maxC) maxC=cc;
      }
      /* Đầu BOARD của đường bay — suy lại mỗi khung hình nên đổi khổ màn hình
       * giữa chừng cũng không lệch. */
      const hx = f.hand ? f.hand.x : b.left + L.bx + (minC+maxC+1)/2*cell;
      const hy = f.hand ? f.hand.y : b.top  + L.by + (minR+maxR+1)/2*cell;

      /* `away` 1 = đang ở khay, 0 = đang ở board. Bay lên thì chậm dần (đáp
       * nhẹ), bay về khay thì nhanh dần (bị hất đi). */
      const away = f.dir === 'in' ? Math.pow(1-t, 3) : t*t*t;
      const x = hx + (f.pt.x - hx)*away;
      const y = hy + (f.pt.y - hy)*away - Math.sin(Math.PI*away)*cell*0.62;
      const s = cell*(1 - (1 - f.pt.scale)*away);
      const a = f.dir === 'in' ? Math.min(1, t*5)
                               : Math.max(0, Math.min(1, 1 - (t-0.74)/0.26));
      drawFlyer(dctx, f.idxs, f.pid, s, x, y, away, a);
    }
  }

  function drawDrag(){
    const G = window.G;
    const wh = fit(dg, dctx);
    dctx.clearRect(0,0,wh[0],wh[1]);
    drawFlyers();
    if(!G.drag) return;
    const d = G.drag, sh = window.SHAPES[d.shapeId], cell = L.cell;
    const b  = cv.getBoundingClientRect();
    const ox = b.left + d.left, oy = b.top + d.top;
    const g  = cell*GROUT, rad = cell*0.09;
    const lw = Math.max(1.2, cell*0.055);

    const pts = shapeOutline(sh, ox, oy, cell, g);
    const path = function(p, r){
      dctx.beginPath();
      if(p) tracePath(dctx, p, r);
      else for(let q=0;q<sh.cells.length;q++)       // phòng hờ
        meshRect(dctx, ox + sh.cells[q][1]*cell, oy + sh.cells[q][0]*cell,
                 cell, shapeNb(sh, q), GROUT, 0, 0.6, rad);
    };

    /* mặt khối + bóng đổ */
    dctx.save();
    dctx.shadowColor = 'rgba(91,75,52,.38)';
    dctx.shadowBlur = 14; dctx.shadowOffsetY = 7;
    path(pts, rad);
    dctx.fillStyle = T.block; dctx.fill();
    dctx.restore();

    /* vệt vát chạy suốt cả khối, không phải mỗi ô một vệt */
    dctx.save();
    path(pts, rad); dctx.clip();
    const gr = dctx.createLinearGradient(0, oy, 0, oy + sh.h*cell);
    gr.addColorStop(0,   'rgba(255,255,255,.20)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0)');
    gr.addColorStop(1,   'rgba(0,0,0,.10)');
    dctx.fillStyle = gr; dctx.fillRect(ox, oy, sh.w*cell, sh.h*cell);
    dctx.restore();

    /* Viền mực quanh khối: chưa tới board thì chưa có ô nào để lấy màu, mà màu
     * đất trên nền linen là beige trên beige.
     *
     * Lấy HAI đường bao rồi tô theo luật chẵn‑lẻ, KHÔNG dùng stroke(): stroke
     * tô viền của TẤT CẢ ô con trong path nên nét sẽ chạy cả vào mạch giữa hai
     * viên cùng khối — đúng cái vừa nhập liền xong. */
    const inner = shapeOutline(sh, ox, oy, cell, g + lw);
    if(pts && inner){
      dctx.beginPath();
      tracePath(dctx, pts,   rad);
      tracePath(dctx, inner, Math.max(0, rad - lw));
      dctx.fillStyle = 'rgba(91,75,52,.42)';
      dctx.fill('evenodd');
    }
  }

  /* Chuỗi path SVG của một đa giác đã bo góc. SVG không có arcTo nên dùng
   * đường bậc hai với chính cái đỉnh làm điểm điều khiển — với góc vuông thì
   * nhìn không khác cung tròn. */
  function traceD(pts, rad){
    const n = pts.length, f = function(v){ return v.toFixed(2); };
    const lerp = function(a, b, t){
      return [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t];
    };
    let d = '';
    for(let t=0;t<n;t++){
      const prev = pts[(t-1+n)%n], cur = pts[t], nxt = pts[(t+1)%n];
      const lenA = Math.hypot(cur[0]-prev[0], cur[1]-prev[1]);
      const lenB = Math.hypot(nxt[0]-cur[0], nxt[1]-cur[1]);
      const r = Math.max(0, Math.min(rad, lenA/2, lenB/2));
      const a = lerp(cur, prev, lenA ? r/lenA : 0);
      const b = lerp(cur, nxt,  lenB ? r/lenB : 0);
      d += (t === 0 ? 'M' + f(a[0]) + ',' + f(a[1]) : 'L' + f(a[0]) + ',' + f(a[1]));
      d += 'Q' + f(cur[0]) + ',' + f(cur[1]) + ' ' + f(b[0]) + ',' + f(b[1]);
    }
    return d + 'Z';
  }

  /* Ô KHAY — vẽ shape thành MỘT miếng liền, cùng đường bao với khối trên tay.
   * Trước đây mỗi ô một hình vuông rời, nên khối năm ô nhìn y như năm khối một
   * ô đứng cạnh nhau — đặt xuống rồi thì không biết gỡ ra sẽ mất những ô nào. */
  function shapeSVG(sh, px, color){
    const w = sh.w*px, h = sh.h*px, g = px*0.045, r = px*0.09;
    const pts = shapeOutline(sh, 0, 0, px, g);
    let body;
    if(pts){
      body = '<path d="' + traceD(pts, r) + '" fill="' + color + '"/>';
    } else {                                     // phòng hờ: quay về ghép ô
      body = '';
      for(let q=0;q<sh.cells.length;q++){
        const x = sh.cells[q][1]*px + g, y = sh.cells[q][0]*px + g, S = px - 2*g;
        body += '<rect x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" width="'+S.toFixed(2)
              + '" height="'+S.toFixed(2)+'" rx="'+r.toFixed(2)+'" fill="'+color+'"/>';
      }
    }
    return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h
         + '" aria-hidden="true">' + body + '</svg>';
  }


  /* Cỡ ô vẽ trong một ô khay. Đo THEO TỪNG CHIỀU chứ không theo cạnh dài
   * nhất: lấy max(w,h) thì khối 4×4 hay 6×2 đều bị cắt cụt — mà thang dạy
   * toàn khối cỡ đó.
   * CHIP_ART phải khớp `.chip-art` trong index.html (cao 54) và bề rộng còn
   * lại trong ô khay 80px. Đổi CSS thì đổi luôn hai số này. */
  const CHIP_ART = { w:72, h:54 };
  function chipPx(sh){
    return Math.max(7, Math.min(19,
      Math.floor(Math.min(CHIP_ART.h/sh.h, CHIP_ART.w/sh.w))));
  }

  function buildDeck(){
    const G = window.G;
    let html = '';
    for(let i=0;i<G.deck.length;i++){
      const sh = window.SHAPES[G.deck[i].shapeId];
      const px = chipPx(sh);
      html += '<button class="chip" data-i="'+i+'" type="button" aria-label="'+sh.name+'">'
            +   '<span class="chip-art">' + shapeSVG(sh, px, T.block) + '</span>'
            +   '<span class="chip-n">×<b>'+G.deck[i].total+'</b></span>'
            + '</button>';
    }
    deckEl.innerHTML = html;
    deckEl.scrollLeft = 0;
    syncDeck();
    deckEdges();
  }

  function syncDeck(){
    const G = window.G;
    const kids = deckEl.children;
    for(let i=0;i<kids.length && i<G.deck.length;i++){
      const d = G.deck[i];
      kids[i].querySelector('.chip-n b').textContent = d.left;
      kids[i].classList.toggle('empty', d.left <= 0);
      kids[i].classList.toggle('hint', G.hintChip === i);
      kids[i].classList.toggle('sel', G.sel === i);
    }
    deckEdges();
  }

  /* Khay có tràn ra ngoài khung không, và đang ở đầu hay cuối? Bật/tắt vệt mờ
   * hai mép để người chơi BIẾT là còn ô nữa ở phía sau — thanh cuộn bị giấu
   * (`scrollbar-width:none`) nên không có vệt thì không có dấu hiệu nào cả. */
  function deckEdges(){
    if(!deckEl) return;
    const max = deckEl.scrollWidth - deckEl.clientWidth;
    const x   = deckEl.scrollLeft;
    deckEl.classList.toggle('more-l', max > 4 && x > 2);
    deckEl.classList.toggle('more-r', max > 4 && x < max - 2);
  }

  function deckScrollable(){
    return !!deckEl && (deckEl.scrollWidth - deckEl.clientWidth) > 4;
  }

  function scrollChipIntoView(i){
    const el = deckEl.children[i];
    if(el && el.scrollIntoView) el.scrollIntoView({ block:'nearest', inline:'center', behavior:'smooth' });
  }

  window.R = { bind:bind, layout:layout, fitBoard:fitBoard, draw:draw, drawDrag:drawDrag,
               boardIndexAt:boardIndexAt, buildDeck:buildDeck, syncDeck:syncDeck,
               scrollChipIntoView:scrollChipIntoView, shapeSVG:shapeSVG,
               chipPoint:chipPoint, deckEdges:deckEdges, deckScrollable:deckScrollable,
               setView:setView, viewBusy:viewBusy, zoomed:zoomed,
               mix:mix, shade:shade, rgba:rgba };
})();
