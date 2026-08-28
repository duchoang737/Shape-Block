/* ============================================================================
 * shapes.js — Bộ khối CỐ ĐỊNH HƯỚNG.
 * ----------------------------------------------------------------------------
 * Không xoay, không lật ⇒ mỗi hướng là MỘT món hàng riêng trên khay
 * ("cùng một khối L quay 4 hướng là 4 ô deck khác nhau" — Cozy Mosaic §02).
 *
 * KHỐI KHÔNG CÓ MÀU RIÊNG. Mọi khối trong khay đều là màu đất trung tính; màu
 * nằm ở Ô BOARD. Vì vậy ở đây chỉ còn hình dạng.
 *
 * `cells` luôn chuẩn hoá: minRow = 0, minCol = 0, sắp theo thứ tự quét
 * (row rồi col). Thứ tự này bắt buộc — solver dùng cells[0] làm neo.
 * ==========================================================================*/
(function(){

  const raw = {
    d_h : { cells:[[0,0],[0,1]],                 name:'Domino ngang' },
    d_v : { cells:[[0,0],[1,0]],                 name:'Domino dọc' },
    i3h : { cells:[[0,0],[0,1],[0,2]],           name:'I3 ngang' },
    i3v : { cells:[[0,0],[1,0],[2,0]],           name:'I3 dọc' },
    l3a : { cells:[[0,0],[0,1],[1,0]],           name:'Góc ┌' },
    l3b : { cells:[[0,0],[0,1],[1,1]],           name:'Góc ┐' },
    l3c : { cells:[[0,0],[1,0],[1,1]],           name:'Góc └' },
    l3d : { cells:[[0,1],[1,0],[1,1]],           name:'Góc ┘' },
    o4  : { cells:[[0,0],[0,1],[1,0],[1,1]],     name:'Vuông' },
    t4u : { cells:[[0,1],[1,0],[1,1],[1,2]],     name:'T ▲' },
    t4d : { cells:[[0,0],[0,1],[0,2],[1,1]],     name:'T ▼' },
    t4l : { cells:[[0,1],[1,0],[1,1],[2,1]],     name:'T ◀' },
    t4r : { cells:[[0,0],[1,0],[1,1],[2,0]],     name:'T ▶' },
    i4h : { cells:[[0,0],[0,1],[0,2],[0,3]],     name:'I4 ngang' },
    i4v : { cells:[[0,0],[1,0],[2,0],[3,0]],     name:'I4 dọc' },
    s4h : { cells:[[0,1],[0,2],[1,0],[1,1]],     name:'S ngang' },
    z4h : { cells:[[0,0],[0,1],[1,1],[1,2]],     name:'Z ngang' },

    /* --- 5 ô: chữ P (vuông 2×2 + một ô thò ra), 8 hướng --------------------- */
    p5a : { cells:[[0,0],[0,1],[1,0],[1,1],[2,0]], name:'P ┏' },
    p5b : { cells:[[0,0],[0,1],[1,0],[1,1],[2,1]], name:'P ┓' },
    p5c : { cells:[[0,0],[1,0],[1,1],[2,0],[2,1]], name:'P ┗' },
    p5d : { cells:[[0,1],[1,0],[1,1],[2,0],[2,1]], name:'P ┛' },
    p5e : { cells:[[0,0],[0,1],[0,2],[1,0],[1,1]], name:'P ▛' },
    p5f : { cells:[[0,0],[0,1],[0,2],[1,1],[1,2]], name:'P ▜' },
    p5g : { cells:[[0,0],[0,1],[1,0],[1,1],[1,2]], name:'P ▙' },
    p5h : { cells:[[0,1],[0,2],[1,0],[1,1],[1,2]], name:'P ▟' },

    /* --- 5 ô: chữ L dài, chữ T, chữ U, dấu cộng, thanh 5 ------------------- */
    l5a : { cells:[[0,0],[1,0],[2,0],[3,0],[3,1]], name:'L dài ┗' },
    l5b : { cells:[[0,1],[1,1],[2,1],[3,0],[3,1]], name:'L dài ┛' },
    l5c : { cells:[[0,0],[0,1],[1,0],[2,0],[3,0]], name:'L dài ┏' },
    l5d : { cells:[[0,0],[0,1],[1,1],[2,1],[3,1]], name:'L dài ┓' },
    t5u : { cells:[[0,1],[1,1],[2,0],[2,1],[2,2]], name:'T dài ▲' },
    t5d : { cells:[[0,0],[0,1],[0,2],[1,1],[2,1]], name:'T dài ▼' },
    u5  : { cells:[[0,0],[0,2],[1,0],[1,1],[1,2]], name:'Chữ U' },
    n5  : { cells:[[0,0],[0,1],[1,0],[1,2],[0,2]], name:'Chữ ∩' },
    x5  : { cells:[[0,1],[1,0],[1,1],[1,2],[2,1]], name:'Dấu cộng' },
    i5h : { cells:[[0,0],[0,1],[0,2],[0,3],[0,4]], name:'I5 —' },
    i5v : { cells:[[0,0],[1,0],[2,0],[3,0],[4,0]], name:'I5 |' },

    /* --- 6 ô: hình chữ nhật 2×3, khối to nhất trong bộ -------------------- */
    r6h : { cells:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]], name:'Chữ nhật —' },
    r6v : { cells:[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]], name:'Chữ nhật |' },

    /* --- 8 và 9 ô: khối TO cho mấy màn đầu ---------------------------------
     * Trần cũ là 6 ô, nên board 36 ô ít nhất cũng phải 6 khối. Có khối 8–9 ô
     * thì đúng bức tranh đó chỉ còn 4 khối — màn dễ hẳn mà tranh không phải
     * thu nhỏ lại. Chỉ dùng cho màn 1–5, các màn sau vẫn theo bậc cũ. */
    r8h : { cells:[[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3]], name:'Chữ nhật dài —' },
    r8v : { cells:[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1],[3,0],[3,1]], name:'Chữ nhật dài |' },
    sq9 : { cells:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]], name:'Vuông lớn' },

    /* --- KHỐI KHỔNG LỒ: hình chữ nhật 10–16 ô ------------------------------
     * Chỉ dùng cho THANG DẠY (màn 1–5), khai tường minh trong `pictures.js`.
     * Không nằm trong `TIERS` nên không bao giờ rơi vào màn sinh tự động.
     * Lý do tồn tại: doc yêu cầu màn 1–4 đúng 3 khối, màn 5 đúng 5 khối. Board
     * 42 ô chia 3 thì mỗi khối phải 14 ô — không có khối cỡ này thì cổng
     * `pieces:[3,3]` không seed nào qua nổi. */
    i6h : { cells:[[0,0],[0,1],[0,2],[0,3],[0,4],[0,5]], name:'Thanh 6 —' },
    i6v : { cells:[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0]], name:'Thanh 6 |' },
    r10h: { cells:[[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,1],[1,2],[1,3],[1,4]], name:'2×5 —' },
    r10v: { cells:[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1],[3,0],[3,1],[4,0],[4,1]], name:'2×5 |' },
    s12h: { cells:[[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]], name:'2×6 —' },
    s12v: { cells:[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1],[3,0],[3,1],[4,0],[4,1],[5,0],[5,1]], name:'2×6 |' },
    r12h: { cells:[[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3]], name:'3×4 —' },
    r12v: { cells:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2]], name:'3×4 |' },
    r14h: { cells:[[0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6]], name:'2×7 —' },
    r15h: { cells:[[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,1],[1,2],[1,3],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4]], name:'3×5 —' },
    r15v: { cells:[[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2],[3,0],[3,1],[3,2],[4,0],[4,1],[4,2]], name:'3×5 |' },
    q16 : { cells:[[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[3,0],[3,1],[3,2],[3,3]], name:'Vuông 4×4' },

    /* 20 ô — cái ĐẦU của bốn bạn nhỏ. Đầu 4×4 thì mặt chỉ rộng 4 ô: hai con
     * mắt buộc phải dính vào mép đầu, tai teo thành hai cái que. Rộng 5 ô mới
     * đủ chỗ cho mắt–mũi–má mà không đụng viền. */
    r20h: { cells:[[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,1],[1,2],[1,3],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4],[3,0],[3,1],[3,2],[3,3],[3,4]], name:'4×5 —' },
    r20v: { cells:[[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[3,0],[3,1],[3,2],[3,3],[4,0],[4,1],[4,2],[4,3]], name:'4×5 |' }
  };

  const SHAPES = {};
  for(const id in raw){
    const s = raw[id];
    const cells = s.cells.map(function(c){ return [c[0],c[1]]; });
    const minR = Math.min.apply(null, cells.map(function(c){ return c[0]; }));
    const minC = Math.min.apply(null, cells.map(function(c){ return c[1]; }));
    const norm = cells.map(function(c){ return [c[0]-minR, c[1]-minC]; })
                      .sort(function(a,b){ return a[0]-b[0] || a[1]-b[1]; });
    /* Cạnh NỘI BỘ của khối: hai ô kề nhau mà cùng thuộc khối này. Đặt khối lên
     * board thì đúng những cạnh đó là thứ có thể "vắt qua tường" — tính sẵn ở
     * đây để lúc kiểm tra chỉ còn tra bảng, không phải dò lại hình. */
    const has = {};
    for(let k=0;k<norm.length;k++) has[norm[k][0]+','+norm[k][1]] = 1;
    const edgesR = [], edgesD = [];
    for(let k=0;k<norm.length;k++){
      const r = norm[k][0], c = norm[k][1];
      if(has[r+','+(c+1)]) edgesR.push([r,c]);
      if(has[(r+1)+','+c]) edgesD.push([r,c]);
    }
    SHAPES[id] = {
      id:id, name:s.name, cells:norm, size:norm.length,
      edgesR:edgesR, edgesD:edgesD,
      h: Math.max.apply(null, norm.map(function(c){ return c[0]; }))+1,
      w: Math.max.apply(null, norm.map(function(c){ return c[1]; }))+1
    };
  }

  /* Bậc thang độ khó = số HƯỚNG người chơi phải phân biệt.
   * Trần 12 shape/bậc để deck luôn nằm trong khoảng 5–12 ô của doc (§05).
   * Bậc đầu cố tình chỉ có khối 2–3 ô: khối nhỏ ⇒ nhiều khối hơn ⇒ màn dài
   * đúng 18–30 khối mà vẫn dễ thở. */
  const TIERS = [
    ['d_h','d_v','l3a','l3b','l3c','l3d'],
    ['d_h','d_v','l3a','l3b','l3c','l3d','i3h','i3v'],
    ['d_h','d_v','l3a','l3b','l3c','l3d','i3h','i3v','o4'],
    ['d_h','d_v','l3a','l3b','l3c','l3d','i3h','i3v','o4','t4u','t4d'],
    ['d_h','d_v','l3a','l3b','l3c','l3d','i3h','i3v','t4u','t4d','t4l','t4r'],
    ['d_h','d_v','l3a','l3b','l3c','l3d','i3h','i3v','o4','t4l','t4r','i4h'],
    ['d_h','d_v','l3a','l3b','l3c','l3d','i3h','i3v','t4u','t4r','i4v','s4h'],
    ['d_h','d_v','l3a','l3b','l3c','l3d','i3h','i3v','o4','t4d','t4l','z4h']
  ];

  window.SHAPES = SHAPES;
  window.SHAPE_TIERS = TIERS;
  window.MIN_SHAPE_SIZE = 2;
})();
