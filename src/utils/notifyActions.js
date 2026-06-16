// src/utils/notifyActions.js
// 브라우저 알림 권한 요청 + 실제 발송 (DOM/Notification API 사용).

// 권한 요청. 결과 문자열('granted'|'denied'|'default')을 돌려줍니다.
export async function requestNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// 알림 발송. Service Worker가 있으면 그걸 통해, 없으면 직접.
// 클릭하면 일기 작성 페이지로 이동합니다.
export async function sendNotificationNow(message) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return false;
  }
  const options = {
    body: message,
    icon: "/pwa-192.png",
    badge: "/pwa-192.png",
    data: { url: "/write" },
  };
  const title = "AI 감성 일기장";

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch {
    // 폴백으로 진행
  }

  try {
    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      window.location.href = "/write";
    };
    return true;
  } catch {
    return false;
  }
}
