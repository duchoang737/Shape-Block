/* ============================================================================
 * gen.js — Sinh màn & solver.
 * ----------------------------------------------------------------------------
 * Ý tưởng cốt lõi: KHÔNG bốc đại một bộ khối rồi cầu cho nó vừa. Ta LÁT KÍN bức
 * tranh trước bằng solver ngẫu nhiên, rồi lấy chính kết quả lát đó làm deck:
 *   • Màn nào cũng CHẮC CHẮN giải được.
 *   • Tổng ô của deck = đúng số ô của board.
 *   • Thường còn RẤT NHIỀU lời giải khác ⇒ "dài chứ không khó".
 *
 * TƯỜNG (đúng luật bản gốc SandShape/Block Wow): tường là rào NẰM TRÊN CẠNH
 * giữa hai ô, KHÔNG chiếm ô nào. Luật duy nhất: **một khối không được nằm vắt
 * qua cạnh có tường**. Lưu bằng hai mảng `R[i]` (cạnh phải của ô i) và `D[i]`
 * (cạnh dưới của ô i).
 * ==========================================================================*/
(function(){
  const SHAPES = window.SHAPES;
  const NB = [[-1,0],[1,0],[0,-1],[0,1]];

  function mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  let _now = (typeof performance !== 'undefined' && performance.now)
    ? function(){ return performance.now(); } : function(){ return Date.now(); };
  function nowMs(){ return _now(); }

  /* Mask từ bức tranh: occ[i]=1 nghĩa là ô KHÔNG dùng được (ngoài board).
   * Ký tự có màu trong palette ⇒ ô chơi được. Board là silhouette bức tranh. */
  function buildMask(pic){
    const rows = pic.art.length, cols = pic.art[0].length;
    const N = rows*cols;
    const occ     = new Uint8Array(N);   // 1 = KHÔNG đặt khối lên được
    const inPic   = new Uint8Array(N);   // 1 = ô thuộc bức tranh (có vẽ)
    const mosaic  = new Uint8Array(N);   // 1 = ô khảm sẵn
    const colorAt = new Array(N).fill(null);
    const holes = {};
    (pic.holes || []).forEach(function(ch){ holes[ch] = 1; });
    let playable = 0, mosaicCount = 0;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const ch = pic.art[r][c], i = r*cols+c;
      const col = pic.palette[ch];
      if(col == null){ occ[i] = 1; continue; }   // ngoài tranh
      inPic[i] = 1; colorAt[i] = col;
      if(holes[ch]){                             // Ô KHẢM: thuộc tranh nhưng khoá
        occ[i] = 1; mosaic[i] = 1; mosaicCount++;
      } else playable++;
    }
    return { rows:rows, cols:cols, occ:occ, inPic:inPic, mosaic:mosaic,
             colorAt:colorAt, playable:playable, mosaicCount:mosaicCount };
  }

  /* ------------------------------------------------------- đặt được hay không
   * Gom về MỘT chỗ: biên, ô đã bị chiếm, và tường. Mọi nơi khác gọi lại hàm này
   * để luật tường không thể lệch giữa solver, generator và lúc chơi. */
  function fits(occ, rows, cols, W, sh, dr, dc, out){
    out.length = 0;
    for(let t=0;t<sh.cells.length;t++){
      const rr = sh.cells[t][0] + dr, cc = sh.cells[t][1] + dc;
      if(rr<0 || rr>=rows || cc<0 || cc>=cols) return false;
      const k = rr*cols + cc;
      if(occ[k]) return false;
      out.push(k);
    }
    if(W){
      for(let t=0;t<sh.edgesR.length;t++)
        if(W.R[(sh.edgesR[t][0]+dr)*cols + sh.edgesR[t][1]+dc]) return false;
      for(let t=0;t<sh.edgesD.length;t++)
        if(W.D[(sh.edgesD[t][0]+dr)*cols + sh.edgesD[t][1]+dc]) return false;
    }
    return true;
  }

  /* Ô `cellIdx` còn khối nào phủ nổi không? Quét mọi shape còn hàng × mọi cách
   * neo. Cắt tỉa mạnh hơn hẳn kiểu "ô trống bị cô lập": một ô có đủ hàng xóm
   * trống vẫn có thể không khối nào lọt vừa — nhất là khi có tường. */
  const _scratch = [];
  function coverable(occ, rows, cols, counts, cellIdx, W){
    const r = (cellIdx/cols)|0, c = cellIdx%cols;
    for(const id in counts){
      if(counts[id] <= 0) continue;
      const sh = SHAPES[id];
      for(let a=0;a<sh.cells.length;a++){
        if(fits(occ, rows, cols, W, sh, r - sh.cells[a][0], c - sh.cells[a][1], _scratch)) return true;
      }
    }
    return false;
  }

  /* Sau khi đặt khối: nếu một ô trống KỀ chỗ vừa đặt đã hết đường được phủ thì
   * nhánh này chết, quay lui ngay. Chỉ soát ô kề — ô ở xa không đổi. */
  function makesDeadHole(occ, rows, cols, counts, idxs, W){
    for(let t=0;t<idxs.length;t++){
      const k = idxs[t], r = (k/cols)|0, c = k%cols;
      for(let n=0;n<4;n++){
        const rr = r+NB[n][0], cc = c+NB[n][1];
        if(rr<0||rr>=rows||cc<0||cc>=cols) continue;
        const j = rr*cols+cc;
        if(occ[j]) continue;
        if(!coverable(occ, rows, cols, counts, j, W)) return true;
      }
    }
    return false;
  }

  /* Lát kín phần còn trống của `occ0` bằng đúng số khối trong `counts0`.
   * Trả {status:'solved'|'unsat'|'unknown', placements:[{id, idxs}]}.
   * 'unknown' = hết ngân sách tìm kiếm, KHÔNG kết luận gì cả. */
  function solve(occ0, rows, cols, counts0, opts){
    opts = opts || {};
    const budget   = opts.budget || 80000;
    const timeMs   = opts.timeMs || 0;
    const rng      = opts.rng || null;
    const W        = opts.walls || null;
    /* HỆ SỐ NHÂN, không phải số cộng: cộng một hằng số vào mọi key thì nó triệt
     * tiêu khi so sánh, thứ tự không đổi. Dương = chuộng khối nhỏ. */
    const sizeBias = opts.sizeBias != null ? opts.sizeBias : 1.2;
    const deadline = timeMs ? (nowMs() + timeMs) : Infinity;

    const occ    = Uint8Array.from(occ0);
    const counts = Object.assign({}, counts0);
    const ids    = Object.keys(counts).sort(function(a,b){
      return SHAPES[b].size - SHAPES[a].size || (a<b?-1:1); });
    const N      = rows*cols;
    const out    = [];
    let nodes = 0, ranOut = false;

    /* Khoá sắp xếp tính TRƯỚC rồi mới sort. Gọi rng() ngay trong comparator làm
     * kết quả phụ thuộc thuật toán sort của từng engine ⇒ mất tính tất định. */
    function order(){
      if(!rng) return ids;
      const a = ids.map(function(id){ return [id, -SHAPES[id].size*sizeBias + rng()*2.2]; });
      a.sort(function(x,y){ return y[1] - x[1]; });
      return a.map(function(x){ return x[0]; });
    }

    function rec(from){
      if(++nodes > budget || nowMs() > deadline){ ranOut = true; return false; }
      let i = from; while(i < N && occ[i]) i++;
      if(i >= N) return true;
      const r = (i/cols)|0, c = i%cols;
      const list = order();
      const idxs = [];
      for(let q=0;q<list.length;q++){
        const id = list[q];
        if(counts[id] <= 0) continue;
        const sh = SHAPES[id], a0 = sh.cells[0];
        if(!fits(occ, rows, cols, W, sh, r - a0[0], c - a0[1], idxs)) continue;
        const snap = idxs.slice();
        for(let t=0;t<snap.length;t++) occ[snap[t]] = 1;
        counts[id]--;
        if(!makesDeadHole(occ, rows, cols, counts, snap, W)){
          out.push({ id:id, idxs:snap });
          if(rec(i+1)) return true;
          out.pop();
        }
        for(let t=0;t<snap.length;t++) occ[snap[t]] = 0;
        counts[id]++;
        if(ranOut) return false;
      }
      return false;
    }

    const solved = rec(0);
    return {
      status: solved ? 'solved' : (ranOut ? 'unknown' : 'unsat'),
      placements: solved ? out.slice() : [],
      nodes: nodes
    };
  }

  /* Đếm SỐ CÁCH lát khác nhau, dừng ở `cap`. Chỉ số "dễ thở" của doc §04:
   * càng nhiều lời giải thì càng ít bị kẹt và càng ít phải gỡ ra làm lại. */
  function countSolutions(occ0, rows, cols, counts0, cap, budget, W){
    cap = cap || 200; budget = budget || 4000000;
    const occ = Uint8Array.from(occ0);
    const counts = Object.assign({}, counts0);
    const ids = Object.keys(counts).sort(function(a,b){
      return SHAPES[b].size - SHAPES[a].size || (a<b?-1:1); });
    const N = rows*cols;
    let found = 0, nodes = 0, ranOut = false;

    function rec(from){
      if(++nodes > budget){ ranOut = true; return; }
      let i = from; while(i < N && occ[i]) i++;
      if(i >= N){ found++; return; }
      const r = (i/cols)|0, c = i%cols;
      const idxs = [];
      for(let q=0;q<ids.length && found<cap && !ranOut;q++){
        const id = ids[q];
        if(counts[id] <= 0) continue;
        const sh = SHAPES[id], a0 = sh.cells[0];
        if(!fits(occ, rows, cols, W, sh, r - a0[0], c - a0[1], idxs)) continue;
        const snap = idxs.slice();
        for(let t=0;t<snap.length;t++) occ[snap[t]] = 1;
        counts[id]--;
        if(!makesDeadHole(occ, rows, cols, counts, snap, W)) rec(i+1);
        for(let t=0;t<snap.length;t++) occ[snap[t]] = 0;
        counts[id]++;
      }
    }
    rec(0);
    return { count:found, capped:found >= cap, exhausted:ranOut, nodes:nodes };
  }

  /* ------------------------------------------------------------------ TƯỜNG
   * Tường KHÔNG rải ngẫu nhiên. Ta gom các khối của lời giải thành từng CỤM
   * ~`target` khối, rồi dựng tường dọc theo ranh giới giữa các cụm. Board bị
   * chia thành mấy VÙNG KÍN nhỏ, mỗi vùng là một câu đố riêng:
   *
   *   • Đặt sai ở vùng nào thì biết ngay ở vùng đó, không phải lắp xong cả
   *     trăm ô mới lộ ra — đây mới là thứ thật sự giảm độ khó.
   *   • Vì tường lấy từ chính lời giải nên màn vẫn giải được theo cấu tạo.
   *   • Trong mỗi vùng vẫn còn nhiều cách lát ⇒ không phải dò đúng một đáp án.
   *
   * (Doc Cozy Mosaic bỏ vật cản vì "chồng thêm vách ngăn là đẩy về phía khó" —
   * đúng với tường RẢI RÁC. Tường dùng để CHIA VÙNG thì tác dụng ngược lại.) */
  /* Chia khối thành `want` cụm GỌN VỀ KHÔNG GIAN — cắt đôi đệ quy theo kiểu
   * k-d tree: lấy cụm nhiều ô nhất, bổ theo trục DÀI hơn của nó, tại chỗ chia
   * đôi số ô. Lặp tới khi đủ số cụm.
   *
   * Vì sao không dùng lối gom BFS ở `makeWalls`: BFS bắt đầu từ một khối ngẫu
   * nhiên rồi vơ dần hàng xóm, nên cụm mọc RẮN RẾT khắp board. Đo màn 15: một
   * cụm có bbox trùm nguyên 10×10 ô — zoom vào đúng bằng không zoom. Lối chơi
   * soi từng vùng đòi vùng phải GỌN, và cắt đôi đệ quy cho ra mấy mảnh cỡ 1/2
   * × 1/2 board, tức là phóng to thật sự gấp đôi.
   *
   * Cắt theo khối (không theo ô) nên tường vẫn nằm đúng ranh giới giữa các
   * khối, và không khối nào bị vắt qua hai vùng. */
  function clusterSpatial(placements, rows, cols, want){
    const P = placements.length;
    const cen = placements.map(function(p){
      let sr = 0, sc = 0;
      for(let t=0;t<p.idxs.length;t++){ sr += (p.idxs[t]/cols)|0; sc += p.idxs[t]%cols; }
      return { r:sr/p.idxs.length, c:sc/p.idxs.length, n:p.idxs.length };
    });
    const bulk = function(list){
      let n = 0;
      for(let q=0;q<list.length;q++) n += cen[list[q]].n;
      return n;
    };
    const all = []; for(let k=0;k<P;k++) all.push(k);
    let parts = [all];

    while(parts.length < want){
      /* Cụm to nhất mà CÒN CẮT ĐƯỢC (≥2 khối). Không kèm điều kiện đó thì gặp
       * cụm một khối là kẹt vòng lặp. */
      let bi = -1;
      for(let i=0;i<parts.length;i++){
        if(parts[i].length < 2) continue;
        if(bi < 0 || bulk(parts[i]) > bulk(parts[bi])) bi = i;
      }
      if(bi < 0) break;
      const list = parts[bi];

      let r0=1e9, r1=-1e9, c0=1e9, c1=-1e9;
      for(let q=0;q<list.length;q++){
        const e = cen[list[q]];
        if(e.r<r0) r0=e.r;  if(e.r>r1) r1=e.r;
        if(e.c<c0) c0=e.c;  if(e.c>c1) c1=e.c;
      }
      const byRow = (r1-r0) >= (c1-c0);
      const sorted = list.slice().sort(function(a,b){
        return byRow ? (cen[a].r-cen[b].r || cen[a].c-cen[b].c)
                     : (cen[a].c-cen[b].c || cen[a].r-cen[b].r);
      });
      const half = bulk(list)/2;
      let acc = 0, cut = sorted.length - 1;
      for(let q=0;q<sorted.length-1;q++){
        acc += cen[sorted[q]].n;
        if(acc >= half){ cut = q+1; break; }
      }
      parts.splice(bi, 1, sorted.slice(0, cut), sorted.slice(cut));
    }

    const cluster = new Int32Array(P);
    for(let i=0;i<parts.length;i++)
      for(let q=0;q<parts[i].length;q++) cluster[parts[i][q]] = i;
    return cluster;
  }

  function makeWalls(placements, rows, cols, target, rnd, wantN){
    const N = rows*cols, P = placements.length;
    const R = new Uint8Array(N), D = new Uint8Array(N);
    if(!target || target <= 0 || P === 0) return { R:R, D:D, count:0, regions:[], cluster:null };

    const owner = new Int32Array(N).fill(-1);
    for(let k=0;k<P;k++)
      for(let t=0;t<placements[k].idxs.length;t++) owner[placements[k].idxs[t]] = k;

    // đồ thị kề giữa các khối
    const nb = []; for(let k=0;k<P;k++) nb.push([]);
    const seen = {};
    function link(a, b){
      if(a === b) return;
      const key = a<b ? a+':'+b : b+':'+a;
      if(seen[key]) return;
      seen[key] = 1; nb[a].push(b); nb[b].push(a);
    }
    for(let i=0;i<N;i++){
      if(owner[i] < 0) continue;
      const c = i%cols;
      if(c+1 < cols && owner[i+1] >= 0) link(owner[i], owner[i+1]);
      if(i+cols < N && owner[i+cols] >= 0) link(owner[i], owner[i+cols]);
    }

    /* `wantN` > 0 ⇒ chia theo KHÔNG GIAN (màn chơi soi từng vùng, vùng phải
     * gọn). Không có thì giữ nguyên lối gom BFS cũ. */
    if(wantN > 0){
      const cl = clusterSpatial(placements, rows, cols, wantN);
      let n0 = 0;
      for(let i=0;i<N;i++){
        if(owner[i] < 0) continue;
        const c = i%cols;
        if(c+1 < cols && owner[i+1] >= 0 && cl[owner[i]] !== cl[owner[i+1]]){ R[i]=1; n0++; }
        if(i+cols < N && owner[i+cols] >= 0 && cl[owner[i]] !== cl[owner[i+cols]]){ D[i]=1; n0++; }
      }
      return { R:R, D:D, count:n0, regions:regionSizes(rows, cols, owner, R, D),
               cluster:cl };
    }

    // gom khối thành cụm ~target khối (BFS tham lam, thứ tự xáo trộn tất định)
    const cluster = new Int32Array(P).fill(-1);
    const order = []; for(let k=0;k<P;k++) order.push(k);
    for(let i=order.length-1;i>0;i--){ const j=(rnd()*(i+1))|0, t=order[i]; order[i]=order[j]; order[j]=t; }
    let cid = 0;
    for(let q=0;q<order.length;q++){
      const start = order[q];
      if(cluster[start] >= 0) continue;
      cluster[start] = cid;
      let size = 1;
      const queue = [start];
      while(queue.length && size < target){
        const cur = queue.shift(), list = nb[cur];
        for(let m=0;m<list.length && size<target;m++){
          if(cluster[list[m]] < 0){ cluster[list[m]] = cid; size++; queue.push(list[m]); }
        }
      }
      cid++;
    }

    // Vùng gồm ĐÚNG một khối là lộ đáp án — nhập nó vào cụm hàng xóm.
    const count = new Int32Array(cid);
    for(let k=0;k<P;k++) count[cluster[k]]++;
    for(let k=0;k<P;k++){
      if(count[cluster[k]] !== 1) continue;
      const list = nb[k];
      for(let m=0;m<list.length;m++){
        if(cluster[list[m]] !== cluster[k]){
          count[cluster[k]]--; cluster[k] = cluster[list[m]]; count[cluster[k]]++;
          break;
        }
      }
    }

    // tường = mọi cạnh giữa hai ô thuộc hai CỤM khác nhau
    let n = 0;
    for(let i=0;i<N;i++){
      if(owner[i] < 0) continue;
      const c = i%cols;
      if(c+1 < cols && owner[i+1] >= 0 && cluster[owner[i]] !== cluster[owner[i+1]]){ R[i]=1; n++; }
      if(i+cols < N && owner[i+cols] >= 0 && cluster[owner[i]] !== cluster[owner[i+cols]]){ D[i]=1; n++; }
    }
    /* Trả luôn `cluster` (khối nào thuộc cụm nào). Đây là thứ cho phép chia
     * LỜI GIẢI theo vùng — xem `buildRegions`. Tường vốn dựng đúng dọc ranh
     * giới giữa các cụm, nên mỗi khối nằm gọn trong một vùng, không khối nào
     * vắt qua hai vùng. */
    return { R:R, D:D, count:n, regions:regionSizes(rows, cols, owner, R, D),
             cluster:cluster };
  }

  /* Kích thước các vùng kín do tường tạo ra — đây mới là "độ khó" người chơi
   * thật sự phải ôm một lúc, chứ không phải tổng số ô của board. */
  function regionSizes(rows, cols, owner, R, D){
    const N = rows*cols, seen = new Uint8Array(N), out = [];
    for(let s=0;s<N;s++){
      if(owner[s] < 0 || seen[s]) continue;
      let n = 0; const st = [s]; seen[s] = 1;
      while(st.length){
        const i = st.pop(); n++;
        const r = (i/cols)|0, c = i%cols;
        if(c+1 < cols && !R[i]      && owner[i+1]>=0    && !seen[i+1])    { seen[i+1]=1;    st.push(i+1); }
        if(c-1 >= 0   && !R[i-1]    && owner[i-1]>=0    && !seen[i-1])    { seen[i-1]=1;    st.push(i-1); }
        if(r+1 < rows && !D[i]      && owner[i+cols]>=0 && !seen[i+cols]) { seen[i+cols]=1; st.push(i+cols); }
        if(r-1 >= 0   && !D[i-cols] && owner[i-cols]>=0 && !seen[i-cols]) { seen[i-cols]=1; st.push(i-cols); }
      }
      out.push(n);
    }
    return out.sort(function(a,b){ return b-a; });
  }

  /* Chia LỜI GIẢI thành từng vùng kín mà tường tạo ra.
   *
   * Mỗi vùng là một câu đố con khép kín: đủ ô, đủ khối, giải xong là xong hẳn,
   * không dính gì tới vùng khác. Nhờ vậy màn chơi theo lối ZOOM TỪNG VÙNG —
   * soi một vùng, khay chỉ bày khối của vùng đó, lấp kín thì chuyển sang vùng
   * kế. Người chơi không bao giờ phải nhìn cái hàng rào, vì mép khung nhìn
   * CHÍNH LÀ bức tường.
   *
   * Xếp theo THỨ TỰ ĐỌC (trên xuống rồi trái sang) để lượt zoom đi tự nhiên. */
  function buildRegions(sol, clusterOfPiece, rows, cols){
    const by = {};
    for(let k=0;k<sol.length;k++){
      const cid = clusterOfPiece[k];
      if(cid == null || cid < 0) continue;
      if(!by[cid]) by[cid] = { cells:[], pieces:[], counts:{},
                               r0:1e9, c0:1e9, r1:-1, c1:-1 };
      const g = by[cid];
      g.pieces.push({ shapeId:sol[k].shapeId, idxs:sol[k].idxs.slice() });
      g.counts[sol[k].shapeId] = (g.counts[sol[k].shapeId]||0) + 1;
      for(let t=0;t<sol[k].idxs.length;t++){
        const i = sol[k].idxs[t], r = (i/cols)|0, c = i%cols;
        g.cells.push(i);
        if(r < g.r0) g.r0 = r;
        if(r > g.r1) g.r1 = r;
        if(c < g.c0) g.c0 = c;
        if(c > g.c1) g.c1 = c;
      }
    }
    const out = [];
    for(const cid in by){
      const g = by[cid];
      g.deck = Object.keys(g.counts)
        .sort(function(a,b){ return SHAPES[a].size - SHAPES[b].size || (a<b?-1:1); })
        .map(function(id){ return { shapeId:id, total:g.counts[id] }; });
      delete g.counts;
      out.push(g);
    }
    out.sort(function(a,b){ return a.r0 - b.r0 || a.c0 - b.c0; });
    return out;
  }

  /* Chọn `want` khối trong lời giải làm KHỐI ĐẶT SẴN, rải đều khắp board. */
  function pickSpread(placements, want, cols, rnd){
    const cen = placements.map(function(p, i){
      let sr = 0, sc = 0;
      for(let k=0;k<p.idxs.length;k++){ sr += (p.idxs[k]/cols)|0; sc += p.idxs[k]%cols; }
      return { i:i, r:sr/p.idxs.length, c:sc/p.idxs.length, taken:false };
    });
    for(let i=cen.length-1;i>0;i--){
      const j = (rnd()*(i+1))|0, t = cen[i]; cen[i] = cen[j]; cen[j] = t;
    }
    const chosen = [];
    for(let d=4.5; d>=0 && chosen.length<want; d-=0.5){
      for(let q=0;q<cen.length && chosen.length<want;q++){
        const a = cen[q];
        if(a.taken) continue;
        let ok = true;
        for(let m=0;m<chosen.length;m++){
          const b = chosen[m];
          if(Math.sqrt((a.r-b.r)*(a.r-b.r) + (a.c-b.c)*(a.c-b.c)) < d){ ok = false; break; }
        }
        if(ok){ a.taken = true; chosen.push(a); }
      }
    }
    return chosen.map(function(a){ return placements[a.i]; });
  }

  /* ----------------------------------------------------------- sinh một màn */
  /* Nhớ theo số màn: `Làm lại` và bấm qua lại giữa các màn không phải sinh lại.
   * Màn là tất định theo index nên nhớ được. Level trả về chỉ để ĐỌC — game.js
   * sao chép trước khi ghi (`Uint8Array.from(lv.occ)`, `lv.deck.map(...)`). */
  const _cache = {};
  function generateLevel(index, seedOverride, opts){
    opts = opts || {};
    const memo = (seedOverride == null && !opts.wantRegions && !opts.wallCluster
                  && opts.gate == null && !opts._relaxed);
    if(memo && _cache[index]) return _cache[index];
    const pics = window.PICTURES;
    const pic  = pics[index % pics.length];
    const mask = buildMask(pic);

    /* Bậc tăng 3 màn một lần. Board nhỏ bị chặn trần (bộ khối lạ trên board 57 ô
     * làm số lời giải rơi xuống còn 1); board to bắt buộc phải có khối 4 ô,
     * không thì số khối vượt trần 30 và màn dài quá hai phút rưỡi. */
    let tierIdx;
    if(pic.tier != null && index < pics.length){
      tierIdx = Math.min(window.SHAPE_TIERS.length-1, pic.tier);   // bức tranh tự khai
    } else {
      tierIdx = Math.min(window.SHAPE_TIERS.length-1, Math.floor(index/3));
      if(mask.playable < 70)      tierIdx = Math.min(tierIdx, 2);
      else if(mask.playable < 90) tierIdx = Math.min(tierIdx, 4);
      else                        tierIdx = Math.max(3, tierIdx);
    }
    /* Bức tranh có thể tự khai BỘ KHỐI của nó (`shapes`), đè lên bậc chung.
     * Thang dạy chơi cần đúng thế: màn 1 phải là khối to cho dễ vào, các màn
     * sau mới thêm dần từng hướng một. */
    let tier = (pic.shapes && index < pics.length)
             ? pic.shapes : window.SHAPE_TIERS[tierIdx];
    if(opts._noBias){                    // đường cứu: thêm khối nhỏ cho dễ lát
      const extra = ['d_h','d_v','l3a','l3b','l3c','l3d','i3h','i3v','o4'];
      tier = tier.concat(extra.filter(function(id){ return tier.indexOf(id) < 0; }));
    }

    /* KHỐI ĐẶT SẴN: 0 = board sạch, người chơi đặt từ ô đầu tiên.
     * Đổi hằng số này thành 0.20 là khối đặt sẵn quay lại ngay. */
    const FIXED_RATIO = 0;
    const fixedRatio = FIXED_RATIO > 0
      ? Math.max(0.15, (FIXED_RATIO + 0.06) - 0.015*tierIdx) : 0;

    /* TƯỜNG — BẬT TỪ MÀN 6.
     *
     * Tường ở đây là tường CHIA VÙNG: gom khối của lời giải thành cụm rồi dựng
     * rào dọc ranh giới giữa các cụm (xem makeWalls). Board vỡ ra thành mấy ổ
     * kín, mỗi ổ là một câu đố con nhìn một cái là ôm hết.
     *
     * Từng tắt, vì hồi đó chia có 2 VÙNG TO: ranh giới giữa hai cụm bao giờ
     * cũng là một nét liền cắt ngang board, người chơi đọc ra cái hàng rào chứ
     * không đọc ra bức tranh. Vùng kín thì đường bao bắt buộc phải chạy hết từ
     * mép này sang mép kia — không có cách nào làm nét đó ngắn lại.
     *
     * Bật lại được là nhờ đổi hướng chia: NHIỀU vùng NHỎ thay vì hai vùng to.
     * Chục nét ngắn đan nhau đọc ra mạch chì của tranh kính, một nét dài cắt
     * đôi bức tranh mới đọc ra hàng rào. Cùng cơ chế, khác cỡ.
     *
     * CỠ VÙNG MỚI LÀ THỨ QUYẾT ĐỊNH DỄ HAY KHÓ, không phải số vùng. Khay dùng
     * CHUNG cho cả board, nên lấp kín một vùng bằng bộ khối sai vẫn lọt: hỏng
     * chỉ lộ ra ở vùng kế bên, lúc không còn khối vừa. Đo trên 15 màn: cách
     * lấp một vùng làm chết phần còn lại chiếm 43% với vùng ≤12 ô, 62% với
     * vùng 13–20 ô, và 85–86% với vùng trên 20 ô.
     *
     * Nhưng GIÁ phải trả khi hỏng đúng bằng CỠ VÙNG — gỡ lại 3–5 khối trong
     * một ổ 15 ô là chuyện vặt, gỡ lại 15 khối trong một vùng 50 ô mới là cực
     * hình. Nên luật là: vùng quanh 10–18 ô, board to ra thì tăng SỐ vùng chứ
     * không tăng CỠ vùng. `pic.regions` trong pictures.js đo theo đúng luật đó.
     *
     * Chữa tận gốc (chưa làm): `buildRegions()` phía trên đã dựng sẵn khay
     * riêng cho từng vùng — chơi zoom từng ổ, khay chỉ bày khối của ổ đó thì
     * lấp đúng ổ là đúng toàn cục, hết đường lọt. `level.regions` sinh ra rồi
     * nhưng game.js chưa đọc tới.
     *
     * `wantRegions: 1` là không tường. */
    const WALLS_FROM = 5;                       // index 5 = MÀN 6
    /* Bức ngoài 20 bức (màn 21+, tranh quay vòng): tự suy ra số vùng theo cỡ
     * board, ~13 ô một vùng. Board dưới 50 ô thì thôi — chia nữa thì mỗi ổ chỉ
     * còn 2 khối, lộ đáp án. */
    const autoRegions = Math.max(2, Math.round(mask.playable / 13));
    const wantRegions = opts.wantRegions != null ? opts.wantRegions
                      : index < WALLS_FROM   ? 1
                      : mask.playable < 50   ? 1
                      : (index < pics.length && pic.regions != null) ? pic.regions
                      : autoRegions;

    /* Board càng to càng phải cho khối to vào, không thì số khối vượt trần 30. */
    /* Âm = chuộng khối TO. Bức tranh tự khai `bias` thì dùng của nó — board nhỏ
     * mà để mức chung thì toàn khối 2 ô, màn dạy chơi thành vụn vặt. */
    const sizeBias = opts._noBias ? -0.3
                   : (pic.bias != null && index < pics.length) ? pic.bias
                   : mask.playable <= 62 ? -0.55
                   : mask.playable <= 75 ? -0.75
                   : mask.playable <= 88 ? -0.95
                   : mask.playable <= 96 ? -1.05 : -1.15;

    const GATE = opts.gate === false ? 0 : (opts.gate || 30);
    const baseSeed = (seedOverride != null) ? seedOverride : (index*2654435761 + 12345) >>> 0;

    const unlimited = {};
    for(let k=0;k<tier.length;k++) unlimited[tier[k]] = 999;

    /* `best`   — bản dự phòng bất kỳ (có thể sai cả số khối).
     * `bestFit` — bản ĐÃ QUA cổng số khối + số ô khay, chỉ thiếu lời giải.
     * Tách hai cái ra vì thang dạy khai `pieces:[3,3]`: thà giao một màn 3 khối
     * ít đường lát còn hơn giao một màn 6 khối đúng như cũ. Trước đây chỉ có
     * một biến nên bản trượt cổng số khối vẫn có cửa được trả về. */
    let best = null, bestFit = null;
    /* Nam man dau board nho, moi lan thu re — quet nhieu seed hon de vo duoc
     * bo khay nhieu loi giai nhat. */
    const MAX_TRY = index < 5 ? 90 : 12;
    for(let attempt=0; attempt<MAX_TRY; attempt++){
      const seed = (baseSeed + attempt*7919) >>> 0;
      /* Van an toan: nua sau cac lan thu thi CHIA NHO VUNG them mot bac. Vung
       * nho hon = de hon = nhieu loi giai hon, nen vong lap chac chan hoi tu
       * thay vi cuoi cung phai chap nhan mot man be tac. */
      const regionsNow = wantRegions + (attempt >= MAX_TRY/2 ? 1 : 0);
      /* Van an toàn thứ hai: nửa sau các lần thử thì NỚI thiên vị cỡ khối về
       * gần 0. Chuộng khối to quá tay làm số lời giải rơi thẳng xuống 1 — khối
       * to và nhiều lời giải kéo ngược nhau, nhất là trên board nhỏ. */
      const biasNow = sizeBias * (attempt >= MAX_TRY/2 ? 0.4 : 1);
      const res = solve(mask.occ, mask.rows, mask.cols, unlimited,
                        { rng: mulberry32(seed), budget: 220000, sizeBias: biasNow });
      if(res.status !== 'solved') continue;

      const want  = fixedRatio > 0 ? Math.max(2, Math.floor(res.placements.length * fixedRatio)) : 0;
      const fixed = want > 0
        ? pickSpread(res.placements, want, mask.cols, mulberry32((seed ^ 0x9e3779b9)>>>0))
        : [];
      const isFixed = new Set(fixed);

      const counts = {}, playerSolution = [], solPlaceIdx = [];
      for(let k=0;k<res.placements.length;k++){
        const p = res.placements[k];
        if(isFixed.has(p)) continue;
        counts[p.id] = (counts[p.id]||0) + 1;
        playerSolution.push({ shapeId:p.id, idxs:p.idxs.slice() });
        solPlaceIdx.push(k);                 // để tra ngược ra cụm của khối này
      }
      const playerPieces = playerSolution.length;
      const deck = Object.keys(counts)
        .sort(function(a,b){ return SHAPES[a].size - SHAPES[b].size || (a<b?-1:1); })
        .map(function(id){ return { shapeId:id, total:counts[id], left:counts[id] }; });

      const wallCluster = opts.wallCluster != null ? opts.wallCluster
                        : (wantRegions <= 1 ? 0 : Math.ceil(res.placements.length / regionsNow));
      const walls = makeWalls(res.placements, mask.rows, mask.cols, wallCluster,
                              mulberry32((seed ^ 0x85ebca6b)>>>0),
                              wantRegions > 1 ? regionsNow : 0);

      const level = {
        index: index, seed: seed, tier: tierIdx,
        picture: pic,
        rows: mask.rows, cols: mask.cols,
        occ: mask.occ,
        inPic: mask.inPic,
        mosaic: mask.mosaic,
        colorAt: mask.colorAt,
        playable: mask.playable,
        mosaicCount: mask.mosaicCount,
        fixed: fixed.map(function(p){ return { shapeId:p.id, idxs:p.idxs.slice() }; }),
        walls: walls,
        /* Lời giải tham chiếu (phần người chơi phải đặt). Dùng cho Gợi ý: DFS
         * exact-cover từ thế cờ đầu màn có thể quá nặng, còn cái này luôn sẵn. */
        solution: playerSolution,
        deck: deck,
        pieceCount: playerPieces,
        /* null = màn chơi nguyên board như thường. Có mảng = màn chơi theo
         * từng vùng, `game.js` sẽ zoom lần lượt. */
        regions: (walls.cluster && walls.count > 0)
          ? buildRegions(playerSolution,
                         solPlaceIdx.map(function(k){ return walls.cluster[k]; }),
                         mask.rows, mask.cols)
          : null
      };

      if(GATE <= 0) return memo ? (_cache[index] = level) : level;

      /* Hai cổng hình dạng màn (doc §04/§05):
       *   • 18–30 khối  ⇒ màn dài 1–2 phút, không lê thê.
       *   • 5–12 ô deck ⇒ khay không trống trải cũng không phải cuộn mới thấy hết. */
      /* Ngưỡng co giãn theo cỡ board: màn dạy chơi 34 ô mà bắt 18 khối thì
       * không seed nào qua nổi. Trần vẫn là 30 khối / 12 ô khay. */
      /* Bức tranh tự khai `pieces:[lo,hi]` thì dùng của nó. Công thức chung giả
       * định khối trung bình ~3,2 ô — board 36 ô sẽ đòi tối thiểu 11 khối, tức
       * là CẤM dùng khối 6 ô. Đúng cái làm màn dạy chơi toàn domino. */
      const pr  = (pic.pieces && index < pics.length) ? pic.pieces : null;
      const loP = pr ? pr[0] : Math.max(8,  Math.min(18, Math.round(mask.playable/3.2)));
      const hiP = pr ? pr[1] : Math.max(14, Math.min(30, Math.round(mask.playable/2.1)));
      /* Số LOẠI khối trong khay. Bức tranh tự khai `deck:[lo,hi]` thì dùng của
       * nó — màn dạy chơi có khay 2 loại mới là dễ, mà sàn chung lại bắt ≥3. */
      const dr  = (pic.deck && index < pics.length) ? pic.deck : null;
      const loD = dr ? dr[0] : (mask.playable < 45 ? 3 : 5);
      const hiD = dr ? dr[1] : 12;
      if(deck.length < loD || deck.length > hiD || playerPieces < loP || playerPieces > hiP){
        if(!best) best = level;
        continue;
      }

      /* Cổng số lời giải — đếm TRÊN BOARD ĐÃ CÓ TƯỜNG, vì đó mới là thế cờ
       * người chơi thật sự gặp. Có tường thì mỗi vùng là một câu đố nhỏ độc
       * lập, kẹt ở vùng nào lộ ra ngay ở vùng đó, nên ngưỡng thấp hơn vẫn
       * thoải mái hơn hẳn board trống trơn cùng số lời giải. */
      const occ2 = Uint8Array.from(mask.occ);
      for(let a=0;a<fixed.length;a++)
        for(let b=0;b<fixed[a].idxs.length;b++) occ2[fixed[a].idxs[b]] = 1;
      const cnt = {};
      for(let k=0;k<deck.length;k++) cnt[deck[k].shapeId] = deck[k].total;
      /* Có tường thì ngưỡng hạ hẳn xuống: chỉ cần KHÔNG phải đáp án duy nhất.
       * Đếm cho tới 12 trên board đã chia vùng là phải duyệt cạn cả cây (vì
       * thường chỉ có dăm bảy lời giải) — đó là chỗ ngốn tới 5 giây một màn. */
      /* Nguong cho board CO TUONG. Tung de 3 roi 5 - qua thap: sinh ra man 1
       * chi co dung 5 cach lat cho 22 khoi, lech mot nuoc la tac, va nguoi choi
       * bao "dat tuong ma co giai duoc dau". Tuong siet them rang buoc nen
       * nguong phai CAO hon board trong, khong phai thap hon. */
      /* Màn có tác giả (thang dạy) phải NHIỀU LỜI GIẢI hẳn — không bao giờ để
       * người chơi rơi vào thế gần như chỉ có một đáp án. Khối càng to thì số
       * cách lát càng ít, nên ngưỡng này mới là thứ giữ cân bằng. */
      const authored = index < 5;               // đúng năm màn của thang dạy
      /* Ngưỡng số lời giải phải CO THEO SỐ KHỐI, không phải một con số chết.
       *
       * 60 là ngưỡng đặt cho board 20+ khối: ở đó tìm ra đúng một cách lát là
       * mò kim đáy bể, nên phải có thật nhiều đường. Board 5 khối thì khác hẳn
       * — nhìn một cái là thấy hết, 15 cách đã là thoải mái. Bắt 60 trên board
       * 5 khối thì không seed nào qua nổi, generator rơi xuống đường cứu và
       * trả về toàn khối 2–3 ô: đúng cái ngược lại với "ít khối, khối to". */
      /* Bức tranh tự khai `solutions:` thì dùng của nó. Board 3 khối khổng lồ
       * chỉ có dăm cách lát là hết — bắt 10 như công thức chung thì không seed
       * nào qua nổi, generator rơi về bản dự phòng và số khối lại sai. */
      const sr = (pic.solutions != null && index < pics.length) ? pic.solutions : null;
      const need = sr != null ? sr
                 : authored ? Math.max(10, Math.min(60, playerPieces*3))
                            : (walls.count > 0 ? 40 : GATE);
      const cs = countSolutions(occ2, mask.rows, mask.cols, cnt, need, 120000,
                                walls.count ? walls : null);
      level.solutionCount = cs.count;
      level.solutionCapped = cs.capped;
      /* CHỈ nhận khi ĐẾM ĐƯỢC đủ lời giải. Hết ngân sách mà chưa thấy lời giải
       * nào nghĩa là KHÔNG BIẾT GÌ CẢ — từng có màn lọt qua cổng kiểu đó rồi
       * hoá ra solver chạy 3 triệu node vẫn không tìm nổi một cách lát: về lý
       * thuyết vẫn giải được (lời giải tham chiếu còn đó) nhưng thực tế là
       * mò kim đáy bể. Thà đổi seed. */
      /* Đủ ngưỡng thì nhận. Hết ngân sách mà ĐÃ ĐẾM ĐƯỢC kha khá lời giải cũng
       * nhận — cây còn rộng thật. (Trước từng nhận cả khi count = 0, tức là
       * không biết gì cả; đó mới là chỗ sinh ra màn bế tắc.) */
      if(cs.count >= need || (cs.exhausted && cs.count >= 25))
        return memo ? (_cache[index] = level) : level;
      if(!bestFit || cs.count > (bestFit.solutionCount||0)) bestFit = level;
      if(!best || cs.count > (best.solutionCount||0)) best = level;
    }
    /* Hết lượt mà bản tốt nhất vẫn quá nghèo lời giải thì bỏ hẳn thiên vị cỡ
     * khối và làm lại — thà khối nhỏ hơn còn hơn giao một màn gần như chỉ có
     * một đáp án duy nhất. */
    /* Đường cứu bỏ thiên vị cỡ khối, nên nó luôn đẻ ra khối nhỏ. Với năm màn
     * đầu thì KHÔNG dùng: bức tranh đã tự khai bộ khối và độ thiên vị, khối to
     * chính là thứ làm màn dễ. Thà nhận bản ít lời giải hơn một chút còn hơn
     * giao một khay toàn domino. */
    /* Thang dạy: cổng SỐ KHỐI thiêng hơn cổng số lời giải. Có bản đúng số khối
     * thì lấy luôn, không đi đường cứu (đường cứu bỏ thiên vị cỡ khối nên nó
     * luôn đẻ ra khay toàn khối nhỏ — đúng cái phải tránh ở đây). */
    if(index < 5 && bestFit) return memo ? (_cache[index] = bestFit) : bestFit;
    let alt = null;
    if(index >= 5 && (!best || (best.solutionCount||0) < 20)
       && opts._relaxed !== true){
      const o2 = {};
      for(const k in opts) o2[k] = opts[k];
      o2._relaxed = true; o2._noBias = true;
      /* Đường cứu chỉ được nhận nếu THẬT SỰ tốt hơn — trước đây nó trả về vô
       * điều kiện, có lần đẻ ra màn 6 cách lát tệ hơn cả bản đang giữ. */
      try{
        const a = generateLevel(index, seedOverride, o2);
        if(!best || (a.solutionCount||0) >= (best.solutionCount||0)) alt = a;
      }catch(e){}
      /* Nhận LUÔN nếu đường cứu đã đủ tốt. Còn nếu nó vẫn CÓ TƯỜNG mà vẫn
       * thiếu lời giải thì khoan trả — van bỏ tường bên dưới còn một cửa nữa,
       * và cửa đó thường hơn hẳn. */
      if(alt && (!(alt.walls && alt.walls.count) || (alt.solutionCount||0) >= 40))
        return alt;
    }

    /* VAN AN TOÀN CỦA TƯỜNG — tường không bao giờ được làm màn KHÓ hơn.
     *
     * Cạn cả 12 seed lẫn đường cứu mà board có tường vẫn chưa đạt cổng 40 đường
     * lát thì BỎ TƯỜNG, sinh lại y như board trống. Màn có tường mà chỉ dăm
     * cách lát đúng là cái người chơi kêu "đặt tường thì còn giải được đâu" —
     * thà không có tường. Bức `pine` (màn 18) là bức chạm van này: chia kiểu gì
     * cũng chỉ ra 1–24 đường lát.
     *
     * PHẢI đứng SAU đường cứu `_relaxed`: đường cứu vẫn giữ tường, chỉ hạ cỡ
     * khối, và nó vớt được kha khá màn (heart, cake, hedge, penguin). Đặt van
     * lên trước là cướp cò — bốn màn đó mất tường oan.
     *
     * Gọi đệ quy với `wantRegions:1` nên nhánh này không tự gọi lại nó. */
    const keep = [bestFit, best, alt].filter(Boolean)
                 .sort(function(a,b){ return (b.solutionCount||0)-(a.solutionCount||0); })[0];
    if(wantRegions > 1 && opts.wantRegions == null
       && (!keep || (keep.solutionCount||0) < 40)){
      const oFlat = {};
      for(const k in opts) oFlat[k] = opts[k];
      oFlat.wantRegions = 1;
      try{
        const flat = generateLevel(index, seedOverride, oFlat);
        if((flat.solutionCount||0) > ((keep||{}).solutionCount||0))
          return memo ? (_cache[index] = flat) : flat;
      }catch(e){}
    }
    if(alt) return alt;
    if(bestFit) return memo ? (_cache[index] = bestFit) : bestFit;
    if(best) return memo ? (_cache[index] = best) : best;
    throw new Error('generateLevel: không lát nổi tranh "'+pic.id+'" — kiểm tra lại mask (§pictures.js).');
  }

  window.LevelGen = { mulberry32:mulberry32, buildMask:buildMask, fits:fits,
                      solve:solve, countSolutions:countSolutions,
                      makeWalls:makeWalls, regionSizes:regionSizes,
                      buildRegions:buildRegions,
                      generateLevel:generateLevel };
})();
