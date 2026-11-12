# Hướng dẫn làm việc với source DOMIS

## Phạm vi và tài liệu

- Repository này là **DOMIS — Apartment Management System**, ứng dụng quản lý phòng/căn hộ cho thuê, khách thuê, hợp đồng, dịch vụ, điện nước và hóa đơn.
- Đọc `README.md` để cài đặt, chạy và hiểu luồng sử dụng; đọc `ARCHITECTURE.md` để hiểu kiến trúc và quan hệ dữ liệu. Đối chiếu mã triển khai trước khi sửa; không mặc định tài liệu phản ánh mọi thay đổi mới.
- Chỉ sửa phần liên quan đến yêu cầu. Không áp dụng cấu trúc, lệnh chạy hay quy ước của dự án khác vào repository này.
- Giữ nguyên thay đổi đang có của người dùng; không tự reset, xóa dữ liệu, commit hoặc push.

## Công cụ và OpenSpec

- Trước khi làm việc, kiểm tra độc lập `openspec/` và `.codegraph/` tại thư mục gốc source.
- Chỉ khi thiếu `openspec/`, chạy `openspec init --tools oh-my-pi` tại thư mục gốc. ID CLI là `oh-my-pi`, không phải `omp`.
- Chỉ khi thiếu `.codegraph/`, chạy `codegraph init` tại thư mục gốc. Không khởi tạo lại công cụ đã tồn tại; nếu lệnh thất bại, báo lỗi thực tế.
- Khi làm việc theo một OpenSpec change, đọc proposal, design, specs và tasks của change tương ứng trong `openspec/changes/`; không xem artifact đề xuất là hành vi đã được triển khai.
- Không sửa change khác hoặc nội dung trong `openspec/changes/archive/` khi không có yêu cầu.

## Công nghệ và cấu trúc

Source dùng JavaScript/JSX và ES Modules, không phải TypeScript. Frontend và backend có `package.json` và lockfile riêng; package gốc không có script chạy toàn hệ thống.

| Đường dẫn | Vai trò |
| --- | --- |
| `frontend/src/main.jsx` | Khởi tạo React 19 và khai báo route bằng React Router 7. |
| `frontend/src/pages/` | Các màn hình nghiệp vụ. |
| `frontend/src/components/` | Biểu mẫu, bố cục, bảng và biểu đồ dùng chung. |
| `frontend/src/styling/` | Stylesheet SCSS. |
| `frontend/validations/` | Schema validation; các form còn có kiểm tra riêng tại component. |
| `frontend/vite.config.js` | Cấu hình Vite 6 và cổng dev. |
| `backend/index.js` | Khởi tạo Express 5, CORS, API routes, static uploads và cron. |
| `backend/routes/` | Khai báo endpoint và thứ tự middleware. |
| `backend/middleware/` | JWT, kiểm tra vai trò và Multer upload. |
| `backend/controllers/` | Validation, nghiệp vụ và truy vấn dữ liệu. |
| `backend/models/` | Schema, quan hệ và hook Mongoose 8. |
| `backend/db/db.js` | Kết nối MongoDB. |
| `backend/cronJobs/` | Tác vụ hết hạn hợp đồng chạy cùng backend process. |
| `backend/uploads/` | File ảnh; MongoDB chỉ lưu tên file trong luồng ảnh phòng hiện tại. |

Frontend gọi Axios trực tiếp từ pages/components; backend đi theo route → middleware → controller → model. Chưa có API client tập trung hay tầng service/repository riêng. Ưu tiên mẫu có sẵn, không tự thêm tầng kiến trúc cho thay đổi nhỏ.

## Cài đặt và chạy

Khuyến nghị Node.js 22 hoặc 24 LTS, npm và MongoDB local/Atlas riêng. Các lệnh dưới đây chạy từ thư mục gốc repository:

```bash
npm --prefix backend ci
npm --prefix frontend ci
```

Cấu hình `backend/.env` với `MONGO_URL`, `SECRET_KEY` và `PORT` (mặc định `5000`); xem ví dụ an toàn trong `README.md`. Không ghi đè `.env` đã có.

Chạy trong hai terminal riêng:

```bash
# Terminal 1: cwd backend để dotenv và uploads dùng đúng đường dẫn tương đối.
cd backend
npm start
```

```bash
# Terminal 2: từ thư mục gốc repository.
npm --prefix frontend run dev -- --strictPort
```

- Frontend: `http://localhost:3000`; backend: `http://localhost:5000`; API có tiền tố `/api`.
- Frontend hiện viết trực tiếp URL API/ảnh tại `localhost:5000`; CORS backend cho phép `http://localhost:3000`. Khi đổi địa chỉ/cổng, cập nhật đồng bộ các callsite và CORS. Chỉ thêm `VITE_API_BASE_URL` không thay đổi các URL hiện có.
- Log HTTP server đang lắng nghe chưa chứng minh MongoDB đã kết nối; kiểm tra riêng kết nối và khả năng đọc/ghi database.
- Chưa có script seed; với database mới, đăng ký tại `/register`, đăng nhập tại `/login`, sau đó tạo dữ liệu qua giao diện.

## Quy tắc khi sửa mã

- Giữ phong cách và cách đặt tên của file đang sửa; import backend dùng ES Modules với phần mở rộng `.js`. Kiểm tra đúng chữ hoa/thường của tên file và SCSS trên Linux.
- Khi đổi API hoặc schema, kiểm tra đủ route, middleware, controller, model và các frontend callsite liên quan; không chỉ sửa một phía.
- Giữ tương thích tên trường và trạng thái nghiệp vụ nếu yêu cầu không thay đổi chúng. Thay đổi hợp đồng, chỉ số đồng hồ hoặc hóa đơn cần kiểm tra ảnh hưởng đến trạng thái phòng, lượng tiêu thụ và số dư.
- Đăng nhập hiện trả `accessToken`; frontend lưu token dưới khóa `authToken` và thông tin tài khoản dưới khóa `user` trong `localStorage`, gửi `Authorization: Bearer <token>` tới API nghiệp vụ.
- Xác thực và phân quyền phải được thực hiện ở backend; kiểm tra frontend không thay thế kiểm tra role hoặc quyền sở hữu bản ghi. Không mặc định mọi route đã có cùng mức bảo vệ.
- Upload ảnh phòng dùng Multer và trường multipart `image`; ảnh được phục vụ qua `/uploads`. Không đổi tên file ảnh thành đường dẫn database hoặc giả định ảnh được lưu trong MongoDB.
- Không sửa/xóa ảnh upload sẵn có để thử nghiệm. Filesystem uploads và MongoDB là hai nguồn lưu trữ độc lập.
- Cron hết hạn hợp đồng chạy lúc `00:05` mỗi ngày theo múi giờ tiến trình Node.js, không phải worker riêng. Khi sửa vòng đời hợp đồng, kiểm tra cả controller lẫn cron.
- Không đưa credential, mật khẩu, JWT hoặc URI database thật vào mã, log, tài liệu hay bundle frontend. Các log nhạy cảm đang có không phải mẫu để sao chép.
- Không dùng database production để phát triển/kiểm thử; không tự chạy migration hoặc thao tác phá hủy dữ liệu.

## Kiểm tra trước khi bàn giao

Chạy từ thư mục gốc, tùy phạm vi thay đổi:

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
node --check backend/index.js
```

- Với JavaScript backend đã sửa, chạy thêm `node --check <đường-dẫn-file>`; kiểm tra cú pháp không thay thế chạy API.
- Repository chưa có bộ kiểm thử tự động được cấu hình. `npm test` trong backend hiện là placeholder luôn báo lỗi, không phải bằng chứng regression test.
- Thay đổi UI: chạy frontend và kiểm tra trực tiếp luồng bị ảnh hưởng trên trình duyệt. Thay đổi API/nghiệp vụ: chạy backend với database thử nghiệm, thực hiện request và kiểm tra response cùng dữ liệu sau thao tác.
- Kiểm tra các trường hợp lỗi liên quan như thiếu/hết hạn token, sai quyền, dữ liệu không hợp lệ hoặc không tìm thấy bản ghi; không chỉ thử luồng thành công.
- Chỉ sửa tài liệu: đối chiếu đường dẫn, scripts và cấu hình thực tế; không cần khởi chạy ứng dụng nếu không thay đổi hành vi.
- Báo rõ lệnh/kịch bản đã chạy và kết quả. Nếu thiếu dependency, database hoặc cấu hình, nêu đúng giới hạn; không khẳng định đã kiểm tra phần chưa chạy.
- Khi thay đổi cách chạy hoặc kiến trúc, cập nhật phần liên quan trong `README.md` hoặc `ARCHITECTURE.md`, tránh chép lại toàn bộ nội dung vào file này.