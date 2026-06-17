// src/components/DiaryEditor.jsx
// AI 감성 일기장의 메인 에디터 화면입니다.
// "일기 저장하기"를 누르면 백엔드(OpenRouter)에서 감성 분석(감정/점수/코멘트/활동)과
// 표지 이미지를 자동으로 생성한 뒤 Firestore의 'diaries' 컬렉션에 저장합니다.
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
import MediaCapture from "./MediaCapture";
import { buildAnalysisPrompt, parseAnalysis } from "../utils/aiAnalysis";
import { generateCoverImage } from "../utils/coverImage";
import { extractVideoFrame } from "../utils/media";
import { useGuideQuestion } from "../hooks/useGuideQuestion";
import { useVoiceInput } from "../hooks/useVoiceInput";
import "./DiaryEditor.css";

// OpenRouter 설정값 (.env 파일에서 불러옵니다)
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL;
// 사진/동영상이 첨부되면 비전 멀티모달 모델로 이미지까지 함께 분석합니다.
const VISION_MODEL =
  import.meta.env.VITE_OPENROUTER_VISION_MODEL || "google/gemini-2.5-flash-lite";

// 로딩 중에 보여줄 동그란 스피너
function Spinner() {
  return <span className="diary-spinner" aria-hidden="true" />;
}

// 잠시 기다리는 헬퍼 (재시도 사이의 대기에 사용)
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// OpenRouter 분석 호출. 무료 모델은 가끔 429가 나므로 짧게 재시도합니다.
// imageDataUrl이 있으면 비전 모델로 사진(또는 동영상 프레임)까지 함께 분석합니다.
async function requestAnalysis(diaryText, withImage, imageDataUrl, retries = 2) {
  const model = imageDataUrl ? VISION_MODEL : OPENROUTER_MODEL;
  const prompt = buildAnalysisPrompt(diaryText, withImage, Boolean(imageDataUrl));
  const content = imageDataUrl
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : prompt;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
    }),
  });

  if (response.status === 429 && retries > 0) {
    await wait(1500);
    return requestAnalysis(diaryText, withImage, imageDataUrl, retries - 1);
  }

  return response;
}

function DiaryEditor({ user, onSaved }) {
  const guide = useGuideQuestion();
  const [searchParams] = useSearchParams();
  // 캘린더에서 "이날의 일기 쓰기"로 넘어온 경우의 날짜 (YYYY-MM-DD)
  const dateParam = searchParams.get("date");

  const [content, setContent] = useState(""); // 일기 원문
  const [media, setMedia] = useState(null); // 첨부 사진/동영상 { type, dataUrl }
  const [showCapture, setShowCapture] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState(""); // analyzing | cover | saving
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // 🎤 음성 입력 — 전사된 텍스트를 본문 끝에 덧붙임
  const appendTranscript = useCallback((text) => {
    setContent((c) => (c ? `${c} ${text}` : text));
    setSaved(false);
  }, []);
  const voice = useVoiceInput(appendTranscript);

  // 💾 저장하기 — 저장 시 AI 분석 + 표지 이미지를 자동 생성한 뒤 Firestore에 저장
  const handleSave = async () => {
    if (!content.trim()) {
      setError("저장할 일기 내용이 없어요 🌿");
      return;
    }

    setError("");
    setSaved(false);
    setSaving(true);

    try {
      // 1) AI 감성 분석 (자동). 첨부 사진/영상이 있으면 그 이미지도 함께 분석합니다.
      let analysis = null;
      setPhase("analyzing");
      let analysisImage = null;
      if (media?.type === "image") {
        analysisImage = media.dataUrl;
      } else if (media?.type === "video") {
        analysisImage = await extractVideoFrame(media.dataUrl); // 대표 프레임
      }
      try {
        const response = await requestAnalysis(content, true, analysisImage);
        if (response.ok) {
          const apiData = await response.json();
          const message = apiData?.choices?.[0]?.message?.content?.trim();
          if (message) analysis = parseAnalysis(message);
        } else {
          console.error("분석 API 오류", response.status);
        }
      } catch (e) {
        console.error("AI 분석 실패 — 기본값으로 저장", e);
      }

      // 2) 표지 이미지 자동 생성 (분석의 묘사 사용, best-effort)
      let cover = "";
      if (analysis?.imagePrompt) {
        setPhase("cover");
        cover = (await generateCoverImage(analysis.imagePrompt)) || "";
      }

      // 3) Firestore 저장
      setPhase("saving");
      await addDoc(collection(db, "diaries"), {
        content: content.trim(),
        emotion: analysis?.emotion || "평온",
        score: analysis?.score ?? 3,
        comment: analysis?.comment || "",
        activity: analysis?.activity || "",
        // 구버전 화면/검색 호환을 위해 코멘트를 aiComment에도 보관
        aiComment: analysis?.comment || "",
        coverImage: cover,
        media: media || null,
        userId: user.uid,
        // 캘린더에서 특정 날짜로 작성하면 그 날짜로, 아니면 서버 시간
        createdAt: dateParam
          ? Timestamp.fromDate(new Date(`${dateParam}T12:00:00`))
          : serverTimestamp(),
      });

      setContent("");
      setMedia(null);
      setSaved(true);
      if (onSaved) onSaved();
    } catch (err) {
      console.error(err);
      setError("일기 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
      setPhase("");
    }
  };

  // "이 질문으로 시작하기" → 질문을 인용구로 입력창 맨 위에 삽입
  const handleUseQuestion = () => {
    setContent((c) => `💭 ${guide.question}\n\n${c}`);
  };

  // 저장 버튼 상태별 문구
  const saveLabel =
    phase === "analyzing"
      ? "AI가 마음을 읽는 중..."
      : phase === "cover"
      ? "표지 그리는 중..."
      : phase === "saving"
      ? "저장 중..."
      : "💾 일기 저장하기";

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
        disabled={saving}
      />

      {/* 음성 입력 + 사진/동영상 첨부 툴바 */}
      <div className="diary-tools">
        {voice.supported && (
          <button
            type="button"
            className={`diary-tool ${voice.recording ? "recording" : ""}`}
            onClick={voice.toggle}
            disabled={voice.busy || saving}
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
          disabled={saving}
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
        className="diary-save-button"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <>
            <Spinner />
            <span>{saveLabel}</span>
          </>
        ) : (
          <span>{saveLabel}</span>
        )}
      </button>
      <p className="diary-save-hint">
        저장하면 AI가 감정 분석과 표지 이미지를 자동으로 만들어 함께 보관해요 ✨
      </p>

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
