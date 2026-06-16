// src/components/SettingsModal.jsx
// 통합 설정 모달: 도시(날씨) · 표지 이미지 · 매일 알림 · 오늘의 질문 · 내보내기
import { useState } from "react";
import { Bell, Download, MapPin, X } from "lucide-react";
import { useCoverImageSetting } from "../hooks/useCoverImageSetting";
import { useNotificationSettings } from "../hooks/useNotificationSettings";
import { useGuideQuestion } from "../hooks/useGuideQuestion";
import { requestNotificationPermission, sendNotificationNow } from "../utils/notifyActions";
import { pickMessage } from "../utils/notify";
import ExportModal from "./ExportModal";
import AppLockSettings from "./AppLockSettings";
import "./SettingsModal.css";

// 켜고 끄는 토글 스위치
function Switch({ on, onClick, label }) {
  return (
    <button
      type="button"
      className={`settings-switch ${on ? "on" : ""}`}
      onClick={onClick}
      role="switch"
      aria-checked={on}
      aria-label={label}
    >
      <span className="settings-switch-knob" />
    </button>
  );
}

const isIos = () =>
  typeof navigator !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent);

function SettingsModal({ user, city, onSaveCity, onClose, onToast, appLock }) {
  const [input, setInput] = useState(city || "");
  const { enabled: coverEnabled, toggle: toggleCover } = useCoverImageSetting();
  const { settings: notify, update: updateNotify } = useNotificationSettings();
  const { hidden: guideHidden, setHidden: setGuideHidden } = useGuideQuestion();
  const [showExport, setShowExport] = useState(false);
  const [permDenied, setPermDenied] = useState(
    typeof Notification !== "undefined" && Notification.permission === "denied"
  );

  const handleSaveCity = () => {
    onSaveCity(input);
    onToast?.("저장되었어요");
  };

  // 알림 토글: 켤 때 권한 요청
  const handleToggleNotify = async () => {
    if (!notify.enabled) {
      const result = await requestNotificationPermission();
      if (result === "granted") {
        updateNotify({ enabled: true });
        setPermDenied(false);
      } else {
        setPermDenied(result === "denied");
        onToast?.("브라우저 설정에서 알림을 허용해주세요");
      }
    } else {
      updateNotify({ enabled: false });
    }
  };

  const handleTest = async () => {
    const result = await requestNotificationPermission();
    if (result !== "granted") {
      setPermDenied(result === "denied");
      onToast?.("브라우저 설정에서 알림을 허용해주세요");
      return;
    }
    sendNotificationNow(pickMessage(notify));
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="settings-close" onClick={onClose} aria-label="닫기">
          <X size={18} />
        </button>

        <h2 className="settings-title">⚙️ 설정</h2>

        {/* 도시 */}
        <div className="settings-section">
          <label className="settings-label" htmlFor="settings-city">
            <MapPin size={15} /> 내 도시 (날씨)
          </label>
          <div className="settings-city-row">
            <input
              id="settings-city"
              type="text"
              className="settings-input"
              placeholder="예: 서울, 부산, Seattle"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveCity()}
            />
            <button type="button" className="settings-city-save" onClick={handleSaveCity}>
              저장
            </button>
          </div>
          <p className="settings-hint">날씨에 따라 배경색이 바뀌어요.</p>
        </div>

        {/* 표지 이미지 */}
        <div className="settings-section settings-toggle-row">
          <div>
            <div className="settings-label">🎨 표지 이미지 자동 생성</div>
            <p className="settings-hint">
              저장 시 AI가 표지를 그려요. (이미지당 약간의 비용)
            </p>
          </div>
          <Switch on={coverEnabled} onClick={toggleCover} label="표지 이미지" />
        </div>

        {/* 알림 */}
        <div className="settings-section">
          <div className="settings-toggle-row">
            <div className="settings-label">
              <Bell size={15} /> 매일 일기 알림
              {permDenied && <span className="settings-badge">권한 거부됨</span>}
            </div>
            <Switch on={notify.enabled} onClick={handleToggleNotify} label="알림" />
          </div>

          {notify.enabled && (
            <div className="settings-subgroup">
              <div className="settings-field">
                <span>시간</span>
                <input
                  type="time"
                  className="settings-time"
                  value={notify.time}
                  onChange={(e) => updateNotify({ time: e.target.value })}
                />
              </div>
              <input
                type="text"
                className="settings-input"
                value={notify.message}
                onChange={(e) => updateNotify({ message: e.target.value })}
                placeholder="알림 메시지"
              />
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={notify.random}
                  onChange={(e) => updateNotify({ random: e.target.checked })}
                />
                랜덤 메시지 사용
              </label>
              <button type="button" className="settings-test" onClick={handleTest}>
                테스트 알림 보내기
              </button>
              {isIos() && (
                <p className="settings-hint">
                  iOS는 홈 화면에 설치한 뒤에만 알림이 동작해요.
                </p>
              )}
            </div>
          )}
        </div>

        {/* 앱 잠금 */}
        {appLock && <AppLockSettings appLock={appLock} onToast={onToast} />}

        {/* 오늘의 질문 */}
        <div className="settings-section settings-toggle-row">
          <div>
            <div className="settings-label">📝 오늘의 질문 보기</div>
            <p className="settings-hint">일기 작성 화면에 가이드 질문을 표시해요.</p>
          </div>
          <Switch
            on={!guideHidden}
            onClick={() => setGuideHidden(!guideHidden)}
            label="오늘의 질문"
          />
        </div>

        {/* 내보내기 */}
        <button
          type="button"
          className="settings-export"
          onClick={() => setShowExport(true)}
        >
          <Download size={16} /> 내 일기 내보내기
        </button>
      </div>

      {showExport && (
        <ExportModal
          user={user}
          onToast={onToast}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

export default SettingsModal;
