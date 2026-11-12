import { useState, useSyncExternalStore } from "react";
import { getSessionSnapshot, subscribeSession, retryRefresh, logout } from "../utils/authSession.js";
import { isAuthHandledError } from "../utils/apiClient.js";
import "../styling/components/sessionNotice.scss";

export default function SessionNotice() {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const failure = session.refreshFailure;
  const logoutStatus = session.notice?.reason === "logout" ? session.notice.status : null;

  const retry = async (operation) => {
    setPending(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      if (!isAuthHandledError(error)) setMessage("The request could not be completed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  if (!failure && !logoutStatus) return null;
  return (
    <aside className="session-notice" role={failure || logoutStatus === "failed" ? "alert" : "status"}>
      {failure && (
        <>
          <p>{failure.message}</p>
          <p>Retry restores your session only; it does not resend the previous action. Check any uncertain payment outcome before submitting again.</p>
          <button type="button" disabled={pending} onClick={() => retry(retryRefresh)}>
            {pending ? "Retrying…" : "Retry session recovery"}
          </button>
        </>
      )}
      {logoutStatus === "pending" && <p>You are logged out locally. Waiting for the server to confirm session revocation…</p>}
      {(logoutStatus === "failed" || logoutStatus === "pending") && (
        <>
          {logoutStatus === "failed" && <p>You are logged out on this device, but server session revocation could not be confirmed. Automatic recovery is disabled.</p>}
          <button type="button" disabled={pending} onClick={() => retry(logout)}>
            {pending ? "Retrying…" : "Retry server logout"}
          </button>
        </>
      )}
      {logoutStatus === "complete" && <p>You are logged out. The server refresh session has been revoked.</p>}
      {message && <p>{message}</p>}
    </aside>
  );
}
