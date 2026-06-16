// src/components/InstallPWA.jsx
// "홈 화면에 설치" 플로팅 버튼입니다.
// - 안드로이드/데스크톱: beforeinstallprompt 이벤트로 설치 가능 시에만 표시
// - iOS Safari: prompt가 없으므로 "공유 → 홈 화면에 추가" 안내 모달 표시
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import "./InstallPWA.css";

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function InstallPWA() {
  const [deferred, setDeferred] = useState(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const ios = isIos();

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // 이미 설치되어 standalone으로 열린 경우 버튼 숨김
  if (isStandalone()) return null;
  // 설치 프롬프트도 없고 iOS도 아니면 표시할 게 없음
  if (!deferred && !ios) return null;

  const handleClick = async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else if (ios) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <button type="button" className="install-pwa-btn" onClick={handleClick}>
        <Download size={16} />
        <span>📲 홈 화면에 설치</span>
      </button>

      {showIosGuide && (
        <div
          className="install-overlay"
          onClick={() => setShowIosGuide(false)}
        >
          <div className="install-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="install-close"
              onClick={() => setShowIosGuide(false)}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
            <div className="install-emoji">📲</div>
            <h3 className="install-title">홈 화면에 추가하기</h3>
            <p className="install-desc">
              Safari 하단의 <Share size={15} className="install-inline-icon" />{" "}
              <b>공유</b> 버튼을 누른 뒤,
              <br />
              <b>“홈 화면에 추가”</b>를 선택하세요.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallPWA;
