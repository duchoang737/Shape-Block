# Cozy Mosaic — bản dựng chạy được

**Version** 2.0 · 2026-08-27 · Dựng theo đề xuất **Cozy Mosaic** (`luan/proposal-v2/`, artifact
`23d44117`, soạn cho a Luân) — áp lên nhánh Block Wow 5 của mình.
**Nền tảng** HTML5 canvas dọc (mobile-first) → APK Android. Vanilla JS, không build step.

> Bản trước (`_superseded_BlockBloom_GDD.md`) là board chữ nhật + khối màu. Bản này đổi hai
> thứ cốt lõi: **board là silhouette bức tranh** và **màu thuộc ô board, không thuộc block**.

---

## 1. Một câu

Kéo block cổ điển từ khay dưới đáy vào một board hình bông hoa / con mèo / con cá voi.
Block **không xoay được**. Lấp đầy thì mạch vữa khép lại và bức tranh lên màu.
**Dài, chậm, không khó.**

---

## 2. Luật (engine phải đúng từng điểm)

- **R-COVER** — thắng khi mọi ô lấp được được phủ **đúng 1 lần**: không ô trống, không chồng,
  không tràn mép.
- **Block KHÔNG BAO GIỜ xoay hay lật.** Không thêm nút xoay dù "tiện".
- **Ô KHẢM** (`picture.holes` — danh sách ký tự zone): ô đã khảm sẵn vào tranh.
  **Không đặt khối lên được**, hiện **màu tranh đầy đủ** ngay từ đầu, vẽ **lõm**, và
  **KHÔNG khép mạch vữa** lúc kết màn.
- **Màu thuộc Ô BOARD, không thuộc block** — nhưng **lúc chơi khối đã đặt giữ MÀU ĐẤT**
  `#D8C2A4`. Màu tranh chỉ hiện khi board lấp kín, **loang từ tâm ra rìa** (~1,4 s).
- **Một block ĐƯỢC PHÉP nằm vắt qua nhiều vùng màu.** Không khớp màu, chỉ khớp hình.
- **Khối đã đặt KÉO ĐƯỢC sang chỗ khác.** Nhấc lên là rời board ngay nhưng **KHÔNG cộng vào
  khay** — nó đang ở trên tay, `×N` phải đứng yên. Ngón tay giữ **đúng viên gạch đã chạm**
  (không snap về tâm khối).
- **Thả đè lên khối khác thì khối bị đè VỀ KHAY**, không từ chối cú thả. Luật này dùng chung cho
  khối kéo từ khay lẫn khối nhấc lên từ board.
- **Đang giữ khối thì vẽ trước cái giá**: khối sắp bị đẩy ra tô **nguyên hình màu gạch nung**
  `#C4794A`; ô sắp lấp mà đang trống thì **viền xanh** `#7FA663`.
- **Nước đi + mọi khối bị đẩy ra = MỘT bước hoàn tác.**
- **Thả ra ngoài tranh, lên ô khảm, hay nhích trong cùng một ô**: khối về đúng chỗ cũ và
  **KHÔNG ghi hoàn tác**.
- **Chạm** (không kéo) khối đã đặt → trả nó về khay.
- **Không** timer, **không** giới hạn nước đi, **không** trạng thái thua, **không** sao/điểm.
- **Không** wall/obstacle. Code tường vẫn còn, mặc định TẮT — xem §4b.

> Chỗ quan trọng nhất và dễ bỏ sót nhất: **bỏ ràng buộc màu**. Người chơi không phải khớp màu nên
> số lời giải hợp lệ của mỗi board tăng vọt — đó là cơ chế làm "dài mà không khó" thành sự thật
> chứ không phải khẩu hiệu.

---

## 3. Vòng lặp

1. Board mở ra là một **silhouette** — có thể bật **tint mờ 12%** của bức tranh để đọc ra chủ thể.
2. Khay dưới đáy: mỗi ô là **một shape ở một chiều cố định**, kèm **số dư ×N**. Cùng một khối L
   quay 4 hướng là 4 ô khay khác nhau. Nhiều ô thì **cuộn ngang**.
3. Kéo khối lên board. Khối nâng **cao hơn ngón tay 1,35 ô + 16 px** nên không bị che.
   Vị trí hợp lệ **sáng xanh**, không hợp lệ **sáng đỏ**.
4. Đặt xuống → ô để lộ màu tranh nằm dưới.
5. **Chạm** vào khối đã đặt để trả nó về khay. Hoàn tác vô hạn.
6. Lấp kín ô cuối → **mạch vữa khép lại** (khe 7,5% → 0,2%), **một vệt sáng quét qua**,
   tranh liền mạch — rồi mới hiện bảng kết màn với **lớp phủ tối chỉ 10%**
   (bức tranh là phần thưởng, không che nó).

---

## 4. Số đo thật (đo trong browser, 20 màn đầu, **tắt tường**)

| Màn | Bức tranh | Lưới | Ô | Khối | Ô deck | Lời giải | Ước lượng |
|---|---|---|---|---|---|---|---|
| 1 | Hoa tulip | 9×11 | 57 | 21 | 5 | 45 | 1:35 |
| 2 | Ngôi sao | 11×11 | 57 | 22 | 6 | ≥200 | 1:39 |
| 3 | Trái tim | 10×11 | 71 | 24 | 5 | ≥200 | 1:48 |
| 4 | Nấm đỏ | 10×11 | 82 | 28 | 8 | ≥200 | 2:06 |
| 5 | Gà con | 11×11 | 86 | 30 | 7 | ≥200 | 2:15 |
| 6 | Cá voi con | 9×14 | 94 | 28 | 9 | ≥200 | 2:06 |
| 7 | Mèo ngủ trưa | 11×11 | 99 | 29 | 9 | ≥200 | 2:11 |
| 8 | Bươm bướm | 11×13 | 103 | 30 | 10 | ≥200 | 2:15 |
| 9–20 | (lặp tranh, bậc khó tăng) | | 57–103 | 18–30 | 7–12 | 48 – ≥200 | 1:21 – 2:15 |

**Lời giải** = số cách lát khác nhau lấp kín board bằng đúng bộ deck đó, đếm bằng exact-cover,
dừng ở 200. Càng nhiều lời giải thì người chơi càng ít bị kẹt và càng ít phải gỡ ra làm lại.
Đây là chỗ **cố tình đi ngược `carpet-go`** — họ bắt buộc lời giải duy nhất vì hệ thống hint của
họ phụ thuộc vào nó; mình cần điều ngược lại.

**Ước lượng** = số khối × 4,5 giây. Là **mô hình**, chưa phải số đo người thật — cần một buổi
playtest để chốt hằng số. Nhưng độ dài màn **điều chỉnh trực tiếp được bằng số khối**.

### Ba cổng chất lượng — generator tự bắt, không phải soi tay
Sinh xong màn, `generateLevel()` tự kiểm và **đổi seed** nếu trượt:

| Cổng | Ngưỡng | Vì sao |
|---|---|---|
| Số khối | 18–30 | Ngoài khoảng này là màn hoặc cụt hoặc lê thê |
| Ô deck | 5–12 | Ít hơn thì đơn điệu; nhiều hơn thì phải cuộn mới thấy hết |
| Số lời giải | ≥30 không tường · **≥3 có tường** | Ít lời giải ⇒ dễ kẹt. Có tường thì kẹt là cục bộ nên ngưỡng hạ, xem §4b |

Sinh màn chậm nhất đo được: **253 ms** (có tường).

---

## 4b. Tường — công cụ GIẢM độ khó

Doc gốc bỏ vật cản với lý do *"silhouette đã tạo góc kẹt và nút thắt rồi, chồng thêm vách ngăn là
đẩy ngược về phía khó"*. Lý do đó **đúng với tường rải rác**. Bản dựng này dùng tường theo cách
khác hẳn — **chia vùng** — và tác dụng thì ngược lại.

**Cách đặt.** Gom các khối của lời giải thành từng cụm (BFS tham lam trên đồ thị kề giữa các
khối), rồi dựng tường dọc **mọi cạnh giữa hai cụm khác nhau**. Cụm chỉ có đúng một khối bị nhập
vào cụm hàng xóm — vùng bằng đúng một khối là lộ đáp án.

**Điều khiển bằng SỐ VÙNG, không phải cỡ cụm.** Cỡ cụm là con số gián tiếp: đổi một nấc thì số
vùng nhảy khó lường. `wantRegions` đặt thẳng cái mình muốn, `wallCluster` được suy ra từ đó.

**Vì sao dễ hơn.** Cái làm người chơi nản trong exact-cover là **phản hồi đến muộn**: đặt sai ở ô
thứ 5 nhưng tới ô thứ 60 mới lộ. Chia vùng biến một câu đố 100 ô thành 8 câu đố 12 ô — lấp xong
một vùng là biết ngay vùng đó đúng. Người chơi chỉ phải ôm **10–15 ô một lúc**.

| Màn | Ô | Số vùng | Vùng lớn nhất | Cạnh có tường |
|---|---|---|---|---|
| 1 | 57 | 3 | 24 | 11 |
| 3 | 71 | 4 | 29 | 23 |
| 5 | 86 | 3 | 33 | 26 |
| 7 | 99 | 2 | 54 | 19 |
| 12 | 82 | 2 | 41 | 16 |
| 13+ | — | 0 | cả board | 0 |

Bậc: màn 1–5 → 3 vùng · màn 6–12 → 2 vùng · màn 13+ → bỏ tường.

> **Chỉnh một lần rồi:** bậc đầu là 6–9 vùng (vùng 10–26 ô) — chủ tài liệu chơi thử bảo *dễ quá*.
> Đã nới lên 2–4 vùng, vùng lớn nhất tăng từ 10–26 ô lên 24–54 ô.

**Cái phải đánh đổi.** Tường là ràng buộc nên **số lời giải tụt** — từ ≥200 xuống 5–200. Board
có tường chỉ cần **≥5 lời giải** là qua cổng: rủi ro kẹt giờ **cục bộ và lộ ngay**, không còn là
cái bẫy cuối màn.

> ⚠️ **Bẫy đã dính:** ban đầu em cho "hết ngân sách đếm" cũng được nhận luôn, lý do *"cây còn
> rộng = thừa đường đi"*. Sai. Hết ngân sách mà **chưa thấy lời giải nào** nghĩa là KHÔNG BIẾT GÌ
> CẢ. Có một màn lọt qua cổng kiểu đó: về lý thuyết vẫn giải được (lời giải tham chiếu còn nguyên
> và lấp kín board), nhưng solver chạy **3 triệu node vẫn không tìm nổi một cách lát** — tức là
> mò kim đáy bể, người chơi bình thường không có cửa. Giờ chỉ nhận khi **đếm được** đủ số, và có
> van an toàn: nửa sau các lần thử thì chia nhỏ vùng thêm một bậc, nên vòng lặp chắc chắn hội tụ.
> Kiểm lại: cả 15 màn đầu đều có lời giải và solver tìm ra trong 300k node.

**Vẽ.** Gờ vữa nổi trên đường lưới: viền đất sẫm `#9C7B4E` bọc ngoài, mặt sáng `#C9A87C` ở giữa,
dày 13% cạnh ô. Lúc kết màn gờ **tan dần theo `revealT`** — bức tranh phải liền mạch.

**Cài đặt.** Hai mảng `walls.R[i]` / `walls.D[i]` (cạnh phải / cạnh dưới của ô i). Mỗi shape đã
tính sẵn `edgesR` / `edgesD` — danh sách cạnh nội bộ — nên kiểm tra chỉ còn là tra bảng. Toàn bộ
luật đặt khối (biên · ô đã chiếm · tường) gom vào **một hàm `LevelGen.fits()`** dùng chung cho
generator, solver và lúc chơi, nên luật không thể lệch giữa ba nơi.

---

## 4c. Ô khảm — lỗ, nhưng là một phần bức tranh

Đề xuất bỏ hole/wall/obstacle của bộ level cũ và **chỉ giữ lỗ**, dưới dạng **ô khảm**.

Khai báo ở `src/pictures.js`: `holes: ['c']` = mọi ô mang ký tự `c` trong `art` là ô khảm.
Vì thế ô khảm luôn trùng một **zone màu** của bức tranh — nó là chi tiết đã được khảm sẵn:
thân bướm, mắt và mũi mèo, đốm nấm, mắt và vây đuôi cá voi.

Ba tác dụng cùng lúc:
1. **Tạo hình cho board.** Thân bướm là ô khảm nên nó tách đôi hai cánh thành hai vùng rời —
   giống hệt tác dụng chia vùng của tường, nhưng đọc ra là *tranh* chứ không phải *rào*.
2. **Giảm số ô phải lấp** mà không làm bức tranh nhỏ đi.
3. **Neo bảng màu.** Ô khảm là chỗ duy nhất lộ màu tranh lúc chơi, nên người chơi có mẫu
   đối chiếu khi tint mờ đang tắt.

| Màn | Tranh | Ô trong tranh | Ô khảm | Ô phải lấp | Zone khảm |
|---|---|---|---|---|---|
| 1 | Hoa tulip | 57 | 0 | 57 | — |
| 2 | Nấm đỏ | 82 | 17 | 65 | đốm trắng + dải nan |
| 3 | Mèo ngủ trưa | 99 | 5 | 94 | mắt, mũi |
| 4 | Cá voi con | 94 | 8 | 86 | mắt, vây đuôi |
| 5 | Bươm bướm | 103 | 5 | 98 | thân |

`buildMask()` tách ba mảng: `inPic` (ô có vẽ) · `mosaic` (ô khảm) · `occ` (ô KHÔNG đặt khối
được = ngoài tranh **hoặc** ô khảm). Solver chỉ nhìn `occ`, renderer chỉ nhìn `inPic`/`mosaic`.

---

## 5. Sinh màn — lát trước, cắt sau

```
1. Đọc ASCII art  →  mask (ô nào thuộc board, màu đích của ô đó).
2. Solver exact-cover NGẪU NHIÊN lát kín toàn bộ mask.
3. Đếm kết quả lát  →  ĐÓ CHÍNH LÀ deck (gom theo shape, kèm số dư).
   Chính lời giải đó cũng được giữ làm LỜI GIẢI THAM CHIẾU (dùng cho Gợi ý).
4. Dựng tường chia vùng từ chính lời giải đó (§4b).
5. Chạy ba cổng chất lượng ở §4. Trượt thì đổi seed, thử lại (tối đa 12 lần).
```

GD **chỉ vẽ tranh**. Deck được suy ra từ lời giải nên màn **giải được theo cấu tạo**, không cần đi tìm.

**Solver** (`LevelGen.solve`) là DFS exact-cover:
- Luôn lấp **ô trống đầu tiên theo thứ tự quét**. Nhờ chuẩn hoá `cells[0]`, mỗi shape chỉ có
  **đúng một** cách đặt phủ ô đó ⇒ nhánh rất hẹp.
- **Cắt tỉa `coverable`**: sau mỗi lần đặt, soát các ô trống KỀ chỗ vừa đặt — ô nào không khối
  nào còn hàng lọt vừa thì cắt nhánh ngay. Mạnh hơn hẳn kiểu chỉ bắt "ô trống bị cô lập".
- **Ngân sách** node + thời gian; hết ngân sách trả `unknown` — không kết luận gì cả.

**Cỡ khối theo cỡ board.** `sizeBias` là **hệ số NHÂN** với kích thước khối, không phải số cộng
(cộng một hằng số vào mọi key thì nó triệt tiêu khi so sánh — thứ tự không đổi, đã dính bẫy này
một lần). Board nhỏ kéo về khối nhỏ, board to nới cho khối to, để số khối luôn rơi vào 18–30.

**Tính tất định.** Khoá sắp xếp tính trước rồi mới `sort`; gọi `rng()` ngay trong comparator làm
kết quả phụ thuộc thuật toán sort của từng engine. Cùng `index` ⇒ cùng màn, ở mọi máy.

---

## 6. Gợi ý — đặt sẵn một khối đúng

Lộ nguyên đáp án là kết thúc màn chơi. Đặt **một** khối là gỡ đúng chỗ đang tắc.

Hai lớp:
1. **Lời giải tham chiếu** của màn: lọc lấy nước nào giờ vẫn đặt vừa, chọn ngẫu nhiên, **đặt luôn**.
   Tức thì, và luôn có ở đầu màn — lúc DFS exact-cover còn quá nặng.
2. Người chơi đi lệch nhiều thì lớp 1 cạn; khi đó board cũng đã vơi nên DFS chạy nhanh, gọi
   solver thật (400 000 node / 400 ms). Vẫn không ra thì chỉ **lắc nhẹ card + nhắc một câu** —
   không có trạng thái thua.

---

## 7. Art direction

**Lấy từ `carpet-go`:** nền linen ấm, board là card giấy trắng, nút tròn mềm nổi khối, HUD chỉ có
số màn — không điểm, không timer, không thanh tiến độ. Hoàn tác vô hạn miễn phí. Không có trạng
thái thua.

**Chất liệu tách bạch:** `carpet-go` là vải dệt. Mình là **gốm** — mặt mờ, mạch vữa, mỗi ô lệch
sắc độ nhẹ (±2,7%, tất định theo chỉ số ô, **không** dùng `Math.random` nếu không board sẽ nhấp
nháy mỗi khung hình) để tranh xong không phẳng như vector.

| | |
|---|---|
| `#EFE3D0` | nền linen |
| `#FFFDF8` | card giấy |
| `#F0E6D6` | ô trống |
| `#D8C2A4` | block trong khay |
| `#C4794A` | nút chính |
| `#5B4B34` | chữ |

Màu của **từng bức tranh** nằm trong dữ liệu level (`src/pictures.js`), không nằm trong theme —
mỗi bức có bảng màu riêng.

---

## 8. Tint mờ — người chơi tự chọn

Doc gốc (§D2) đề xuất **có, 12%**: đọc được chủ thể ngay và nhắm khối vào đúng vùng, mô típ tô màu
theo số; cú lên màu lúc kết màn vẫn còn nguyên. Cách khác là ô trống trắng trơn, tranh chỉ hiện
khi xong — đậm chất puzzle hơn, nhưng board 100 ô trắng trơn là một bức tường.

**Chốt của a Luân: để người chơi tự bật/tắt.** Nút 👁 trên đầu màn, mặc định BẬT, lưu lại.
Khi tắt, caption cũng giấu tên tranh (`bức tranh ẩn · 57 ô`) và bảng chọn màn ghi `chưa lắp` —
không rò rỉ ở đâu khác.

---

## 9. Kỹ thuật

Vanilla JS + canvas 2D, không build step, không dependency. 5 file `src/*.js` nạp bằng `<script>`
thường (chạy được cả `file://`). `build-playable.mjs` gộp thành một file ~62 KB.

| File | Việc |
|---|---|
| `pictures.js` | 8 bức, ASCII silhouette + bảng màu riêng từng bức |
| `shapes.js` | 17 khối cố định hướng (không màu), 8 bậc độ khó, trần 12 shape/bậc |
| `gen.js` | `mulberry32`, `buildMask`, `coverable`, `solve`, `countSolutions`, `generateLevel` |
| `render.js` | Board canvas (gốm, mạch vữa, tint, vệt sáng) + khay **DOM** + overlay khối đang kéo |
| `game.js` | State, đặt/gỡ/hoàn tác, input, gợi ý, phòng tranh, HUD, âm thanh WebAudio |

**Khay là DOM, không phải canvas** — `touch-action: pan-x` để trình duyệt tự lo cuộn ngang, còn
mình chỉ nhận cử chỉ **đi lên** để nhấc khối. Khối đang kéo vẽ trên một canvas overlay `position:
fixed` phủ toàn màn hình nên nó bay được cả ra ngoài khung board.

Tiến độ lưu `localStorage` (`cozymosaic.save`): `unlocked`, `last`, `showTint`, `done`.
Âm thanh sinh bằng WebAudio oscillator — **không có file asset nào**.

### QA hooks
`CM_QA.go(i)` · `CM_QA.solve()` · `CM_QA.count(cap)` · `CM_QA.state()`

### Đã kiểm chứng (8 màn đầu, mô phỏng qua đúng đường pointer-event)
- 5 màn của slice chạy được; `CM_QA.solve()` lấp kín board và deck về **đúng 0** ở cả 5.
- **Ô khảm**: thả khối phủ ô khảm ở thân bướm (màn 5) bị từ chối — `filled` và `×N` đứng yên.
- **Vuốt ngang trên khay**: không nhấc khối lên (trình duyệt tự cuộn).
- **Chạm khối đã đặt**: về khay (`×N` +1), hoàn tác trả lại **đúng chỗ cũ**.
- **Kéo khối trên board sang ô trống**: `filled` không đổi, `×N` không đổi, hoàn tác +1.
- **Kéo đè lên khối khác**: khối bị đè về khay (`×N` +1), **một** lần hoàn tác trả lại **cả hai**
  về đúng chỗ.
- **Nhích ngón tay trong cùng một ô**: không tính là nước đi (hoàn tác không tăng).
- **Màu**: ô đã đặt lúc chơi đo được đúng `#d8c2a4` (lệch 0 so với màu đất, lệch 142 so với màu
  tranh). Ô khảm đo được `#70583a` so với màu tranh `#6B5233` — lệch 10, đúng biên độ lệch sắc độ.
- **Vòng loang**: t=0 cả tâm lẫn rìa còn màu đất · t=0,25 và 0,5 tâm đã lên màu, rìa chưa ·
  t=0,75 rìa mới lên. Đúng nghĩa loang từ tâm ra.
- **Mạch vữa kết màn**: ô thường khép (alpha 255), ô khảm **không khép** (alpha 0).
- Console không có lỗi.
- Tường: khối vắt qua cạnh có tường bị **từ chối**, cùng chỗ đó mà bỏ tường thì **đặt được**
  (kiểm cả bằng `fits()` lẫn bằng kéo-thả thật). Khối dọc tại đúng ô đó vẫn đặt được — tường chặn
  cạnh chứ không chặn ô. Gờ vẽ ra `#c9a87c` alpha 255 trên cạnh có tường, alpha 0 trên cạnh không
  có; sau khi thắng chỗ đó thành màu tranh `#f0a2b9` — gờ đã tan.
- Kéo khay → board: đặt đúng ô, `×N` giảm. Chạm khối đã đặt: trả về khay, `×N` tăng.
- Gợi ý: **đặt luôn** một khối và sáng ô khay tương ứng. Hoàn tác: gỡ đúng khối.
- Tự lắp hết cả 8 màn: deck về 0, `solved` đúng.
- Reveal: lấy mẫu pixel **toàn bộ ô của cả 8 board — 0 ô sai màu**, lệch tối đa 12/255 (đúng biên
  độ lệch sắc độ cố ý). Mạch vữa: khe trong suốt lúc chơi → lấp kín màu ô lúc kết màn.
- Tint: bật `#F0DED3`, tắt `#F0E6D6` (đúng màu ô trống, không rò rỉ tranh).

---

## 10. Còn để ngỏ

- **Mới 8 bức tranh.** Doc đề xuất 30 màn, curve 60 → 150 giây. Curve đã đúng; cần vẽ thêm 22 bức.
  Mask là text ASCII trong `pictures.js`, generator lo phần chia khối.
- **Hằng số 4,5 giây/khối chưa playtest.** Mọi con số "thời lượng" ở §4 là mô hình.
- **Phòng tranh mới ở mức khung** — có lưới các bức đã lắp, chưa có gì để làm trong đó.
- **FTUE 3 bước** chưa làm.
- **Chưa đóng APK.**
