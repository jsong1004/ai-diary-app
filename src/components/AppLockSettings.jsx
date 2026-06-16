// src/components/AppLockSettings.jsx
// 설정 모달 안에 들어가는 "앱 잠금(PIN)" 섹션입니다.
import { useState } from "react";
import { Lock } from "lucide-react";

function AppLockSettings({ appLock, onToast }) {
  const [editing, setEditing] = useState(false);
  const [step1, setStep1] = useState("");
  const [step2, setStep2] = useState("");
  const [error, setError] = useState("");

  const startEditing = () => {
    setStep1("");
    setStep2("");
    setError("");
    setEditing(true);
  };

  const handleSave = async () => {
    if (step1.length < 4) {
      setError("PIN은 4자리 이상으로 설정해주세요");
      return;
    }
    if (step1 !== step2) {
      setError("두 PIN이 일치하지 않아요");
      return;
    }
    await appLock.setPin(step1);
    setEditing(false);
    onToast?.("앱 잠금이 설정되었어요 🔒");
  };

  const handleRemove = () => {
    appLock.removePin();
    setEditing(false);
    onToast?.("앱 잠금을 해제했어요");
  };

  return (
    <div className="settings-section">
      <div className="settings-label">
        <Lock size={15} /> 앱 잠금 (PIN)
      </div>
      <p className="settings-hint">
        설정하면 앱을 열 때마다 PIN을 입력해야 일기를 볼 수 있어요.
      </p>

      {!editing && (
        <div className="settings-city-row">
          <button type="button" className="settings-city-save" onClick={startEditing}>
            {appLock.hasPin ? "PIN 변경" : "PIN 설정하기"}
          </button>
          {appLock.hasPin && (
            <button type="button" className="settings-test" onClick={handleRemove}>
              잠금 해제
            </button>
          )}
        </div>
      )}

      {editing && (
        <div className="settings-subgroup">
          <input
            type="password"
            inputMode="numeric"
            className="settings-input"
            placeholder="새 PIN (4자리 이상)"
            value={step1}
            onChange={(e) => setStep1(e.target.value)}
          />
          <input
            type="password"
            inputMode="numeric"
            className="settings-input"
            placeholder="PIN 다시 입력"
            value={step2}
            onChange={(e) => setStep2(e.target.value)}
          />
          {error && <p className="settings-hint">{error}</p>}
          <div className="settings-city-row">
            <button type="button" className="settings-city-save" onClick={handleSave}>
              저장
            </button>
            <button type="button" className="settings-test" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppLockSettings;
