/* ============================================================================
 * game.js — Trạng thái, luật, input, vòng lặp.
 * ----------------------------------------------------------------------------
 * LUẬT (Cozy Mosaic):
 *   • Block KHÔNG BAO GIỜ xoay hay lật. Không thêm nút xoay dù "tiện".
 *   • Ô KHẢM (`picture.holes`) không đặt khối lên được; nó đã là một phần tranh.
 *   • Lúc chơi khối đã đặt giữ MÀU ĐẤT. Màu tranh chỉ hiện khi board lấp kín,
 *     loang từ tâm ra rìa.
 *   • Một block ĐƯỢC PHÉP nằm vắt qua nhiều vùng màu.
 *   • Khối đã đặt KÉO ĐƯỢC sang chỗ khác. Nhấc lên là rời board ngay nhưng
 *     KHÔNG cộng vào khay — nó đang ở trên tay, ×N phải đứng yên.
 *   • Thả đè lên khối khác thì khối bị đè VỀ KHAY, không từ chối cú thả.
 *   • Nước đi + mọi khối bị đẩy ra = MỘT bước hoàn tác.
 *   • Không timer, không giới hạn nước đi, không trạng thái thua, không sao.
 * ==========================================================================*/
(function(){
  const SHAPES = window.SHAPES;
  const LevelGen = window.LevelGen;
  const STORE = 'cozymosaic.save';
  const REVEAL_MS = 1400;

  const G = window.G = {
    level:null, index:0,
    rows:0, cols:0, occ:null, inPic:null, mosaic:null, colorAt:null,
    fill:null, blocked:null, placements:new Map(), nextPid:1, filled:0,
    deck:[], history:[],
    drag:null, pending:null,
    hintChip:-1, sel:-1, wallsActive:null,
    solved:false, solvedAt:0, revealT:0,
    /* Tint mờ 12% của bức tranh trên ô trống — người chơi tự bật/tắt. */
    showTint:true,
    /* Ba công tắc trong bảng Cài đặt, đều nhớ qua localStorage. */
    sound:true, haptic:true,
    unlocked:0, done:null
  };

  let cv, dg, deckEl, els = {};

  /* ------------------------------------------------------------ lưu tiến độ */
  function load(){
    G.done = new Set();
    try{
      const s = JSON.parse(localStorage.getItem(STORE) || '{}');
      G.unlocked = s.unlocked || 0;
      if(s.showTint != null) G.showTint = !!s.showTint;
      if(s.sound    != null) G.sound    = !!s.sound;
      if(s.haptic   != null) G.haptic   = !!s.haptic;
      (s.done || []).forEach(function(i){ G.done.add(i); });
      return s.last || 0;
    }catch(e){ return 0; }
  }
  function save(){
    try{
      localStorage.setItem(STORE, JSON.stringify({
        unlocked:G.unlocked, last:G.index, showTint:G.showTint,
        sound:G.sound, haptic:G.haptic, done:Array.from(G.done)
      }));
    }catch(e){}
  }

  /* ------------------------------------------------------------- nạp màn */
  function loadLevel(index){
    if(index < 0) index = 0;
    const lv = LevelGen.generateLevel(index);
    G.level = lv; G.index = index;
    G.rows = lv.rows; G.cols = lv.cols;
    G.occ = lv.occ; G.inPic = lv.inPic; G.mosaic = lv.mosaic; G.colorAt = lv.colorAt;
    G.deck = lv.deck.map(function(d){ return { shapeId:d.shapeId, total:d.total, left:d.total }; });
    G.wallsActive = (lv.walls && lv.walls.count) ? lv.walls : null;
    G.fill = new Int16Array(lv.rows*lv.cols).fill(-1);
    G.blocked = Uint8Array.from(lv.occ);
    G.placements = new Map(); G.nextPid = 1; G.filled = 0;
    G.history = []; G.drag = null; G.pending = null; G.hintChip = -1; G.sel = -1;
    G.solved = false; G.solvedAt = 0; G.revealT = 0;
    if(window.FX) window.FX.clear();     // đổi màn: bỏ hết hiệu ứng còn dở

    /* CHƠI THEO VÙNG — HIỆN CHỈ BẬT Ở MÀN 11.
     *
     * `level.regions` do gen.js dựng cho MỌI màn có tường (từ màn 6), nhưng
     * lối chơi soi-từng-ổ mới chỉ chốt ở màn 11. Mấy màn còn lại vẫn chơi
     * nguyên board, tường vẽ ra như cũ.
     *
     * Muốn mở rộng thì thêm index vào mảng này, không phải sửa chỗ nào khác —
     * dữ liệu vùng đã có sẵn ở mọi màn có tường. */
    const ZOOM_LEVELS = [10];                   // index 10 = MÀN 11
    G.regions   = (ZOOM_LEVELS.indexOf(index) >= 0 && lv.regions && lv.regions.length > 1)
                  ? lv.regions : null;
    G.regionIdx = 0;
    G.activeCells = null;
    G.regionRect  = null;
    G.regionCells = null;
    if(G.regions) enterRegion(0, false, 1100);   // xem cả bức 1,1 s rồi mới zoom
    else window.R.setView(null, false);

    hideOverlays();
    window.R.buildDeck();
    syncHud();
    window.R.fitBoard();
    save();
    prewarm(index + 1);
  }

  /* Sinh trước màn kế tiếp lúc máy rảnh. Màn 5 (cá voi) sinh mất ~2 giây vì
   * board to + có tường + cổng chất lượng khắt khe; làm sẵn từ lúc chơi màn 4
   * thì lúc bấm sang không còn khựng. LevelGen tự nhớ theo số màn. */
  function prewarm(i){
    if(i >= window.PICTURES.length + 12) return;
    const run = function(){ try{ LevelGen.generateLevel(i); }catch(e){} };
    if(window.requestIdleCallback) requestIdleCallback(run, { timeout:2500 });
    else setTimeout(run, 400);
  }

  /* -------------------------------------------------------------- đặt / gỡ */
  function doPlace(shapeId, idxs){
    const pid = G.nextPid++;
    G.placements.set(pid, { id:pid, shapeId:shapeId, idxs:idxs });
    for(let k=0;k<idxs.length;k++){ G.fill[idxs[k]] = pid; G.blocked[idxs[k]] = 1; }
    G.filled += idxs.length;
    /* Mọi đường đưa một khối lên board đều đi qua đây — đặt mới, hoàn tác, trả
     * về chỗ cũ — nên gắn cú nén-bật ở đây là đủ, không phải rải ra từng chỗ.
     * Riêng đường chạm-chip-rồi-chạm-board thì `commit` lát nữa đổi lại thành
     * bay-từ-khay-lên. */
    if(window.FX) window.FX.land(pid);
    return pid;
  }

  /* Khối rời board thì BAY VỀ Ô KHAY của chính nó. Luật 6 và luật 8 đều nói
   * khối không mất đi đâu cả, nó về khay — cho người chơi nhìn thấy đúng thế.
   * `hand` (toạ độ màn hình) dùng khi khối đang ở đầu ngón tay chứ không còn ở
   * chỗ cũ trên board. */
  function trayFly(p, hand){
    if(!window.FX || !p) return;
    const pt = window.R.chipPoint(p.shapeId);
    window.FX.flyOut(p.id, p.shapeId, p.idxs, pt, hand);
  }
  function doRemove(pid){
    const p = G.placements.get(pid);
    if(!p) return null;
    for(let k=0;k<p.idxs.length;k++){ G.fill[p.idxs[k]] = -1; G.blocked[p.idxs[k]] = 0; }
    G.filled -= p.idxs.length;
    G.placements.delete(pid);
    return p;
  }
  function deckOf(shapeId){
    for(let k=0;k<G.deck.length;k++) if(G.deck[k].shapeId === shapeId) return G.deck[k];
    return null;
  }
  function deckIndexOf(shapeId){
    for(let k=0;k<G.deck.length;k++) if(G.deck[k].shapeId === shapeId) return k;
    return -1;
  }

  /* Ô THẢ ĐƯỢC: trong tranh, không phải ô khảm, không vắt qua tường (nếu bật).
   * Ô đang có khối khác thì VẪN THẢ ĐƯỢC — khối kia sẽ bị đẩy về khay. */
  function dropCells(shapeId, r, c){
    const sh = SHAPES[shapeId], out = [];
    for(let t=0;t<sh.cells.length;t++){
      const rr = sh.cells[t][0] + r, cc = sh.cells[t][1] + c;
      if(rr<0 || rr>=G.rows || cc<0 || cc>=G.cols) return null;
      const i = rr*G.cols + cc;
      if(!G.inPic[i] || G.mosaic[i]) return null;
      /* Ngoài ổ đang soi thì cấm. Tường đã cấm khối VẮT QUA ranh giới, nhưng
       * chưa cấm đặt gọn trong một ổ KHÁC — mà khay giờ là khay riêng của ổ
       * này, đặt lạc sang ổ khác là hỏng sổ sách của cả hai bên. */
      if(G.activeCells && !G.activeCells[i]) return null;
      out.push(i);
    }
    const W = G.wallsActive;
    if(W){
      for(let t=0;t<sh.edgesR.length;t++)
        if(W.R[(sh.edgesR[t][0]+r)*G.cols + sh.edgesR[t][1]+c]) return null;
      for(let t=0;t<sh.edgesD.length;t++)
        if(W.D[(sh.edgesD[t][0]+r)*G.cols + sh.edgesD[t][1]+c]) return null;
    }
    return out;
  }
  /* Đặt khối sao cho nó PHỦ ô vừa chạm. Thử mọi cách neo (ô nào của khối rơi
   * vào ô đã chạm), rồi mới nới ra quanh đó — cùng tinh thần "thả đâu cũng
   * được" của thao tác kéo. */
  function placeAtCell(shapeId, cellIdx){
    const sh = SHAPES[shapeId];
    const tr = (cellIdx/G.cols)|0, tc = cellIdx%G.cols;
    for(let t=0;t<sh.cells.length;t++){
      const idxs = dropCells(shapeId, tr - sh.cells[t][0], tc - sh.cells[t][1]);
      if(idxs) return idxs;
    }
    for(let d=1; d<=2; d++)
      for(let dr=-d; dr<=d; dr++) for(let dc=-d; dc<=d; dc++){
        if(Math.max(Math.abs(dr), Math.abs(dc)) !== d) continue;
        for(let t=0;t<sh.cells.length;t++){
          const idxs = dropCells(shapeId, tr+dr - sh.cells[t][0], tc+dc - sh.cells[t][1]);
          if(idxs) return idxs;
        }
      }
    return null;
  }

  /* ------------------------------------------------------------------- VÙNG
   * Vào ổ thứ `k`: khung nhìn zoom vào đúng ổ đó, và KHAY CHỈ BÀY KHỐI CỦA Ổ
   * ĐÓ.
   *
   * Khay riêng từng ổ mới là chỗ ăn tiền, không phải cái zoom. Khay dùng chung
   * cả board thì lấp kín một ổ bằng bộ khối sai vẫn lọt — hỏng chỉ lộ ra ở ổ
   * kế bên lúc không còn khối vừa, mà lúc đó gỡ lại đã muộn. Khay riêng thì
   * lấp đúng ổ là đúng toàn cục: hết đường lọt.
   *
   * Lịch sử hoàn tác xoá theo từng ổ — ổ đã xong là xong, không lùi ngược qua
   * ranh giới được. Ổ chỉ 3–6 khối nên chẳng mất gì. */
  function enterRegion(k, animate, hold){
    const rg = G.regions[k];
    G.regionIdx = k;
    G.activeCells = new Uint8Array(G.rows*G.cols);
    for(let q=0;q<rg.cells.length;q++) G.activeCells[rg.cells[q]] = 1;
    G.regionCells = rg.cells;                  // render khoét màn mờ theo hình này
    G.regionRect = { r0:rg.r0, c0:rg.c0, r1:rg.r1, c1:rg.c1 };
    G.deck = rg.deck.map(function(d){
      return { shapeId:d.shapeId, total:d.total, left:d.total };
    });
    G.sel = -1; G.hintChip = -1; G.history = [];

    /* `hold` > 0: đứng ở HÌNH TỔNG chừng đó rồi mới zoom vào ổ đầu.
     *
     * Vào màn mà đã nằm sẵn trong ổ thì người chơi không biết mình đang ở đâu
     * trong bức tranh, cũng không biết bức tranh là hình gì. Cho xem cả bức —
     * tường vẽ ra, thấy rõ nó chia thành mấy ổ — rồi mới bổ nhào vào ổ đầu. */
    if(hold > 0){
      window.R.setView(null, false);
      setTimeout(function(){
        if(G.regions && G.regionIdx === k && !G.solved)
          window.R.setView(G.regionRect, true);
      }, hold);
    } else {
      window.R.setView(G.regionRect, animate);
    }
    window.R.buildDeck();
    syncHud();
  }

  function regionDone(){
    if(!G.regions) return false;
    const cells = G.regions[G.regionIdx].cells;
    for(let q=0;q<cells.length;q++) if(G.fill[cells[q]] < 0) return false;
    return true;
  }

  function occupantsOf(idxs){
    const set = {}, list = [];
    for(let k=0;k<idxs.length;k++){
      const pid = G.fill[idxs[k]];
      if(pid >= 0 && !set[pid]){ set[pid] = 1; list.push(pid); }
    }
    return list;
  }

  /* --------------------------------------------------------- một nước đi
   * Đặt khối + đẩy mọi khối bị đè về khay, gộp thành MỘT bước hoàn tác. */
  function commit(shapeId, cells, opt){
    opt = opt || {};
    const evicted = [];
    const victims = occupantsOf(cells);
    for(let k=0;k<victims.length;k++){
      const p = doRemove(victims[k]);
      if(!p) continue;
      deckOf(p.shapeId).left++;
      evicted.push({ shapeId:p.shapeId, idxs:p.idxs });
      trayFly(p);
    }
    const pid = doPlace(shapeId, cells.slice());
    if(opt.fromDeck) deckOf(shapeId).left--;
    /* CHẠM chip rồi CHẠM board: khối thật sự đi từ khay lên, nên cho nó bay.
     * Kéo thả thì không — lúc thả, khối đã nằm sẵn dưới ngón tay đúng ô đó. */
    if(opt.tap && window.FX)
      window.FX.flyIn(pid, shapeId, cells, window.R.chipPoint(shapeId));
    G.history.push({ shapeId:shapeId, to:cells.slice(),
                     from: opt.origin ? opt.origin.slice() : null,
                     fromDeck: !!opt.fromDeck, evicted:evicted });
    G.hintChip = -1;
    sfx(evicted.length ? 'push' : 'place');
    after();
  }

  function undo(){
    const a = G.history.pop();
    if(!a) return;
    const pid = G.fill[a.to[0]];
    let gone = null;
    if(pid >= 0 && !a.returned) gone = doRemove(pid);
    if(a.returned){                       // nước "chạm để trả về khay"
      doPlace(a.shapeId, a.to.slice());
      deckOf(a.shapeId).left--;
    } else {
      // trả các khối bị đẩy ra về đúng chỗ cũ, rồi mới tới khối gốc
      for(let k=0;k<a.evicted.length;k++){
        doPlace(a.evicted[k].shapeId, a.evicted[k].idxs.slice());
        deckOf(a.evicted[k].shapeId).left--;
      }
      /* Khối gốc đi đâu thì hoàn tác phải cho nó bay về đúng chỗ đó: về khay
       * nếu nó vốn lấy từ khay, còn không thì về chỗ cũ trên board (doPlace tự
       * lo cú nén-bật). */
      if(a.fromDeck){ deckOf(a.shapeId).left++; trayFly(gone); }
      else if(a.from) doPlace(a.shapeId, a.from.slice());
    }
    G.solved = false; G.revealT = 0; G.hintChip = -1;
    els.win.classList.remove('on');
    sfx('pull');
    after();
  }

  /* Chạm khối đã đặt (không kéo) → trả nó về khay. */
  function pull(pid){
    const p = G.placements.get(pid);
    if(!p) return false;
    doRemove(pid);
    deckOf(p.shapeId).left++;
    trayFly(p);
    G.history.push({ shapeId:p.shapeId, to:p.idxs.slice(), from:null,
                     fromDeck:false, evicted:[], returned:true });
    G.hintChip = -1;
    sfx('pull');
    after();
    return true;
  }

  function restart(){ loadLevel(G.index); }

  function after(){
    window.R.syncDeck();
    syncHud();
    /* Lấp kín ổ đang soi ⇒ trượt sang ổ kế. Chờ một nhịp cho cú nén-bật của
     * khối cuối chạy xong rồi mới dời khung nhìn — dời ngay thì hai chuyển
     * động chồng lên nhau, nhìn giật. */
    if(G.regions && !G.solved && regionDone()){
      if(G.regionIdx + 1 < G.regions.length){
        const next = G.regionIdx + 1;
        setTimeout(function(){
          if(!G.solved && G.regions && G.regionIdx === next-1) enterRegion(next, true);
        }, 420);
        return;
      }
      /* Ổ cuối xong = cả bức xong. Kéo khung nhìn về CẢ BOARD rồi mới ăn mừng:
       * người chơi phải thấy trọn bức tranh mình vừa ghép. */
      G.activeCells = null; G.regionRect = null; G.regionCells = null;
      window.R.setView(null, true);
    }
    if(!G.solved && G.filled === G.level.playable) win();
    /* KHÔNG có thông báo "hết đường" — chủ tài liệu thấy nó phiền. Chỗ dựa còn
     * lại: cổng chất lượng đã siết (mỗi màn ≥40 cách lát), hoàn tác vô hạn, và
     * luật thả-đè-thì-đẩy-khối-kia-về-khay nên hiếm khi thật sự tắc. */
  }

  /* ---------------------------------------------------------------- gợi ý
   * Gợi ý KHÔNG lộ nguyên đáp án — nó ĐẶT SẴN MỘT KHỐI ĐÚNG. */
  function hint(){
    if(G.solved) return;
    /* Chơi theo ổ thì gợi ý chỉ được lấy trong LỜI GIẢI CỦA Ổ ĐANG SOI. Lấy cả
     * bàn thì nó đặt sang ổ khác — mà `dropCells` đã cấm, nên gợi ý sẽ im lặng
     * không làm gì và người chơi tưởng nút hỏng. */
    const pool = (G.regions ? G.regions[G.regionIdx].pieces : G.level.solution);
    const ready = pool.filter(function(p){
      const d = deckOf(p.shapeId);
      if(!d || d.left <= 0) return false;
      for(let k=0;k<p.idxs.length;k++) if(G.blocked[p.idxs[k]]) return false;
      return true;
    });
    let pick = ready.length ? ready[(Math.random()*ready.length)|0] : null;

    if(!pick){
      const counts = {};
      for(let k=0;k<G.deck.length;k++) if(G.deck[k].left > 0) counts[G.deck[k].shapeId] = G.deck[k].left;
      if(!Object.keys(counts).length) return;
      /* Đường cứu: giải lại từ thế cờ hiện tại. Chơi theo ổ thì phải KHOÁ HẾT
       * phần ngoài ổ lại trước, không thì solver đi lát sang ổ bên cạnh bằng
       * khay của ổ này. */
      let occ = G.blocked;
      if(G.activeCells){
        occ = Uint8Array.from(G.blocked);
        for(let i=0;i<occ.length;i++) if(!G.activeCells[i]) occ[i] = 1;
      }
      const res = LevelGen.solve(occ, G.rows, G.cols, counts,
                                 { budget:400000, timeMs:400, walls:G.wallsActive });
      if(res.status !== 'solved'){ nudge(); return; }
      const p = res.placements[(Math.random()*res.placements.length)|0];
      pick = { shapeId:p.id, idxs:p.idxs };
    }
    commit(pick.shapeId, pick.idxs.slice(), { fromDeck:true });
    G.hintChip = deckIndexOf(pick.shapeId);
    window.R.syncDeck();
    window.R.scrollChipIntoView(G.hintChip);
  }

  function nudge(){
    els.card.classList.remove('nudge');
    void els.card.offsetWidth;
    els.card.classList.add('nudge');       // lắc nhẹ card, không nói gì
  }

  /* ---------------------------------------------------------------- thắng */
  function win(){
    G.solved = true; G.solvedAt = performance.now();
    G.drag = null; G.pending = null;
    if(G.index + 1 > G.unlocked) G.unlocked = G.index + 1;
    G.done.add(G.index);
    save(); syncHud();
    sfx('win');
    setTimeout(showWin, REVEAL_MS + 350);
  }

  /* ------------------------------------------------------------------ HUD */
  /* GAME KHÔNG CHỮ: HUD chỉ còn SỐ màn. Không caption, không tên tranh, không
   * câu hướng dẫn, không thông báo — mọi thứ nói bằng hình. */
  function syncHud(){
    els.level.textContent = G.index + 1;
    /* Ba công tắc nằm trong bảng Cài đặt chứ không còn trên thanh trên. */
    els.rowTint.classList.toggle('on', G.showTint);
    els.rowSound.classList.toggle('on', G.sound);
    els.rowHaptic.classList.toggle('on', G.haptic);
    const pics = new Set();
    G.done.forEach(function(i){ pics.add(i % window.PICTURES.length); });
    els.galCount.textContent = pics.size + ' / ' + window.PICTURES.length + ' bức ›';
  }

  function hideOverlays(){
    els.win.classList.remove('on');
    els.gallery.classList.remove('on');
    els.settings.classList.remove('on');
  }
  function showWin(){
    els.winArt.innerHTML = picThumb(G.level.picture, 14);   // chính bức vừa lắp
    els.win.classList.add('on');
  }

  /* --------------------------------------------------------- phòng tranh */
  /* Phòng tranh giờ kiêm luôn BẢNG CHỌN MÀN — hai nút ‹ › đã rời thanh trên,
   * đây là đường duy nhất để quay lại màn cũ. Màn đã xong hiện bức tranh; màn
   * đã mở mà chưa xong để trống, vì bức tranh chính là phần thưởng. */
  function openGallery(){
    const open = Math.max(G.unlocked, G.index) + 1;
    let html = '';
    for(let i=0;i<open;i++){
      const pic  = window.PICTURES[i % window.PICTURES.length];
      const done = G.done.has(i);
      html += '<button class="frame' + (i === G.index ? ' cur' : '') + '" data-lv="' + i + '">' +
              (done ? picThumb(pic, 8) : '<div class="thumb-empty"></div>') +
              '<b>' + (i+1) + '</b></button>';
    }
    for(let k=0;k<3;k++)
      html += '<div class="frame locked"><div class="thumb-empty"></div><b>' +
              (open+k+1) + '</b></div>';
    els.galGrid.innerHTML = html;
    els.settings.classList.remove('on');
    els.gallery.classList.add('on');
  }
  /* Bức tranh hiện ở bảng kết màn và ở phòng tranh.
   *
   * Hai ô cạnh nhau vẽ SÁT nhau thì mép chung vẫn bị khử răng cưa: mỗi bên chỉ
   * phủ nửa điểm ảnh, cộng lại vẫn hở ra nền trắng — thành một cái lưới kẻ ô
   * chạy khắp bức tranh. Nên phải cho hai ô ĐÈ nhau nửa điểm ảnh, và tắt luôn
   * khử răng cưa: tranh lắp xong phải là MỘT hình liền.
   *
   * Gom theo màu rồi tô một path — mấy ô cùng màu kề nhau nhập hẳn làm một
   * mảng, không còn mép chung nào để mà hở. */
  function picThumb(pic, px){
    const rows = pic.art.length, cols = pic.art[0].length;
    const byCol = {};
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const col = pic.palette[pic.art[r][c]];
      if(col == null) continue;
      (byCol[col] = byCol[col] || []).push([r,c]);
    }
    let s = '<svg class="thumb" shape-rendering="crispEdges" viewBox="0 0 '
          + (cols*px)+' '+(rows*px)+'" width="'+(cols*px)+'" height="'+(rows*px)+'">';
    const o = 0.5;                     // đè nhau nửa điểm ảnh
    for(const col in byCol){
      let d = '';
      const list = byCol[col];
      for(let k=0;k<list.length;k++){
        const x = list[k][1]*px - o, y = list[k][0]*px - o, w = px + 2*o;
        d += 'M'+x+','+y+'h'+w+'v'+w+'h'+(-w)+'Z';
      }
      s += '<path d="'+d+'" fill="'+col+'"/>';
    }
    return s + '</svg>';
  }

  /* ---------------------------------------------------------------- âm nhỏ */
  let AC = null;
  function sfx(kind){
    try{
      /* Rung đi kèm mọi tiếng động, nhưng là công tắc riêng. */
      if(G.haptic && navigator.vibrate)
        navigator.vibrate(kind === 'win' ? [16,40,16] : 9);
      if(!G.sound) return;
      if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
      if(AC.state === 'suspended') AC.resume();
      const seq = { place:[[440,0,.07]], pull:[[262,0,.07]], push:[[330,0,.06],[220,.06,.09]],
                    win:[[523,0,.13],[659,.11,.13],[784,.22,.13],[1046,.33,.30]] }[kind];
      if(!seq) return;
      for(let k=0;k<seq.length;k++){
        const f = seq[k][0], at = AC.currentTime + seq[k][1], dur = seq[k][2];
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(0.11, at+0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, at+dur);
        o.connect(g); g.connect(AC.destination); o.start(at); o.stop(at+dur+0.02);
      }
    }catch(e){}
  }

  /* ---------------------------------------------------------------- input */
  function localPos(e){
    const b = cv.getBoundingClientRect();
    return [e.clientX - b.left, e.clientY - b.top];
  }

  function updateDrag(px, py){
    const d = G.drag, L = window.L, cell = L.cell;
    d.left = px + d.offX;
    d.top  = py + d.offY;

    const fr = (d.top - L.by)/cell, fc = (d.left - L.bx)/cell;
    const r0 = Math.round(fr), c0 = Math.round(fc);
    /* Thả ở ĐÂU CŨNG ĐƯỢC: không bắt người chơi canh đúng ô. Quét cả vùng ±3 ô
     * quanh chỗ thả và nhận vị trí HỢP LỆ GẦN NHẤT — kể cả khi khối đang thò ra
     * ngoài tranh hay đè lên ô khảm, nó tự trượt vào chỗ vừa. Chỉ khi cả vùng
     * không còn chỗ nào đặt được thì khối mới quay về. */
    /* HÚT VÀO CHỖ CÒN TRỐNG. Chấm điểm = khoảng cách CỘNG tiền phạt cho mỗi ô
     * đã có khối mà mình đè lên. Phạt 2,2 ô nghĩa là: chỗ trống nào nằm trong
     * bán kính 2,2 ô luôn thắng chỗ phải đè một viên — khối tự trượt vào lỗ
     * thay vì hất khối cũ ra. Hết chỗ trống thì vị trí đè vẫn nhận, nên vẫn
     * đặt chồng được khi thật sự muốn. */
    const DE = 2.2;
    let best = null, bestScore = Infinity;
    for(let dr=-3;dr<=3;dr++) for(let dc=-3;dc<=3;dc++){
      const r = r0+dr, c = c0+dc;
      const dist = Math.sqrt((r-fr)*(r-fr) + (c-fc)*(c-fc));
      if(dist > 3.2) continue;
      const idxs = dropCells(d.shapeId, r, c);
      if(!idxs) continue;
      let chong = 0;
      for(let k=0;k<idxs.length;k++) if(G.fill[idxs[k]] >= 0) chong++;
      const score = dist + DE*chong;
      if(score >= bestScore) continue;
      bestScore = score; best = { r:r, c:c, idxs:idxs };
    }
    d.snap = best;
    /* Ngón tay có đang ở NGOÀI board không — thả ở ngoài là gỡ khối. */
    d.out = px < L.bx - cell*0.5 || px > L.bx + G.cols*cell + cell*0.5 ||
            py < L.by - cell*0.5 || py > L.by + G.rows*cell + cell*0.5;
    /* Vẽ trước cái giá: khối nào sắp bị đẩy ra khay. */
    d.evict = best ? occupantsOf(best.idxs).map(function(pid){
      return G.placements.get(pid).idxs;
    }) : [];
  }

  function startDrag(shapeId, from, px, py, extra){
    const L = window.L, sh = SHAPES[shapeId], cell = L.cell;
    G.pending = null;
    G.drag = Object.assign({
      shapeId:shapeId, from:from, left:0, top:0, snap:null, evict:[], origin:null,
      /* Kéo từ khay: khối nâng cao hơn ngón tay để không bị che. Nhấc từ board
       * thì `liftFromBoard` ghi đè offX/offY để GIỮ NGUYÊN viên gạch đã chạm. */
      offX: -sh.w*cell/2,
      offY: -(cell*1.35 + 16) - sh.h*cell/2
    }, extra || {});
    document.body.classList.add('dragging');
    G.sel = -1;
    updateDrag(px, py);
  }

  function sameCells(a, b){
    if(!a || !b || a.length !== b.length) return false;
    for(let k=0;k<a.length;k++) if(a[k] !== b[k]) return false;
    return true;
  }

  function endDrag(){
    const d = G.drag;
    G.drag = null;
    document.body.classList.remove('dragging');
    if(!d) return;

    /* KÉO RA NGOÀI BOARD = GỠ. Khối nhấc từ board mà thả ở ngoài khung tranh
     * thì trả thẳng về khay, không bò về chỗ cũ. Cùng với chạm-để-gỡ, người
     * chơi có hai đường bỏ một khối đã đặt.
     *
     * liftFromBoard đã doRemove nhưng CHƯA cộng vào khay (lúc đó khối đang ở
     * trên tay), nên ở đây phải cộng. */
    if(d.from === 'board' && d.out){
      const slot = deckOf(d.shapeId);
      if(slot) slot.left++;
      /* Bay về khay TỪ ĐẦU NGÓN TAY, không phải từ chỗ cũ trên board — lúc này
       * khối đang ở trên tay, chỗ cũ đã trống từ lúc nhấc lên rồi. */
      const b = cv.getBoundingClientRect(), sh = SHAPES[d.shapeId], cell = window.L.cell;
      trayFly({ id:d.pid, shapeId:d.shapeId, idxs:d.origin },
              { x: b.left + d.left + sh.w*cell/2, y: b.top + d.top + sh.h*cell/2 });
      G.history.push({ shapeId:d.shapeId, to:d.origin.slice(), from:null,
                       fromDeck:false, evicted:[], returned:true });
      G.hintChip = -1;
      sfx('pull');
      after();
      return;
    }

    if(!d.snap){                                   // ra ngoài tranh / lên ô khảm
      if(d.from === 'board') doPlace(d.shapeId, d.origin.slice());
      window.R.syncDeck();
      return;                                      // KHÔNG ghi undo
    }
    if(d.from === 'board' && sameCells(d.snap.idxs, d.origin)){
      doPlace(d.shapeId, d.origin.slice());        // nhích trong cùng một ô
      window.R.syncDeck();
      return;                                      // KHÔNG ghi undo
    }
    commit(d.shapeId, d.snap.idxs, { fromDeck: d.from === 'deck', origin: d.origin });
  }

  /* ---- chạm xuống khay ---- */
  function onChipDown(e){
    if(G.solved) return;
    const chip = e.target.closest ? e.target.closest('.chip') : null;
    let i = chip ? +chip.dataset.i : -1;
    if(!(i >= 0) || !G.deck[i] || G.deck[i].left <= 0) i = -1;
    /* `chip:-1` = chạm vào khoảng trống của khay (hoặc vào ô đã dùng hết).
     * Vẫn ghi nhận, vì từ đó KÉO NGANG để cuộn khay là hợp lệ — chỉ không nhấc
     * được khối nào lên thôi. */
    G.pending = { chip:i, x0:e.clientX, y0:e.clientY,
                  sl0:deckEl.scrollLeft, scroll:false, dx0:0 };
    listen();
  }

  /* ---- chạm xuống board (chạm = trả về khay, kéo = nhấc lên) ---- */
  function onBoardDown(e){
    if(G.solved || G.drag) return;
    const p = localPos(e);
    const i = window.R.boardIndexAt(p[0], p[1]);
    if(i < 0) return;

    if(G.sel >= 0 && G.deck[G.sel] && G.deck[G.sel].left > 0){
      const cells = placeAtCell(G.deck[G.sel].shapeId, i);
      if(cells){
        const id = G.deck[G.sel].shapeId;
        commit(id, cells, { fromDeck:true, tap:true });
        if(!deckOf(id) || deckOf(id).left <= 0) G.sel = -1;   // hết hàng thì bỏ chọn
        window.R.syncDeck();
      }
      return;
    }

    if(G.mosaic[i]) return;
    /* Khối nằm trong ổ ĐÃ XONG: khoá luôn. Gỡ nó ra thì khay hiện tại không có
     * chỗ trả về (khay là của ổ này), sổ sách vỡ ngay. */
    if(G.activeCells && !G.activeCells[i]) return;
    const pid = G.fill[i];
    if(pid < 0) return;
    G.pending = { pid:pid, x0:e.clientX, y0:e.clientY, px:p[0], py:p[1] };
    listen();
  }

  function liftFromBoard(pend, px, py){
    const L = window.L, cell = L.cell;
    const p = G.placements.get(pend.pid);
    if(!p) return;
    const origin = p.idxs.slice();
    let minR = Infinity, minC = Infinity;
    for(let k=0;k<origin.length;k++){
      const r = (origin[k]/G.cols)|0, c = origin[k]%G.cols;
      if(r < minR) minR = r;
      if(c < minC) minC = c;
    }
    const left = L.bx + minC*cell, top = L.by + minR*cell;
    doRemove(pend.pid);          // rời board ngay…
    // …nhưng KHÔNG cộng vào khay: nó đang ở trên tay, ×N phải đứng yên.
    startDrag(p.shapeId, 'board', px, py, {
      origin: origin,
      pid: pend.pid,             // để lát nữa còn biết lấy lệch sắc độ của khối nào

      offX: left - pend.px,      // giữ đúng viên gạch đã chạm dưới ngón tay
      offY: top  - pend.py
    });
  }

  function listen(){
    window.addEventListener('pointermove', onWinMove, { passive:false });
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinUp);
  }
  function onWinMove(e){
    const pend = G.pending;
    if(pend){
      const dx = e.clientX - pend.x0, dy = e.clientY - pend.y0;
      if(pend.pid != null){
        if(Math.abs(dx) > 6 || Math.abs(dy) > 6){
          const p = localPos(e);
          liftFromBoard(pend, p[0], p[1]);
        }
      } else if(pend.scroll){
        /* ĐANG CUỘN KHAY. Trừ đi `dx0` — quãng đã đi lúc vượt ngưỡng — để khay
         * không giật nảy một cái ngay khi bắt đầu cuộn. */
        deckEl.scrollLeft = pend.sl0 - (dx - pend.dx0);
        e.preventDefault();
      } else {
        /* Hai cử chỉ cùng bắt đầu từ ô khay, phân biệt bằng HƯỚNG:
         *   đi LÊN   ⇒ nhấc khối ra khỏi khay;
         *   đi NGANG ⇒ cuộn khay để với tới mấy ô còn khuất ngoài khung.
         * Trên điện thoại `touch-action:pan-x` đã cho trình duyệt tự cuộn, còn
         * đây là đường dành cho CHUỘT — chuột không có touch-action nào cả, nên
         * trước giờ kéo ngang bằng chuột không ăn gì. */
        if(pend.chip >= 0 &&
           (dy < -8 || (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)))){
          const p = localPos(e);
          startDrag(G.deck[pend.chip].shapeId, 'deck', p[0], p[1], { chip:pend.chip });
        } else if(Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)
                  && window.R.deckScrollable()){
          pend.scroll = true; pend.dx0 = dx;
          deckEl.classList.add('grabbing');
          e.preventDefault();
        }
      }
    }
    if(G.drag){
      e.preventDefault();
      const p = localPos(e);
      updateDrag(p[0], p[1]);
    }
  }
  function onWinUp(e){
    window.removeEventListener('pointermove', onWinMove);
    window.removeEventListener('pointerup', onWinUp);
    window.removeEventListener('pointercancel', onWinUp);
    const pend = G.pending;
    G.pending = null;
    deckEl.classList.remove('grabbing');
    if(!G.drag && pend){
      if(pend.pid != null){ pull(pend.pid); return; }        // chạm khối đã đặt
      /* Vừa CUỘN khay xong thì không phải cú chạm chọn. Cũng không chọn khi
       * trình duyệt HUỶ pointer — trên điện thoại, cú vuốt ngang bị nó nuốt để
       * tự cuộn và bắn ra `pointercancel`; tính đó là chạm thì vuốt tới vuốt
       * lui một hồi là chọn nhầm khối. */
      if(pend.scroll || pend.chip < 0) return;
      if(e && e.type === 'pointercancel') return;
      /* Chạm ô khay mà không kéo ⇒ CHỌN khối. Chạm tiếp vào tranh là đặt.
       * Đường này để chuột trên máy tính (và mọi chỗ mà cử chỉ kéo không ăn)
       * vẫn chơi được, chứ không bắt buộc phải kéo. */
      G.sel = (G.sel === pend.chip) ? -1 : pend.chip;
      window.R.syncDeck();
      return;
    }
    endDrag();
  }

  /* ----------------------------------------------------------------- loop */
  function frame(now){
    if(window.FX) window.FX.tick(now);
    if(G.solved && G.revealT < 1) G.revealT = Math.min(1, (now - G.solvedAt)/REVEAL_MS);
    window.R.draw(now);
    window.R.drawDrag();
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------------- boot */
  function boot(){
    cv = document.getElementById('cv');
    dg = document.getElementById('dragLayer');
    deckEl = document.getElementById('deck');
    window.R.bind(cv, dg, deckEl);

    els = {
      card:document.getElementById('card'),
      level:document.getElementById('hudLevel'),
      win:document.getElementById('win'), winArt:document.getElementById('winArt'),
      gallery:document.getElementById('gallery'),
      galGrid:document.getElementById('galGrid'),
      settings:document.getElementById('settings'),
      rowTint:document.getElementById('rowTint'),
      rowSound:document.getElementById('rowSound'),
      rowHaptic:document.getElementById('rowHaptic'),
      galCount:document.getElementById('galCount')
    };

    loadLevel(load());

    deckEl.addEventListener('pointerdown', onChipDown);
    /* Con lăn chuột trên khay = cuộn NGANG. Khay chỉ cao 66px, cuộn dọc không
     * có gì để cuộn — lăn mà khay không nhúc nhích thì người chơi kết luận là
     * khay chỉ có bấy nhiêu ô. Nhận cả deltaX (chuột/trackpad cuộn ngang). */
    deckEl.addEventListener('wheel', function(ev){
      if(!window.R.deckScrollable()) return;
      const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      if(!d) return;
      deckEl.scrollLeft += d;
      ev.preventDefault();
    }, { passive:false });
    cv.addEventListener('pointerdown', onBoardDown);

    function toggle(key){ G[key] = !G[key]; syncHud(); save(); }
    els.rowTint.onclick   = function(){ toggle('showTint'); };
    els.rowSound.onclick  = function(){ toggle('sound'); if(G.sound) sfx('place'); };
    els.rowHaptic.onclick = function(){ toggle('haptic'); if(G.haptic) sfx('pull'); };
    document.getElementById('rowGallery').onclick  = openGallery;
    document.getElementById('btnRestart').onclick  = restart;
    document.getElementById('btnSettings').onclick = function(){ els.settings.classList.add('on'); };
    document.getElementById('setClose').onclick    = function(){ els.settings.classList.remove('on'); };
    document.getElementById('btnHint').onclick     = hint;
    document.getElementById('btnUndo').onclick     = undo;
    document.getElementById('galClose').onclick    = function(){ els.gallery.classList.remove('on'); };
    els.galGrid.onclick = function(e){
      const f = e.target.closest('[data-lv]');
      if(f) loadLevel(+f.dataset.lv);
    };
    document.getElementById('btnAgain').onclick   = restart;
    document.getElementById('btnGo').onclick      = function(){ loadLevel(G.index+1); };

    window.addEventListener('keydown', function(e){
      if(e.key === 'z' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); undo(); }
      else if(e.key === 'r') restart();
      else if(e.key === 'h') hint();
    });
    window.addEventListener('resize', function(){ window.R.fitBoard(); });

    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------- QA hooks */
  window.CM_QA = {
    go: function(i){ loadLevel(i); return G.index; },
    solve: function(){
      const plan = G.level.solution.slice();
      for(let k=0;k<plan.length;k++){
        const p = plan[k];
        let free = true;
        for(let q=0;q<p.idxs.length;q++) if(G.blocked[p.idxs[q]]) free = false;
        if(free && deckOf(p.shapeId).left > 0) commit(p.shapeId, p.idxs.slice(), { fromDeck:true });
      }
      return G.filled === G.level.playable && G.deck.every(function(d){ return d.left === 0; });
    },
    count: function(cap){
      const counts = {};
      for(let k=0;k<G.deck.length;k++) if(G.deck[k].left>0) counts[G.deck[k].shapeId] = G.deck[k].left;
      return LevelGen.countSolutions(G.blocked, G.rows, G.cols, counts, cap||200, 3000000, G.wallsActive);
    },
    state: function(){
      return { level:G.index+1, picture:G.level.picture.id,
               cells:G.level.playable, mosaic:G.level.mosaicCount,
               pieces:G.level.pieceCount, deck:G.deck.length,
               filled:G.filled, undo:G.history.length, solved:G.solved };
    }
  };

  window.Game = { boot:boot, loadLevel:loadLevel, undo:undo, restart:restart, hint:hint };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
