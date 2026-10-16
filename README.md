# TripGo — Demo quản lý ghế 2D

## Chạy dự án

Yêu cầu Node.js 22.12+ (hoặc phiên bản đáp ứng Vite 8).

```sh
npm install
npm run dev
```

## Gửi email đặt vé qua Resend

Backend gửi email dùng Node.js + Express. Tạo tài khoản Resend, tạo API key và xác minh domain gửi; sau đó điền `.env` ở thư mục gốc:

```dotenv
RESEND_API_KEY=re_...
EMAIL_FROM=TripGo <booking@your-verified-domain.example>
CLIENT_URL=http://localhost:5173
PORT=3000
```

`EMAIL_FROM` phải thuộc domain đã xác minh trên Resend. Không đưa API key vào biến `VITE_*` hoặc mã frontend. `.env` được Git bỏ qua; `.env.example` chỉ là mẫu cấu hình.

Chạy hai terminal ở thư mục dự án:

```sh
# Terminal 1: frontend Vite
npm run dev

# Terminal 2: backend API
npm run server:dev
```

`npm run server` chạy backend không dùng nodemon. Vite chuyển tiếp `/api` đến `http://localhost:3000`; khi triển khai frontend/backend khác origin, đặt `CLIENT_URL` đúng origin frontend và cấu hình `VITE_API_URL` là URL backend (không có dấu `/` cuối). Kiểm tra backend tại `http://localhost:3000/api/health`.

Trang thành công hiện chỉ kích hoạt gửi khi bản ghi trong trình duyệt báo `Đã đặt vé` và `paymentState: "paid"` (không phải trạng thái demo). API giới hạn kích thước payload, kiểm tra dữ liệu, giới hạn yêu cầu theo IP và chống lặp bằng mã booking + email ở tiến trình backend cùng idempotency key của Resend. Trình duyệt không tự gửi lại sau khi tải lại; có thể bấm gửi lại rõ ràng nếu lần trước thất bại. Trạng thái “Resend đã tiếp nhận” chỉ có nghĩa dịch vụ nhận yêu cầu, không chứng minh Gmail đã giao email.

**Giới hạn xác minh:** TripGo hiện lưu booking trong `localStorage`; không có cơ sở dữ liệu booking hay xác minh thanh toán phía máy chủ. Do đó backend không thể xác thực booking/thanh toán từ trình duyệt và email luôn ghi rõ rằng dữ liệu đặt chỗ chưa được backend xác minh, không xác nhận đã thanh toán hay thay thế vé. Idempotency lưu trong bộ nhớ chỉ chống lặp trong thời gian sống của tiến trình; Resend bảo vệ thêm bằng idempotency key theo chính sách dịch vụ. Để bảo đảm chống trùng và chỉ gửi xác nhận đáng tin cậy trong production, cần lưu booking/trạng thái email ở database và xác minh payment bằng webhook/API tin cậy trước khi gửi.


3. Chọn **1A → 1C**: hệ thống chặn vì bỏ trống 1B. Chọn **1A → 1B** thì hợp lệ.
4. Dùng **Tự xếp ghế liền nhau** để xếp nhóm. Ghế trong từng cụm ABC hoặc DEF phải liền nhau. Nhóm đông có thể chọn các cụm liền nhau ở những hàng khác nhau, không bắt buộc sát hàng. Tự xếp ghế vẫn ưu tiên các hàng gần nhau.
5. Xác nhận và thanh toán demo. Đặt lần tiếp theo trên cùng chuyến/ngày sẽ thấy ghế vừa đặt màu xám.
6. Hủy vé trong lịch sử hoặc admin: ghế được giải phóng. Tải lại trang vẫn giữ vé/ghế đã đặt.

## Quản trị

Tài khoản demo: `admin@tripgo.vn` / `admin123`.

Trong dashboard chọn **Quản lý ghế 2D**:

- Chọn chuyến/ngày bay; ngày cố định nếu chuyến đã có lịch cụ thể.
- Chọn chế độ **Khóa / mở khóa ghế**, rồi bấm ghế trống.
- Chọn chế độ **Đặt / bỏ ghế demo** để tạo từng ghế đã đặt giả lập.
- **Tạo mẫu ghế đã đặt** thêm một số ghế giả lập; **Xóa ghế demo** xóa riêng ghế giả lập, giữ vé đã đặt và ghế khóa.
- Bấm ghế có vé để xem mã đặt chỗ. Muốn giải phóng phải hủy vé ở **Vé đã đặt**.
- **Sao lưu & khôi phục** xuất/nhập cả sơ đồ ghế. Bản sao lưu cũ không có sơ đồ ghế vẫn được hỗ trợ.

Danh mục chuyến bay dùng chung nằm ở `src/data/flights.json`. Khi admin mở, danh mục này được ghép với dữ liệu đã lưu để giữ các chỉnh sửa/chuyến bay tự thêm và bổ sung các chuyến mẫu còn thiếu. Danh sách admin phân trang 10 chuyến mỗi lần; dùng **Xem thêm** để xem phần còn lại. Các trang chỉ chia sẻ dữ liệu khi chạy cùng địa chỉ web/trình duyệt vì dữ liệu demo được lưu trong `localStorage`.

Trong **Vé đã đặt**, xem cột **Thanh toán** hoặc lọc theo trạng thái thanh toán. Chỉ bấm **Xác nhận đã nhận tiền** sau khi đối soát đúng số tiền và nội dung chuyển khoản trên tài khoản ngân hàng; thao tác ghi lại người xác nhận và thời gian. Đây là demo lưu trên trình duyệt, không tự kiểm tra giao dịch ngân hàng hay đồng bộ dữ liệu giữa các máy.

## Quy tắc và phạm vi demo

Sơ đồ cố định 20 hàng × 6 ghế = 120 vị trí, lối đi ở giữa C và D. Đây là mô hình minh họa; số chỗ bán trong danh mục chuyến bay là hạn mức riêng. Ghế chưa chọn không được giữ chỗ; chỉ ghi nhận khi thanh toán demo thành công. Hệ thống kiểm tra lại ghế lúc xác nhận chọn ghế và thanh toán, chặn ghế trùng/khóa và chặn tạo một ghế trống ở giữa hai ghế đã chiếm. Lỗ trống vốn có từ trước không chặn những lựa chọn ở hàng khác.

Dữ liệu lưu trong localStorage theo mã chuyến + ngày bay, dùng chung giữa các trang/tài khoản trên cùng trình duyệt và địa chỉ web. Không đồng bộ qua Git hoặc máy khác; chuyển dữ liệu bằng JSON sao lưu. Đây là frontend demo, chưa có cơ chế giữ ghế/giao dịch đồng thời của hệ thống thật. Vé cũ không có ngày được xem là chiếm ghế trên mọi ngày của cùng mã chuyến để tránh đặt trùng.

## Kiểm tra quy tắc

```sh
node tests/seat-rules.mjs
node tests/group-adjacency.mjs
node tests/seat-interaction.mjs
node tests/large-group-interaction.mjs
```

Các tệp giao diện khác được giữ lại. Build được cập nhật để bao gồm cả các trang tìm chuyến, hành khách, ghế, xác nhận và thanh toán.

## Quy tắc nhóm đã điều chỉnh

- Hai hoặc ba khách phải chọn một cụm ghế liền nhau nếu khoang còn cụm đủ chỗ.
- Nhóm đông được chọn nhiều cụm ở các hàng khác nhau; không bắt buộc các hàng sát nhau.
- Ví dụ 9 khách: 1A–1F + 3A–3C hoặc 1A–1C + 2A–2C + 5D–5F đều hợp lệ khi ghế trống.
- Ví dụ 15 khách: 1A–1F + 2A–2F + 5A–5C hợp lệ.
- Giữ số cụm ít nhất có thể để tránh chọn rải thành ghế đơn khi vẫn đủ cụm liền nhau. Không bỏ trống ghế giữa.
- Nếu khoang chỉ còn ghế đơn, cho phép tách nhóm theo chỗ còn trống.
- Tự xếp ghế vẫn ưu tiên các hàng gần nhau; đây là gợi ý, không phải giới hạn cho chọn thủ công.
- Cùng quy tắc được kiểm tra khi bấm ghế, xác nhận và thanh toán demo.

## Giao diện Admin Workspace

Admin giữ màu xanh–trắng, cỡ chữ và bố cục gần bản gốc TripGo. Sidebar trắng, bảng/thẻ được chỉnh nhẹ và menu điện thoại có thể đóng/mở. Các chức năng cũ và quy tắc chọn ghế cho nhóm được giữ lại. Xem `ADMIN-REVIEW.md` để biết kết quả kiểm tra và các chức năng còn thiếu hoặc chưa liên thông.
