// src/utils/aiMarkdown.js
// AI 감성 분석 응답(마크다운)을 안전하게 HTML로 렌더링하고,
// "감성 분석" / "짧은 코멘트" 두 구역으로 나누는 공용 유틸입니다.
// DiaryEditor(작성 화면)와 DiaryList(목록/상세 모달)에서 함께 사용합니다.

// HTML 특수문자를 이스케이프해서 XSS를 막습니다.
// (AI 응답을 dangerouslySetInnerHTML로 넣기 전에 반드시 거칩니다)
export function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 한 줄 안의 인라인 마크다운(**굵게**, *기울임*, `코드`)을 HTML로 바꿉니다.
export function renderInline(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

// 아주 가벼운 마크다운 → HTML 렌더러.
// 지원: ### 제목, > 인용, - 목록, 굵게/기울임/코드, 문단.
// 입력은 renderInline에서 모두 이스케이프되므로 안전합니다.
export function renderMarkdown(markdown) {
  if (!markdown) return "";
  const lines = markdown.split(/\r?\n/);
  let html = "";
  let inList = false;
  let inQuote = false;
  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      html += "</blockquote>";
      inQuote = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      closeQuote();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      closeQuote();
      const level = Math.min(heading[1].length, 6);
      html += `<h${level}>${renderInline(heading[2])}</h${level}>`;
      continue;
    }
    if (/^>\s?/.test(line)) {
      closeList();
      if (!inQuote) {
        html += "<blockquote>";
        inQuote = true;
      }
      html += `<p>${renderInline(line.replace(/^>\s?/, ""))}</p>`;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      closeQuote();
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${renderInline(line.replace(/^[-*]\s+/, ""))}</li>`;
      continue;
    }
    closeList();
    closeQuote();
    html += `<p>${renderInline(line)}</p>`;
  }
  closeList();
  closeQuote();
  return html;
}

// AI 응답을 "감성 분석" / "짧은 코멘트" 두 구역으로 나눕니다.
// 형식을 못 지킨 경우를 대비해, 둘 다 비면 hasSections=false로 알려줍니다.
export function parseAiResult(text) {
  const lines = (text || "").split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      current = { title: heading[1].trim(), body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(line);
    } else if (line.trim()) {
      // 첫 제목 이전의 텍스트(머리말)도 보관
      current = { title: "", body: [line] };
      sections.push(current);
    }
  }

  let analysis = "";
  let comment = "";
  for (const section of sections) {
    const body = section.body.join("\n").trim();
    if (!body) continue;
    if (/감성|분석|감정/.test(section.title)) {
      analysis = analysis ? `${analysis}\n${body}` : body;
    } else if (/코멘트|한마디|응원|위로|메시지/.test(section.title)) {
      // 코멘트는 별도 인용 박스로 감싸므로 줄 앞의 '>'는 제거합니다.
      comment = body.replace(/^>\s?/gm, "");
    }
  }

  return { analysis, comment, hasSections: Boolean(analysis || comment) };
}

// 카드 미리보기용: 마크다운 기호(#, *, >, `, -)를 제거해 깔끔한 평문으로 만듭니다.
export function stripMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s+/gm, "") // 제목 기호
    .replace(/^>\s?/gm, "") // 인용 기호
    .replace(/^[-*]\s+/gm, "") // 목록 기호
    .replace(/\*\*(.+?)\*\*/g, "$1") // 굵게
    .replace(/\*([^*]+?)\*/g, "$1") // 기울임
    .replace(/`([^`]+?)`/g, "$1") // 코드
    .replace(/\s+/g, " ") // 줄바꿈/공백 정리
    .trim();
}
