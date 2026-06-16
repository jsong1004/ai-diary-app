// src/components/ExportModal.jsx
// 일기 내보내기 — 마크다운(.md) 또는 PDF(html2pdf.js)로 저장합니다.
import { useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { X } from "lucide-react";
import { db } from "../firebase";
import { getEmotion } from "../utils/emotions";
import {
  filterByPeriod,
  buildMarkdown,
  buildChatMarkdown,
  downloadText,
  formatLongDate,
} from "../utils/exportDiary";
import { toMillis } from "../utils/stats";
import "./ExportModal.css";

const PERIODS = [
  { key: "month", label: "이번 달" },
  { key: "3months", label: "지난 3개월" },
  { key: "year", label: "올해" },
  { key: "all", label: "전체" },
];

const PERIOD_LABEL = {
  month: "이번 달",
  "3months": "지난 3개월",
  year: "올해",
  all: "전체",
};

// 시스템 한글 폰트만 사용하는 인라인 스타일 (html2pdf CORS 이슈 방지)
const FONT = "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";

function ExportModal({ user, onClose, onToast }) {
  const [period, setPeriod] = useState("month");
  const [format, setFormat] = useState("md");
  const [includeAi, setIncludeAi] = useState(true);
  const [includeCover, setIncludeCover] = useState(true);
  const [includeChat, setIncludeChat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const userName = user.displayName || "나";

  const fetchDiaries = async () => {
    const snap = await getDocs(
      query(collection(db, "diaries"), where("userId", "==", user.uid))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  const fetchChat = async () => {
    const snap = await getDocs(
      query(collection(db, "chatMessages"), where("userId", "==", user.uid))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (toMillis(a.timestamp) || 0) - (toMillis(b.timestamp) || 0));
  };

  const handleExport = async () => {
    setBusy(true);
    setStatus("일기를 모으는 중...");
    try {
      const all = await fetchDiaries();
      const diaries = filterByPeriod(all, period);

      if (diaries.length === 0) {
        onToast?.("해당 기간에 일기가 없어요");
        setBusy(false);
        return;
      }

      const chat = includeChat ? await fetchChat() : [];
      const stamp = new Date().toISOString().slice(0, 7);
      const baseName = `감성일기_${stamp}_${userName}`;

      if (format === "md") {
        setStatus("마크다운 만드는 중...");
        let md = buildMarkdown(diaries, {
          title: `나의 일기 (${PERIOD_LABEL[period]})`,
          includeAi,
        });
        if (includeChat) md += buildChatMarkdown(chat);
        downloadText(`${baseName}.md`, md);
        onToast?.("내보내기 완료! 다운로드 폴더를 확인해주세요");
        onClose();
      } else {
        setStatus("PDF로 변환하는 중... (일기가 많으면 시간이 걸려요)");
        await exportPdf(diaries, chat, baseName);
        onToast?.("내보내기 완료! 다운로드 폴더를 확인해주세요");
        onClose();
      }
    } catch (err) {
      console.error(err);
      onToast?.("일기가 너무 많아요. 기간을 좁혀서 다시 시도해주세요");
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  // PDF: 인라인 스타일만 쓰는 임시 div를 만들어 html2pdf로 변환
  const exportPdf = async (diaries, chat, baseName) => {
    const { default: html2pdf } = await import("html2pdf.js");

    const esc = (s) =>
      (s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let html = `<div style="font-family:${FONT};color:#3b332a;padding:24px;text-align:center;page-break-after:always">
      <div style="font-size:40px;margin-top:120px">📔</div>
      <h1 style="font-size:28px;color:#8e5fc0">AI 감성 일기장</h1>
      <p style="font-size:16px;color:#6a5a78">${esc(userName)}님의 기록</p>
      <p style="font-size:14px;color:#a89cb0">${PERIOD_LABEL[period]} · 총 ${diaries.length}편</p>
    </div>`;

    for (const d of diaries) {
      const emo = d.emotion ? getEmotion(d.emotion) : null;
      const cover =
        includeCover && d.coverImage
          ? `<img src="${d.coverImage}" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;margin-bottom:16px"/>`
          : "";
      const badge = emo
        ? `<span style="display:inline-block;padding:4px 12px;border-radius:999px;background:${emo.color}22;color:${emo.color};font-size:13px;font-weight:bold">${emo.emoji} ${emo.key}${
            d.score ? ` (${d.score}/5)` : ""
          }</span>`
        : "";
      const comment = d.comment || d.aiComment;
      const aiBlock =
        includeAi && comment
          ? `<div style="margin-top:16px;padding:14px 16px;border-left:4px solid #c86dd7;background:#f6f0fb;border-radius:0 10px 10px 0">
               <div style="font-size:13px;font-weight:bold;color:#9c6ec0;margin-bottom:6px">💬 AI 코멘트</div>
               <div style="font-size:14px;line-height:1.7;color:#5a4d66">${esc(comment)}</div>
             </div>`
          : "";

      html += `<div style="font-family:${FONT};padding:24px;page-break-after:always">
        ${cover}
        <div style="font-size:13px;color:#b18ad0;font-weight:bold">${formatLongDate(d.createdAt)}</div>
        <div style="margin:8px 0 14px">${badge}</div>
        <div style="font-size:15px;line-height:1.9;color:#3b332a;white-space:pre-wrap">${esc(d.content)}</div>
        ${aiBlock}
      </div>`;
    }

    if (includeChat && chat.length) {
      html += `<div style="font-family:${FONT};padding:24px"><h2 style="color:#8e5fc0">🤖 AI 상담가와의 대화 기록</h2>`;
      for (const m of chat) {
        const who = m.role === "user" ? "🙋 나" : "💗 AI";
        html += `<p style="font-size:14px;line-height:1.7;margin:8px 0;color:#3b332a"><b>${who}:</b> ${esc(m.content)}</p>`;
      }
      html += `</div>`;
    }

    const holder = document.createElement("div");
    holder.style.position = "absolute";
    holder.style.left = "-9999px";
    holder.style.visibility = "hidden";
    holder.style.width = "794px";
    holder.innerHTML = html;
    document.body.appendChild(holder);

    try {
      await html2pdf()
        .set({
          margin: 15,
          filename: `${baseName}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { useCORS: true, allowTaint: false, logging: false, scale: 2 },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(holder)
        .save();
    } finally {
      document.body.removeChild(holder);
    }
  };

  return (
    <div className="export-overlay" onClick={() => !busy && onClose()}>
      <div className="export-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="export-close"
          onClick={onClose}
          disabled={busy}
          aria-label="닫기"
        >
          <X size={18} />
        </button>
        <h2 className="export-title">📤 내 일기 내보내기</h2>

        <div className="export-section">
          <div className="export-label">기간</div>
          <div className="export-radios">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`export-radio ${period === p.key ? "active" : ""}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="export-section">
          <div className="export-label">형식</div>
          <div className="export-tabs">
            <button
              type="button"
              className={`export-tab ${format === "md" ? "active" : ""}`}
              onClick={() => setFormat("md")}
            >
              📝 마크다운
            </button>
            <button
              type="button"
              className={`export-tab ${format === "pdf" ? "active" : ""}`}
              onClick={() => setFormat("pdf")}
            >
              📄 PDF
            </button>
          </div>
        </div>

        <div className="export-section">
          <label className="export-check">
            <input
              type="checkbox"
              checked={includeAi}
              onChange={(e) => setIncludeAi(e.target.checked)}
            />
            AI 코멘트 포함
          </label>
          {format === "pdf" && (
            <label className="export-check">
              <input
                type="checkbox"
                checked={includeCover}
                onChange={(e) => setIncludeCover(e.target.checked)}
              />
              표지 이미지 포함
            </label>
          )}
          <label className="export-check">
            <input
              type="checkbox"
              checked={includeChat}
              onChange={(e) => setIncludeChat(e.target.checked)}
            />
            챗봇 대화 포함
          </label>
        </div>

        <button
          type="button"
          className="export-go"
          onClick={handleExport}
          disabled={busy}
        >
          {busy ? status || "내보내는 중..." : "내보내기"}
        </button>
      </div>
    </div>
  );
}

export default ExportModal;
