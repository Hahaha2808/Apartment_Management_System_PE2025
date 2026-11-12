# Design

## Context

Xem `proposal.md` phần Why và `specs/session-authentication/spec.md` cho hợp đồng hành vi. Thiết kế này cần thiết vì thay đổi xuyên backend/frontend và có rủi ro phân loại sai lỗi quyền truy cập thành hết phiên.

Các quan sát từ source, không phải kết quả chạy ứng dụng:

- `authMiddleware.js` trả `403` cho lỗi JWT, bắt mọi exception và còn log key/payload. Các router nghiệp vụ xác thực trước controller; upload phòng xác thực trước Multer, thu tiền xác thực trước `collectPayment`.
- `userController.js` cấp `{ id, role }` với `expiresIn: "1d"`; `userRoutes.js` chỉ có signin/register. `User.model.js` chưa lưu phiên hoặc refresh token.
- Frontend gọi Axios rải rác, `SignIn.jsx` lưu `authToken`/`user` trong localStorage, `SidePanel.jsx` chỉ xóa cục bộ. Router chạy trong StrictMode và chưa có guard chung; dashboard có nhiều request độc lập.
- `backend/index.js` cho phép CORS `http://localhost:3000` với credentials; frontend vẫn gọi thẳng `localhost:5000`. Tài liệu nêu production Firebase `web.app` và Render `onrender.com`: hai site khác nhau, không đủ điều kiện cookie cùng site đã chọn.
- Backend chưa có test suite hành vi, frontend có dev/build/lint. Lần khảo sát trước không chạy được middleware do resolve `dotenv`; không coi source reading là runtime proof.

Người dùng đã xác nhận: access token 5 phút; phiên refresh hết hạn tuyệt đối sau 1 ngày; cookie HttpOnly với frontend/API cùng site; cập nhật cả bốn artifact, không code. Fetch remote trong lần update này thất bại do DNS GitHub; người dùng cho phép tiếp tục trên bản local. Không sửa thay đổi có sẵn của người dùng.

## Goals / Non-Goals

**Goals:**

- Một contract phân biệt lỗi access token, lỗi quyền truy cập, refresh bị từ chối và lỗi tạm thời.
- Giữ thao tác/biểu mẫu khi access token hết hạn, nhưng không gửi trùng thu tiền/hợp đồng/upload.
- Rotation và kết thúc phiên an toàn với request đồng thời, nhiều tab, signin/logout và response đến muộn.
- Giữ schema nghiệp vụ và payload thành công của API nghiệp vụ; dùng MongoDB hiện có để lưu phiên refresh.

**Non-Goals:**

- Không tạo auth framework/context toàn cục nếu tiện ích phiên nhỏ và router đã đủ; không thêm thư viện runtime.
- Không gia hạn phiên quá 24 giờ, không refresh theo timer, không triển khai cookie cross-site hoặc bỏ kiểm tra hạn JWT. Giữ access token/user trong localStorage; chỉ refresh token nằm trong cookie.
- Không dùng decode JWT phía browser để tự quyết định tính hợp lệ; backend là nguồn xác thực. Không sửa các vấn đề khác như route `/admin` chưa được khai báo.

## Decisions

### 1. Giữ xác thực trước nghiệp vụ và phân loại lỗi chính xác

Giữ `authenticateToken` trước role/controller/Multer. Parse một Bearer credential, scheme không phân biệt hoa/thường; thiếu/scheme khác/Bearer rỗng trả `401 AUTH_REQUIRED`; token hỏng/sai chữ ký/`nbf` tương lai trả `401 TOKEN_INVALID`; `TokenExpiredError` trả `401 TOKEN_EXPIRED`. Message hết hạn access token không khẳng định phiên refresh đã hết hạn. `401` có `WWW-Authenticate: Bearer`; thiếu quyền vẫn `403`.

Chỉ bao `jwt.verify` trong catch JWT, không bao `next()`; thiếu/rỗng khóa cấu hình và lỗi ngoài nhóm JWT trả `500` an toàn, không gán nhầm `401`. `jwt.verify` vẫn kiểm tra chữ ký/hạn, không bật `ignoreExpiration` để refresh. Bỏ log key/JWT/payload/request đăng nhập và không log nguyên Axios error/config/cookie.

**Thay vì:** bắt mọi lỗi thành `403`, hoặc chấp nhận JWT hết hạn để cấp tiếp. Cả hai làm sai ranh giới xác thực và vô hiệu ý nghĩa TTL.

### 2. Access token 5 phút, refresh session 24 giờ tuyệt đối

Signin thành công tạo một phiên mới. Access JWT giữ `id`/`role`, TTL thông thường 300 giây; refresh cấp JWT có `exp = min(now + 300, session.expiresAt)`. Dùng giây nguyên nhất quán; không cấp token nếu hạn phiên đã đến. Access token hết hạn không phải credential để refresh.

Refresh token là opaque token ngẫu nhiên ít nhất 256 bit bằng Node crypto, không phải JWT thứ hai. Đề xuất model `backend/models/RefreshSession.model.js`:

| Trường | Ý nghĩa |
| --- | --- |
| `userId` | Tài khoản sở hữu phiên, không sao chép role làm nguồn quyền |
| `currentTokenHash` | SHA-256 của refresh token hiện hành |
| `tokenHashes` | Các hash đã cấp cho phiên, gồm token đã dùng để phát hiện reuse |
| `createdAt`, `expiresAt` | Hạn tuyệt đối `createdAt + 24h`, không thay đổi khi rotation |
| `revokedAt` | Phiên đã bị thu hồi |

Index hash để tìm phiên, TTL index ở `expiresAt` chỉ dọn dữ liệu; mọi request vẫn kiểm tra thời gian/trạng thái, không chờ MongoDB xóa record. Không lưu token thô. Mỗi lần đăng nhập là phiên độc lập.

Refresh tìm phiên theo hash, kiểm tra hạn/revocation và đọc lại user. User không tồn tại thì thu hồi phiên và từ chối. Token mới chứa role hiện tại; JSON trả user đã bỏ password. Rotation dùng compare-and-swap atomic trên cùng document với điều kiện hash hiện hành, chưa revoke, chưa hết hạn: thay current hash, lưu hash mới trong lịch sử. Hash cũ đã biết bị sử dụng lại thu hồi phiên đó, không toàn bộ phiên tài khoản. Không cần transaction nhiều document.

**Thay vì:** refresh token trong localStorage, lưu token thô hoặc chỉ cấp JWT dài hạn thứ hai không thể thu hồi. Hash + MongoDB hiện có cho phép rotation/revocation mà không thêm runtime dependency.

### 3. Endpoint điều khiển phiên không đi qua interceptor refresh

| Endpoint | Thành công | Lỗi phiên |
| --- | --- | --- |
| `POST /api/users/signin` | JSON `accessToken`, `user`, message hiện có; đặt cookie refresh, tạo phiên mới | Giữ lỗi thông tin tài khoản hiện có |
| `POST /api/users/refresh` | `200` JSON `accessToken`, `user`; thay cookie refresh | `401 { code: "REFRESH_INVALID", message: ... }` nếu cookie/phiên/user không dùng được |
| `POST /api/users/logout` | Thu hồi phiên refresh hiện tại, xóa cookie; `204` kể cả cookie thiếu/phiên đã thu hồi | Lỗi hệ thống là `5xx`, không báo thành công giả |

Các endpoint trên nhận JSON, không yêu cầu access JWT còn hạn. Refresh/logout xác thực bằng cookie, không bằng body refresh token hoặc access token hết hạn. Response chứa credentials có `Cache-Control: no-store`.

Cookie `refreshToken`: `HttpOnly`, production `Secure`, `SameSite=Strict`, host-only (không Domain), `Path=/api/users`, Max-Age theo số giây còn lại đến hạn phiên. Dev HTTP localhost cho phép `Secure=false` có chủ đích; production bắt buộc HTTPS. Clear cookie dùng cùng Path và thuộc tính; không mở rộng Path chỉ để tiện truy cập.

Signin thành công thu hồi phiên của cookie hiện tại nếu có trước khi thay bằng phiên mới; sai mật khẩu không phá phiên cũ. Logout thu hồi cả family tìm được từ cookie, kể cả hash đã rotation, nhưng không thu hồi các phiên đăng nhập khác. Refresh bị từ chối không gửi cookie xóa có thể ghi đè cookie phiên mới bởi response cũ; frontend kết thúc phiên tương ứng và chỉ signin chủ động mới tạo phiên mới.

**Thay vì:** refresh qua interceptor API nghiệp vụ hoặc bắt cookie thiếu bằng cách dùng JWT hết hạn. Tách control client tránh vòng lặp và giữ ranh giới credential rõ ràng.

### 4. Cookie cùng site là điều kiện rollout, có chống CSRF

Chọn cấu hình đơn giản hơn trong lựa chọn cùng site đã được duyệt: một public HTTPS origin, route `/api/*` và `/uploads/*` qua reverse proxy/gateway tới backend, route frontend còn lại tới UI. Domain cụ thể là cấu hình triển khai, không hard-code domain mẫu thành production. Không coi Firebase rewrite trực tiếp tới một URL Render bất kỳ là khả năng đã xác nhận.

Dev: thêm proxy `/api` và `/uploads` trong `frontend/vite.config.js` tới `http://localhost:5000`, gọi URL tương đối qua `localhost:3000`. Cùng một cách gọi `/api` dùng ở production. Các request public signin/register cũng đổi URL tương đối; các URL ảnh liên quan đổi sang `/uploads` để không quay về localhost khi deploy.

Signin/refresh/logout bắt buộc kiểm tra Origin khớp chính xác frontend origin được cấu hình, và header custom `X-CSRF-Protection: 1`; thiếu/sai trả `403`, không thay đổi phiên/cookie. Không chấp nhận Origin `null`, không allowlist bằng `endsWith` lỏng hoặc wildcard. Custom header + kiểm tra Origin + SameSite bảo vệ login CSRF, rotation và logout. CORS khi cần chỉ cho origin cấu hình với credentials/header được phép; không dùng `*`. Reverse proxy phải giữ đúng public Origin/Set-Cookie/HTTPS, không cache response auth.

**Thay vì:** `SameSite=None; Secure` trên hai domain Firebase/Render hiện hữu. Third-party cookie có thể bị chặn; `withCredentials` không khắc phục được. Cấu hình gateway/domain và smoke cookie là điều kiện phát hành, không phải việc có thể bỏ qua sau code.

### 5. API client: refresh theo lỗi xác định và replay tối đa một lần

Đề xuất `src/utils/apiClient.js` cho API nghiệp vụ và một control client không có refresh interceptor cho signin/refresh/logout. Control client gửi cookie (`withCredentials: true`) và CSRF header. API client lấy access token hiện tại lúc gửi, không đặt JSON Content-Type toàn cục để giữ FormData boundary.

Mỗi request ghi metadata `sessionEpoch`, `accessVersion`, `retried`. Luồng response:

1. Không thuộc epoch hiện tại hoặc phiên đã logout: reject lỗi đã xử lý, không refresh/replay dưới tài khoản mới.
2. `403`, network error, timeout, `5xx`: reject tới UI, không refresh/replay, không xóa phiên.
3. `401 AUTH_REQUIRED`/`TOKEN_INVALID` hoặc `401` không có code hết hạn được công nhận: kết thúc phiên hiện tại một lần. Request đã `retried` mà nhận `401` cũng dừng, không vòng lặp.
4. `401 TOKEN_EXPIRED` lần đầu: đợi lượt refresh phối hợp tại Decision 6. Nếu cùng epoch đã có `accessVersion` mới, dùng kết quả đó thay vì gọi refresh lần nữa.
5. Refresh thành công và epoch còn khớp: gắn token mới, giữ nguyên method/path/query/body/FormData và replay đúng request một lần. Return promise của replay; không resolve giả bằng response rỗng.
6. Refresh trả `401 REFRESH_INVALID`: kết thúc phiên một lần, không replay. Lỗi mạng/`5xx` của refresh giữ phiên và biểu mẫu, báo lỗi tạm thời; không tự lặp. Refresh `403` là lỗi origin/CSRF/cấu hình, không giả thành hết phiên.

Replay thao tác ghi chỉ an toàn vì mã `TOKEN_EXPIRED` được tạo trước side effect. Mất response sau khi thao tác đã xử lý không thỏa điều kiện này, tuyệt đối không replay theo HTTP method hoặc đoán lỗi. Không replay thao tác cũ sau signin thủ công lại.

**Thay vì:** refresh mọi `401`, refresh theo timer hoặc retry mọi lỗi Axios. Các cách đó che lỗi xác thực hoặc làm trùng thu tiền/ghi hợp đồng.

### 6. Single-flight, nhiều tab và ranh giới signin/logout

Đề xuất `src/utils/authSession.js` quản lý `authToken`/`user` và metadata phiên chia sẻ: epoch đăng nhập, access version, trạng thái refresh/logout. Có thể tách điều phối vào `src/utils/sessionCoordinator.js` khi cần để giữ client không phụ thuộc router. Không lưu refresh token ở đây.

Dùng một promise single-flight trong tab và Web Locks cùng origin để serialize các thao tác có thể thay cookie: signin, refresh, logout. Đọc lại snapshot/epoch/access version sau khi lấy lock. Những tab đang chờ thấy token mới thì dùng lại, không refresh token cookie đã rotation. Cập nhật localStorage dưới lock, phát sự kiện storage/BroadcastChannel cho tab khác. Web Locks yêu cầu secure context; các browser được hỗ trợ phải có API này, không fallback khóa localStorage có race.

Giữ lock đến khi response/control operation đã hoàn tất và state được commit; không tự timeout nhả lock trong lúc request vẫn có thể đặt cookie. Một epoch phân biệt lần đăng nhập, không đổi chỉ vì refresh; access version đổi khi refresh. Tab chờ không được replay nếu epoch đã đổi sang tài khoản/phiên mới.

Khi refresh thất bại tạm thời, công bố kết quả thất bại theo lượt/version cho các waiter, không cho từng waiter tạo lượt mới nối tiếp. UI hiển thị lỗi và nút Thử lại do người dùng chủ động; thao tác đó mới mở lượt thử mới. Không có retry nền hoặc timer.

Logout lập tức đánh dấu epoch đã kết thúc, xóa local token/user và thông báo các tab; sau đó lấy cùng lock để gọi logout bằng cookie mới nhất, kể cả cookie từ refresh đang chạy. Kết quả refresh đang chờ không được commit vào epoch đã kết thúc. Chỉ báo server logout hoàn tất sau `204`; nếu lỗi mạng/`5xx`, giữ trạng thái logout local chia sẻ và báo chưa xác nhận thu hồi server. Không tự bootstrap refresh từ cookie khi local token không còn; signin chủ động tiếp theo thay thế/revoke cookie cũ dưới lock.

Signin cũng giữ lock tới khi Set-Cookie/state đã ổn định, nhờ đó response refresh cũ không thể thay cookie sau signin mới. Không chỉ bảo vệ JSON response bằng một boolean mà bỏ qua side effect Set-Cookie của browser.

**Thay vì:** chỉ single-flight mỗi tab hoặc so token string. Cookie dùng chung giữa các tab; rotation không phối hợp sẽ tự kích hoạt reuse/revocation. Epoch và lock bảo vệ cả cookie lẫn phiên trong app.

### 7. Route guard, banner và toàn bộ caller dùng một contract

Thêm `RequireAuth.jsx`, bọc toàn bộ route nghiệp vụ hiện có trong `main.jsx` trước khi mount page; `/`, `/login`, `/register` public. Có access token đã hết hạn không khiến guard đăng xuất: API sẽ xác minh và kích hoạt refresh. Không có phiên cục bộ thì về login bằng replace; không tự dùng cookie để phục hồi phiên đã logout. Parse user an toàn, không coi local role là quyền backend.

Bind callback điều hướng sau khi tạo router và trước render, không import ngược `main.jsx` từ client. Interceptor module-level chỉ đăng ký một lần, không trong StrictMode effect. `SignIn` lưu phiên qua utility; `SidePanel` gọi server logout thay vì chỉ xóa storage. Banner kết thúc phiên render từ navigation state, không effect alert; refresh thành công không hiện banner hay đóng form.

Các caller cần migrate: pages `Room`, `Customer`, `Payment`, `Service`, `Electric`, `Water`, `BookingPlanner`; components `AddRoomForm`, `EditRoomForm`, `AddCustomerForm`, `ExpiringContractsTable`, `RoomStatusChart`. `Dashboard` bỏ guard cũ; `SignIn`/`SignUp` dùng public/control API cùng origin. Catch bỏ qua lỗi terminal đã được xử lý, vẫn hiển thị `403`/network/server và lỗi refresh tạm thời có ý nghĩa.

Gỡ header/token plumbing, alert/redirect xác thực cũ và log credentials tại caller đã migrate; không giữ client xác thực cũ song song. Giữ nghiệp vụ, query/payload và tính toán tiền nguyên trạng.

**Thay vì:** mỗi page tự refresh hoặc xóa phiên khi thấy token có exp cũ. Client chung giữ một policy và không làm mất form chỉ vì access token hết hạn.

## Risks / Trade-offs

- [Thiếu gateway/domain cùng site] → Chưa được coi là production-ready; cung cấp route public/API cùng origin và kiểm chứng cookie thực trước rollout. Không bật third-party cookie làm giải pháp.
- [Token bị đánh cắp hoặc reuse] → Refresh opaque, hash-only, rotation atomic và thu hồi đúng family; access token vẫn có cửa sổ tới `exp` tối đa 5 phút cho token mới. Không tuyên bố logout thu hồi ngay JWT stateless.
- [Access token vẫn ở localStorage, còn rủi ro XSS] → Không lưu refresh token ở đó, không log credential; không tuyên bố đã loại toàn bộ XSS.
- [Network fail sau rotation có thể làm client mất token mới] → Không retry tự động; giữ form, cho người dùng thử lại có chủ đích. Nếu credential thực tế không còn dùng được, yêu cầu signin, không bỏ kiểm tra reuse.
- [Nhiều tab/response trễ gây rotation hoặc logout sai] → Web Locks + shared epoch/version + single-flight, serialize cả signin/logout; regression và browser smoke các race này.
- [Replay làm trùng thao tác ghi] → Chỉ sau mã hết hạn từ middleware trước controller/upload, tối đa một lần; kiểm tra số lần thay đổi số dư và số tệp, không chỉ số request.
- [JWT cũ vẫn có TTL 1 ngày] → Đây là TTL của token đã ký, không thể sửa bằng đổi `expiresIn`; policy 5 phút áp dụng token mới. JWT legacy không có refresh session, hết hạn phải signin lại, không tạo phiên bằng JWT hết hạn.
- [Hạ tầng/dependency chưa được chạy ở planning] → Kiểm chứng khi apply bằng database thử nghiệm/API/browser. Không báo hoàn thành rollout từ kết quả validate tài liệu.

## Migration Plan

1. Chuẩn bị model/index refresh session và cấu hình origin/cookie/gateway cùng site; cung cấp dev proxy và hướng dẫn production route `/api`/`/uploads`, HTTPS, Origin và Set-Cookie.
2. Triển khai backend contract `401`/`403`, signin TTL 5 phút, refresh rotation và logout; land regression backend cùng tài liệu API. Giữ legacy JWT hợp lệ đến `exp` cũ, không đổi khóa ký chỉ để triển khai tính năng này.
3. Triển khai client/coordinator/guard và public/control calls, migrate toàn bộ caller và URL ảnh liên quan. Land regression concurrency/replay và tài liệu UX cùng nhóm thay đổi.
4. Chạy regression, build/lint và browser/API smoke thật với cùng-site HTTPS, nhiều tab, hết hạn, thu tiền và upload. Cập nhật README/ARCHITECTURE/changelog trước bàn giao.
5. Phát hành backend/frontend/gateway đồng bộ. Nếu rollback: rollback cả bộ, thu hồi các phiên refresh của đợt rollout và xóa cookie bằng cấu hình phù hợp; không giữ credential dài hạn mồ côi. Không có migration schema nghiệp vụ, không xóa dữ liệu phiên/hóa đơn/ảnh của người dùng.
