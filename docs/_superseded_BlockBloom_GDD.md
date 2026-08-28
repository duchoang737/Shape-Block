# Game Design Document — Block Bloom

**Version** 1.1 · Ngày 2026-08-27 · Kế thừa **Block Wow / SandShape v2.0**, thay toàn bộ lớp thao tác.
**Nền tảng** HTML5 canvas dọc (mobile-first) → APK Android. Prototype hiện tại: vanilla JS, không build step.

> **v1.1 đổi hai điểm so với v1.0:** board từ *silhouette hình con vật* → **khung chữ nhật kín**
> (silhouette lộ ngay hình gì, hỏng mất bất ngờ), và thêm **khối đặt sẵn** như game gốc.

---

## 1. Vì sao làm lại

Block Wow là *logic packing puzzle*: kéo khối lấp kín board, có xoay/lật, có 4 nhóm luật phụ.
Hai vấn đề của lớp thao tác cũ:

- **Xoay/lật là một bước thừa trên mobile.** Người chơi phải: chọn khối → bấm ⟳ vài lần → mới kéo.
  Ba thao tác cho một nước đi. Sai hướng thì phải kéo ra, xoay lại, kéo vào.
- **Khay khối rời rạc.** Cùng một shape nhưng nằm ở 5 chỗ khác nhau trên khay ⇒ mắt phải quét cả khay
  mỗi lần muốn tìm một hình.

Block Bloom giữ nguyên **lõi**: lấp kín board bằng polyomino, không chồng, không tràn.
Đổi **lớp trên**: một thao tác duy nhất là **kéo-thả**.

---

## 2. Năm thay đổi cốt lõi

### 2.1 Bỏ xoay & lật — mỗi hướng là một khối riêng
Không có nút ⟳ / ⇋, không tap-đúp. Khối nằm sẵn đúng chiều sẽ dùng.
Cái giá phải trả: bộ khối nở ra (góc L có 4 hướng, T có 4 hướng, I có 2 hướng).
Đổi lại: người chơi **nhìn thấy** thứ mình cần thay vì phải **tưởng tượng** ra nó.

Hiện có 19 khối cố định hướng, xem `src/shapes.js`.

### 2.2 Khay gom theo shape + số dư
Tất cả khối cùng shape nằm chung **một ô** trên khay, có badge `×N`.
Đặt được một cái thì N giảm; gỡ ra thì N tăng lại. N = 0 → ô mờ đi, không kéo được.

Khay **tự chọn bố cục**:

| Số shape trên deck | Bố cục |
|---|---|
| ≤ 6 | 1 hàng, ô 48–68 px, không cuộn |
| 7 – 12 | **2 hàng**, ô tới 68 px, không cuộn |
| ≥ 13 | 2 hàng, ô 48 px, **cuộn ngang** (gradient mờ ở mép báo còn hàng) |

Cuộn 15 px thì cấn hơn là không cuộn, nên khay xuống 2 hàng trước rồi mới cuộn.
Board bị giới hạn bởi **chiều ngang** trên đa số máy (13 cột), nên khay cao thêm gần như
không lấy mất ô nào của board — đo trên 375×762: `cell = 27 px` ở cả hai bố cục.

### 2.3 Board là khung chữ nhật kín, có khối đặt sẵn
Board = **13×13 = 169 ô**, tất cả đều lấp được. Trên đó sẵn có **7–15 khối đặt cứng**
(≈ 26–44 ô, 15–26% board tuỳ bậc, màn đầu nhiều hơn).

Khối đặt sẵn:
- **Không kéo được** (`onDown` bỏ qua khi `placement.fixed`), không nằm trong deck.
- Vẽ bằng tông **đá xám** `mix(màuShape, #5a6183, 0.74)` + chấm rivet ở giữa ⇒ đọc ngay là
  "của board", và **tuyệt đối không rò rỉ màu bức tranh**.
- Khi thắng thì chúng cũng đổi màu như mọi ô khác — chúng là một phần của tranh.

Chúng làm hai việc: **tạo cấu trúc** cho một khung chữ nhật vốn trống trơn (không có chúng
thì lát chữ nhật quá dễ và quá nhạt), và **cho người chơi điểm tựa** để bắt đầu.

### 2.4 Người chơi KHÔNG biết trước bức tranh
Đây là lý do board bỏ kiểu silhouette: silhouette hình con mèo thì nhìn phát biết ngay là con mèo.

Trong lúc chơi board chỉ là khung xám + khối đá + khối màu. Lấp kín xong:
**mọi ô crossfade** từ màu khối sang màu tranh trong 900 ms, đồng thời khe hở giữa ô co từ
5.5% xuống 0.4% ⇒ ~40 khối rời tan thành **một mảng màu liền**. Kèm 90 hạt pháo hoa lấy màu
từ chính bức tranh.

Không tiết lộ ở đâu khác:
- HUD ghi **"Tranh ẩn"**, chỉ đổi thành tên tranh sau khi màn đó đã hoàn thành 1 lần.
- Bảng chọn màn ghi **"???"** cho màn chưa hoàn thành.
- **Không có nút bật/tắt bóng mờ.** Cờ `G.showGhost` vẫn còn nhưng chỉ bật được từ console,
  dành cho lúc thiết kế tranh.

8 tranh hiện có (13×13): Cây nấm · Gà con · Mèo · Ngôi sao · Trái tim · Bông hoa · Con bướm · Tên lửa.
Vì cả khung đều lấp được nên art thoải mái có **chi tiết 1 ô** (mắt, mỏ, râu) — ràng buộc
"không có gai 1 ô" của bản silhouette không còn áp dụng.

### 2.5 Dài chứ không khó
| | Block Wow | Block Bloom |
|---|---|---|
| Board | 2×2 → 10×6 | 13×13 kín |
| Ô chơi được | 4 → 60 | 169 |
| Khối người chơi đặt | 2 → 13 | 36 – 41 |
| Thời lượng | 30 giây – 3 phút | 1 – 2 phút |

Độ khó **không** tăng bằng luật phụ (bỏ hết R-SYMBOL / R-COLOR-ADJ / R-ANCHOR / R-NUMBER)
mà bằng **số hướng khối phải phân biệt** (deck 7 → 16 shape) và **ít khối đặt sẵn dần**.
Xem `SHAPE_TIERS` trong `src/shapes.js`.

---

## 3. Luật (engine phải đúng từng điểm)

Board = tập ô chơi được. Mỗi khối là polyomino **cố định hướng**.

- **R-COVER** — thắng khi **mọi ô chơi được được phủ đúng 1 lần**: không ô trống, không chồng,
  không tràn mép.
- **ALL-PLACED** — ô khối-đặt-sẵn + tổng ô của deck = đúng số ô board (bảo đảm bởi cách sinh
  màn, §4). Vì vậy R-COVER thoả ⟺ deck rỗng.
- **KHÔNG có** luật màu / ký hiệu / neo / số. **KHÔNG có** máu, đồng hồ đếm ngược, giới hạn nước đi.

Không có "nước đi sai bị phạt". Chỗ duy nhất người chơi mất là **thời gian**.

---

## 4. Sinh màn — lát trước, cắt sau

Điểm mấu chốt: **không bốc đại một bộ khối rồi cầu cho nó vừa.**

```
1. Đọc ASCII art  →  mask (ô nào thuộc board, màu đích của ô đó).
2. Chạy solver exact-cover NGẪU NHIÊN lát kín toàn bộ mask.
3. Cắt lời giải làm hai:
      • ~15-26% khối, RẢI ĐỀU khắp board   →  khối đặt sẵn
      • phần còn lại                        →  deck (gom theo shape, đếm số dư)
   Phần còn lại cũng được giữ nguyên làm LỜI GIẢI THAM CHIẾU (dùng cho Gợi ý, §6).
```

Hệ quả:
- Màn nào cũng **chắc chắn** có ít nhất một lời giải (chính là lời giải sinh ra nó).
- Ô đặt sẵn + ô deck **luôn** khớp số ô board.
- Thường còn **rất nhiều** lời giải khác ⇒ người chơi không phải dò đúng một đáp án.

Rải đều khối đặt sẵn: xáo trộn tất định rồi tham lam nhận khối nào cách mọi khối đã nhận
≥ d, nới d từ 4.5 xuống cho tới khi đủ số (`pickSpread`).

**Solver** (`LevelGen.solve`) là DFS exact-cover:
- Luôn lấp **ô trống đầu tiên theo thứ tự quét**. Nhờ chuẩn hoá `cells[0]` của shape, mỗi shape
  chỉ có **đúng một** cách đặt phủ ô đó ⇒ nhánh rất hẹp.
- **Cắt tỉa `coverable`**: sau mỗi lần đặt, soát các ô trống KỀ chỗ vừa đặt — nếu có ô nào mà
  **không khối nào còn hàng lọt vừa** (quét mọi shape × mọi cách neo) thì cắt nhánh.
  Mạnh hơn hẳn kiểu chỉ bắt "ô trống bị cô lập": giảm số node 2–3× (lv16: 276k → 84k).
- **Ngân sách** node + thời gian. Hết ngân sách trả `unknown` — **không kết luận gì cả**.

Đo thực tế: sinh 8 màn = 21 ms. Một nước đi của người chơi (đã tính cả stuck-check) ≈ 1–15 ms.

**Tính tất định:** khoá sắp xếp được tính trước rồi mới `sort`. Gọi `rng()` ngay trong comparator
làm kết quả phụ thuộc thuật toán sort của từng engine — đã sửa. Cùng `index` ⇒ cùng màn, ở mọi máy.

---

## 5. Input model — chỉ còn kéo-thả

| Thao tác | Hành vi |
|---|---|
| **Kéo ô khay → board** | Khối bay lên **cao hơn ngón tay 1.35 ô + 16 px** (không bị ngón che). Ghost hiện đúng ô sẽ phủ + viền trắng. Thả hợp lệ → đặt. Không hợp lệ → về khay, `×N` không đổi. |
| **Kéo khối đã đặt** | Nhấc khỏi board ngay (ô trống ra để tự ghost vào lại được). Thả chỗ mới → `move`. Thả bậy → trả về khay, `×N` +1. **Miễn phí.** |
| **Chạm khối đặt sẵn** | Không có gì xảy ra — nó là một phần của board. |
| **Vuốt ngang trên khay** | Cuộn khay (chỉ khi deck dài quá 2 hàng). |
| **Undo** | Lùi 1 nước. Không giới hạn, không tốn gì. |
| **Hint 💡** | Nhấp nháy một nước đặt hợp lệ 2.8 s + ô khay tương ứng, tự cuộn khay tới đó. |

**Phân biệt kéo-khối vs cuộn-khay.** Chạm vào ô khay chưa quyết định ngay là gì:
- vuốt **lên** > 8 px → nhấc khối;
- vuốt **ngang** > 12 px và ngang > dọc → cuộn khay;
- vuốt **dọc** > 12 px → nhấc khối.

Nếu khay không cần cuộn (`maxScroll === 0`) thì bỏ qua toàn bộ đoạn này: **chạm là nhấc luôn**,
đúng cảm giác Block Blast. Với bố cục 2 hàng thì hầu hết màn rơi vào trường hợp này.

**Nam châm snap.** Vị trí làm tròn có sai số ±0.5 ô. Ngoài ra còn quét 8 ô lân cận, nhận ô hợp lệ
gần nhất trong bán kính **0.85 ô** ⇒ lệch nhẹ vẫn vào đúng chỗ.

---

## 6. Chống bí — "dài chứ không khó"

Vì deck khớp chính xác số ô còn trống, người chơi **có thể** đặt vào thế không hoàn thành được.
Bốn lớp bảo vệ:

1. **Gỡ khối miễn phí** — kéo khối đã đặt ra bất cứ lúc nào (trừ khối đặt sẵn).
2. **Undo không giới hạn.**
3. **Stuck-check.** Sau *mỗi* nước, solver chạy với deck còn lại (ngân sách 26 000 node / 35 ms).
   Chỉ khi **chứng minh được** là `unsat` mới bật banner đỏ *"Hết đường rồi"* kèm nút Undo.
   Hết ngân sách → `unknown` → **im lặng tuyệt đối**, không doạ nhầm người chơi.
4. **Gợi ý hai lớp.**
   - Lớp 1 — **lời giải tham chiếu** của màn: lọc lấy nước nào giờ vẫn đặt vừa, chọn ngẫu nhiên.
     Tức thì (0 ms), và luôn có ở đầu màn.
   - Lớp 2 — người chơi đi lệch nhiều thì lớp 1 cạn; khi đó board cũng đã vơi nên DFS chạy
     nhanh, gọi solver thật (400 000 node / 400 ms).

**Vì sao cần lớp 1:** DFS exact-cover từ thế cờ **đầu màn** có thể quá nặng — đo thực tế màn 7 và
màn 13 chạy 600 000 node vẫn `unknown`. Ràng buộc "dùng đúng bộ khối này, không thừa không thiếu"
là ràng buộc chặt. Điều này **không** ảnh hưởng tính giải được (generator đã dựng ra lời giải)
cũng **không** ảnh hưởng stuck-check (chỉ báo khi *chứng minh* được), nhưng nếu không có lớp 1
thì nút Gợi ý sẽ hỏng đúng ở những màn khó nhất.

---

## 7. Art khối cổ điển

Bỏ sprite hải cẩu/mèo. Mỗi ô vẽ bằng code:
bo góc 20%, khe hở 5.5%, gradient dọc (trắng 36% ở đỉnh → đen 27% ở đáy), viền trắng 20%.
Màu **gắn theo shape, không theo lượt** — nhìn màu là biết hướng, khỏi đọc hình.

Nền tối `#0a0b18` + radial gradient tím. Khung board có shadow riêng để nổi khỏi nền.

> ⚠️ **Bẫy đã dính một lần:** `mix()` phải trả **hex**, vì kết quả của nó còn được đem đi `mix()`
> tiếp (màu khối đặt sẵn → màu tranh) mà `hexRGB()` chỉ đọc được hex. Trả `'rgb(...)'` thì vòng
> thứ hai ra `NaN`, canvas **lặng lẽ giữ `fillStyle` cũ**, và ô sẽ ăn màu của ô vẽ ngay trước nó —
> lỗi chỉ hiện lúc reveal, chỉ trên khối đặt sẵn, và không ném exception nào.

---

## 8. Kỹ thuật

Vanilla JS + canvas 2D, không build step, không dependency. 5 file `src/*.js` nạp bằng
`<script>` thường (chạy được cả `file://`). `build-playable.mjs` gộp thành 1 file ~57 KB.

| File | Việc |
|---|---|
| `pictures.js` | 8 tranh ASCII 13×13 + palette (có màu nền `'.'`) |
| `shapes.js` | 19 khối cố định hướng, màu, 7 bậc độ khó |
| `gen.js` | `mulberry32`, `buildMask`, `pickSpread`, `coverable`, `solve`, `generateLevel` |
| `render.js` | Layout responsive (khay 1/2 hàng) + toàn bộ vẽ + hit-test |
| `game.js` | State, place/remove/undo, input, stuck-check, hint, HUD, âm thanh WebAudio |

DPR-aware, `touch-action: none`, safe-area inset. Tiến độ lưu `localStorage` (`blockwow5.save`):
`unlocked`, `last`, và `done` (danh sách màn đã hoàn thành — dùng để quyết định có lộ tên tranh chưa).
Âm thanh sinh bằng WebAudio oscillator — **không có file asset nào**.

### Đã kiểm chứng (8 màn đầu, mô phỏng qua đúng đường pointer-event)
- Chơi hết bằng lời giải tham chiếu: 36–41 nước, deck về 0, `solved = true` cả 8 màn.
- Reveal: lấy mẫu pixel toàn bộ 169 ô — **0 ô sai màu**, lệch tối đa 8/255 (do gradient vát).
- Gợi ý: ra nước ở cả 8 màn, 0 ms.
- Stuck-check: bật đúng nước tạo thế chết, tắt ngay khi Undo.
- Khối đặt sẵn: bất động, tông xám cách màu tranh 60–214 (không rò rỉ).

---

## 9. Còn để ngỏ

- **Stuck-check phát hiện muộn ở đầu màn.** Lúc board còn trống, solver hay trả `unknown` nên
  một nước sai từ sớm có thể mãi sau mới bị bắt. Hướng xử lý: MRV (chọn ô ít lựa chọn nhất)
  hoặc unit-propagation trong solver.
- **Ladder mới có 8 tranh**, hết thì lặp lại với bậc khó hơn. Cần thêm tranh trước soft-launch.
- **Chưa có meta**: bộ sưu tập tranh đã mở là chỗ meta tự nhiên nhất — đã có sẵn `G.done`.
- **Board mọi màn đều 13×13.** Có thể đổi cỡ khung theo chương để đổi nhịp.
- **Chưa đóng APK.** Prototype web trước, đóng gói sau.
