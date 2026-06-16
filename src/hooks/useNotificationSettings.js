// src/hooks/useNotificationSettings.js
// 알림 설정(localStorage 'notifySettings')을 관리하는 훅입니다.
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_NOTIFY_SETTINGS } from "../utils/notify";

const KEY = "notifySettings";

export function loadNotifySettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    return { ...DEFAULT_NOTIFY_SETTINGS, ...(raw || {}) };
  } catch {
    return { ...DEFAULT_NOTIFY_SETTINGS };
  }
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState(loadNotifySettings);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // 무시
    }
  }, [settings]);

  const update = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  return { settings, update };
}
