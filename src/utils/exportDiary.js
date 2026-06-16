// src/utils/exportDiary.js
// 일기 내보내기용 순수 유틸: 기간 필터 + 마크다운 문자열 조립.
// (PDF는 html2pdf.js로 ExportModal에서 처리)
import { getEmotion } from "./emotions";
import { toMillis } from "./stats";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// createdAt → "2026년 6월 12일 (금)"
export function formatLongDate(createdAt) {
  const ms = toMillis(createdAt);
  if (ms == null) return "날짜 미상";
  const d = new Date(ms);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${
    WEEKDAYS[d.getDay()]
  })`;
}

// 기간 키 → [start, end] ms 범위를 계산합니다.
// period: 'month' | '3months' | 'year' | 'all' | 'custom'
export function periodRange(period, now = Date.now(), customStart, customEnd) {
  const d = new Date(now);
  switch (period) {
    case "month":
      return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), now];
    case "3months":
      return [new Date(d.getFullYear(), d.getMonth() - 2, 1).getTime(), now];
    case "year":
      return [new Date(d.getFullYear(), 0, 1).getTime(), now];
    case "custom":
      return [
        customStart ? new Date(customStart).getTime() : 0,
        customEnd ? new Date(customEnd).getTime() + 86400000 : now,
      ];
    case "all":
    default:
      return [0, Infinity];
  }
}

// 기간으로 일기를 필터링하고 최신순 정렬합니다.
export function filterByPeriod(diaries, period, opts = {}) {
  const [start, end] = periodRange(
    period,
    opts.now,
    opts.customStart,
    opts.customEnd
  );
  return (diaries || [])
    .filter((dd) => {
      const ms = toMillis(dd.createdAt);
      if (ms == null) return period === "all";
      return ms >= start && ms <= end;
    })
    .sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0));
}

// 일기 배열 → 마크다운 문자열
export function buildMarkdown(diaries, opts = {}) {
  const { title = "나의 일기", includeAi = true } = opts;
  const lines = [`# ${title}`, ""];

  for (const d of diaries) {
    const emo = d.emotion ? getEmotion(d.emotion) : null;
    const scoreStr = d.score ? ` (${d.score}/5)` : "";
    const head = emo
      ? `## ${formatLongDate(d.createdAt)} · ${emo.emoji} ${emo.key}${scoreStr}`
      : `## ${formatLongDate(d.createdAt)}`;
    lines.push("---", "", head, "", (d.content || "").trim(), "");

    const comment = d.comment || d.aiComment;
    if (includeAi && comment) {
      lines.push("> 💬 AI 코멘트");
      for (const line of comment.trim().split(/\r?\n/)) {
        lines.push(`> ${line}`);
      }
      lines.push("");
    }
    if (includeAi && d.activity) {
      lines.push(`> 🌱 추천 활동: ${d.activity}`, "");
    }
  }
  return lines.join("\n");
}

// 챗봇 대화를 마크다운 섹션으로
export function buildChatMarkdown(messages) {
  if (!messages || messages.length === 0) return "";
  const lines = ["", "---", "", "## 🤖 AI 상담가와의 대화 기록", ""];
  for (const m of messages) {
    const who = m.role === "user" ? "🙋 나" : "💗 AI";
    lines.push(`**${who}:** ${(m.content || "").trim()}`, "");
  }
  return lines.join("\n");
}

// 브라우저에서 텍스트를 파일로 다운로드 (Blob + a 태그)
export function downloadText(filename, text, mime = "text/markdown") {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
