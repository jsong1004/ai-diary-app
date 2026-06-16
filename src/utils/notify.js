// src/utils/notify.js
// 매일 일기 알림의 설정/판단 로직 (순수 함수 위주, 테스트 가능).

export const DEFAULT_MESSAGE =
  "오늘 하루 어땠나요? 일기로 마음을 정리해보세요 🌿";

export const MESSAGE_POOL = [
  "오늘 하루 어땠나요? 🌿",
  "잠시 멈춰 오늘을 돌아볼 시간이에요 ☕",
  "오늘의 한 줄을 남겨볼까요? ✨",
  "마음의 사진 한 장, 일기로 찍어두세요 📷",
];

export const DEFAULT_NOTIFY_SETTINGS = {
  enabled: false,
  time: "21:00",
  message: DEFAULT_MESSAGE,
  random: false,
};

// 로컬 날짜 키 (YYYY-M-D)
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// 현재 시각의 HH:MM
export function hhmm(date = new Date()) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// 지금 알림을 보내야 하는지 판단합니다.
// - 활성화 + 설정 시간 일치 + 오늘 아직 안 보냄
export function shouldFire(settings, now = new Date(), lastSentDay = "") {
  if (!settings || !settings.enabled) return false;
  if (hhmm(now) !== settings.time) return false;
  if (lastSentDay === dayKey(now)) return false;
  return true;
}

// 보낼 메시지를 고릅니다. (random이면 풀에서 무작위)
export function pickMessage(settings) {
  if (settings?.random) {
    return MESSAGE_POOL[Math.floor(Math.random() * MESSAGE_POOL.length)];
  }
  return settings?.message || DEFAULT_MESSAGE;
}
