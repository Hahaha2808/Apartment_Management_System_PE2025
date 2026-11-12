import axios from "axios";

// Cookie-changing endpoints never pass through the protected API interceptor.
export const authApi = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "X-CSRF-Protection": "1" },
});
