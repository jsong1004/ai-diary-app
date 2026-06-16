/* eslint-disable react-refresh/only-export-components */
// src/hooks/useTheme.jsx
// 앱 전체가 공유하는 테마(라이트/다크) 컨텍스트입니다.
// (컨텍스트 파일이라 Provider 컴포넌트와 useTheme 훅을 함께 내보냅니다)
// - 첫 방문: localStorage('theme') > 시스템 설정(prefers-color-scheme)
// - 선택은 localStorage 저장 + <html data-theme="..."> 반영
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const KEY = "theme";

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // 접근 불가 시 시스템 설정으로
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

const ThemeContext = createContext({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // 무시
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
