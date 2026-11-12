import axios from "axios";
import { authSession, SessionError } from "./authSession.js";
export { authApi } from "./authTransport.js";

export const isAuthHandledError = (error) => error?.authHandled === true;

export function createApiClient(session, options = {}) {
  const client = axios.create({ baseURL: "/api", ...options });

  client.interceptors.request.use((config) => {
    const current = session.getSnapshot();
    const previous = config.__sessionRequest;
    if (!current.token || (previous && previous.epoch !== current.epoch)) {
      throw new SessionError("This request belongs to a session that has ended.", "SESSION_STALE");
    }
    config.__sessionRequest = {
      epoch: current.epoch,
      accessVersion: current.accessVersion,
      retried: previous?.retried || false,
    };
    config.headers.set("Authorization", `Bearer ${current.token}`);
    // Do not set Content-Type: Axios/browser must retain the multipart boundary.
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      if (!session.isCurrent(response.config.__sessionRequest.epoch)) {
        throw new SessionError("This response belongs to a session that has ended.", "SESSION_STALE");
      }
      return response;
    },
    async (error) => {
      if (isAuthHandledError(error)) throw error;
      const config = error.config;
      const request = config?.__sessionRequest;
      if (!request) throw error;
      if (!session.isCurrent(request.epoch)) {
        throw new SessionError("This response belongs to a session that has ended.", "SESSION_STALE");
      }
      if (error.response?.status !== 401) throw error;
      if (request.retried || error.response.data?.code !== "TOKEN_EXPIRED") {
        throw await session.invalidate(request.epoch);
      }
      await session.ensureFresh(request);
      if (!session.isCurrent(request.epoch)) {
        throw new SessionError("This request belongs to a session that has ended.", "SESSION_STALE");
      }
      config.__sessionRequest = { ...request, retried: true };
      // Keep method, params and the original transformed body/FormData intact.
      // Return the real replay promise; failed writes never become empty successes.
      return client.request(config);
    }
  );
  return client;
}

const api = createApiClient(authSession);
export default api;
