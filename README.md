# Cozy Mosaic  (thư mục `Block Wow 5`)

Kéo block cổ điển từ khay dưới đáy vào một board **hình bông hoa / con mèo / con cá voi**.
Block **không xoay được**. Lấp đầy thì mạch vữa khép lại và **bức tranh lên màu**.
Dài, chậm, không khó.

Dựng theo đề xuất **Cozy Mosaic** (`luan/proposal-v2/`, artifact `23d44117`) — không phải bản
port, mà là áp luật + art direction của doc lên nhánh này.

## Chơi thử

Nhanh nhất — mở file này bằng trình duyệt bất kỳ, không cần cài gì:

```
CozyMosaic_playable.html
```

Bản dev (in cả IP LAN để test trên điện thoại cùng Wi-Fi):

```bash
node "Block Wow 5/serve.js"
```

Build lại file playable sau khi sửa code:

```bash
node "Block Wow 5/build-playable.mjs"
```

## Luật

1. Block **không bao giờ** xoay hay lật — mỗi hướng là một món hàng riêng trên khay, kèm `×N`.
2. **Ô KHẢM** (`picture.holes`) là ô đã khảm sẵn vào tranh: không đặt khối lên được, hiện
   **màu tranh đầy đủ** ngay từ đầu, vẽ lõm, và **không khép mạch vữa** lúc kết màn.
3. **Màu thuộc ô board, không thuộc block** — nhưng lúc chơi khối đã đặt vẫn giữ **màu đất**
   `#D8C2A4`. Màu tranh chỉ hiện khi board lấp kín, **loang từ tâm ra rìa** (~1,4 s).
4. Một block **được phép** nằm vắt qua nhiều vùng màu. Không phải khớp màu, chỉ khớp hình.
5. Khối đã đặt **kéo được** sang chỗ khác. Nhấc lên là rời board ngay nhưng **không cộng vào
   khay** — nó đang ở trên tay. Ngón tay giữ **đúng viên gạch đã chạm**, không snap về tâm khối.
6. **Thả đè lên khối khác thì khối bị đè về khay**, không từ chối cú thả. Đang giữ khối thì
   khối sắp bị đẩy ra được tô **nguyên hình màu gạch nung**, ô trống sắp lấp thì **viền xanh**.
7. Nước đi + mọi khối bị đẩy ra = **một** bước hoàn tác. Thả ra ngoài tranh, lên ô khảm, hay
   nhích trong cùng một ô thì khối về đúng chỗ cũ và **không ghi hoàn tác**.
8. **Chạm** (không kéo) khối đã đặt → trả nó về khay.
9. Không timer, không giới hạn nước đi, không trạng thái thua, không sao.

## Số đo (đo thật trong browser, 5 màn của slice)

**20 màn, to dần đều** — đo thật bằng `LevelGen.generateLevel()`:

| Màn | Tranh | Khổ | Ô | Bậc khối | Khối | Ô deck |
|---|---|---|---|---|---|---|
| 1 | Mèo con | 6×7 | 24 | 0 | 3 | 2 |
| 2 | Gấu bông | 6×7 | 28 | 0 | 3 | 2 |
| 3 | Thỏ hồng | 7×7 | 26 | 0 | 3 | 2 |
| 4 | Cún con | 6×7 | 34 | 0 | 3 | 3 |
| 5 | Cá voi con | 6×8 | 48 | 0 | 5 | 4 |
| 6 | Trái tim | 8×9 | 55 | 2 | 19 | 7 |
| 7 | Chậu cây | 9×9 | 57 | 2 | 21 | 8 |
| 8 | Cốc ca cao | 8×9 | 59 | 2 | 21 | 8 |
| 9 | Con cú | 9×9 | 66 | 3 | 23 | 8 |
| 10 | Ngôi nhà nhỏ | 10×10 | 70 | 3 | 24 | 10 |
| 11 | Con cáo | 10×10 | 77 | 3 | 27 | 10 |
| 12 | Bánh kem | 9×10 | 78 | 4 | 26 | 10 |
| 13 | Con nhím | 10×10 | 83 | 4 | 25 | 12 |
| 14 | Thuyền buồm | 11×10 | 87 | 5 | 26 | 10 |
| 15 | Con ong | 12×10 | 88 | 5 | 28 | 10 |
| 16 | Chim cánh cụt | 11×10 | 90 | 5 | 30 | 10 |
| 17 | Con voi | 12×12 | 99 | 6 | 29 | 11 |
| 18 | Cây thông | 14×11 | 102 | 6 | 30 | 11 |
| 19 | Gấu trúc | 11×11 | 102 | 7 | 30 | 10 |
| 20 | Bươm bướm | 12×12 | 105 | 7 | 30 | 9 |

**Màn 21 trở đi**: game không có trần — `generateLevel(index)` nhận mọi chỉ số và
`pics[index % 20]` quay vòng lại 20 bức này, bậc khối theo `Math.floor(index/3)`.

Bậc khối tự lên được là nhờ board to dần: `gen.js` chặn trần bậc theo cỡ board
(dưới 70 ô ⇒ trần bậc 2), nên hồi chỉ có 6 bức toàn dưới 70 ô thì bậc **kẹt ở 2
vĩnh viễn** — màn 100 y hệt màn 7.

Năm màn của thang dạy **tự khai số khối** (`pieces:[3,3]` / `[5,5]` trong `src/pictures.js`),
generator đổi seed cho tới khi đạt đúng con số đó. Muốn ít khối như vậy trên board 42 ô thì mỗi
khối phải 12–16 ô — bộ khối khổng lồ nằm cuối `src/shapes.js`, **không** có trong `TIERS` nên
màn từ 6 trở đi không đụng tới.

Màn 6 trở đi vẫn theo ba cổng chất lượng chung (số khối 18–30 · ô deck 5–12 · số lời giải),
xem `generateLevel()` trong `src/gen.js`.

## Cấu trúc

```
Block Wow 5/
  index.html                    shell + CSS + HUD (DOM)
  CozyMosaic_playable.html      bản gộp 1 file — mở là chơi        ← BẢN HIỆN TẠI
  BlockBloom_playable.html      bản dựng cũ (board chữ nhật, block màu) — chỉ để đối chiếu
  build-playable.mjs            gộp src/*.js vào index.html
  serve.js                      static server, in cả IP LAN
  src/
    pictures.js   20 bức tranh, ASCII silhouette + bảng màu riêng từng bức
    shapes.js     17 khối cố định hướng (không màu), 8 bậc độ khó
    gen.js        solver exact-cover + đếm lời giải + sinh màn có cổng chất lượng
    render.js     board canvas (gốm/mạch vữa) + khay DOM + overlay khối đang kéo
    fx.js         chuyển động lúc đặt xuống / trả về khay (chỉ thời gian, không vẽ)
    game.js       state, đặt/gỡ/hoàn tác, input, gợi ý, phòng tranh, âm thanh
  docs/
    CozyMosaic_GDD.md                  ← tài liệu hiện tại
    _superseded_BlockBloom_GDD.md      bản trước, giữ để đối chiếu
```

## Chuyển động khi đặt và khi gỡ

Ba cú, khai ở `src/fx.js` — đó cũng là chỗ duy nhất chỉnh thời lượng.

| | | |
|---|---|---|
| **Đáp xuống** | 260 ms | Khối vừa nằm xuống thì **nén dọc 15% / phình ngang 11%** rồi bật lại, dao động tắt dần, kèm bụi vữa ở chân khối. Chạy cho **mọi** đường đưa khối lên board: kéo thả, hoàn tác, trả về chỗ cũ. |
| **Bay từ khay lên** | 280 ms | **Chỉ** đường *chạm chip rồi chạm board* — chỉ ở đó khối mới thật sự đi từ khay lên. Kéo thả thì không: lúc thả, khối đã nằm sẵn dưới ngón tay đúng ô đó rồi. Tới nơi là nối thẳng vào cú đáp xuống. |
| **Bay về khay** | 320 ms | Khối rời board: chạm để gỡ (luật 8), bị đè đẩy ra (luật 6), kéo ra ngoài tranh, hoàn tác nước lấy từ khay. Kéo ra ngoài thì bay **từ đầu ngón tay**, ba đường kia bay từ chỗ cũ trên board. |

Hai chuyện đáng nhớ nếu sau này sửa:

1. **Nước đi ghi xong ngay lúc chạm, không đợi hiệu ứng.** Khối đang bay từ khay lên đã
   nằm trong `G.placements` rồi; `FX.xformOf()` trả `hidden` nên `render.js` vẽ ô đó thành
   **ô trống** và vẽ khối trên `#dragLayer`. Bấm nhanh cỡ nào cũng không mất nước đi.
2. **Khối đang bay vẽ trên `#dragLayer`, không phải canvas board** — canvas board dừng đúng
   ở mép tranh, bay tới khay là bị cắt cụt. Toạ độ ô khay hỏi `R.chipPoint()` lúc bắt đầu
   bay; vị trí trên board thì render tự suy từ `idxs` mỗi khung hình, nên xoay ngang điện
   thoại giữa chừng cũng không lệch.

Màu cũng đổi theo đường bay: `earth` kéo màu tranh về màu đất `#D8C2A4` của khay, nên khối rời
board thì nhạt dần thành đúng món hàng trên khay, bay lên thì lên màu.

### Kiểu đáp xuống — đã duyệt kiểu A

`PRESETS` trong `src/fx.js` giữ bốn kiểu; **`DEFAULT = 'A'`** là kiểu đã duyệt. Hai cú bay
giống nhau ở cả bốn, chỉ khác nhau lúc khối đáp:

| | | |
|---|---|---|
| **A · Nén & bật** | 260 ms | Nén dọc 15% / phình ngang 11% rồi bật lại, dao động tắt dần, kèm bụi vữa. **← đang dùng** |
| B · Ấn vào vữa | 170 ms | Hiện to hơn 6% rồi lún về đúng cỡ ô. Không quá đà, không bụi. |
| C · Nảy gốm | 320 ms | Như A nhưng nén 23%, dao động lâu hơn, bụi nhiều hơn. |
| D · Board rung theo | 150 ms | Khối đáp gọn rồi các khối xung quanh lún theo thành sóng lan ra. |

Ba kiểu kia giữ lại vì bản duyệt `demo/anim-presets.html` cần — đó là **chính game này**, thêm
một thanh đổi kiểu ngay lúc đang chơi, do `build-playable.mjs` sinh ra cùng lượt build. Thanh
đó chỉ có trong file demo; `CozyMosaic_playable.html` không dính gì tới nó.

Đổi kiểu = sửa một dòng `DEFAULT`. Muốn bỏ hẳn ba kiểu thừa thì xoá chúng khỏi `PRESETS`, và
bỏ luôn đoạn sinh demo ở cuối `build-playable.mjs`.

## Thêm tranh mới

Sửa `src/pictures.js`. Ba luật:

1. Mọi hàng dài **bằng nhau**.
2. Ký tự nào có màu trong `palette` thì là ô chơi được; `'.'` là ô khoét.
   **Không để vùng rời 1 ô** (khối nhỏ nhất là domino). Gai 1 ô dính vào thân thì không sao.
3. 56–105 ô ⇒ 18–30 khối ⇒ 1–2 phút.
4. **Đừng để một màu ăn quá 45% số ô.** Bảng màu 4–5 màu cùng một cung (bức toàn
   nâu, bức toàn xám) trông đơn sắc hẳn khi lên màu. Nhắm 8–10 màu chạm 3–4 cung.
   Chi tiết **một ô** giữ được nét sắc nhờ luật "ô đơn độc không pha" trong
   `blendPicture()` — nên chấm, mắt, hạt, quả cứ vẽ một ô thoải mái.

**Đổi màu KHÔNG đụng gì tới cách lát.** Luật §4 nói màu thuộc ô board, khối được
nằm vắt qua nhiều vùng màu — nên đổi ký tự giữa các ô *đã thuộc tranh* thì số
khối, số lời giải, cỡ deck đều y nguyên. Chỉ đổi ô thành `'.'` (hoặc ngược lại)
mới sinh lại màn. Trừ khi bức tranh tự khai `pieces` / `deck` /
   `solutions` / `shapes` — năm màn dạy chơi đều khai, nên chúng không theo công thức này.

Generator lát kín trước rồi mới cắt ra thành deck, nên màn **giải được theo cấu tạo**.
Mask sai thì `generateLevel()` ném lỗi ngay chứ không treo.

### Muốn màn chỉ có N khối thì vẽ silhouette thành N hình chữ nhật

Bộ khối khổng lồ toàn là chữ nhật, nên **silhouette phải là hợp của đúng N hình chữ nhật**
thì mới lát nổi N khối. Đây mới là chỗ quyết định, không phải số ô.

Đừng vì thế mà vẽ tranh thành một khối chữ nhật đặc — đó là lý do màn 1–3 bản trước nhìn
ra **dải màu kẻ ngang** chứ không ra cái bánh/hộp quà/ly trà sữa. Hai thứ tách rời nhau:

* **Silhouette** (ô nào chơi được) quyết định lát được mấy khối → ghép từ N chữ nhật, cho
  nó có bậc, có phần nhô lên: nến trên bánh, nơ trên hộp, ống hút trên ly.
* **Màu** không ảnh hưởng gì tới chuyện lát (luật §4: khối được nằm vắt qua nhiều vùng màu)
  → cứ vẽ chi tiết thoải mái: ruy băng hình dấu cộng, cốm rắc, trân châu xen kẽ.

Hai con số đã đo được, đừng đi lại từ đầu:

* **Đầu con vật phải rộng ≥5 ô.** Đầu 4 ô ngang thì hai con mắt buộc phải nằm ở hai cột
  ngoài cùng — dính sát viền, nhìn như lồi mắt, mà cũng hết chỗ cho mũi. Đó là lý do có
  khối `r20h` (4×5) trong `src/shapes.js`.
* **Chi tiết một ô (mắt, mũi, hạt) vẽ được**, nhưng chỉ từ khi `blendPicture()` biết bỏ
  qua ô đơn độc. Trước đó dải pha màu rộng 0,20 ô ăn vào từ cả bốn phía, ô lẻ teo còn 60%
  và nhoè hết viền — hạt trân châu thành lỗ thủng, hạt cốm thành vệt bẩn. Ranh giới giữa
  hai *mảng* màu vẫn pha mềm như cũ.

## Tường — bật từ màn 6

Tường là rào **nằm trên cạnh** giữa hai ô, không chiếm ô nào. Luật: *một khối không
được nằm vắt qua cạnh có tường*.

Tường **không rải ngẫu nhiên**. `makeWalls()` gom các khối của lời giải tham chiếu
thành từng cụm rồi dựng rào dọc ranh giới giữa các cụm. Board vỡ ra thành mấy ổ kín,
mỗi ổ là một câu đố con nhìn một cái là ôm hết. Hai hệ quả:

1. **Màn giải được theo cấu tạo** — tường lấy từ chính lời giải nên lời giải đó
   không bao giờ vắt qua rào.
2. **Đặt sai ở ổ nào thì lộ ra ngay quanh ổ đó**, không phải lắp xong cả trăm ô mới biết.

### Cỡ vùng mới là thứ quyết định, không phải số vùng

Khay dùng **CHUNG** cho cả board. Lấp kín một vùng bằng bộ khối sai vẫn lọt qua —
hỏng chỉ lộ ra ở vùng kế bên, lúc không còn khối nào vừa. Đo trên 15 màn, tỉ lệ
"cách lấp kín một vùng làm CHẾT phần board còn lại":

| cỡ vùng | số vùng đo | tỉ lệ chết |
|---|---|---|
| ≤12 ô | 15 | 43% |
| 13–20 ô | 14 | 62% |
| 21–30 ô | 10 | 85% |
| >30 ô | 13 | 86% |

Cái đó **không chữa được** khi khay còn dùng chung. Nhưng **giá phải trả khi hỏng
đúng bằng cỡ vùng**: gỡ 3–5 khối trong một ổ 15 ô là chuyện vặt, gỡ 15 khối trong
một vùng 50 ô mới là cực hình. Nên luật là **vùng quanh 5–20 ô; board to ra thì
tăng SỐ vùng, không tăng CỠ vùng**.

(Cũng chính vì thế tường mới bật lại được sau lần bỏ trước: hồi đó chia 2 vùng to,
ranh giới thành **một nét liền cắt ngang tranh** và người chơi đọc ra cái hàng rào.
Chục nét ngắn đan nhau thì đọc ra mạch chì tranh kính. Cùng cơ chế, khác cỡ.)

**Chữa tận gốc — chưa làm.** `buildRegions()` trong `gen.js` đã dựng sẵn khay
riêng cho từng vùng (`level.regions`: ô, khối, số lượng, khung bao). Chơi zoom từng
ổ, khay chỉ bày khối của ổ đó, thì lấp đúng ổ **là** đúng toàn cục — hết đường lọt.
`level.regions` sinh ra rồi nhưng `game.js` chưa đọc tới.

### Số vùng thật của 20 màn

| Màn | Tranh | Vùng | Cỡ từng vùng (ô) | Rào | Đường lát |
|---|---|---|---|---|---|
| 1 | Mèo con | — | không tường | 0 | 1+ |
| 2 | Gấu bông | — | không tường | 0 | 1+ |
| 3 | Thỏ hồng | — | không tường | 0 | 1+ |
| 4 | Cún con | — | không tường | 0 | 1+ |
| 5 | Cá voi con | — | không tường | 0 | 8+ |
| 6 | Trái tim | 8 | 5 / 6 / 7 / 7 / 7 / 7 / 7 / 9 | 34 | 40+ |
| 7 | Chậu cây | 6 | 6 / 6 / 9 / 10 / 13 / 13 | 27 | 40+ |
| 8 | Cốc ca cao | 5 | 7 / 9 / 11 / 16 / 16 | 27 | 40+ |
| 9 | Con cú | 8 | 6 / 6 / 8 / 8 / 8 / 9 / 9 / 12 | 40 | 40+ |
| 10 | Ngôi nhà nhỏ | 7 | 8 / 8 / 8 / 9 / 11 / 11 / 15 | 41 | 40+ |
| 11 | Con cáo | 8 | 8 / 8 / 9 / 9 / 10 / 10 / 10 / 13 | 39 | 40+ |
| 12 | Bánh kem | 6 | 7 / 10 / 13 / 14 / 17 / 17 | 37 | 40+ |
| 13 | Con nhím | 7 | 8 / 8 / 11 / 11 / 12 / 15 / 18 | 45 | 40+ |
| 14 | Thuyền buồm | 6 | 11 / 11 / 11 / 14 / 20 / 20 | 33 | 40+ |
| 15 | Con ong | 8 | 9 / 9 / 10 / 10 / 12 / 12 / 13 / 13 | 44 | 40+ |
| 16 | Chim cánh cụt | 11 | 4 / 6 / 6 / 7 / 7 / 8 / 9 / 10 / 10 / 11 / 12 | 62 | 40+ |
| 17 | Con voi | 6 | 11 / 14 / 14 / 15 / 22 / 23 | 39 | 40+ |
| 18 | Cây thông | — | không tường | 0 | 30+ |
| 19 | Gấu trúc | 7 | 10 / 12 / 14 / 14 / 14 / 15 / 23 | 49 | 40+ |
| 20 | Bươm bướm | 4 | 4 / 24 / 27 / 50 | 19 | 40+ |

Khai ở `picture.regions`. `regions:1` là tắt tường hoàn toàn. Màn 1–5 không tường
(`WALLS_FROM = 5` trong `gen.js`) — thang dạy học kéo thả, ô khảm, đè khối trước đã.
**Màn 21 trở đi** (tranh quay vòng) tự suy số vùng theo cỡ board: `round(số ô / 13)`,
board dưới 50 ô thì thôi không chia.

**Cổng chất lượng siết hơn khi có tường**: board có rào phải đếm được **≥40** đường
lát (board trống chỉ cần 30) — tường ràng buộc thêm nên ngưỡng phải cao hơn, không
phải thấp hơn.

**Van an toàn: tường không bao giờ được làm màn khó hơn.** Cạn cả 12 seed lẫn đường
cứu `_relaxed` mà board có tường vẫn dưới 40 đường lát thì `generateLevel()` **bỏ
tường**, sinh lại y như board trống. Cây thông (màn 18) là bức duy nhất chạm van:
chia kiểu gì cũng chỉ ra 1–24 đường lát.

Thứ tự ba đường cứu **có ý nghĩa** và đừng đảo: 12 seed → `_relaxed` (giữ tường, hạ
cỡ khối) → van bỏ tường. `_relaxed` vớt được bốn màn (trái tim, bánh kem, con nhím,
chim cánh cụt); đặt van lên trước là cướp cò, bốn màn đó mất tường oan.

## Ghi chú dev

- **Thanh trên còn đúng ba phần**: nút *chơi lại* — số LEVEL — nút *cài đặt*. Nút xem tranh mờ
  và phòng tranh đã dọn vào bảng **Cài đặt**; hai nút ‹ › nhảy màn thì bỏ hẳn, đổi màn bằng
  **phòng tranh** (nó kiêm luôn bảng chọn màn: màn đã xong hiện bức tranh, màn đã mở mà chưa
  xong để trống).
- Bảng Cài đặt có 4 dòng: *xem tranh mờ dẫn đường* (tint 12% trên ô trống, mặc định bật) ·
  *phòng tranh* · *âm thanh* · *rung*. Cả ba công tắc đều nhớ qua `localStorage`.
- Nút là **ảnh PNG 128px** ở `assets/btn/`, do `codeb image` sinh — mỗi nút là một đĩa gốm nằm
  giữa nền lanh phẳng, khung CSS bo tròn 50% cắt bốn góc nên không phải khớp màu nền. Bản gốc
  1024px giữ ở `ui-demos/assets/btn/`, thu nhỏ bằng `node ui-demos/shrink-buttons.mjs`.
  `build-playable.mjs` tự nhúng base64 khi gộp file.
- Ô khảm khai báo ở `src/pictures.js`, field `holes` — danh sách **ký tự zone** trong `art`.
  Ví dụ bướm dùng `holes:['c']` nên nguyên thân bướm thành ô khảm và tách đôi hai cánh.
- Muốn khối đặt sẵn quay lại: đổi `FIXED_RATIO` trong `src/gen.js` từ `0` thành `0.20`.
- QA trong console: `CM_QA.go(i)` · `CM_QA.solve()` · `CM_QA.count(200)` · `CM_QA.state()`
- Xoá tiến độ: `localStorage.removeItem('cozymosaic.save')`
- Phím tắt desktop: `Ctrl+Z` hoàn tác · `R` làm lại · `H` gợi ý
