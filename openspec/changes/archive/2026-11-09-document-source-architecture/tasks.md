# Tasks

Chỉ thực hiện sau yêu cầu apply riêng. Thiết kế ở [design.md](design.md); `skip_specs: true` vì không thay đổi hành vi ứng dụng. File được phép thay đổi khi apply: `ARCHITECTURE.md` và phần liên kết kiến trúc trong `README.md`.

## 1. Tài liệu cấu trúc source và dữ liệu

- [x] 1.1 Tạo `ARCHITECTURE.md` bằng tiếng Việt theo dàn ý design; ghi trách nhiệm `frontend/src/main.jsx`, pages/components, Axios, Express routes/middleware/controllers, Mongoose và các prefix API. Hoàn tất khi mỗi thành phần có đường dẫn source tồn tại và không vẽ thêm tầng service/repository không có trong code.
- [x] 1.2 Thêm flowchart tổng quan thành phần và bảng quan hệ User/Room/Service, Tenant/Contract, ElectricMeter/WaterMeter, Payment; mô tả cron trong backend process. Xác minh node/edge khớp source và render được sơ đồ; cron ghi đúng 00:05 theo múi giờ tiến trình, không mô tả worker riêng hoặc cơ chế chạy bù.

## 2. Luồng request và vòng đời ảnh

- [x] 2.1 Mô tả đăng nhập bằng email/mật khẩu, bcryptjs, JWT một ngày, `localStorage.authToken`; thêm flowchart request được bảo vệ qua xác minh token và vai trò landlord. Xác minh với `SignIn.jsx`, `userController.js`, `authMiddleware.js` và `roomRoutes.js`; preview sơ đồ thể hiện nhánh 403, không đưa đăng nhập public hoặc static ảnh qua cổng landlord.
- [x] 2.2 Thêm flowchart upload/đọc ảnh từ FormData qua Multer diskStorage, filesystem, tên file trong `Room.image`, URL `/uploads/filename` và Express static. Xác minh với `AddRoomForm.jsx`, `Room.jsx`, upload middleware, room controller/model và `backend/index.js`; preview sơ đồ, phân biệt rõ byte ảnh với tên file và không khẳng định có transaction filesystem–database hoặc tự commit GitHub.

## 3. Môi trường triển khai và điều hướng tài liệu

- [x] 3.1 Viết phần local/online: cổng 3000/5000, `MONGO_URL`, `SECRET_KEY`, `PORT`, URL API/CORS hiện có, topology Firebase Hosting–Render–Atlas và database riêng khi clone. Xác minh tên biến/cổng bằng source và README; chỉ mô tả persistent disk là chưa xác minh, ghi rủi ro filesystem tạm kèm nguồn Render, không thêm URI hoặc credential thật.
- [x] 3.2 Thêm liên kết tương đối `ARCHITECTURE.md` trong mục kiến trúc của README, giữ hướng dẫn cài đặt và chỉnh sửa hiện có của người dùng. Hoàn tất khi liên kết mở đúng file và tài liệu mới liên kết về hướng dẫn chạy trong README, không lặp lại nguyên quy trình cài đặt.

## 4. Kiểm tra tích hợp tài liệu

- [x] 4.1 Kiểm tra toàn bộ liên kết/anchor và các khối Markdown của hai tài liệu, xác nhận ba flowchart render thành công trong renderer Mermaid, không chỉ đếm code fence. Hoàn tất khi có kết quả kiểm tra và preview cho từng sơ đồ; không thêm dependency ứng dụng, permanent test cho text hoặc request ghi dữ liệu production.
- [x] 4.2 Đối chiếu lần cuối nội dung với phạm vi proposal/design: chỉ mô tả hiện trạng, không đưa văn phong trích báo cáo, không khẳng định đã kiểm thử production hoặc đã chuyển ảnh lên cloud storage. Hoàn tất khi `ARCHITECTURE.md` và liên kết README đủ tiêu chí trên, source/runtime/cloud configuration giữ nguyên và kết quả xác minh được nêu trong bàn giao.
