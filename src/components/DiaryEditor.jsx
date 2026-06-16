// src/components/DiaryEditor.jsx
// AI 감성 일기장의 메인 에디터 화면입니다.
// 일기를 작성하면 OpenRouter API로 감성 분석(JSON: 감정/점수/코멘트/활동)을 받고,
// (설정 시) 표지 이미지를 생성한 뒤 Firestore의 'diaries' 컬렉션에 저장합니다.
import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { Mic, Paperclip, RefreshCw, Sparkles, X } from "lucide-react";
import { db } from "../firebase";
import AiResult from "./AiResult";
import MediaCapture from "./MediaCapture";
import { buildAnalysisPrompt, parseAnalysis } from "../utils/aiAnalysis";
import { generateCoverImage } from "../utils/coverImage";
import { useCoverImageSetting } from "../hooks/useCoverImageSetting";
import { useGuideQuestion } from "../hooks/useGuideQuestion";
import { useVoiceInput } from "../hooks/useVoiceInput";
import "./DiaryEditor.css";

// OpenRouter 설정값 (.env 파일에서 불러옵니다)
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL;

// 로딩 중에 보여줄 동그란 스피너
function Spinner() {
  return <span className="diary-spinner" aria-hidden="true" />;
}

// AI 분석 중에 보여줄 스켈레톤(shimmer) 자리표시자
function SkeletonResult() {
  return (
    <div className="diary-ai-card">
      <div className="diary-ai-header">✨ AI 감성 분석 결과</div>
      <div className="diary-ai-divider" />
      <div className="diary-ai-body" aria-hidden="true">
        <div className="diary-ai-section">
          <div className="diary-skeleton diary-skeleton-title" />
          <div className="diary-skeleton diary-skeleton-line" />
          <div className="diary-skeleton diary-skeleton-line short" />
        </div>
        <div className="diary-ai-section">
          <div className="diary-skeleton diary-skeleton-title" />
          <div className="diary-skeleton diary-skeleton-line" />
          <div className="diary-skeleton diary-skeleton-line medium" />
        </div>
      </div>
    </div>
  );
}

// 잠시 기다리는 헬퍼 (재시도 사이의 대기에 사용)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// OpenRouter 분석 호출. 무료 모델은 가끔 429가 나므로 짧게 재시도합니다.
async function requestAnalysis(diaryText, withImage, retries = 2) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "user", content: buildAnalysisPrompt(diaryText, withImage) },
      ],
    }),
  });

  if (response.status === 429 && retries > 0) {
    await wait(1500);
    return requestAnalysis(diaryText, withImage, retries - 1);
  }

  return response;
}

function DiaryEditor({ user, onSaved }) {
  const { enabled: coverEnabled } = useCoverImageSetting();
  const guide = useGuideQuestion();
  const [searchParams] = useSearchParams();
  // 캘린더에서 "이날의 일기 쓰기"로 넘어온 경우의 날짜 (YYYY-MM-DD)
  const dateParam = searchParams.get("date");

  const [content, setContent] = useState(""); // 일기 원문
  const [analysis, setAnalysis] = useState(null); // {emotion,score,comment,activity,imagePrompt}
  const [coverImage, setCoverImage] = useState(null); // 표지 이미지 data URL
  const [media, setMedia] = useState(null); // 첨부 사진/동영상 { type, dataUrl }
  const [showCapture, setShowCapture] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // 🎤 음성 입력 — 전사된 텍스트를 본문 끝에 덧붙임
  const appendTranscript = useCallback((text) => {
    setContent((c) => (c ? `${c} ${text}` : text));
    setSaved(false);
  }, []);
  const voice = useVoiceInput(appendTranscript);

  // 🤖 AI 감성 분석받기
  const handleAnalyze = async () => {
    if (!content.trim()) {
      setError("먼저 오늘의 일기를 적어 주세요 ✍️");
      return;
    }

    setError("");
    setSaved(false);
    setCoverImage(null);
    setAnalyzing(true);

    try {
      const response = await requestAnalysis(content, coverEnabled);

      if (response.status === 429) {
        setError("지금 AI가 잠시 붐비고 있어요. 잠시 후 다시 시도해 주세요 🙏");
        return;
      }
      if (!response.ok) {
        throw new Error(`API 응답 오류 (${response.status})`);
      }

      const apiData = await response.json();
      const message = apiData?.choices?.[0]?.message?.content?.trim();
      if (!message) {
        throw new Error("AI 응답이 비어 있어요.");
      }

      const result = parseAnalysis(message);
      setAnalysis(result);

      // 표지 이미지 자동 생성 (설정이 켜져 있고 묘사가 있을 때만)
      if (coverEnabled && result.imagePrompt) {
        setGeneratingCover(true);
        const cover = await generateCoverImage(result.imagePrompt);
        setCoverImage(cover); // 실패 시 null
        setGeneratingCover(false);
      }
    } catch (err) {
      console.error(err);
      setError("AI 감성 분석에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAnalyzing(false);
    }
  };

  // 🎨 표지 다시 그리기
  const handleRegenerateCover = async () => {
    if (!analysis?.imagePrompt || generatingCover) return;
    setGeneratingCover(true);
    const cover = await generateCoverImage(analysis.imagePrompt);
    if (cover) setCoverImage(cover);
    setGeneratingCover(false);
  };

  // 💾 일기 저장하기 (원문 + 구조화된 분석 + 표지 + userId + createdAt)
  const handleSave = async () => {
    if (!content.trim()) {
      setError("저장할 일기 내용이 없어요 🌿");
      return;
    }

    setError("");
    setSaving(true);

    try {
      await addDoc(collection(db, "diaries"), {
        content: content.trim(),
        emotion: analysis?.emotion || "평온",
        score: analysis?.score ?? 3,
        comment: analysis?.comment || "",
        activity: analysis?.activity || "",
        // 구버전 화면/검색 호환을 위해 코멘트를 aiComment에도 보관
        aiComment: analysis?.comment || "",
        coverImage: coverImage || "",
        media: media || null,
        userId: user.uid,
        // 캘린더에서 특정 날짜로 작성하면 그 날짜로, 아니면 서버 시간
        createdAt: dateParam
          ? Timestamp.fromDate(new Date(`${dateParam}T12:00:00`))
          : serverTimestamp(),
      });

      setContent("");
      setAnalysis(null);
      setCoverImage(null);
      setMedia(null);
      setSaved(true);
      if (onSaved) onSaved();
    } catch (err) {
      console.error(err);
      setError("일기 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  // "이 질문으로 시작하기" → 질문을 인용구로 입력창 맨 위에 삽입
  const handleUseQuestion = () => {
    setContent((c) => `💭 ${guide.question}\n\n${c}`);
  };

  return (
    <div className="diary-editor">
      {dateParam && (
        <div className="diary-date-banner">
          📅 {dateParam} 의 일기를 작성하고 있어요
        </div>
      )}

      {/* 오늘의 질문 가이드 카드 */}
      {!guide.hidden && (
        <div className="guide-card">
          <button
            type="button"
            className="guide-hide"
            onClick={() => guide.setHidden(true)}
            aria-label="질문 숨기기"
          >
            <X size={15} />
          </button>
          <div className="guide-label">
            <Sparkles size={15} /> 오늘의 질문
          </div>
          <p className="guide-question">{guide.question}</p>
          <div className="guide-actions">
            <button
              type="button"
              className="guide-btn ghost"
              onClick={guide.shuffle}
            >
              <RefreshCw size={13} /> 다른 질문
            </button>
            <button
              type="button"
              className="guide-btn solid"
              onClick={handleUseQuestion}
            >
              이 질문으로 시작하기
            </button>
          </div>
        </div>
      )}

      <label className="diary-label" htmlFor="diary-content">
        오늘의 일기
      </label>
      <textarea
        id="diary-content"
        className="diary-textarea"
        placeholder="오늘 하루는 어땠나요?"
        value={content}
        onChange={(event) => {
          setContent(event.target.value);
          setSaved(false);
        }}
        rows={8}
      />

      {/* 음성 입력 + 사진/동영상 첨부 툴바 */}
      <div className="diary-tools">
        {voice.supported && (
          <button
            type="button"
            className={`diary-tool ${voice.recording ? "recording" : ""}`}
            onClick={voice.toggle}
            disabled={voice.busy}
          >
            <Mic size={16} />
            <span>
              {voice.recording
                ? "● 녹음 중 (탭하여 종료)"
                : voice.busy
                ? "음성 변환 중..."
                : "음성 입력"}
            </span>
          </button>
        )}
        <button
          type="button"
          className="diary-tool"
          onClick={() => setShowCapture(true)}
        >
          <Paperclip size={16} />
          <span>사진·동영상</span>
        </button>
      </div>

      {voice.error && <p className="diary-error">{voice.error}</p>}

      {/* 첨부 미디어 미리보기 */}
      {media && (
        <div className="diary-media">
          {media.type === "image" ? (
            <img src={media.dataUrl} alt="첨부 사진" />
          ) : (
            <video src={media.dataUrl} controls playsInline />
          )}
          <button
            type="button"
            className="diary-media-remove"
            onClick={() => setMedia(null)}
            aria-label="첨부 제거"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <button
        type="button"
        className="diary-analyze-button"
        onClick={handleAnalyze}
        disabled={analyzing || saving}
      >
        {analyzing ? (
          <>
            <Spinner />
            <span>분석 중...</span>
          </>
        ) : (
          <span>✨ AI 감성 분석받기</span>
        )}
      </button>

      {/* AI 감성 분석 결과 (분석 중에는 스켈레톤) */}
      {analyzing ? (
        <SkeletonResult />
      ) : (
        analysis && (
          <AiResult
            data={analysis}
            coverImage={coverImage}
            onRegenerate={analysis.imagePrompt ? handleRegenerateCover : null}
            regenerating={generatingCover}
          />
        )
      )}

      <button
        type="button"
        className="diary-save-button"
        onClick={handleSave}
        disabled={saving || analyzing}
      >
        {saving ? (
          <>
            <Spinner />
            <span>저장 중...</span>
          </>
        ) : (
          <span>💾 일기 저장하기</span>
        )}
      </button>

      {error && <p className="diary-error">{error}</p>}
      {saved && <p className="diary-success">일기가 따뜻하게 보관되었어요 🌿</p>}

      {showCapture && (
        <MediaCapture
          onCapture={(m) => {
            setMedia(m);
            setSaved(false);
          }}
          onClose={() => setShowCapture(false)}
        />
      )}
    </div>
  );
}

export default DiaryEditor;
