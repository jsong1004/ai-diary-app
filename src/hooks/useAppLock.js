// src/hooks/useAppLock.js
// 앱 잠금(PIN) 설정/해제 상태 관리. PIN 해시는 localStorage(기기별),
// "이번 세션에 잠금 해제됨" 여부는 sessionStorage(탭 닫으면 다시 잠김)에 둡니다.
import { useCallback, useState } from "react";
import { hashPin } from "../utils/appLock";

const PIN_KEY = "appLockPinHash";
const UNLOCK_KEY = "appLockUnlocked";

function readPinHash() {
  try {
    return localStorage.getItem(PIN_KEY) || "";
  } catch {
    return "";
  }
}

function readUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

export function useAppLock() {
  const [pinHash, setPinHash] = useState(readPinHash);
  const [unlocked, setUnlocked] = useState(readUnlocked);

  const hasPin = Boolean(pinHash);
  const locked = hasPin && !unlocked;

  const setPin = useCallback(async (pin) => {
    const hash = await hashPin(pin);
    try {
      localStorage.setItem(PIN_KEY, hash);
      sessionStorage.setItem(UNLOCK_KEY, "true");
    } catch {
      // 무시
    }
    setPinHash(hash);
    setUnlocked(true);
  }, []);

  const removePin = useCallback(() => {
    try {
      localStorage.removeItem(PIN_KEY);
    } catch {
      // 무시
    }
    setPinHash("");
  }, []);

  const unlock = useCallback(
    async (pin) => {
      const hash = await hashPin(pin);
      if (hash === pinHash) {
        try {
          sessionStorage.setItem(UNLOCK_KEY, "true");
        } catch {
          // 무시
        }
        setUnlocked(true);
        return true;
      }
      return false;
    },
    [pinHash]
  );

  const lockNow = useCallback(() => {
    try {
      sessionStorage.removeItem(UNLOCK_KEY);
    } catch {
      // 무시
    }
    setUnlocked(false);
  }, []);

  return { hasPin, locked, setPin, removePin, unlock, lockNow };
}
