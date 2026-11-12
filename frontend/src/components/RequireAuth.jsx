import { useSyncExternalStore } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getSessionSnapshot, subscribeSession } from "../utils/authSession.js";

export default function RequireAuth() {
  const session = useSyncExternalStore(subscribeSession, getSessionSnapshot);
  // Do not decode JWTs or trust a stored role. The API remains authoritative.
  if (!session.token) {
    return <Navigate to="/login" replace state={{ sessionNotice: session.notice?.reason }} />;
  }
  return <Outlet />;
}
