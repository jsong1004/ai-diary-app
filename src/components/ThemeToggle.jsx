// src/components/ThemeToggle.jsx
// 라이트/다크 모드를 전환하는 헤더 버튼입니다.
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import "./ThemeToggle.css";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드" : "다크 모드"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default ThemeToggle;
