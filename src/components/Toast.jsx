// src/components/Toast.jsx
// 화면 하단에 잠깐 떴다 사라지는 토스트 메시지입니다.
// message가 truthy일 때 표시되고, duration 후 onDone을 호출합니다.
import { useEffect } from "react";
import "./Toast.css";

function Toast({ message, duration = 2000, onDone }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => onDone && onDone(), duration);
    return () => clearTimeout(id);
  }, [message, duration, onDone]);

  if (!message) return null;

  return (
    <div className="app-toast" role="status">
      {message}
    </div>
  );
}

export default Toast;
