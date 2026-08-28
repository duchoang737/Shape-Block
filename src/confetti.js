/* ============================================================================
 * confetti.js — Pháo giấy ăn mừng lúc xong màn.
 * ----------------------------------------------------------------------------
 * HAI KHẨU Ở HAI GÓC DƯỚI, bắn chéo lên vào giữa màn hình. Bắn từ góc chứ
 * không phải từ trên rơi xuống: pháo rơi từ trên là hiệu ứng của thứ ĐÃ xong
 * từ trước, còn bắn lên từ dưới đọc ra là "vừa mới xong ngay lúc này".
 *
 * Vẽ nhờ trên `#dragLayer` — lớp canvas phủ cả viewport, `pointer-events:none`,
 * z-index 20, mỗi khung hình `R.drawDrag()` đã xoá sạch và đặt sẵn phép biến
 * đổi theo DPR. Ta vẽ NGAY SAU nó nên toạ độ ở đây là pixel CSS thuần, và
 * không phải dựng thêm canvas nào.
 *
 * Không đụng gì tới `fx.js` (hiệu ứng khối đáp xuống) — hai hệ độc lập.
 * ==========================================================================*/
(function(){

  /* Lấy từ bảng màu của mấy bức tranh trong `pictures.js` cho cùng tông ấm,
   * thêm màu giấy để có mảnh sáng bật lên trên nền linen. */
  const COLORS = ['#E8574B', '#F2A65A', '#FBD24B', '#3FAF9B',
                  '#4FA3C4', '#F27CA4', '#B07A4E', '#FFFDF8'];

  const GRAV = 1650;      // px/s² — rơi hơi nhanh, đỡ lê thê
  const DRAG = 0.62;      // hệ số cản/s, để mảnh giấy đuối dần chứ không bay thẳng
  const FADE = 0.55;      // giây cuối đời dùng để mờ đi

  let cv = null, ctx = null, parts = [], last = 0;

  /* Người dùng khai báo hạn chế chuyển động thì im lặng bỏ qua — pháo giấy là
   * trang trí thuần, không mang thông tin nào cả. */
  const reduced = (typeof matchMedia === 'function') &&
                  matchMedia('(prefers-reduced-motion: reduce)').matches;

  function bind(){
    if(ctx) return true;
    cv = document.getElementById('dragLayer');
    if(!cv) return false;
    ctx = cv.getContext('2d');
    return true;
  }

  function rnd(a, b){ return a + Math.random()*(b-a); }

  /* Một khẩu. `dirX` = +1 bắn sang phải (khẩu trái), -1 bắn sang trái. */
  function cannon(x, y, dirX, n){
    for(let i=0;i<n;i++){
      /* Ngẩng 54°–83° so với phương ngang: thấp hơn thì giấy tạt ngang ra khỏi
       * màn hình trước khi kịp thấy, cao hơn thì hai chùm chụm vào giữa thành
       * một cột. */
      const ang = rnd(Math.PI*0.30, Math.PI*0.46);
      const sp  = rnd(880, 1580);
      parts.push({
        x:x, y:y,
        vx: Math.cos(ang)*sp*dirX,
        vy: -Math.sin(ang)*sp,
        w: rnd(6, 11), h: rnd(9, 16),
        rot: rnd(0, Math.PI*2), vr: rnd(-9, 9),
        ph: rnd(0, Math.PI*2), fr: rnd(6, 11),   // pha + tần số lật
        col: COLORS[(Math.random()*COLORS.length)|0],
        life: 0, max: rnd(1.7, 2.7)
      });
    }
  }

  /* Một loạt: hai khẩu hai góc dưới. Gọi lại được nhiều lần, các loạt chồng
   * lên nhau. */
  function burst(){
    if(reduced || !bind()) return;
    const w = cv.clientWidth, h = cv.clientHeight;
    if(!w || !h) return;
    const n = w < 480 ? 42 : 60;             // màn hẹp thì bớt mảnh cho nhẹ
    cannon(w*0.035, h*0.99,  1, n);
    cannon(w*0.965, h*0.99, -1, n);
  }

  function clear(){ parts.length = 0; }
  function active(){ return parts.length > 0; }

  function draw(now){
    if(!parts.length){ last = 0; return; }
    if(!bind()) return;

    /* Tab bị ẩn rồi quay lại thì `now` nhảy vọt — kẹp dt lại, không thì cả
     * chùm giấy dịch chuyển tức thời ra ngoài màn hình trong đúng một khung. */
    if(!last || now - last > 300) last = now;
    let dt = (now - last)/1000;
    last = now;
    if(!(dt > 0)) dt = 1/60;
    if(dt > 0.05) dt = 0.05;

    const h = cv.clientHeight;
    ctx.save();
    for(let i=parts.length-1;i>=0;i--){
      const p = parts[i];
      p.life += dt;
      const k = 1 - DRAG*dt;
      p.vx *= k;
      p.vy = p.vy*k + GRAV*dt;
      p.x  += p.vx*dt;
      p.y  += p.vy*dt;
      p.rot += p.vr*dt;
      p.ph  += p.fr*dt;

      if(p.life > p.max || p.y > h + 80){ parts.splice(i, 1); continue; }

      const fade = p.life > p.max - FADE ? Math.max(0, (p.max - p.life)/FADE) : 1;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      /* Bóp ngang theo hình sin = mảnh giấy đang lật qua lật lại. Rẻ hơn nhiều
       * so với vẽ hình 3D mà đọc ra đúng cái cần đọc. */
      ctx.scale(Math.cos(p.ph), 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    }
    ctx.restore();
  }

  window.Confetti = { burst:burst, draw:draw, clear:clear, active:active };
})();
