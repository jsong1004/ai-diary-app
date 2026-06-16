// src/hooks/useDebounce.js
// 값이 바뀐 뒤 일정 시간(delay) 동안 추가 변경이 없을 때만 갱신되는 디바운스 훅입니다.
// 검색 입력처럼 "타이핑이 멈춘 뒤에만" 처리하고 싶을 때 사용합니다.
import { useEffect, useState } from "react";

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
