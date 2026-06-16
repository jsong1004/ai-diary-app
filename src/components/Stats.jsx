// src/components/Stats.jsx
// 감정 통계 대시보드 — 최근 30일 일기를 분석해 4개 카드로 보여줍니다.
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import {
  summarize,
  distribution,
  recentTrend,
  topEmotions,
} from "../utils/stats";
import { getEmotion } from "../utils/emotions";
import "./Stats.css";

const DAY = 24 * 60 * 60 * 1000;
const MEDALS = ["🥇", "🥈", "🥉"];

// 최근 14일 점수 추이를 SVG 선 그래프로 그립니다. (외부 라이브러리 없음)
function TrendChart({ points }) {
  const W = 300;
  const H = 120;
  const PAD = 16;

  if (points.length === 0) {
    return <p className="stats-empty-mini">데이터가 부족해요</p>;
  }

  const xStep =
    points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const yFor = (score) => {
    // score 1~5 → 아래(높은 y)~위(낮은 y)
    const ratio = (score - 1) / 4;
    return H - PAD - ratio * (H - PAD * 2);
  };
  const coords = points.map((p, i) => ({
    x: PAD + i * xStep,
    y: yFor(p.score),
  }));
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      className="stats-trend-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="최근 감정 점수 추이"
    >
      {/* 기준선 (3점) */}
      <line
        x1={PAD}
        y1={yFor(3)}
        x2={W - PAD}
        y2={yFor(3)}
        className="stats-trend-base"
      />
      <path d={linePath} className="stats-trend-line" fill="none" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="3.5" className="stats-trend-dot" />
      ))}
    </svg>
  );
}

function Stats({ user }) {
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  // 마운트 시점의 "지금"을 한 번만 고정 (렌더 순수성 유지)
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const q = query(
      collection(db, "diaries"),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDiaries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user.uid]);

  // 최근 30일치만 사용
  const recent = useMemo(() => {
    const cutoff = now - 30 * DAY;
    return diaries.filter((d) => {
      const ms = d.createdAt?.toMillis ? d.createdAt.toMillis() : null;
      return ms == null || ms >= cutoff;
    });
  }, [diaries, now]);

  const summary = useMemo(() => summarize(recent), [recent]);
  const dist = useMemo(() => distribution(recent), [recent]);
  const trend = useMemo(() => recentTrend(recent, 14), [recent]);
  const top3 = useMemo(() => topEmotions(recent, 3), [recent]);
  const maxCount = Math.max(1, ...dist.map((d) => d.count));

  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-empty">
          <span className="diary-list-spinner" aria-hidden="true" />
          <p>통계를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (recent.length === 0) {
    return (
      <div className="stats-page">
        <h1 className="stats-title">📊 감정 통계</h1>
        <div className="stats-empty">
          <div className="stats-empty-emoji">🌱</div>
          <p>아직 일기가 없어요. 첫 일기를 써보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <h1 className="stats-title">📊 감정 통계</h1>
      <p className="stats-subtitle">최근 30일의 마음을 모아봤어요</p>

      <div className="stats-grid">
        {/* 카드 1 — 이번 달 요약 */}
        <div className="stats-card">
          <div className="stats-card-title">📅 이번 달 요약</div>
          <div className="stats-summary">
            <div className="stats-summary-item">
              <div className="stats-summary-value">{summary.count}</div>
              <div className="stats-summary-label">총 일기</div>
            </div>
            <div className="stats-summary-item">
              <div className="stats-summary-value">{summary.avgScore}</div>
              <div className="stats-summary-label">평균 점수</div>
            </div>
            <div className="stats-summary-item">
              <div className="stats-summary-value">
                {summary.topEmotion ? summary.topEmotion.emoji : "—"}
              </div>
              <div className="stats-summary-label">
                {summary.topEmotion ? summary.topEmotion.key : "최다 감정"}
              </div>
            </div>
          </div>
        </div>

        {/* 카드 2 — 감정 분포 막대그래프 */}
        <div className="stats-card">
          <div className="stats-card-title">📊 감정 분포</div>
          <div className="stats-bars">
            {dist.map((d) => (
              <div key={d.key} className="stats-bar-row">
                <span className="stats-bar-label">
                  {d.emoji} {d.key}
                </span>
                <div className="stats-bar-track">
                  <div
                    className="stats-bar-fill"
                    style={{
                      width: `${(d.count / maxCount) * 100}%`,
                      background: d.color,
                    }}
                  />
                </div>
                <span className="stats-bar-count">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 카드 3 — 최근 14일 점수 추이 */}
        <div className="stats-card">
          <div className="stats-card-title">📈 최근 감정 점수 추이</div>
          <TrendChart points={trend} />
          <div className="stats-trend-axis">
            <span>낮음(1)</span>
            <span>높음(5)</span>
          </div>
        </div>

        {/* 카드 4 — 감정 TOP 3 */}
        <div className="stats-card">
          <div className="stats-card-title">🏷 가장 많은 감정 TOP 3</div>
          <div className="stats-top">
            {top3.length === 0 && (
              <p className="stats-empty-mini">데이터가 부족해요</p>
            )}
            {top3.map((e, i) => {
              const emo = getEmotion(e.key);
              return (
                <div key={e.key} className="stats-top-row">
                  <span className="stats-top-medal">{MEDALS[i]}</span>
                  <span className="stats-top-emoji">{emo.emoji}</span>
                  <span className="stats-top-name">{e.key}</span>
                  <span className="stats-top-count">{e.count}회</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
