/* ============================================================================
 * pictures.js — Bức tranh + thang dạy chơi.
 * ----------------------------------------------------------------------------
 * Board CHÍNH LÀ silhouette bức tranh. Ký tự nào có màu trong `palette` thì
 * thuộc tranh; `'.'` là ô khoét.
 *
 * NĂM MÀN ĐẦU LÀ MỘT THANG DẠY, mỗi màn giới thiệu ĐÚNG MỘT thứ mới:
 *   1 Trái tim — kéo khối, khối không xoay        (chưa có gì khác)
 *   2 Nấm đỏ   — Ô KHẢM                            + holes
 *   3 Mèo      — nhiều hướng khối hơn              + tier
 *   4 Bông hoa — TƯỜNG chia vùng                   + regions
 *   5 Cá voi   — tất cả cùng lúc, board to nhất
 *
 * Mỗi bức tự khai độ khó của mình, không suy ra từ số thứ tự:
 *   `tier`    — bậc bộ khối (0 = chỉ domino + góc; càng cao càng nhiều hướng)
 *   `regions` — số vùng tường muốn chia (1 = không tường)
 *   `holes`   — danh sách KÝ TỰ ZONE là ô khảm sẵn, không đặt khối lên được
 *   `teach`   — HIỆN KHÔNG DÙNG: game đã bỏ hết chữ. Giữ lại phòng khi cần
 *               bản có hướng dẫn; muốn bật thì vẽ lại caption ở index.html.
 *
 * MÀU: vì một khối được phép nằm vắt qua nhiều vùng màu, chia bao nhiêu vùng
 * cũng KHÔNG làm màn khó thêm — chỉ làm bức tranh đẹp hơn. Mỗi bức ở đây có
 * 3–7 vùng: thân, vùng tối, vùng sáng, chi tiết.
 *
 * LUẬT KHI VẼ TRANH MỚI:
 *   1. Mọi hàng phải dài BẰNG NHAU.
 *   2. Sau khi trừ ô khảm, mỗi vùng liền nhau còn lại phải lát được bằng khối
 *      từ 2 ô trở lên. Generator ném lỗi ngay nếu không.
 *   3. MÀU KHÔNG ĐƯỢC TRÙNG NỀN. Ô trống là `#F0E6D6`, nền linen `#EFE3D0` —
 *      màu tranh nào sát hai màu đó thì ô đã lấp trông y hệt ô còn trống.
 *      `node build-playable.mjs` tự đo và cảnh báo; ngưỡng: vùng ≥5 ô phải
 *      cách ≥45, vùng nhỏ hơn phải cách ≥25.
 * ==========================================================================*/
window.PICTURES = [

  /* ================================================================ MÀN 1–4
   * CHỦ ĐỀ: BỐN BẠN NHỎ — mèo · gấu · thỏ · cún.
   *
   * Luật vẽ rút ra sau mấy lần hỏng (xem README §"Muốn màn chỉ có N khối"):
   *
   *  1. SILHOUETTE = đúng 3 hình chữ nhật, và ba cái đó phải LỆCH NHAU. Tai
   *     nhô lên, thân thò ra — có bậc thì mới ra hình con vật. Xếp thành một
   *     khối chữ nhật đặc là ra cái chăn kẻ sọc, không ra con gì cả.
   *  2. MÀU không dính gì tới chuyện lát (luật §4: khối được nằm vắt qua nhiều
   *     vùng màu) ⇒ mặt mũi vẽ thoải mái trong lòng ba hình chữ nhật đó.
   *  3. ĐẦU PHẢI RỘNG 5 Ô. Bản trước để đầu 4×4: mặt chỉ còn 4 cột nên hai con
   *     mắt buộc phải nằm ở hai cột ngoài cùng — dính sát viền đầu, nhìn như bị
   *     lồi mắt, mà cũng chẳng còn chỗ cho mũi hay má. Rộng 5 ô thì mắt lùi vào
   *     cột 2 và 4, chừa cột giữa cho mũi. Đó là lý do có khối `r20h`.
   *  4. Cách lát là DUY NHẤT ở cả bốn màn: tai chỉ lắp vừa chỗ tai. Với màn dạy
   *     3 khối thì đó là điểm mạnh — nhấc khối lên là biết nó đi đâu.
   * ==========================================================================*/

  /* ---------------------------------------------------------------- MÀN 1
   * Mèo con. Tai = hai cột 2×1 nhọn, trong tai hồng; đầu 4×5. Má hồng nằm ngay
   * cạnh mắt — chi tiết một ô, giữ được nét sắc nhờ luật "ô đơn độc không pha"
   * trong `blendPicture()`. */
  { id:'cat', name:'Mèo con', en:'Little Cat',
    teach:'Chạm chọn một khối rồi chạm vào tranh — hoặc kéo thẳng lên.',
    tier:0, regions:1, holes:[],
    shapes:['r20h','d_v'], bias:-1.6,
    pieces:[3,3], deck:[2,3], solutions:1,
    palette:{ h:'#F2A65A', p:'#F58BA0', e:'#3A2A18',
              m:'#FFC49A', n:'#E8574B' },
    art:[
      ".h...h.",
      ".p...p.",
      ".hhhhh.",
      ".pehep.",
      ".hmnmh.",
      ".hhhhh."
    ] },

  /* ---------------------------------------------------------------- MÀN 2
   * Gấu bông. Tai tròn = hai ô vuông 2×2, mõm kem chiếm gần nửa dưới mặt. */
  { id:'bear', name:'Gấu bông', en:'Teddy Bear',
    teach:'Kéo khối từ khay lên tranh.',
    tier:0, regions:1, holes:[],
    shapes:['r20h','o4'], bias:-1.6,
    pieces:[3,3], deck:[2,3], solutions:1,
    palette:{ g:'#8A5A34', h:'#B07A4E', e:'#3A2A18',
              m:'#E0B87F', n:'#4A3324' },
    art:[
      "gg...gg",
      "gg...gg",
      ".hhhhh.",
      ".heheh.",
      ".mmnmm.",
      ".hmmmh."
    ] },

  /* ---------------------------------------------------------------- MÀN 3
   * Thỏ hồng. Tai = hai cột 3×1 — dài gấp rưỡi tai mèo, nhìn là biết con gì. */
  { id:'bunny', name:'Thỏ hồng', en:'Pink Bunny',
    teach:'Chạm vào khối đã đặt để lấy nó về khay.',
    tier:0, regions:1, holes:[],
    shapes:['r20h','i3v'], bias:-1.6,
    pieces:[3,3], deck:[2,3], solutions:1,
    palette:{ h:'#F2A0BE', p:'#F7A8C4', e:'#3A2A18',
              m:'#FFAECB', n:'#E8574B' },
    art:[
      ".h...h.",
      ".p...p.",
      ".p...p.",
      ".hhhhh.",
      ".heheh.",
      ".hmnmh.",
      ".hhhhh."
    ] },

  /* ---------------------------------------------------------------- MÀN 4
   * Cún con — bạn duy nhất có CẢ THÂN: đầu 4×5 · thân 2×6 · đuôi 2×1 chìa ra
   * bên phải. Ba khối ba cỡ khác hẳn nhau nên nhìn khay là biết cái nào vào đâu.
   * Tai cụp vẽ bằng MÀU ở hai góc trên của đầu, không cắt vào silhouette — cắt
   * thì đầu hết là hình chữ nhật và màn không còn lát nổi bằng 3 khối. */
  { id:'puppy', name:'Cún con', en:'Little Puppy',
    teach:'Kéo khối đã đặt đè lên khối khác — khối kia tự về khay.',
    tier:0, regions:1, holes:[],
    shapes:['r20h','s12h','d_v'], bias:-1.6,
    pieces:[3,3], deck:[3,3], solutions:1,
    palette:{ d:'#A8703C', h:'#DDA95F', e:'#3A2A18', m:'#F0C77E',
              n:'#4A3324', c:'#E8574B', b:'#C98A4E' },
    art:[
      ".dhhhd.",
      ".heheh.",
      ".hmnmh.",
      ".hmmmh.",
      "ccccccb",
      "mmbbmmb"
    ] },

  /* ---------------------------------------------------------------- MÀN 5
   * To nhất trong năm màn đầu. Cũng là chữ nhật đầy — cá voi bơi trên nền
   * biển, không phải cá voi bị cắt rời khỏi nền. */
  { id:'whale', name:'Cá voi con', en:'Little Whale',
    teach:'Kéo khối đã đặt đè lên khối khác — khối kia tự về khay.',
    tier:0, regions:1, holes:[],
    shapes:['r12h','r12v','r10h','r10v','sq9','r8h','r8v','r6h','r6v'],
    bias:-1.6, pieces:[5,5], deck:[2,5], solutions:8,
    palette:{ s:'#1F5F8F', b:'#7FC8E8', k:'#1B3A52', m:'#A9DCF2' },
    art:[
      "ssssssss",
      "ssbbbbss",
      "sbbkbbbs",
      "sbbbbbbs",
      "ssmmmmss",
      "ssssssss"
    ] },

  /* ---------------------------------------------------------------- MÀN 6
   * Ngoài thang dạy. Trái tim thon dần nên khối to khó lọt — để bộ khối nhỏ. */
  { id:'heart', name:'Trái tim', en:'Warm Heart',
    tier:2, regions:8, holes:[],
    bias:-0.9,
    /* MÀN GIỚI THIỆU TƯỜNG. Bộ khối phải là bậc 2 nguyên vẹn, KHÔNG khai
     * `shapes` riêng: bộ hẹp cũ (o4 + p5a/p5d + domino) gặp tường thì chỉ còn
     * 3–19 đường lát, dưới hẳn ngưỡng 40 của board có tường — màn lọt qua cổng
     * bằng đường dự phòng và thành gần như đáp án duy nhất.
     *
     * Nới `pieces` theo: bộ khối rộng hơn thì ra ~20 khối, để nguyên [11,15] là
     * màn rớt cổng SỐ KHỐI trước cả khi kịp đếm lời giải. */
    pieces:[14,20],
    palette:{ d:'#A81F42', r:'#E32B58', w:'#FA7B9C' },
    art:[
      ".dd...dd.",
      "ddddddddd",
      "dwwrrrrrd",
      "dwrrrrrrd",
      "drrrrrrrd",
      ".drrrrrd.",
      "..drrrd..",
      "...ddd..."
    ] }
,

  /* ======================================================== MÀN 7–20 · TO DẦN
   * Từ đây board lớn dần theo màn: 57 ô ở màn 7 lên 105 ô ở màn 20, số khối 19
   * lên 30. Bậc bộ khối đi kèm (2 → 7) vì `gen.js` chặn trần bậc theo cỡ board
   * — board dưới 70 ô mà thả bộ khối lạ vào thì số lời giải rơi xuống còn một.
   *
   * MÀU SÁNG PHẢI TỐI HẲN XUỐNG. Nền linen là #EFE3D0, ô trống #F0E6D6, nên
   * trắng-kem thật (#F2EDE2, #F7E4CE...) đo ra chỉ cách nền 4–8: ô đã lấp trông
   * y hệt ô còn trống. Hai màu "sáng" dùng được, đã đo:
   *     #A8B4C0  xám xanh  cách nền 47  — lông trắng, buồm, tuyết
   *     #D8C08A  cát ấm    cách nền 57  — tường, mặt, cánh
   * `node build-playable.mjs` tự đo lại mỗi lần build.
   * ==========================================================================*/

/* ---- MÀN 7 · Chậu cây · 38 ô ------------------------------------------ */
{ id:'plant', name:'Chậu cây', en:'Little Plant',
  tier:2, regions:5, holes:[],
  palette:{ g:'#5FA45C', d:'#2F7A4A', f:'#E8557E', y:'#F2C24B', v:'#7B5EA7', t:'#8A6039', p:'#C4794A', b:'#3E8FA8', s:'#9C5A2E' },
  art:[
      "..gfgyg..",
      ".ggdggvg.",
      "gfggggdgy",
      "ggdggfggg",
      ".ggvgdgg.",
      "..gygfg..",
      "...ttt...",
      ".pbbbbbp.",
      "..sssss.."
    ] },

/* ---- MÀN 8 · Cốc ca cao · 44 ô ---------------------------------------- */
{ id:'cocoa', name:'Cốc ca cao', en:'Cup of Cocoa',
  tier:2, regions:4, holes:[],
  palette:{ s:'#A8B4C0', b:'#3E8FA8', m:'#D9614A', h:'#B0553F', c:'#7A4A2E', k:'#5C3520', w:'#D8C08A', y:'#F2C24B' },
  art:[
      "..ss.ss..",
      ".bbbbbbb.",
      "cccwwcchh",
      "ckkkkkchh",
      "mmmmmmmhh",
      "bbbbbbbhh",
      ".mymymym.",
      "..mmmmm.."
    ] },

/* ---- MÀN 9 · Con cú · 52 ô -------------------------------------------- */
{ id:'owl', name:'Con cú', en:'Sleepy Owl',
  tier:3, regions:7, holes:[],
  palette:{ e:'#7A5A3A', b:'#3E8FA8', w:'#D8C08A', k:'#2A1D12', y:'#E8A03C', c:'#D8A96A', v:'#7B5EA7', f:'#C98A4E' },
  art:[
      ".ee...ee.",
      "ebbbbbbbe",
      "ewwyyywwe",
      "ewkyyykwe",
      "eeeyyyeee",
      ".ccccccc.",
      ".cvcvcvc.",
      ".effeffe.",
      "..fffff.."
    ] },

/* ---- MÀN 10 · Ngôi nhà nhỏ · 59 ô ------------------------------------- */
{ id:'house', name:'Ngôi nhà nhỏ', en:'Cosy House',
  tier:3, regions:6, holes:[],
  palette:{ r:'#B04A3C', o:'#E8763C', w:'#D8C08A', b:'#3E8FA8', g:'#4E9E5C', d:'#7A4A2E' },
  art:[
      "....rr....",
      "...roor...",
      "..roooor..",
      ".roooooor.",
      "rroooooorr",
      ".wwwwwwww.",
      ".wbbwwbbw.",
      ".wwwwwwww.",
      ".wggddggw.",
      ".wggddggw."
    ] },

/* ---- MÀN 11 · Con cáo · 60 ô ------------------------------------------ */
{ id:'fox', name:'Con cáo', en:'Little Fox',
  tier:3, regions:7, holes:[],
  palette:{ o:'#D9702F', p:'#E890AC', w:'#D8C08A', k:'#2A1D12', n:'#3A2A18', b:'#3E8FA8', r:'#C8443C', t:'#B85A22', g:'#4E9E5C' },
  art:[
      ".op....po.",
      ".opo..opo.",
      ".oooooooo.",
      ".owkookwo.",
      ".owwnnwwo.",
      "..wwwwww..",
      "bbrrbbrrbb",
      "oooooooooo",
      "ottttttto.",
      ".gttttttg."
    ] },

/* ---- MÀN 12 · Bánh kem · 66 ô ----------------------------------------- */
{ id:'cake', name:'Bánh kem', en:'Birthday Cake',
  tier:4, regions:6, holes:[],
  palette:{ y:'#F2C24B', t:'#3E8FA8', r:'#E8433C', v:'#7B5EA7', c:'#A8B4C0', f:'#F291B4', s:'#D9536B', p:'#E8A03C', g:'#6BBF7A', k:'#8A4B2A', m:'#D8C08A' },
  art:[
      ".y.t.r.v..",
      ".c.c.c.c..",
      "ffffffffff",
      "fsfvftfrff",
      "pppppppppp",
      "pgpgpgpgpg",
      "kkkkkkkkkk",
      "kkmmkkmmkk",
      "kkkkkkkkkk"
    ] },

/* ---- MÀN 13 · Con nhím · 73 ô ----------------------------------------- */
{ id:'hedge', name:'Con nhím', en:'Hedgehog',
  tier:4, regions:7, holes:[],
  palette:{ s:'#6B4A32', d:'#4A3222', u:'#8A5A7A', f:'#D8A96A', k:'#2A1D12', n:'#B0553F', r:'#D9433C', g:'#4E9E5C', v:'#4E6FB8', y:'#E8A03C' },
  art:[
      "...ssdd...",
      "..suudss..",
      ".srrddsuu.",
      "ssggssddss",
      "sudduuddus",
      "ssddvvddss",
      "fssdduusds",
      "ffkssddyss",
      "ffnffssdd.",
      ".ffffss..."
    ] },

/* ---- MÀN 15 · Thuyền buồm · 79 ô -------------------------------------- */
{ id:'boat', name:'Thuyền buồm', en:'Little Boat',
  tier:5, regions:6, holes:[],
  palette:{ s:'#A8B4C0', r:'#D9433C', y:'#F2C24B', m:'#8A6039', h:'#B04A3C', w:'#4E8FB8', d:'#2F6F8F', f:'#A8D8E8' },
  art:[
      "...rs.yy..",
      "..srs.mm..",
      ".rsrs.mm..",
      "srsrs.mm..",
      "rsrsr.mm..",
      "hhhhhhhhhh",
      "yyhhhhhhyy",
      "wwwwwwwwww",
      ".wfwwwwfw.",
      "dwwwwwwwwd",
      "ddwwwwwwdd"
    ] },

/* ---- MÀN 14 · Con ong · 78 ô ------------------------------------------ */
{ id:'bee', name:'Con ong', en:'Busy Bee',
  tier:5, regions:8, holes:[],
  palette:{ b:'#3E8FA8', w:'#A8B4C0', c:'#7FC4CC', y:'#F2C24B', o:'#E8763C', e:'#2A1D12', k:'#3A2A18', p:'#E890AC', n:'#D99A2B' },
  art:[
      ".bb....bb.",
      "bwcb..bcwb",
      "wcbwwwwbcw",
      ".bwcwwcwb.",
      "..yyyyyy..",
      ".ypeyyepy.",
      "kkyooyyykk",
      ".kkkkkkkk.",
      ".yyoooyyy.",
      ".kkkkkkkk.",
      "..nyyoyn..",
      "...kkkk..."
    ] },

/* ---- MÀN 16 · Chim cánh cụt · 86 ô ------------------------------------ */
{ id:'penguin', name:'Chim cánh cụt', en:'Penguin',
  tier:5, regions:10, holes:[],
  palette:{ r:'#D9433C', m:'#D8C08A', k:'#2F3B4A', w:'#A8B4C0', e:'#1A2029', b:'#E8A03C', s:'#3E8FA8', g:'#F2C24B', f:'#D9873C' },
  art:[
      "...rrrr...",
      "..rrmmrr..",
      ".kkwewekk.",
      ".kkwbbwkk.",
      "kkkwwwwkkk",
      "ssssssssss",
      "gssssssssg",
      "kkwwwwwwkk",
      "kkwwwwwwkk",
      ".kwwwwwwk.",
      "..ffffff.."
    ] },

/* ---- MÀN 18 · Con voi · 99 ô ------------------------------------------ */
{ id:'eleph', name:'Con voi', en:'Grey Elephant',
  tier:6, regions:6, holes:[],
  palette:{ g:'#8A94A8', p:'#E890AC', r:'#D9433C', e:'#2A2D36', m:'#C8607A', b:'#3E8FA8', y:'#F2C24B', n:'#6E7789', v:'#7B5EA7' },
  art:[
      "..gggggg....",
      ".grrrrrrg...",
      "ppgrrrrgpp..",
      "ppgegegepp..",
      "ppgggmggpp..",
      ".gggggggg...",
      ".bbyybbnn...",
      "bbyybbynn...",
      "gggggggnn...",
      "ggggggg.nn..",
      "vv...vv.nn..",
      "gg...gg.nn.."
    ] },

/* ---- MÀN 17 · Cây thông · 92 ô ---------------------------------------- */
{ id:'pine', name:'Cây thông', en:'Winter Pine',
  tier:6, regions:7, holes:[],
  palette:{ g:'#3C7A45', d:'#2A5C34', y:'#F2C24B', r:'#D9433C', b:'#3E8FA8', v:'#A86FC4', t:'#7A4A2E', p:'#C4794A' },
  art:[
      "....yy.....",
      "...gyrg....",
      "..grrddg...",
      ".gbggvggb..",
      "..grddbg...",
      ".grggybgg..",
      "gyggddggvg.",
      "gvggrggbgg.",
      "ggddggddgg.",
      "grggbggygg.",
      "grggddggyg.",
      "gvggrggbgg.",
      "....tt.....",
      "..pppppp..."
    ] },

/* ---- MÀN 19 · Gấu trúc · 102 ô ---------------------------------------- */
{ id:'panda', name:'Gấu trúc', en:'Panda',
  tier:7, regions:7, holes:[],
  palette:{ k:'#33333B', w:'#A8B4C0', e:'#1A1A20', p:'#E890AC', c:'#C8607A', r:'#D9433C', y:'#F2C24B', g:'#5FA45C', l:'#8ED18A', t:'#3C7A45' },
  art:[
      ".kk....kk..",
      "kkkkwwkkkk.",
      "kwwwwwwwwk.",
      "kwkkwwkkwk.",
      "kwkekekekw.",
      ".wcpppcww..",
      ".wwwwwwww..",
      "rrrryyrrrr.",
      "kkwwwwwwkkg",
      "kkwwwwwwkgl",
      ".kkwwwwkktl"
    ] },

/* ---- MÀN 20 · Bươm bướm · 105 ô --------------------------------------- */
{ id:'flutter', name:'Bươm bướm', en:'Butterfly',
  tier:7, regions:3, holes:[],
  palette:{ o:'#E8763C', y:'#F2C24B', k:'#3A2A18', p:'#D9536B', w:'#D8C08A', v:'#7B5EA7', t:'#3E8FA8', b:'#4E6FB8', g:'#6BBF7A' },
  art:[
      "kk......kk..",
      "kkk.kk.kkk..",
      "vooo.kk.ooov",
      "oybokkkobyo.",
      "ootokkkotoo.",
      "vooo.kk.ooov",
      ".ppokkkopp..",
      "pgppkkkppgp.",
      "pwbpkkkpbwp.",
      "pgppkkkppgp.",
      ".pb.kkk.bp..",
      "....kk......"
    ] }
];
