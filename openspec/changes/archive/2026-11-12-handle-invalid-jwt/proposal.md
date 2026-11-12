# Proposal

## Why

DOMIS hiện dùng JWT hạn 1 ngày và trả `403` cho cả lỗi xác thực lẫn thiếu quyền; frontend chưa có cơ chế phục hồi phiên tập trung. Cần rút access token xuống 5 phút, tự refresh trong phiên tối đa 1 ngày để không gián đoạn nhập hợp đồng/thu tiền, và chỉ yêu cầu đăng nhập lại khi phiên thực sự không còn hợp lệ.

## What Changes

- **BREAKING**: API được bảo vệ trả `401` cho lỗi xác thực với `AUTH_REQUIRED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`; giữ `403` cho thiếu quyền. Access token mới có thời hạn **5 phút**, thay cho 1 ngày.
- Thêm `POST /api/users/refresh` và `POST /api/users/logout`. Đăng nhập cấp access token và refresh token qua cookie `HttpOnly`; refresh token không xuất hiện trong JSON hoặc localStorage. Backend lưu hash, rotation và trạng thái thu hồi trong MongoDB.
- Phiên refresh hết hạn tuyệt đối **24 giờ từ lúc đăng nhập**; rotation không gia hạn mốc này. Access token cấp gần cuối phiên không vượt quá hạn tuyệt đối của phiên.
- Chỉ tự refresh khi API nghiệp vụ trả `401 TOKEN_EXPIRED`; thành công thì gửi lại request gốc tối đa một lần, giữ dữ liệu đang nhập. Nhiều request dùng chung một lượt refresh và phối hợp giữa các tab để không dùng lại refresh token đã rotation.
- Chỉ replay thao tác ghi khi nhận lỗi hết hạn xác định từ middleware trước nghiệp vụ/upload. Không replay sau timeout, mất mạng, `5xx`, refresh bị từ chối hoặc đăng nhập thủ công lại.
- Token hỏng/thiếu hoặc refresh hết hạn/bị thu hồi kết thúc phiên một lần; `403`, lỗi mạng và `5xx` không tự đăng xuất. Logout thu hồi phiên refresh và xóa dữ liệu cục bộ; phản hồi cũ không được ghi đè hoặc phục hồi phiên mới/đã logout.
- Dùng cookie `HttpOnly`, `Secure` ở production, cùng site; cấu hình domain hoặc reverse proxy, credentials và chống CSRF là phần bắt buộc của rollout. Không phụ thuộc third-party cookie giữa Firebase và Render.
- Giữ route guard và loại log mật khẩu/khóa ký/token; không dùng dữ liệu localStorage làm bằng chứng quyền backend. Giữ access token/user trong localStorage như hiện tại; chỉ refresh token chuyển vào cookie.
- Ngoài phạm vi: gia hạn phiên vô hạn, “remember me”, lưu bản nháp sau khi đăng nhập thủ công lại, idempotency cho lỗi mạng/thao tác nhấn lặp, thay đổi role/ownership, route admin và thu hồi ngay access token đã cấp trước hạn của nó.

## Capabilities

### New Capabilities

- `session-authentication`: Hợp đồng lỗi JWT, access token ngắn hạn, phục hồi qua refresh và kết thúc phiên an toàn trên API/frontend.

### Modified Capabilities

Không có; `openspec list --specs` hiện không có capability nào.

## Impact

- Backend: middleware xác thực; controller/router user cho signin/refresh/logout; model phiên refresh mới trong MongoDB. Giữ auth trước role/controller/Multer, không đổi schema nghiệp vụ.
- Frontend: client API, tiện ích phiên/điều phối refresh, router guard, signin/logout và toàn bộ caller nghiệp vụ. Giữ `accessToken`/`user` trong JSON đăng nhập thành công; refresh token chỉ qua cookie.
- Hạ tầng: API trình duyệt phải cùng site với frontend qua domain hoặc reverse proxy; dev proxy/cấu hình credentials và origin được phép phải đồng bộ. Hosting Firebase/Render khác site hiện tại không tự đáp ứng điều kiện này.
- **BREAKING**: consumer phải dùng `401`/code mới và cookie refresh để có auto-refresh; JWT được cấp trước rollout không có refresh session, tiếp tục chịu `exp` cũ đến khi hết hạn rồi phải đăng nhập lại.
- Cập nhật `README.md`, `ARCHITECTURE.md`, changelog và kiểm thử TTL, rotation/revocation, CSRF/cookie, concurrent refresh, replay không trùng thao tác ghi trong giai đoạn apply. Không sửa code, hạ tầng hoặc tài liệu ngoài change trong workflow update này.
