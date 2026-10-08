export const AUTH_STATE_EVENT = "courselib:auth-changed";

export function saveAuthTokens({ access, refresh }) {
  localStorage.setItem("accessToken", access);
  localStorage.setItem("refreshToken", refresh);
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}

export function clearAuthTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  window.dispatchEvent(new Event(AUTH_STATE_EVENT));
}
