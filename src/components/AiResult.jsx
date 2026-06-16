// src/components/AiResult.jsx
// AI 감성 분석 결과를 카드로 렌더링하는 공용 컴포넌트입니다.
// - 신버전: emotion/score/comment/activity 구조화 데이터 + 표지 이미지
// - 구버전: aiComment(마크다운 텍스트)만 있는 일기는 마크다운으로 렌더링(하위호환)
import { RefreshCw } from "lucide-react";
import { renderMarkdown, parseAiResult } from "../utils/aiMarkdown";
import { getEmotion } from "../utils/emotions";
import "./AiResult.css";

// 점수(1~5)를 동그라미 게이지로 표시
function ScoreDots({ score }) {
  return (
    <span className="ai-score" title={`감정 점수 ${score}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`ai-score-dot ${n <= score ? "on" : ""}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

// data: 일기 또는 분석 결과 객체 { emotion, score, comment, activity, aiComment }
// coverImage: 표지 이미지 data URL (선택)
// onRegenerate / regenerating: 에디터에서 "표지 다시 그리기" 용 (선택)
// large: 상세 모달에서 표지를 크게 보여줄 때
function AiResult({ data, coverImage, onRegenerate, regenerating, large }) {
  if (!data) return null;

  const cover = coverImage || data.coverImage;
  const hasEmotion = Boolean(data.emotion);

  return (
    <div className="diary-ai-card">
      <div className="diary-ai-header">✨ AI 감성 분석 결과</div>
      <div className="diary-ai-divider" />

      {/* 표지 이미지 */}
      {cover && (
        <div className={`ai-cover ${large ? "large" : ""}`}>
          <img src={cover} alt="일기 표지 이미지" />
          {onRegenerate && (
            <button
              type="button"
              className="ai-cover-regen"
              onClick={onRegenerate}
              disabled={regenerating}
            >
              <RefreshCw size={14} className={regenerating ? "spin" : ""} />
              <span>{regenerating ? "그리는 중..." : "표지 다시 그리기"}</span>
            </button>
          )}
        </div>
      )}

      {hasEmotion ? (
        <StructuredBody data={data} />
      ) : (
        <LegacyBody text={data.aiComment || data.comment} />
      )}
    </div>
  );
}

// 신버전: 감정 뱃지 + 점수 + 코멘트 + 추천 활동
function StructuredBody({ data }) {
  const emo = getEmotion(data.emotion);
  return (
    <div className="diary-ai-body">
      <div className="diary-ai-section">
        <div className="diary-ai-section-title">📝 감성 분석</div>
        <div className="ai-emotion-row">
          <span
            className="ai-emotion-badge"
            style={{
              background: `${emo.color}22`,
              color: emo.color,
              borderColor: `${emo.color}55`,
            }}
          >
            <span className="ai-emotion-emoji">{emo.emoji}</span>
            {emo.key}
          </span>
          <ScoreDots score={data.score || 3} />
        </div>
      </div>

      {data.comment && (
        <div className="diary-ai-section">
          <div className="diary-ai-section-title">💬 짧은 코멘트</div>
          <blockquote
            className="diary-ai-quote"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(data.comment) }}
          />
        </div>
      )}

      {data.activity && (
        <div className="diary-ai-section">
          <div className="diary-ai-section-title">🌱 추천 활동</div>
          <div className="diary-ai-rich">
            <p>{data.activity}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// 구버전: 마크다운 텍스트를 두 구역(감성 분석/짧은 코멘트)으로 렌더링
function LegacyBody({ text }) {
  if (!text) return null;
  const parsed = parseAiResult(text);
  return (
    <div className="diary-ai-body">
      {parsed.hasSections ? (
        <>
          {parsed.analysis && (
            <section className="diary-ai-section">
              <div className="diary-ai-section-title">📝 감성 분석</div>
              <div
                className="diary-ai-rich"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(parsed.analysis),
                }}
              />
            </section>
          )}
          {parsed.comment && (
            <section className="diary-ai-section">
              <div className="diary-ai-section-title">💬 짧은 코멘트</div>
              <blockquote
                className="diary-ai-quote"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(parsed.comment),
                }}
              />
            </section>
          )}
        </>
      ) : (
        <div
          className="diary-ai-rich"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
        />
      )}
    </div>
  );
}

export default AiResult;
