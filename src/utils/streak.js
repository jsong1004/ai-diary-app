// src/utils/streak.js
// 연속 기록(streak) 계산 — 오늘(또는 아직 안 썼다면 어제)부터 거슬러 올라가며
// 끊기지 않고 일기를 쓴 날 수를 셉니다.
import { toMillis } from "./stats";

function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function calculateStreak(diaries, now = Date.now()) {
  const days = new Set();
  for (const d of diaries || []) {
    const ms = toMillis(d.createdAt);
    if (ms != null) days.add(dayKey(ms));
  }

  const cursor = new Date(now);
  if (!days.has(dayKey(cursor.getTime()))) {
    // 오늘 아직 안 썼다면 어제부터 거슬러 올라가 "현재 살아있는" 연속 기록을 셉니다.
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
