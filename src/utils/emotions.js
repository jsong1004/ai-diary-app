// src/utils/emotions.js
// 8가지 감정의 이모지·색상·정렬 순서를 한 곳에서 관리합니다.
// 감정 뱃지(DiaryEditor/AiResult), 통계(Stats), 검색 필터(DiaryList)에서 공용으로 씁니다.

export const EMOTIONS = [
  { key: "기쁨", emoji: "😊", color: "#f5b301" }, // 노랑
  { key: "슬픔", emoji: "😢", color: "#4a90e2" }, // 파랑
  { key: "분노", emoji: "😠", color: "#e0405b" }, // 빨강
  { key: "불안", emoji: "😰", color: "#b06ad6" }, // 보라
  { key: "평온", emoji: "😌", color: "#56c596" }, // 초록
  { key: "설렘", emoji: "🥰", color: "#ff7eb3" }, // 핑크
  { key: "피곤", emoji: "😴", color: "#8a92a6" }, // 회색
  { key: "감사", emoji: "🙏", color: "#f0883e" }, // 주황
];

// 빠른 조회용 맵
const EMOTION_MAP = Object.fromEntries(EMOTIONS.map((e) => [e.key, e]));

// 기본값(파싱 실패/구버전 데이터)에 쓰는 감정
export const DEFAULT_EMOTION = "평온";

// 감정 키로 메타데이터를 찾습니다. 모르는 값이면 평온으로 대체합니다.
export function getEmotion(key) {
  return EMOTION_MAP[key] || EMOTION_MAP[DEFAULT_EMOTION];
}

// 감정에 어울리는 부드러운 그라데이션 (표지 이미지가 없을 때 카드 배경으로 사용)
export function emotionGradient(key) {
  const c = getEmotion(key).color;
  return `linear-gradient(135deg, ${hexWithAlpha(c, 0.85)} 0%, ${hexWithAlpha(
    c,
    0.45
  )} 100%)`;
}

// #rrggbb + alpha(0~1) → rgba() 문자열
function hexWithAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
