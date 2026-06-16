// src/utils/stats.js
// 감정 통계 대시보드(Stats.jsx)를 위한 순수 집계 함수들입니다.
// 외부 의존성이 없어 단위 테스트하기 좋습니다.
import { EMOTIONS, DEFAULT_EMOTION } from "./emotions";

// 다양한 형태의 createdAt(Firestore Timestamp / Date / number)를 ms로 변환합니다.
export function toMillis(createdAt) {
  if (!createdAt) return null;
  if (typeof createdAt === "number") return createdAt;
  if (typeof createdAt.toMillis === "function") return createdAt.toMillis();
  if (createdAt instanceof Date) return createdAt.getTime();
  return null;
}

// Firestore 문서 배열을 통계용으로 정규화합니다.
// emotion/score가 없는 구버전 일기는 평온/3점으로 처리합니다.
export function normalize(diaries) {
  return (diaries || []).map((d) => {
    const ms = toMillis(d.createdAt);
    const score = Number(d.score);
    return {
      emotion: d.emotion || DEFAULT_EMOTION,
      score: Number.isFinite(score) ? Math.min(5, Math.max(1, score)) : 3,
      ms,
    };
  });
}

// 카드 1 — 이번 달 요약: 총 개수, 평균 점수, 가장 자주 느낀 감정
export function summarize(diaries) {
  const items = normalize(diaries);
  const count = items.length;
  if (count === 0) {
    return { count: 0, avgScore: 0, topEmotion: null };
  }
  const avgScore =
    Math.round((items.reduce((s, i) => s + i.score, 0) / count) * 10) / 10;
  const dist = distribution(diaries);
  const top = [...dist].sort((a, b) => b.count - a.count)[0];
  return { count, avgScore, topEmotion: top && top.count > 0 ? top : null };
}

// 카드 2 — 감정 분포: 8가지 감정별 횟수 (EMOTIONS 순서 유지)
export function distribution(diaries) {
  const items = normalize(diaries);
  const counts = Object.fromEntries(EMOTIONS.map((e) => [e.key, 0]));
  for (const i of items) {
    if (counts[i.emotion] === undefined) counts[i.emotion] = 0;
    counts[i.emotion] += 1;
  }
  return EMOTIONS.map((e) => ({
    key: e.key,
    emoji: e.emoji,
    color: e.color,
    count: counts[e.key],
  }));
}

// 카드 3 — 최근 N일 감정 점수 추이.
// 같은 날 일기가 여러 개면 평균을 내고, 날짜 오름차순으로 정렬합니다.
export function recentTrend(diaries, days = 14) {
  const items = normalize(diaries).filter((i) => i.ms != null);
  const byDay = new Map(); // 'YYYY-M-D' → { sum, n, ms }
  for (const i of items) {
    const d = new Date(i.ms);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const prev = byDay.get(key) || { sum: 0, n: 0, ms: i.ms };
    prev.sum += i.score;
    prev.n += 1;
    prev.ms = Math.min(prev.ms, i.ms);
    byDay.set(key, prev);
  }
  const points = [...byDay.entries()]
    .map(([key, v]) => ({
      key,
      ms: v.ms,
      score: Math.round((v.sum / v.n) * 10) / 10,
    }))
    .sort((a, b) => a.ms - b.ms);
  return points.slice(-days);
}

// 카드 4 — 가장 많이 등장한 감정 TOP n
export function topEmotions(diaries, n = 3) {
  return distribution(diaries)
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
