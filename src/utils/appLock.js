// src/utils/appLock.js
// 앱 잠금(PIN)용 해시 유틸. 기기에만 저장되므로 평문 대신 SHA-256 해시로 보관합니다.
export async function hashPin(pin) {
  const data = new TextEncoder().encode(String(pin));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
