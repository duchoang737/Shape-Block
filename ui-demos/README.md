# 4 hướng UI cho Cozy Mosaic

Mở file này bằng trình duyệt bất kỳ, không cần cài gì:

```
Block Wow 5/ui-demos/index.html
```

Trang đó là **bảng chọn**: mỗi thẻ có một ảnh art direction (do `codeb image` sinh) và một
link mở **demo chạy được**. Chốt một hướng rồi mình bê CSS của hướng đó vào `index.html` của
game.

## Trong mỗi demo có gì

Thanh đen trên cùng **không thuộc game** — nó là điều khiển của demo:

| | |
|---|---|
| 4 tab | Trang chủ · Chơi · Phòng tranh · Cài đặt |
| ▶ Chạy cú kết màn | lấp nốt ô trống → mạch vữa khép lại → vệt sáng quét → bảng thắng |
| ↺ Đặt lại | về trạng thái chơi dở |

Bên trong khung máy thì bấm được thật: chạm **ô trống** để lấp (lấp hết ô cuối là chạy cú kết
màn), chạm **ô khay** để chọn, nút 👁 bật/tắt tranh mờ dẫn đường, các công tắc trong Cài đặt
gạt được. Deep-link để soi nhanh: `demo-1-gom-vai.html#game` · `#gal` · `#set` · `#win`.

Board trong demo dùng **đúng dữ liệu tranh của game** (chép từ `src/pictures.js`), kể cả ô
khảm — không phải lưới bịa cho đẹp ảnh.

## Bốn hướng

| | Hướng | Ý chính |
|---|---|---|
| A | **Gốm & Vải thô** | Bản hiện tại được chỉnh cho ra dáng game: nền vải lanh thật, ô gốm men mờ, nút kem viền nâu có gờ 3px |
| B | **Gỗ & Ngọc bích** | Ngôn ngữ chuẩn của dòng block puzzle: khung gỗ chạm, viền đồng, chữ vàng, nền tối |
| C | **Giấy thủ công** | Giấy cắt dán nhiều lớp, nút sticker. Ô gạch nghiêng lệch lúc chơi rồi **tự nắn thẳng** khi khép mạch |
| D | **Kẹo mềm hiện đại** | Bộ mặt casual phổ biến 2025: nút bo tròn dày có gờ dưới, chữ đậm bo tròn, nền gradient pastel |

Cả bốn đều **tôn luật của game**: khối trong khay giữ **màu đất** (màu thuộc ô board, không
thuộc block), không sao, không điểm, không timer.

Hai thứ demo thêm so với bản hiện tại, hướng nào cũng có:
**màn hình chính** (chưa có) và **thanh tiến độ ô đã lấp** dưới board (chưa có).

## Sửa và dựng lại

Bốn demo **không sửa tay** — chúng do một script sinh ra, để sửa layout một lần là cả bốn đổi
theo:

```bash
node "Block Wow 5/ui-demos/build-demos.mjs"
```

Trong `build-demos.mjs`:

- `BASE_CSS` — bố cục + hành vi, dùng chung. Mọi thứ nhìn thấy được đi qua **biến CSS**.
- `THEMES[]` — bốn khối, mỗi khối là biến + cách vẽ mặt ô / nút / khung của một hướng.
  **Đây là thứ sẽ được bê sang game.**
- `SCREENS` — markup 4 màn hình, dùng chung.
- `APP` — logic demo (vẽ board, khay, phòng tranh, cú kết màn).

## assets/

Do `codeb image` sinh:

| File | Model | Dùng làm gì |
|---|---|---|
| `dir-*.png` | Nano Banana Pro | Ảnh art direction, chỉ hiện ở trang chọn |
| `logo-*.png` | Nano Banana Pro | Concept nhận diện, chỉ hiện ở trang chọn |
| `tex-*.png` | Nano Banana Flash / Pro | Nền thật của demo (vải lanh, gỗ, giấy, pastel) |

Tên game trong demo **vẽ bằng CSS**, không dùng ảnh logo — sắc nét ở mọi mật độ điểm ảnh và
đổi màu theo hướng.

Hai điều đã vấp khi sinh ảnh, ghi lại kẻo lặp:

1. `--provider gemini` hay trả `no image data in response` với prompt kiểu "seamless tileable
   texture". Đổi sang `--provider google` + prompt ngắn, tả **vật thể** chứ đừng tả "swatch"
   thì ra ngay.
2. Ảnh texture trả về là **ảnh chụp có bối cảnh** (mảnh vải đặt trên bàn), không phải hoạ tiết
   lặp. Nên demo phóng to lấy vùng phẳng ở giữa (`--bg-fx-size:300% auto`) chứ không lát.
