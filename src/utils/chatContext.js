// src/utils/chatContext.js
// AI 상담가가 오늘 작성한 일기를 참고해서 답하도록, 시스템 프롬프트에
// 오늘 일기 요약을 끼워 넣는 유틸입니다.
import { toMillis } from "./stats";

function dateKeyFromMs(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

// 일기 목록 중 주어진 dateKey(YYYY-MM-DD)에 작성된 것만 골라냅니다.
export function diariesOnDate(diaries, dateKey) {
  return (diaries || []).filter((d) => {
    const ms = toMillis(d.createdAt);
    return ms != null && dateKeyFromMs(ms) === dateKey;
  });
}

// 베이스 시스템 프롬프트에 오늘 일기 요약을 덧붙입니다. 일기가 없으면 그대로 반환합니다.
export function withDiaryContext(basePrompt, diaryEntries) {
  if (!diaryEntries || diaryEntries.length === 0) return basePrompt;
  const summary = diaryEntries
    .map((d) => `- (${d.emotion || "평온"}) ${d.content}`)
    .join("\n");
  return (
    `${basePrompt}\n\n사용자가 오늘 쓴 일기:\n${summary}\n` +
    "위 일기 내용을 이미 알고 있다는 듯, 자연스럽게 그 이야기를 참고해서 공감해줘."
  );
}
