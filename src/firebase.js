// src/firebase.js
// Firebase 초기 설정 파일입니다.
//
// 👉 사용 방법
// 1. Firebase 콘솔(https://console.firebase.google.com) 접속
// 2. 프로젝트 선택 → 좌측 상단 톱니바퀴(⚙️) → "프로젝트 설정"
// 3. "내 앱" 섹션에서 웹 앱(</>)을 선택하면 보이는 firebaseConfig 값을
//    아래 firebaseConfig 객체에 그대로 붙여넣으세요.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⬇️⬇️⬇️ 여기에 본인의 Firebase 설정값을 붙여넣으세요 ⬇️⬇️⬇️
const firebaseConfig = {
  apiKey: "AIzaSyCqI89aCAocXMN10AvLWOHMmxlFuR_e06Q",
  authDomain: "ai-diary-js.firebaseapp.com",
  projectId: "ai-diary-js",
  storageBucket: "ai-diary-js.firebasestorage.app",
  messagingSenderId: "660195078083",
  appId: "1:660195078083:web:c5dccf66a94f7e69d65776",
  measurementId: "G-18NLLQK640"
};
// ⬆️⬆️⬆️ 여기까지 ⬆️⬆️⬆️

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 로그인(Authentication)과 데이터베이스(Firestore) 객체를 내보냅니다.
// 다른 파일에서 import { auth, db } from "./firebase"; 형태로 사용하세요.
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
