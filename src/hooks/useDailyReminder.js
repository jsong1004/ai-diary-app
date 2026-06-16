// src/hooks/useDailyReminder.js
// 앱이 열려 있는 동안 1분마다 알림 시각을 확인하고, 조건이 맞으면 알림을 보냅니다.
// (브라우저 탭이 켜져 있을 때만 동작 — 진짜 푸시는 별도 서버 필요)
import { useEffect } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { loadNotifySettings } from "./useNotificationSettings";
import { shouldFire, pickMessage, dayKey } from "../utils/notify";
import { sendNotificationNow } from "../utils/notifyActions";

const LAST_KEY = "notifyLastSent";

// 오늘 이미 일기를 썼는지 확인 (썼으면 알림 건너뜀)
async function wroteToday(uid) {
  try {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const q = query(
      collection(db, "diaries"),
      where("userId", "==", uid),
      where("createdAt", ">=", Timestamp.fromDate(start))
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch {
    return false; // 조회 실패 시 알림은 보냄
  }
}

export function useDailyReminder(user) {
  useEffect(() => {
    if (!user) return;

    const check = async () => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;

      const settings = loadNotifySettings();
      let lastSent;
      try {
        lastSent = localStorage.getItem(LAST_KEY) || "";
      } catch {
        lastSent = "";
      }

      if (!shouldFire(settings, new Date(), lastSent)) return;
      if (await wroteToday(user.uid)) {
        // 오늘 썼으면 보내지 않되, 중복 체크를 피하려 발송일로 기록
        try {
          localStorage.setItem(LAST_KEY, dayKey());
        } catch {
          /* 무시 */
        }
        return;
      }

      sendNotificationNow(pickMessage(settings));
      try {
        localStorage.setItem(LAST_KEY, dayKey());
      } catch {
        /* 무시 */
      }
    };

    check();
    const id = setInterval(check, 60 * 1000);
    return () => clearInterval(id);
  }, [user]);
}
