// src/components/DiaryList.jsx
// 로그인한 사용자가 저장한 일기 목록 + 검색/감정 필터 + 삭제 기능 화면입니다.
// 보안: Firestore에서 '본인(userId)의 일기'만 조회/삭제합니다.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Search, Trash2, X } from "lucide-react";
import { db } from "../firebase";
import AiResult from "./AiResult";
import Toast from "./Toast";
import { stripMarkdown } from "../utils/aiMarkdown";
import { filterDiaries, highlightParts } from "../utils/search";
import { getEmotion, emotionGradient, EMOTIONS } from "../utils/emotions";
import { calculateStreak } from "../utils/streak";
import { useDebounce } from "../hooks/useDebounce";
import "./DiaryList.css";

// Firestore Timestamp → "2026년 6월 12일" 한국어 날짜
function formatKoreanDate(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : null;
  if (!date) return "방금 전";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

// 긴 글을 잘라 미리보기 문자열로
function preview(text, max) {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

// 검색어 강조 렌더링
function Highlighted({ text, term }) {
  const parts = highlightParts(text, term);
  return (
    <>
      {parts.map((p, i) =>
        p.match ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

// 카드/모달 상단 표지 (AI 표지 이미지 > 감정 그라데이션)
// 사용자가 첨부한 사진/동영상은 표지가 아니라 본문 첨부로 따로 보여줍니다.
function Cover({ diary, large }) {
  const emo = getEmotion(diary.emotion);
  return (
    <div className={`diary-cover ${large ? "large" : ""}`}>
      {diary.coverImage ? (
        <img src={diary.coverImage} alt="일기 표지" />
      ) : (
        <div
          className="diary-cover-fallback"
          style={{ background: emotionGradient(diary.emotion) }}
        >
          <span>{emo.emoji}</span>
        </div>
      )}
    </div>
  );
}

function DiaryList({ user }) {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // 상세 모달
  const [confirmTarget, setConfirmTarget] = useState(null); // 삭제 확인 모달 대상
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  // 검색 + 필터 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [emotionFilter, setEmotionFilter] = useState(""); // "" = 전체
  const debouncedTerm = useDebounce(searchTerm, 300);

  // 본인 일기 실시간 구독
  useEffect(() => {
    const diariesQuery = query(
      collection(db, "diaries"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      diariesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : Infinity;
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : Infinity;
          return tb - ta;
        });
        setDiaries(items);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // 검색어/감정으로 필터 (useMemo 캐싱)
  const filtered = useMemo(
    () => filterDiaries(diaries, { term: debouncedTerm, emotion: emotionFilter }),
    [diaries, debouncedTerm, emotionFilter]
  );

  const streak = useMemo(() => calculateStreak(diaries), [diaries]);

  // 일기 삭제 (본인 것만)
  const handleDelete = async (diary) => {
    if (!diary || diary.userId !== user.uid) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "diaries", diary.id));
      setConfirmTarget(null);
      setSelected(null);
      setToast("삭제되었습니다");
    } catch (err) {
      console.error(err);
      setToast("삭제에 실패했어요");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="diary-list-page">
      <div className="diary-list-header">
        <div className="diary-list-heading">
          <h1 className="diary-list-title">🌷 나의 일기</h1>
          {streak > 0 && (
            <span className="diary-streak-badge">🔥 {streak}일 연속 기록 중</span>
          )}
        </div>
        <button
          type="button"
          className="diary-write-button"
          onClick={() => navigate("/write")}
        >
          ✍️ 새 일기 쓰기
        </button>
      </div>

      {/* 검색창 */}
      <div className="diary-search">
        <Search size={18} className="diary-search-icon" />
        <input
          type="text"
          className="diary-search-input"
          placeholder="일기 내용이나 코멘트에서 검색…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            type="button"
            className="diary-search-clear"
            onClick={() => setSearchTerm("")}
            aria-label="검색어 지우기"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 감정 필터 칩 */}
      <div className="diary-chips">
        <button
          type="button"
          className={`diary-chip ${emotionFilter === "" ? "active" : ""}`}
          onClick={() => setEmotionFilter("")}
        >
          전체
        </button>
        {EMOTIONS.map((e) => (
          <button
            key={e.key}
            type="button"
            className={`diary-chip ${emotionFilter === e.key ? "active" : ""}`}
            style={
              emotionFilter === e.key
                ? { background: e.color, borderColor: e.color, color: "#fff" }
                : undefined
            }
            onClick={() =>
              setEmotionFilter((cur) => (cur === e.key ? "" : e.key))
            }
          >
            {e.emoji} {e.key}
          </button>
        ))}
      </div>

      {/* 결과 개수 */}
      {!loading && diaries.length > 0 && (
        <p className="diary-count">총 {filtered.length}개의 일기</p>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="diary-list-empty">
          <span className="diary-list-spinner" aria-hidden="true" />
          <p>일기를 불러오는 중...</p>
        </div>
      )}

      {/* 일기가 하나도 없을 때 */}
      {!loading && diaries.length === 0 && (
        <div className="diary-list-empty">
          <div className="diary-list-empty-emoji">🌱</div>
          <p>아직 기록된 일기가 없어요.</p>
          <button
            type="button"
            className="diary-write-button"
            onClick={() => navigate("/write")}
          >
            첫 일기 쓰러 가기
          </button>
        </div>
      )}

      {/* 필터 결과 없음 */}
      {!loading && diaries.length > 0 && filtered.length === 0 && (
        <div className="diary-list-empty">
          <div className="diary-list-empty-emoji">🔎</div>
          <p>일치하는 일기가 없어요. 다른 키워드를 시도해보세요.</p>
        </div>
      )}

      {/* 일기 카드 그리드 */}
      {!loading && filtered.length > 0 && (
        <div className="diary-grid">
          {filtered.map((diary) => {
            const emo = getEmotion(diary.emotion);
            return (
              <div
                key={diary.id}
                className="diary-card"
                role="button"
                tabIndex={0}
                onClick={() => setSelected(diary)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(diary);
                }}
              >
                <Cover diary={diary} />

                <button
                  type="button"
                  className="diary-delete-btn"
                  aria-label="일기 삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmTarget(diary);
                  }}
                >
                  <Trash2 size={16} />
                </button>

                <div className="diary-card-body">
                  <div className="diary-card-meta">
                    <span className="diary-card-date">
                      {formatKoreanDate(diary.createdAt)}
                    </span>
                    <span className="diary-card-meta-right">
                      {diary.media && (
                        <span className="diary-card-attach" title="첨부 있음">
                          {diary.media.type === "video" ? "🎬" : "📷"}
                        </span>
                      )}
                      {diary.emotion && (
                        <span
                          className="diary-card-emotion"
                          style={{
                            background: `${emo.color}22`,
                            color: emo.color,
                          }}
                        >
                          {emo.emoji} {emo.key}
                        </span>
                      )}
                    </span>
                  </div>

                  <p className="diary-card-content">
                    <Highlighted
                      text={preview(diary.content, 100)}
                      term={debouncedTerm}
                    />
                  </p>

                  {(diary.comment || diary.aiComment) && (
                    <div className="diary-card-ai">
                      <span className="diary-card-ai-label">🌸 AI 코멘트</span>
                      <p className="diary-card-ai-text">
                        <Highlighted
                          text={preview(
                            stripMarkdown(diary.comment || diary.aiComment),
                            60
                          )}
                          term={debouncedTerm}
                        />
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 상세 보기 모달 */}
      {selected && (
        <div className="diary-modal-overlay" onClick={() => setSelected(null)}>
          <div
            className="diary-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="diary-modal-close"
              onClick={() => setSelected(null)}
              aria-label="닫기"
            >
              ✕
            </button>

            <Cover diary={selected} large />

            <span className="diary-modal-date">
              {formatKoreanDate(selected.createdAt)}
            </span>

            <h2 className="diary-modal-heading">오늘의 일기</h2>
            <p className="diary-modal-content">{selected.content}</p>

            {/* 첨부한 사진/동영상 */}
            {selected.media && (
              <div className="diary-modal-media">
                {selected.media.type === "video" ? (
                  <video src={selected.media.dataUrl} controls playsInline />
                ) : (
                  <img src={selected.media.dataUrl} alt="첨부 사진" />
                )}
              </div>
            )}

            {(selected.emotion || selected.aiComment || selected.comment) && (
              <AiResult data={selected} />
            )}

            <button
              type="button"
              className="diary-modal-delete"
              onClick={() => setConfirmTarget(selected)}
            >
              <Trash2 size={16} />
              <span>이 일기 삭제</span>
            </button>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {confirmTarget && (
        <div
          className="diary-modal-overlay"
          onClick={() => !deleting && setConfirmTarget(null)}
        >
          <div
            className="diary-confirm"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="diary-confirm-icon">🗑</div>
            <h3 className="diary-confirm-title">일기를 삭제할까요?</h3>
            <p className="diary-confirm-desc">한 번 삭제하면 되돌릴 수 없어요.</p>
            <div className="diary-confirm-buttons">
              <button
                type="button"
                className="diary-confirm-cancel"
                onClick={() => setConfirmTarget(null)}
                disabled={deleting}
              >
                취소
              </button>
              <button
                type="button"
                className="diary-confirm-delete"
                onClick={() => handleDelete(confirmTarget)}
                disabled={deleting}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}

export default DiaryList;
