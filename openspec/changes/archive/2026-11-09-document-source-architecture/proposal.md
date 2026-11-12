# Proposal

## Why

README giới thiệu sản phẩm và cách chạy, nhưng chưa có tài liệu riêng giúp người đọc lần theo cấu trúc source, xác thực, dữ liệu và luồng tải ảnh. Cần một architecture note bằng tiếng Việt, có flowchart, đặc biệt phân biệt database Atlas với filesystem lưu ảnh và môi trường clone với bản online.

## What Changes

- Thêm `ARCHITECTURE.md` ở root, mô tả kiến trúc hiện có dựa trên source, không phải kiến trúc mục tiêu hoặc tóm tắt báo cáo đồ án.
- Giải thích trách nhiệm frontend, Express routes/middleware/controllers, Mongoose models, MongoDB, filesystem `uploads/` và cron.
- Dùng Mermaid flowchart cho cấu trúc thành phần, vòng đời request có JWT và luồng upload/đọc ảnh; diễn giải cron và quan hệ dữ liệu bằng phần riêng, tránh lặp cùng một sơ đồ.
- Nêu topology Firebase Hosting / Render / MongoDB Atlas theo thông tin triển khai đã được chủ dự án xác nhận; tách rõ khỏi cấu hình local `localhost:3000` / `localhost:5000`.
- Nêu database do `MONGO_URL` lựa chọn, clone không tự đồng bộ production, file ảnh không nằm trong MongoDB hay tự được commit lên GitHub; tình trạng persistent disk của bản deploy chưa được xác minh.
- Thêm một liên kết từ mục kiến trúc trong `README.md` sang tài liệu mới, giữ hướng dẫn cài đặt ở README làm nguồn chính.

## Capabilities

### New Capabilities

Không có thay đổi hành vi hệ thống. Đây là thay đổi tài liệu thuần túy; `.openspec.yaml` khai báo `skip_specs: true`, không tạo delta spec giả cho tính năng đã tồn tại.

### Modified Capabilities

Không có. Không thay đổi yêu cầu API, dữ liệu, xác thực hoặc lưu trữ.

## Impact

- Khi apply: chỉ tạo `ARCHITECTURE.md` và bổ sung liên kết trong `README.md`.
- Không sửa `frontend/`, `backend/`, schema database, dependency, biến môi trường thực tế hoặc cấu hình dịch vụ cloud.
- Nguồn đối chiếu: `frontend/src/main.jsx`, các page/component gọi Axios, `backend/index.js`, `backend/routes/`, `backend/middleware/`, `backend/controllers/`, `backend/models/`, `backend/db/db.js`, `backend/cronJobs/contractExpirationJob.js`.
- Không cần migration, seed, upload thử lên production hoặc truy cập tài khoản/cloud secrets. Kiểm tra bằng liên kết source, Markdown và khả năng render Mermaid; không coi tài liệu là chứng nhận production đã được kiểm thử.
