export const authMaxAgeMs = 24 * 60 * 60 * 1000;

const authStartedAtKey = "camviewer.authStartedAt";
const authKeys = [
  "camviewer.user",
  "camviewer.accessToken",
  "camviewer.csrfToken"
];

export function markAuthStarted(now = Date.now()) {
  localStorage.setItem(authStartedAtKey, String(now));
}

export function getStoredAuthExpiresAt(): number | null {
  const startedAt = Number(localStorage.getItem(authStartedAtKey));
  return Number.isFinite(startedAt) && startedAt > 0 ? startedAt + authMaxAgeMs : null;
}

export function isStoredAuthFresh(now = Date.now()) {
  const expiresAt = getStoredAuthExpiresAt();
  return expiresAt !== null && now < expiresAt;
}

export function clearStoredAuthSession() {
  localStorage.removeItem(authStartedAtKey);
  authKeys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
