# session-authentication Specification

## Purpose

Quy định JWT ngắn hạn, tự phục hồi phiên khi access token hết hạn và kết thúc phiên an toàn trong DOMIS, để thao tác quản lý phòng, hợp đồng và thu tiền không bị gián đoạn hoặc thực hiện trùng.

## Requirements

### Requirement: Missing bearer credentials return authentication required
API được bảo vệ SHALL trả HTTP `401` với JSON có `code: "AUTH_REQUIRED"` và `message` an toàn khi request không cung cấp thông tin Bearer hợp lệ để xác minh; SHALL không chạy nghiệp vụ hoặc ghi tệp.

#### Scenario: No authorization header
- **WHEN** request gọi API được bảo vệ mà không có header Authorization
- **THEN** API trả `401`, `code` là `AUTH_REQUIRED`, và không thực hiện nghiệp vụ

#### Scenario: Empty or unsupported authorization header
- **WHEN** header Authorization có giá trị `Bearer`, `Bearer `, hoặc dùng scheme không phải Bearer
- **THEN** API trả `401` với `code: "AUTH_REQUIRED"`, không tạo hoặc thay đổi dữ liệu/tệp

### Requirement: Expired tokens have a stable error code
API được bảo vệ SHALL trả HTTP `401` với `code: "TOKEN_EXPIRED"` và `message` an toàn khi JWT có chữ ký hợp lệ nhưng đã hết hạn; SHALL không thực hiện nghiệp vụ.

#### Scenario: Expired access token
- **WHEN** request mang JWT đã hết hạn được ký bằng khóa hợp lệ
- **THEN** API trả `401` với `code: "TOKEN_EXPIRED"` và không thực hiện nghiệp vụ

### Requirement: Invalid tokens cannot authorize requests
API được bảo vệ SHALL trả HTTP `401` với `code: "TOKEN_INVALID"` và `message` an toàn cho JWT hỏng định dạng, sai chữ ký hoặc chưa đến thời điểm hiệu lực; SHALL không thực hiện nghiệp vụ hoặc ghi tệp.

#### Scenario: Malformed or forged token
- **WHEN** request mang Bearer token không phải JWT hợp lệ hoặc được ký bằng khóa khác
- **THEN** API trả `401` với `code: "TOKEN_INVALID"` và không thay đổi dữ liệu/tệp

#### Scenario: Token is not active yet
- **WHEN** request mang JWT có chữ ký hợp lệ nhưng thời điểm `nbf` còn ở tương lai
- **THEN** API trả `401` với `code: "TOKEN_INVALID"` và không thực hiện nghiệp vụ

### Requirement: Authorization failure preserves the session
API SHALL giữ HTTP `403` cho người dùng có JWT hợp lệ nhưng không đủ quyền vai trò hoặc quyền sở hữu. Frontend SHALL giữ phiên và hiển thị lỗi quyền truy cập, không chuyển về đăng nhập vì lỗi này.

#### Scenario: Valid token with insufficient role
- **WHEN** người dùng có JWT hợp lệ nhưng không có vai trò cần thiết gọi API nghiệp vụ
- **THEN** API trả `403` và frontend không xóa token/user hoặc chuyển về `/login`

#### Scenario: Valid token cannot access another owner's record
- **WHEN** API trả `403` do người dùng không sở hữu bản ghi được yêu cầu
- **THEN** frontend hiển thị lỗi quyền truy cập và giữ nguyên phiên đăng nhập

### Requirement: Terminal authentication failure ends the current session once
Khi API nghiệp vụ trả `401 AUTH_REQUIRED`/`TOKEN_INVALID`, hoặc refresh bị từ chối vì phiên không hợp lệ, frontend SHALL xóa phiên cục bộ, thay thế URL bằng `/login` và hiển thị một thông báo đăng nhập lại. `TOKEN_EXPIRED` lần đầu SHALL được xử lý bằng refresh trước khi quyết định kết thúc phiên.

#### Scenario: Expired access token with a valid refresh session
- **WHEN** request nghiệp vụ nhận `401 TOKEN_EXPIRED` và phiên refresh còn hợp lệ
- **THEN** frontend thử refresh mà không xóa phiên, chuyển login hoặc làm mất nội dung biểu mẫu

#### Scenario: Invalid token while saving data
- **WHEN** thao tác lưu nhận `401` với `TOKEN_INVALID`
- **THEN** frontend kết thúc phiên và yêu cầu đăng nhập lại, không báo lưu thành công

#### Scenario: Concurrent terminal authentication failures
- **WHEN** nhiều request cùng phiên nhận lỗi xác thực không thể phục hồi
- **THEN** frontend chỉ chuyển về `/login` một lần và hiển thị một thông báo, không phát sinh vòng lặp chuyển trang

#### Scenario: Authentication required returned by protected API
- **WHEN** API được bảo vệ trả `401` với `AUTH_REQUIRED` cho request của phiên hiện tại
- **THEN** frontend áp dụng cùng luồng xóa phiên và đăng nhập lại

### Requirement: Protected pages require a local session
Frontend SHALL đưa người dùng chưa có token về `/login` trước khi mount nội dung trang nghiệp vụ và gửi request có xác thực. Có token cục bộ SHALL không được xem là bằng chứng token hoặc quyền truy cập hợp lệ ở backend.

#### Scenario: Direct navigation without a token
- **WHEN** người dùng không có token truy cập trực tiếp URL của trang nghiệp vụ
- **THEN** frontend thay thế URL bằng `/login` và không hiển thị dữ liệu hoặc gửi request của trang nghiệp vụ

#### Scenario: Back navigation after session termination
- **WHEN** người dùng bấm Back và tới một route nghiệp vụ sau khi phiên đã bị xóa
- **THEN** frontend không mount nội dung nghiệp vụ và đưa người dùng về `/login`

### Requirement: Unrelated failures do not terminate a session
Frontend SHALL không xóa phiên hoặc kích hoạt luồng hết phiên do lỗi của endpoint đăng nhập/đăng ký, `403`, lỗi mạng, hoặc `5xx`; SHALL hiển thị lỗi phù hợp tại ngữ cảnh request. Lỗi server/cấu hình SHALL không bị API gán nhầm thành lỗi JWT của người dùng.

#### Scenario: Incorrect sign-in credentials
- **WHEN** đăng nhập thất bại do thông tin tài khoản không đúng
- **THEN** trang đăng nhập hiển thị lỗi tài khoản và không phát sinh vòng lặp chuyển trang hoặc thông báo hết phiên

#### Scenario: Temporary network or server failure
- **WHEN** request nghiệp vụ thất bại vì mất mạng hoặc API trả `500`
- **THEN** frontend hiển thị lỗi kết nối/server và không xóa phiên

#### Scenario: Server cannot verify because configuration is unavailable
- **WHEN** backend thiếu khóa ký cần thiết để xác minh JWT
- **THEN** request thất bại như lỗi server, không trả `TOKEN_INVALID` hoặc khiến frontend đăng xuất vì lỗi `401`

### Requirement: Authentication recovery replays only explicitly rejected requests
Frontend SHALL chỉ tự gửi lại request gốc tối đa một lần sau `401 TOKEN_EXPIRED` từ middleware và refresh thành công. Middleware SHALL từ chối trước controller/upload. Frontend SHALL không replay do timeout, lỗi mạng, `5xx`, refresh thất bại hoặc đăng nhập thủ công lại.

#### Scenario: Payment collection resumes after refresh
- **WHEN** request thu tiền bị middleware từ chối bằng `401 TOKEN_EXPIRED` và refresh thành công
- **THEN** frontend gửi lại request gốc một lần với token mới và chỉ có một thao tác thu tiền được thực hiện

#### Scenario: Upload resumes after refresh
- **WHEN** request upload ảnh bị middleware từ chối bằng `401 TOKEN_EXPIRED` trước khi ghi tệp và refresh thành công
- **THEN** request được gửi lại một lần với đúng dữ liệu multipart, không tạo tệp từ lần bị từ chối

#### Scenario: Uncertain payment outcome is not replayed
- **WHEN** request thu tiền gặp timeout, lỗi mạng hoặc `500`
- **THEN** frontend không tự refresh hoặc gửi lại request, và không khẳng định thao tác chưa được thực hiện

#### Scenario: Sign in manually after refresh session expiry
- **WHEN** người dùng đăng nhập lại sau khi phiên refresh hết hạn và thao tác ghi trước đó thất bại
- **THEN** hệ thống không tự gửi lại thao tác ghi của phiên cũ

#### Scenario: Retried request is still unauthorized
- **WHEN** request đã replay một lần lại nhận `401`
- **THEN** frontend không refresh/replay tiếp và chỉ kết thúc phiên nếu phản hồi vẫn thuộc phiên hiện tại

### Requirement: Old responses cannot replace the current session
Frontend SHALL không cho response của phiên cũ ghi đè phiên mới hoặc phục hồi phiên đã logout; phản hồi hết hạn dùng access token cũ trong cùng phiên SHALL sử dụng token đã refresh, không rotation thêm ngoài nhu cầu.

#### Scenario: Old unauthorized response arrives after a new sign-in
- **WHEN** request của phiên cũ trả `401` sau khi đăng nhập thành công vào phiên mới
- **THEN** frontend không xóa phiên mới và không gửi lại request cũ dưới tài khoản mới

#### Scenario: Refresh completes while logout is in progress
- **WHEN** người dùng logout trong lúc refresh đang chờ response
- **THEN** token từ refresh không phục hồi phiên cục bộ và logout thu hồi credential mới nhất trước khi báo hoàn tất

### Requirement: Authentication diagnostics protect credentials
Phản hồi lỗi và log trong luồng xác thực/request được thay đổi SHALL không chứa khóa ký, toàn bộ JWT hoặc payload xác thực đã giải mã. Thông báo cho người dùng SHALL không lộ stack trace hay thông tin xác minh nội bộ.

#### Scenario: Invalid token is rejected without leaking credentials
- **WHEN** request có JWT không hợp lệ bị từ chối
- **THEN** response chỉ cung cấp mã lỗi/thông báo an toàn và log không chứa khóa ký, JWT hoặc payload đã giải mã

#### Scenario: Valid token is accepted without credential logging
- **WHEN** request có JWT hợp lệ được xử lý
- **THEN** luồng xác thực và request liên quan không ghi khóa ký, JWT hoặc payload đã giải mã vào log

### Requirement: Valid sessions retain existing behavior
JWT hợp lệ và đủ quyền SHALL tiếp tục truy cập nghiệp vụ như trước. Đăng nhập thành công SHALL giữ response JSON có `accessToken`/`user`; refresh token SHALL chỉ được cấp qua cookie, không có trong JSON hoặc localStorage.

#### Scenario: Valid landlord request
- **WHEN** người dùng có JWT landlord hợp lệ truy cập dữ liệu thuộc quyền của mình
- **THEN** API tiếp tục xử lý nghiệp vụ và frontend không kích hoạt luồng hết phiên

#### Scenario: Successful sign-in
- **WHEN** người dùng đăng nhập bằng tài khoản hợp lệ
- **THEN** API trả `accessToken`/`user`, đặt cookie refresh và frontend dùng phiên mới cho request tiếp theo

### Requirement: Access tokens have a five-minute upper lifetime
Access token mới SHALL hết hạn sau 300 giây từ lúc cấp, hoặc sớm hơn nếu phiên refresh đạt hạn tuyệt đối. Token đã hết hạn SHALL không được gia hạn chỉ bằng chính token đó.

#### Scenario: Token issued after sign-in
- **WHEN** người dùng đăng nhập thành công để bắt đầu phiên mới
- **THEN** access token có `exp - iat = 300` giây

#### Scenario: Token issued near the absolute session limit
- **WHEN** refresh thành công khi phiên chỉ còn ít hơn 5 phút
- **THEN** access token mới không có `exp` vượt quá hạn tuyệt đối của phiên

### Requirement: Refresh sessions have an absolute one-day lifetime
Phiên refresh SHALL hết hạn sau 24 giờ từ lần đăng nhập thành công, không gia hạn bởi hoạt động hoặc rotation. Phiên hết hạn, bị thu hồi, không tồn tại hoặc thuộc tài khoản đã bị xóa SHALL không cấp access token.

#### Scenario: Refresh cannot extend the session limit
- **WHEN** người dùng refresh nhiều lần trong một phiên
- **THEN** mọi lần refresh vẫn giữ cùng hạn tuyệt đối 24 giờ từ đăng nhập

#### Scenario: Refresh session is no longer usable
- **WHEN** gọi refresh với cookie thiếu/không hợp lệ, phiên hết hạn/bị thu hồi hoặc tài khoản đã bị xóa
- **THEN** API trả `401` với `code: "REFRESH_INVALID"`, không cấp token mới và frontend yêu cầu đăng nhập lại một lần

#### Scenario: Refresh uses current account permissions
- **WHEN** refresh thành công sau khi role tài khoản được thay đổi hợp lệ ở backend
- **THEN** access token và thông tin user trả về phản ánh role hiện tại, không sao chép role từ access token hết hạn

### Requirement: Automatic refresh is bounded and shared
Frontend SHALL tự gọi `POST /api/users/refresh` chỉ khi request nghiệp vụ bị từ chối bằng `401 TOKEN_EXPIRED`; endpoint refresh SHALL không kích hoạt chính interceptor này. Các request đồng thời SHALL dùng chung kết quả refresh và phối hợp giữa các tab dùng cùng cookie.

#### Scenario: Several requests expire at once
- **WHEN** nhiều request cùng phiên trong một hoặc nhiều tab nhận `TOKEN_EXPIRED`
- **THEN** chỉ một rotation được thực hiện cho access token hết hạn đó và các request dùng kết quả mới, không gây logout do đua refresh

#### Scenario: Invalid token or insufficient permissions
- **WHEN** request trả `401 TOKEN_INVALID`, `401 AUTH_REQUIRED` hoặc `403`
- **THEN** frontend không gọi refresh; hai lỗi `401` kết thúc phiên hiện tại, còn `403` giữ phiên và báo thiếu quyền

#### Scenario: Refresh temporarily cannot reach the server
- **WHEN** refresh gặp lỗi mạng hoặc `5xx`
- **THEN** frontend giữ dữ liệu phiên/biểu mẫu, báo không thể khôi phục tạm thời, không replay request gốc hoặc tự lặp refresh

### Requirement: Refresh credentials rotate and detect reuse
Mỗi refresh thành công SHALL thay refresh token bằng token mới; backend SHALL chỉ lưu hash và trạng thái phiên. Token đã rotation SHALL không được dùng lại; sử dụng lại token đó SHALL thu hồi toàn bộ phiên refresh liên quan, không ảnh hưởng phiên đăng nhập độc lập.

#### Scenario: Refresh token is rotated
- **WHEN** refresh thành công với token hiện tại
- **THEN** API cấp access token mới và thay cookie refresh, token refresh cũ không thể tiếp tục cấp token

#### Scenario: A consumed refresh token is reused
- **WHEN** refresh nhận một token đã sử dụng của phiên chưa hết hạn
- **THEN** API trả `401 REFRESH_INVALID`, thu hồi phiên đó và không thu hồi phiên đăng nhập độc lập của người dùng

### Requirement: Refresh cookies require same-site deployment and CSRF protection
Refresh token SHALL được lưu trong cookie `HttpOnly`, `Secure` ở production, `SameSite=Strict`, không có Domain và giới hạn Path tới `/api/users`. Các endpoint signin/refresh/logout SHALL chỉ chấp nhận origin frontend được cấu hình và header chống CSRF. Production SHALL cung cấp frontend/API cùng site, không phụ thuộc third-party cookie.

#### Scenario: Production cookie is issued
- **WHEN** đăng nhập hoặc refresh thành công trên HTTPS production
- **THEN** cookie có các thuộc tính bảo mật quy định, thời hạn không vượt hạn phiên, và JavaScript không đọc được refresh token

#### Scenario: Cross-site request attempts refresh or logout
- **WHEN** signin/refresh/logout nhận request có origin không được phép hoặc thiếu header chống CSRF
- **THEN** API trả `403`, không cấp/rotation/thu hồi phiên hoặc thay đổi cookie

#### Scenario: Browser uses the deployed same-site API
- **WHEN** người dùng đăng nhập và refresh trên cấu hình production được hỗ trợ
- **THEN** browser gửi/nhận được cookie không cần bật third-party cookie; deployment Firebase/Render khác site trực tiếp không được coi là cấu hình đạt yêu cầu

### Requirement: Logout revokes the refresh session
Logout SHALL thu hồi phiên refresh hiện tại, xóa cookie cùng thuộc tính Path/Domain và xóa access token/user cục bộ. Logout SHALL không được báo đã hoàn tất thu hồi server nếu request logout thất bại; thao tác lặp SHALL an toàn. Access token đã cấp vẫn có hiệu lực đến `exp`, tối đa 5 phút và không vượt hạn phiên.

#### Scenario: Logout succeeds
- **WHEN** người dùng logout khi phiên refresh còn hợp lệ
- **THEN** API thu hồi phiên, xóa cookie, trả `204` và frontend xóa dữ liệu phiên rồi về trang public

#### Scenario: Logout is repeated
- **WHEN** logout được gọi lại khi cookie không có hoặc phiên đã bị thu hồi
- **THEN** API vẫn trả `204`, xóa cookie nếu có và không thu hồi phiên đăng nhập độc lập

#### Scenario: Logout cannot reach the server
- **WHEN** người dùng logout nhưng request gặp lỗi mạng hoặc `5xx`
- **THEN** frontend xóa phiên cục bộ, chặn khôi phục phiên tự động và thông báo chưa xác nhận thu hồi server, không báo logout server thành công
