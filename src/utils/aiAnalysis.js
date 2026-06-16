// src/utils/aiAnalysis.js
// AI 감성 분석을 JSON 형식으로 주고받기 위한 프롬프트 생성 + 응답 파싱 유틸입니다.
import { EMOTIONS, DEFAULT_EMOTION } from "./emotions";

const EMOTION_LIST = EMOTIONS.map((e) => e.key).join("/");

// 일기 본문을 받아 AI에게 보낼 분석 프롬프트를 만듭니다.
// withImage=true면 표지 이미지 묘사(imagePrompt)도 함께 요청합니다.
export function buildAnalysisPrompt(diaryText, withImage = false) {
  const imageField = withImage
    ? `,\n     "imagePrompt": "일기 분위기에 어울리는 이미지 묘사를 영어로 한 문장. 따뜻하고 회화적인 일러스트 스타일, 사람 얼굴은 포함하지 말고 풍경/사물/추상적 분위기로. 예: 'A cozy window with warm sunlight, watercolor style, soft pastel colors'"`
    : "";

  return (
    "다음 일기를 분석해서 정확히 아래 JSON 형식으로만 답해줘. 다른 말은 절대 붙이지 마.\n" +
    "{\n" +
    `     "emotion": "주된 감정 (${EMOTION_LIST} 중 하나)",\n` +
    '     "score": 1~5 사이 숫자 (1=매우부정, 5=매우긍정),\n' +
    '     "comment": "따뜻한 코멘트 (2~3문장)",\n' +
    '     "activity": "추천 활동 한 줄"' +
    imageField +
    "\n}\n" +
    `일기: ${diaryText}`
  );
}

// 1~5 범위로 안전하게 정규화합니다.
function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 3;
  return Math.min(5, Math.max(1, Math.round(n)));
}

// AI가 돌려준 문자열에서 JSON을 추출해 구조화된 결과로 파싱합니다.
// 코드펜스(```json ... ```)나 앞뒤 설명이 섞여 있어도 첫 { ~ 마지막 }를 잡아냅니다.
// 실패하면 emotion='평온', score=3 기본값으로 안전하게 폴백합니다.
export function parseAnalysis(text) {
  const fallback = {
    emotion: DEFAULT_EMOTION,
    score: 3,
    comment: typeof text === "string" ? text.trim() : "",
    activity: "",
    imagePrompt: "",
    parsed: false,
  };

  if (!text || typeof text !== "string") return fallback;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return fallback;

  const jsonSlice = text.slice(start, end + 1);

  let data;
  try {
    data = JSON.parse(jsonSlice);
  } catch {
    return fallback;
  }

  const emotion =
    typeof data.emotion === "string" && data.emotion.trim()
      ? data.emotion.trim()
      : DEFAULT_EMOTION;

  return {
    emotion,
    score: clampScore(data.score),
    comment: typeof data.comment === "string" ? data.comment.trim() : "",
    activity: typeof data.activity === "string" ? data.activity.trim() : "",
    imagePrompt:
      typeof data.imagePrompt === "string" ? data.imagePrompt.trim() : "",
    parsed: true,
  };
}
