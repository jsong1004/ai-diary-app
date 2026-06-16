// src/components/LockScreen.jsx
// 앱 시작 시 PIN을 입력해야 일기장에 들어갈 수 있는 잠금 화면입니다.
import { useState } from "react";
import { Lock } from "lucide-react";
import "./LockScreen.css";

function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!pin) return;
    setChecking(true);
    setError("");
    const ok = await onUnlock(pin);
    setChecking(false);
    if (!ok) {
      setError("PIN이 일치하지 않아요");
      setPin("");
    }
  };

  return (
    <div className="lock-page">
      <form className="lock-card" onSubmit={handleSubmit}>
        <div className="lock-icon">
          <Lock size={28} />
        </div>
        <h1 className="lock-title">잠겨 있어요</h1>
        <p className="lock-subtitle">PIN을 입력해서 일기장을 열어주세요</p>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          className="lock-input"
          placeholder="PIN"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError("");
          }}
        />

        {error && <p className="lock-error">{error}</p>}

        <button type="submit" className="lock-button" disabled={!pin || checking}>
          {checking ? "확인 중..." : "열기"}
        </button>

        <p className="lock-hint">
          PIN이 기억나지 않나요? 이 브라우저의 사이트 데이터를 지우면
          잠금이 초기화돼요 (저장된 일기는 그대로 안전해요).
        </p>
      </form>
    </div>
  );
}

export default LockScreen;
