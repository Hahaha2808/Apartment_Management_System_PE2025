# Changelog

## [Unreleased]

Development package version: `0.1.0` (frontend and backend); no release or tag is created by this change.

### Added

- Rotating, hash-only MongoDB refresh sessions with a fixed 24-hour lifetime, HttpOnly same-site cookies, CSRF protection, and server-side logout.
- Shared authenticated API client with bounded refresh/replay, multi-tab coordination, session guards, and recoverable refresh-error UI.
- JWT/refresh regressions, Vite API/upload proxies, and a same-origin HTTPS Nginx gateway configuration.

### Changed

- New access JWTs expire after five minutes, capped by the refresh session's absolute expiry.
- Authentication failures use HTTP 401 and stable error codes; permission failures retain HTTP 403.
- Business callers use the shared client and relative API/upload URLs. Automatic replay is limited to one request explicitly rejected before side effects with TOKEN_EXPIRED.
- Backend waits for MongoDB and refresh-session indexes before accepting HTTP requests.

### Security

- Removed credential-bearing authentication/request logs from changed paths. Refresh tokens are not returned in JSON or stored in browser localStorage.
- Refresh-token reuse revokes its session, without revoking independent sign-ins. Logout does not invalidate already-issued stateless JWTs before their expiry.
- Existing one-day JWTs retain their signed expiry and do not gain a refresh session automatically; the new lifetime applies to newly issued tokens.

### Verification

- Backend regressions: 29 passed against an isolated MongoDB; frontend regressions: 29 passed. Frontend production build and syntax checks for changed backend files passed.
- Real browser smoke used a local, self-signed HTTPS Nginx gateway: four expired dashboard requests across two distinct tabs shared one refresh; upload, room edit, tenant/contract creation, invoice calculation, and payment collection changed persisted data only once.
- Temporary refresh network/403/502 failures retained forms; explicit recovery did not replay abandoned writes. Refresh expiry/reuse terminated the session once, and business 403 responses retained authentication.
- Test-only rollback rehearsal revoked three active refresh sessions, confirmed rejection of the current browser credential, and cleared the scoped Secure/HttpOnly cookie through server logout without changing room, tenant, contract, or payment counts. Direct navigation and repeated Back after logout sent no business API requests in either tab.
- Frontend lint remains blocked by 27 pre-existing errors and two hook warnings; no suppression was added. The successful build reports a chunk-size warning above 500 kB.
- Production rollout/downgrade was not performed. Backend/frontend/gateway must move together; the real public HTTPS domain, certificate, and deployment still require environment-specific verification before release.
