# 📔 AI 감성 일기장 (AI Emotional Diary)

> 코딩을 몰라도, 오늘의 감정을 AI와 함께 기록하고 들여다보는 따뜻한 일기장.

**🔗 라이브:** https://vibecoding-vote.web.app

매일의 일기를 적으면 AI가 감정을 분석해 따뜻한 코멘트를 건네고, 감정의 흐름을 통계·캘린더로 보여줍니다. 마음이 복잡한 날엔 AI 상담가와 대화할 수도 있어요.

---

## 💡 무엇을, 왜 만들었나요?

**무엇:** 일기 작성 → AI 감성 분석(감정·점수·코멘트·추천 활동) → 저장 → 통계/캘린더로 회고하는 PWA 웹앱. 더해서 일별 AI 상담 챗봇, 날씨 배경, 다크 모드, 검색/필터, 내보내기까지 갖춘 "진짜 앱 같은" 일기 서비스입니다.

**왜:**
- 일기는 "기억하면 쓰는 것"이 아니라 **습관**이 되어야 오래 갑니다. 빈 화면 앞에서 막히지 않도록 **가이드 질문**과 **매일 알림**으로 작은 물꼬를 터줍니다.
- 하루하루의 감정은 점이지만, **한 달치를 모으면 선이 보입니다.** AI가 일기에서 감정을 뽑아내 통계·캘린더로 시각화해 자기 이해를 돕습니다.
- "바이브 코딩(Vibe Coding)" 워크샵 프로젝트로 출발 — **자연어로 원하는 것을 설명하면 AI가 구현**하는 방식으로, 비개발자도 자신의 앱을 만들어 세상에 배포하는 경험을 목표로 했습니다.

---

## ✨ 주요 기능

### 핵심
- **🔐 Google 로그인** — Firebase Authentication (본인 데이터만 접근)
- **📝 AI 감성 분석** — 일기를 분석해 `감정 / 점수(1~5) / 코멘트 / 추천 활동`을 JSON으로 반환, 카드 형태로 렌더링
- **🎤 음성 입력** — 마이크로 말하면 OpenRouter 멀티모달(omni) 모델이 한국어로 받아쓰기해 본문에 추가 (무료 오디오 모델)
- **📎 사진·동영상 첨부** — 카메라로 사진 촬영 또는 짧은(≤5초) 동영상 녹화, 파일 선택도 지원. 일기 카드/상세에 미디어 표시
- **💾 일기 저장 & 목록** — Firestore 실시간 동기화, 감정별 그라데이션 표지 카드
- **💗 AI 감성 상담 챗봇** — **일별 세션**으로 저장되어 지난 상담을 날짜별로 다시 볼 수 있음 (과거는 읽기 전용), 답변 마크다운 렌더링, 대화 **복사·삭제** 지원

### 회고 & 탐색
- **📊 감정 통계 대시보드** — 이번 달 요약, 감정 분포 막대그래프, 최근 14일 점수 추이(SVG 직접 구현), 감정 TOP 3
- **📅 캘린더 뷰** — 월간 달력에 그날의 감정 이모지 표시, 빈 날 클릭 시 그 날짜로 작성
- **🔍 검색 & 감정 필터** — 본문/코멘트 키워드 검색(300ms 디바운싱), 8가지 감정 칩 필터, 검색어 형광펜 하이라이트
- **📤 내보내기** — 기간·형식(마크다운/PDF) 선택, 표지·AI코멘트·챗봇 대화 포함 옵션

### 경험 & 편의
- **🌤 날씨 배경 + 위젯** — 도시 날씨에 따라 배경 그라데이션이 바뀌고 상단에 glassmorphism 위젯 (Open-Meteo, 키 불필요)
- **🌙 다크 모드** — 시스템 설정 감지 + 수동 토글, 전 컴포넌트 일관 적용
- **📲 PWA** — 홈 화면 설치(안드로이드/데스크톱 자동, iOS 안내), 오프라인 셸 캐싱
- **🔔 매일 알림** — 지정 시간 알림(랜덤 메시지 풀), 오늘 이미 작성 시 건너뜀 (Notification API)
- **📝 오늘의 질문** — 날짜 기반 가이드 질문 12종, "이 질문으로 시작하기"로 본문 자동 삽입
- **🎨 AI 표지 이미지**(선택) — 일기 분위기에 맞는 표지 그림 생성 (기본 OFF, OpenRouter 크레딧 필요)

### 디자인 & 접근성
- 따뜻한 둥근 감성 폰트(Nunito + Nanum Gothic), 파스텔 Soft UI
- 키보드 포커스 링, `prefers-reduced-motion` 지원, 44px 터치 타깃, WCAG 대비 고려

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | React 19, Vite 8, React Router 7 |
| **백엔드 / 인프라** | Firebase — Authentication(Google), Cloud Firestore, Hosting |
| **AI** | OpenRouter (LLM 감성 분석 · 챗봇 · 음성 전사(omni) · 표지 이미지 생성) |
| **외부 API** | Open-Meteo (날씨, 키 불필요) |
| **브라우저 API** | getUserMedia / MediaRecorder (카메라·마이크), Web Audio (WAV 변환), Notification, Service Worker |
| **UI / 라이브러리** | lucide-react(아이콘), html2pdf.js(PDF 내보내기), vite-plugin-pwa(PWA) |
| **품질** | ESLint, 자체 테스트 러너(esbuild + node) |

> 모든 무거운 의존성(html2pdf)은 **동적 import로 코드 스플리팅**되어 필요할 때만 로드됩니다.

---

## 🚀 시작하기

### 1. 사전 준비
- Node.js 18+
- Firebase 프로젝트 (Authentication·Firestore 활성화)
- OpenRouter API 키 (https://openrouter.ai)

### 2. 설치
```bash
npm install
```

### 3. 환경 변수 (`.env`)
프로젝트 루트에 `.env` 파일을 만듭니다:
```bash
VITE_OPENROUTER_API_KEY=sk-or-...           # OpenRouter API 키
VITE_OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free   # 감성 분석/챗봇 모델
VITE_OPENROUTER_AUDIO_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free  # (선택) 음성 입력 전사 모델
VITE_OPENROUTER_IMAGE_MODEL=google/gemini-2.5-flash-image  # (선택) 표지 이미지 모델
```

> Firebase 설정값은 `src/firebase.js`의 `firebaseConfig`에 입력합니다.

### 4. 개발 서버
```bash
npm run dev        # http://localhost:5173
```

### 5. 테스트 / 빌드
```bash
npm test           # 순수 로직 단위 테스트 (오프라인)
npm run lint       # ESLint
npm run build      # 프로덕션 빌드 (dist/) + PWA 서비스워커 생성
```

### 6. 배포 (Firebase Hosting)
```bash
npm run build && firebase deploy --only hosting
```

---

## 📁 프로젝트 구조

```
src/
├── App.jsx                 # 라우팅 + 레이아웃(헤더/날씨배경/설치버튼/알림)
├── main.jsx                # 진입점 (ThemeProvider, Router)
├── firebase.js             # Firebase 초기화 (auth, db)
├── index.css / theme.css   # 전역 스타일 + 라이트/다크 토큰
├── components/
│   ├── Login.jsx           # Google 로그인
│   ├── DiaryEditor.jsx     # 일기 작성 + AI 분석 + 음성 입력 + 미디어 첨부 + 가이드 질문
│   ├── MediaCapture.jsx    # 카메라 사진/동영상 촬영 + 파일 선택 모달
│   ├── DiaryList.jsx       # 목록 + 검색/필터 + 삭제 + 상세 모달
│   ├── AiResult.jsx        # 감정 뱃지·점수·코멘트·표지 카드 (공용)
│   ├── ChatBot.jsx         # AI 상담가 (일별 세션, 마크다운, 복사/삭제)
│   ├── Stats.jsx           # 감정 통계 대시보드 (4카드 + SVG 차트)
│   ├── Calendar.jsx        # 월간 캘린더 뷰
│   ├── SettingsModal.jsx   # 도시·표지·알림·질문·내보내기 설정
│   ├── ExportModal.jsx     # 마크다운/PDF 내보내기
│   ├── WeatherWidget.jsx   # 날씨 위젯
│   ├── InstallPWA.jsx      # 홈 화면 설치 버튼/안내
│   ├── ThemeToggle.jsx     # 다크 모드 토글
│   └── Toast.jsx           # 토스트 알림
├── hooks/                  # useTheme, useWeather, useUserSettings,
│                           # useDebounce, useGuideQuestion,
│                           # useNotificationSettings, useDailyReminder, ...
└── utils/                  # 순수 로직 (테스트 대상)
    ├── aiAnalysis.js       # 분석 프롬프트 생성 + JSON 파싱
    ├── aiMarkdown.js       # 안전한 마크다운 → HTML 렌더러 (XSS 방지)
    ├── emotions.js         # 8가지 감정 정의(이모지·색)
    ├── stats.js            # 통계 집계
    ├── search.js           # 검색/필터 + 하이라이트
    ├── weather.js          # 날씨 코드 매핑 + 조회/캐시
    ├── exportDiary.js      # 마크다운 빌드 + 다운로드
    ├── notify.js           # 알림 판단 로직
    ├── voice.js            # 녹음 → WAV 변환 → OpenRouter 음성 전사
    └── coverImage.js       # 표지 이미지 생성/리사이즈

tests/
├── run.mjs                 # 단위 테스트 (npm test)
├── integration.mjs         # 실 Firestore 통합 테스트 (이메일/패스워드 계정 필요)
└── ai-live.mjs             # 실 OpenRouter 분석 파이프라인 테스트
```

---

## 🧪 테스트

- **단위 테스트** (`npm test`) — 감정/통계/검색/마크다운/내보내기/알림 등 순수 로직 검증. 소스가 확장자 없는 import를 쓰므로 esbuild로 번들 후 node 실행.
- **통합 테스트** (`tests/integration.mjs`) — 실제 Firestore에 테스트 유저로 붙어 저장→조회→통계→캘린더→검색→내보내기→삭제 전 과정을 검증하고, 끝나면 데이터·계정을 정리. *(Email/Password 인증을 일시적으로 켜야 동작)*
- **AI 파이프라인** (`tests/ai-live.mjs`) — 실제 OpenRouter 모델로 감성 분석 JSON 파싱까지 검증.

---

## 🗃 데이터 모델 (Firestore)

| 컬렉션 | 주요 필드 |
|--------|-----------|
| `diaries` | `userId, content, emotion, score, comment, activity, coverImage, media{type,dataUrl}, createdAt` |
| `chatMessages` | `userId, role, content, dateKey(YYYY-MM-DD), timestamp` |
| `users` *(선택)* | `city` — 보안 규칙이 막혀 있으면 localStorage로 대체 |

---

## ⚠️ 알려진 제약

- **날씨 도시 설정**은 `users` 컬렉션 보안 규칙이 막혀 있어 **기기별 localStorage**에 우선 저장됩니다 (Firestore는 best-effort 동기화). 기기 간 공유가 필요하면 `users/{uid}` 본인 읽기/쓰기 규칙을 추가하세요.
- **사진·동영상 첨부**는 Firestore 문서 1MB 한도에 맞춰 사진은 리사이즈(최대 900px), 동영상은 5초·저비트레이트로 저장합니다. 더 큰/긴 미디어가 필요하면 Firebase Storage 연동이 필요합니다.
- **음성 입력**은 `MediaRecorder` 지원 브라우저에서만 버튼이 보입니다 (앱 내장 브라우저·구형 iOS 제외). 정식 Chrome/Safari 권장.
- **AI 표지 이미지**는 비용이 발생하여 **기본 OFF**입니다. 설정에서 켜고 OpenRouter 크레딧이 있어야 동작합니다.
- **알림**은 브라우저 탭이 열려 있을 때만 정확히 동작하는 클라이언트 방식입니다. 앱을 닫아도 오는 푸시는 별도 서버(FCM 등)가 필요합니다. iOS는 PWA로 "홈 화면에 추가" 후에만 알림이 동작합니다.
- 호스팅 도메인을 Firebase **Authentication → Authorized domains**에 추가해야 Google 로그인 팝업이 열립니다.

---

## 📜 라이선스

개인/학습용 프로젝트입니다.

🤖 Built with the help of [Claude Code](https://claude.com/claude-code)
