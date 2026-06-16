// src/utils/search.js
// 일기 검색 + 감정 필터를 위한 순수 함수들입니다. (DiaryList에서 useMemo로 사용)

// 검색어와 감정으로 일기 목록을 필터링합니다.
// - term: 일기 내용(content) / AI 코멘트(comment, aiComment)에서 대소문자 무시 검색
// - emotion: 지정되면 emotion 필드가 일치하는 것만 (AND 조건)
export function filterDiaries(diaries, { term = "", emotion = "" } = {}) {
  const q = term.trim().toLowerCase();

  return (diaries || []).filter((d) => {
    if (emotion && (d.emotion || "평온") !== emotion) return false;

    if (!q) return true;
    const haystack = [d.content, d.comment, d.aiComment]
      .filter(Boolean)
      .join("\n")
      .toLowerCase();
    return haystack.includes(q);
  });
}

// 검색어에 해당하는 부분을 강조하기 위해 텍스트를 조각으로 나눕니다.
// 반환: [{ text, match }] — match=true인 조각을 <mark>로 감싸면 됩니다.
export function highlightParts(text, term) {
  const src = text || "";
  const q = (term || "").trim();
  if (!q) return [{ text: src, match: false }];

  const parts = [];
  const lower = src.toLowerCase();
  const ql = q.toLowerCase();
  let i = 0;
  while (i < src.length) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) {
      parts.push({ text: src.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ text: src.slice(i, idx), match: false });
    parts.push({ text: src.slice(idx, idx + q.length), match: true });
    i = idx + q.length;
  }
  return parts;
}
