// src/hooks/useCoverImageSetting.js
// "AI 표지 이미지 자동 생성" 설정(localStorage). 비용이 들기 때문에 기본값은 꺼짐(off).
import { useCallback, useEffect, useState } from "react";

const KEY = "coverImageEnabled";

export function useCoverImageSetting() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(enabled));
    } catch {
      // 무시
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { enabled, setEnabled, toggle };
}
