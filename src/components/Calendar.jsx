// src/components/Calendar.jsx
// 월간 캘린더 뷰 — 외부 라이브러리 없이 Date 계산으로 직접 그립니다.
// 일기를 쓴 날에는 감정 이모지를 표시하고, 클릭하면 상세/작성으로 이동합니다.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "../firebase";
import AiResult from "./AiResult";
import { getEmotion } from "../utils/emotions";
import { summarize } from "../utils/stats";
import "./Calendar.css";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function dayKey(y, m, d) {
  return `${y}-${m}-${d}`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function Calendar({ user }) {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState([]);
  const [view, setView] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(null); // {label, items}

  useEffect(() => {
    const q = query(
      collection(db, "diaries"),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setDiaries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error(err)
    );
    return () => unsub();
  }, [user.uid]);

  // 날짜별 일기 묶음 (key: 'y-m-d')
  const byDay = useMemo(() => {
    const map = new Map();
    for (const d of diaries) {
      const ms = d.createdAt?.toMillis ? d.createdAt.toMillis() : null;
      if (ms == null) continue;
      const dt = new Date(ms);
      const key = dayKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const arr = map.get(key) || [];
      arr.push({ ...d, _ms: ms });
      map.set(key, arr);
    }
    return map;
  }, [diaries]);

  // 이번 달 일기 (요약 바용)
  const monthDiaries = useMemo(
    () =>
      diaries.filter((d) => {
        const ms = d.createdAt?.toMillis ? d.createdAt.toMillis() : null;
        if (ms == null) return false;
        const dt = new Date(ms);
        return dt.getFullYear() === view.year && dt.getMonth() === view.month;
      }),
    [diaries, view]
  );
  const summary = useMemo(() => summarize(monthDiaries), [monthDiaries]);

  // 42칸(6주) 그리드
  const cells = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const start = new Date(view.year, view.month, 1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      return dt;
    });
  }, [view]);

  const today = new Date();
  const isToday = (dt) =>
    dt.getFullYear() === today.getFullYear() &&
    dt.getMonth() === today.getMonth() &&
    dt.getDate() === today.getDate();

  const move = (delta) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const goToday = () =>
    setView({ year: today.getFullYear(), month: today.getMonth() });

  // 대표 일기(점수 높은 것, 동점이면 최신)
  const representative = (items) =>
    [...items].sort((a, b) => (b.score || 0) - (a.score || 0) || b._ms - a._ms)[0];

  const handleCellClick = (dt) => {
    const key = dayKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const items = byDay.get(key);
    if (items && items.length) {
      setSelectedDay({
        label: `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일`,
        items: [...items].sort((a, b) => b._ms - a._ms),
      });
    } else {
      const ymd = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(
        dt.getDate()
      )}`;
      navigate(`/write?date=${ymd}`);
    }
  };

  return (
    <div className="calendar-page">
      <div className="calendar-head">
        <button type="button" className="calendar-nav" onClick={() => move(-1)} aria-label="이전 달">
          <ChevronLeft size={20} />
        </button>
        <div className="calendar-title">
          {view.year}년 {view.month + 1}월
        </div>
        <button type="button" className="calendar-nav" onClick={() => move(1)} aria-label="다음 달">
          <ChevronRight size={20} />
        </button>
        <button type="button" className="calendar-today" onClick={goToday}>
          오늘
        </button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`calendar-weekday ${i === 0 ? "sun" : ""} ${
              i === 6 ? "sat" : ""
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((dt, i) => {
          const inMonth = dt.getMonth() === view.month;
          const key = dayKey(dt.getFullYear(), dt.getMonth(), dt.getDate());
          const items = byDay.get(key);
          const rep = items && representative(items);
          const emo = rep && rep.emotion ? getEmotion(rep.emotion) : null;
          return (
            <button
              type="button"
              key={i}
              className={`calendar-cell ${inMonth ? "" : "muted"} ${
                items ? "has-diary" : ""
              } ${isToday(dt) ? "today" : ""}`}
              onClick={() => handleCellClick(dt)}
            >
              <span className="calendar-daynum">{dt.getDate()}</span>
              {emo && <span className="calendar-emoji">{emo.emoji}</span>}
            </button>
          );
        })}
      </div>

      {/* 하단 요약 바 */}
      <div className="calendar-summary">
        <div>
          <span className="calendar-summary-num">{summary.count}</span> 일기
        </div>
        <div>
          평균{" "}
          <span className="calendar-summary-num">{summary.avgScore || "-"}</span>
        </div>
        <div>
          최다{" "}
          <span className="calendar-summary-num">
            {summary.topEmotion ? summary.topEmotion.emoji : "—"}
          </span>
        </div>
      </div>

      {/* 상세 모달 */}
      {selectedDay && (
        <div className="diary-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="diary-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="diary-modal-close"
              onClick={() => setSelectedDay(null)}
              aria-label="닫기"
            >
              ✕
            </button>
            <span className="diary-modal-date">{selectedDay.label}</span>
            {selectedDay.items.map((d, idx) => (
              <div key={d.id} style={idx > 0 ? { marginTop: 24 } : undefined}>
                <h2 className="diary-modal-heading">오늘의 일기</h2>
                <p className="diary-modal-content">{d.content}</p>
                {(d.emotion || d.aiComment || d.comment) && <AiResult data={d} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
