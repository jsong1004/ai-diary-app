// src/hooks/useUserSettings.js
// 사용자 도시(날씨) 설정을 관리합니다.
// 저장소: localStorage(기기별, 즉시 영구 보존)를 기본으로 하고,
// Firestore 'users/{uid}'는 best-effort로 동기화합니다.
// (Firestore 보안 규칙이 users 컬렉션을 막아도 날씨 기능은 정상 동작)
import { useCallback, useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const cityKey = (uid) => `city:${uid}`;

export function useUserSettings(user) {
  const [city, setCityState] = useState(() => {
    try {
      return localStorage.getItem(cityKey(user.uid)) || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(true);

  // 최초 로드: Firestore에 저장된 값이 있으면 가져와 동기화 (best-effort)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (active && snap.exists() && snap.data().city) {
          const remote = snap.data().city;
          setCityState(remote);
          try {
            localStorage.setItem(cityKey(user.uid), remote);
          } catch {
            /* 무시 */
          }
        }
      } catch {
        // 권한 없음 등 → localStorage 값 그대로 사용
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user.uid]);

  const setCity = useCallback(
    (newCity) => {
      const trimmed = (newCity || "").trim();
      setCityState(trimmed);
      try {
        localStorage.setItem(cityKey(user.uid), trimmed);
      } catch {
        /* 무시 */
      }
      // Firestore 동기화는 best-effort (실패해도 무시)
      setDoc(doc(db, "users", user.uid), { city: trimmed }, { merge: true }).catch(
        () => {}
      );
    },
    [user.uid]
  );

  return { city, setCity, loading };
}
