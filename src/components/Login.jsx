// src/components/Login.jsx
// Google 계정으로 로그인하는 화면입니다.
import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import "./Login.css";

// 구글 브랜드 로고(컬러 G) SVG
function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 구글 로그인 실행
  // 로그인 성공 시 Firebase Auth 상태가 바뀌고,
  // App.jsx의 onAuthStateChanged가 이를 감지해 메인 화면으로 이동합니다.
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      // 사용자가 팝업을 닫은 경우는 오류 메시지를 보여주지 않습니다.
      if (err.code !== "auth/popup-closed-by-user") {
        setError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-emoji">📔</div>
        <h1 className="login-title">AI 다이어리</h1>
        <p className="login-subtitle">
          오늘 하루의 감정을 기록하고,
          <br />
          AI와 함께 마음을 들여다보세요.
        </p>

        <button
          type="button"
          className="google-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <GoogleIcon />
          <span>{loading ? "로그인 중..." : "Google 계정으로 로그인"}</span>
        </button>

        {error && <p className="login-error">{error}</p>}

        <p className="login-footer">로그인하면 일기가 안전하게 보관돼요 🌿</p>
      </div>
    </div>
  );
}

export default Login;
