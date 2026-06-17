// src/components/ChatBot.jsx
// 따뜻한 감성 상담가 AI와 대화하는 채팅 화면입니다.
// 상담 내용은 '일별 세션'으로 저장/조회합니다 — 날짜 칩으로 지난 상담을 다시 볼 수 있고,
// 과거 날짜는 읽기 전용이며 오늘만 새 대화를 이어갈 수 있습니다.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { Copy, Mic, Trash2 } from "lucide-react";
import { db } from "../firebase";
import { renderMarkdown } from "../utils/aiMarkdown";
import { diariesOnDate, withDiaryContext } from "../utils/chatContext";
import { useVoiceInput } from "../hooks/useVoiceInput";
import Toast from "./Toast";
import "./ChatBot.css";

// OpenRouter 설정값 (.env 파일에서 불러옵니다)
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL;

const SYSTEM_PROMPT =
  "너는 따뜻한 감성 상담가야. 사용자의 일기와 대화를 바탕으로 공감하고 위로해줘. 한국어로 답변해.";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 날짜 → 'YYYY-MM-DD' 키
function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

// 날짜 키 → 표시 라벨 (오늘 / 어제 / M월 D일)
function dateLabel(key) {
  const today = toDateKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === today) return "오늘";
  if (key === toDateKey(y)) return "어제";
  const [, mo, da] = key.split("-");
  return `${+mo}월 ${+da}일`;
}

// 메시지의 정렬용 시간(ms)
function msgTime(m) {
  if (m.timestamp?.toMillis) return m.timestamp.toMillis();
  return m._localTime || 0;
}

// OpenRouter 호출. 무료 모델은 가끔 429가 나므로 짧게 재시도합니다.
async function requestChat(conversation, systemPrompt, retries = 2) {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversation.map(({ role, content }) => ({ role, content })),
      ],
    }),
  });

  if (response.status === 429 && retries > 0) {
    await wait(1500);
    return requestChat(conversation, systemPrompt, retries - 1);
  }
  return response;
}

function ChatBot({ user }) {
  const todayKey = toDateKey(new Date());

  const [allMessages, setAllMessages] = useState([]); // 전체 메시지 (dateKey 포함)
  const [diaries, setDiaries] = useState([]); // 오늘 일기 맥락용 (상담가가 참고)
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const bottomRef = useRef(null);

  // 🎤 음성 입력 — 전사된 텍스트를 입력창에 덧붙임
  const appendVoice = useCallback((text) => {
    setInput((v) => (v ? `${v} ${text}` : text));
  }, []);
  const voice = useVoiceInput(appendVoice);

  // 이전 대화 기록 로드 — dateKey가 없는 구버전 메시지는 timestamp에서 유추
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "chatMessages"), where("userId", "==", user.uid))
        );
        const history = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            let dateKey = data.dateKey;
            if (!dateKey && data.timestamp?.toDate) {
              dateKey = toDateKey(data.timestamp.toDate());
            }
            return { id: doc.id, ...data, dateKey };
          })
          .sort((a, b) => msgTime(a) - msgTime(b));
        setAllMessages(history);
      } catch (err) {
        console.error(err);
        setError("대화 기록을 불러오지 못했어요.");
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [user.uid]);

  // 오늘 작성한 일기를 불러와 상담가가 맥락으로 참고하게 합니다.
  useEffect(() => {
    const loadTodayDiaries = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "diaries"), where("userId", "==", user.uid))
        );
        setDiaries(snapshot.docs.map((d) => d.data()));
      } catch (err) {
        console.error(err);
      }
    };
    loadTodayDiaries();
  }, [user.uid]);

  const todayDiaries = useMemo(
    () => diariesOnDate(diaries, todayKey),
    [diaries, todayKey]
  );
  const systemPrompt = useMemo(
    () => withDiaryContext(SYSTEM_PROMPT, todayDiaries),
    [todayDiaries]
  );

  // 대화가 있는 날짜 목록 (최신순) + 항상 오늘 포함
  const dates = useMemo(() => {
    const set = new Set(allMessages.map((m) => m.dateKey).filter(Boolean));
    set.add(todayKey);
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [allMessages, todayKey]);

  // 선택한 날짜의 메시지
  const visibleMessages = useMemo(
    () => allMessages.filter((m) => m.dateKey === selectedDate),
    [allMessages, selectedDate]
  );

  const isToday = selectedDate === todayKey;

  // 메시지 추가/입력 시 맨 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, sending]);

  // Firestore 저장 (dateKey 포함)
  const saveMessage = async (role, content) => {
    try {
      await addDoc(collection(db, "chatMessages"), {
        userId: user.uid,
        role,
        content,
        dateKey: todayKey,
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !isToday) return;

    setError("");
    setInput("");

    const now = Date.now();
    const userMessage = {
      role: "user",
      content: text,
      dateKey: todayKey,
      _localTime: now,
    };
    // 오늘 대화 맥락 (AI에 전달)
    const todayConvo = [
      ...allMessages.filter((m) => m.dateKey === todayKey),
      userMessage,
    ];
    setAllMessages((prev) => [...prev, userMessage]);
    saveMessage("user", text);

    setSending(true);
    try {
      const response = await requestChat(todayConvo, systemPrompt);
      if (response.status === 429) {
        setError("지금 AI가 잠시 붐비고 있어요. 잠시 후 다시 보내 주세요 🙏");
        return;
      }
      if (!response.ok) throw new Error(`API 응답 오류 (${response.status})`);

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error("AI 응답이 비어 있어요.");

      setAllMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          dateKey: todayKey,
          _localTime: Date.now(),
        },
      ]);
      saveMessage("assistant", reply);
    } catch (err) {
      console.error(err);
      setError("답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  // 현재 보고 있는 날짜의 대화를 클립보드에 복사
  const handleCopy = async () => {
    if (visibleMessages.length === 0) return;
    const text = visibleMessages
      .map((m) => `${m.role === "user" ? "🙋 나" : "💗 AI"}: ${m.content}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setToast("대화를 복사했어요");
    } catch {
      setToast("복사에 실패했어요");
    }
  };

  // 현재 보고 있는 날짜의 대화 전체 삭제 (Firestore + 로컬)
  const handleDeleteSession = async () => {
    try {
      // 1) 화면에 있는 문서(id 보유)를 삭제
      const ids = visibleMessages.filter((m) => m.id).map((m) => m.id);
      await Promise.all(ids.map((id) => deleteDoc(doc(db, "chatMessages", id))));
      // 2) 같은 날 보낸 직후 메시지까지 확실히 정리 (dateKey 기준 재조회)
      try {
        const snap = await getDocs(
          query(
            collection(db, "chatMessages"),
            where("userId", "==", user.uid),
            where("dateKey", "==", selectedDate)
          )
        );
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      } catch {
        /* 인덱스/권한 문제 시 1단계 삭제로 충분 */
      }

      setAllMessages((prev) => prev.filter((m) => m.dateKey !== selectedDate));
      setConfirmDelete(false);
      setSelectedDate(todayKey);
      setToast("대화를 삭제했어요");
    } catch (err) {
      console.error(err);
      setConfirmDelete(false);
      setToast("삭제에 실패했어요");
    }
  };

  return (
    <div className="chatbot">
      <div className="chatbot-header">
        <div className="chatbot-header-title-wrap">
          <span className="chatbot-header-icon" aria-hidden="true">💗</span>
          <span className="chatbot-header-title">AI 감성 상담가</span>
        </div>
        {visibleMessages.length > 0 && (
          <div className="chatbot-header-actions">
            <button
              type="button"
              className="chatbot-header-btn"
              onClick={handleCopy}
              aria-label="대화 복사"
              title="대화 복사"
            >
              <Copy size={17} />
            </button>
            <button
              type="button"
              className="chatbot-header-btn"
              onClick={() => setConfirmDelete(true)}
              aria-label="대화 삭제"
              title="대화 삭제"
            >
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </div>

      {/* 일별 세션 날짜 칩 */}
      {!loadingHistory && (
        <div className="chat-dates">
          {dates.map((key) => (
            <button
              key={key}
              type="button"
              className={`chat-date-chip ${
                selectedDate === key ? "active" : ""
              }`}
              onClick={() => setSelectedDate(key)}
            >
              {dateLabel(key)}
            </button>
          ))}
        </div>
      )}

      <div className="chatbot-messages">
        {loadingHistory && <p className="chatbot-info">대화를 불러오는 중...</p>}

        {!loadingHistory && visibleMessages.length === 0 && (
          <div className="chatbot-welcome">
            <div className="chatbot-welcome-emoji">🌷</div>
            <p>
              {isToday ? (
                <>
                  안녕하세요, 마음을 나눠 주세요.
                  <br />
                  오늘 어떤 하루를 보내셨나요?
                </>
              ) : (
                <>이 날에는 상담 기록이 없어요.</>
              )}
            </p>
          </div>
        )}

        {visibleMessages.map((message, index) => (
          <div
            key={message.id || index}
            className={`chat-row ${
              message.role === "user" ? "chat-row-user" : "chat-row-ai"
            }`}
          >
            {message.role === "user" ? (
              <div className="chat-bubble chat-bubble-user">
                {message.content}
              </div>
            ) : (
              <div
                className="chat-bubble chat-bubble-ai chat-markdown"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(message.content),
                }}
              />
            )}
          </div>
        ))}

        {sending && (
          <div className="chat-row chat-row-ai">
            <div className="chat-bubble chat-bubble-ai chat-typing">
              <span className="chat-dot" />
              <span className="chat-dot" />
              <span className="chat-dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && <p className="chatbot-error">{error}</p>}

      {/* 오늘만 입력 가능, 과거 세션은 읽기 전용 */}
      {isToday ? (
        <div className="chatbot-input-bar">
          {voice.supported && (
            <button
              type="button"
              className={`chatbot-mic-button ${voice.recording ? "recording" : ""}`}
              onClick={voice.toggle}
              disabled={voice.busy}
              aria-label={voice.recording ? "녹음 종료" : "음성 입력"}
              title={voice.recording ? "녹음 종료" : "음성 입력"}
            >
              <Mic size={18} />
            </button>
          )}
          <textarea
            className="chatbot-input"
            placeholder={
              voice.recording
                ? "● 녹음 중..."
                : voice.busy
                ? "음성 변환 중..."
                : "마음을 들려주세요..."
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            type="button"
            className="chatbot-send-button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
          >
            전송
          </button>
        </div>
      ) : (
        <div className="chat-readonly-bar">
          <span>지난 상담은 읽기 전용이에요</span>
          <button
            type="button"
            className="chat-today-button"
            onClick={() => setSelectedDate(todayKey)}
          >
            오늘 상담하기
          </button>
        </div>
      )}

      {/* 대화 삭제 확인 모달 */}
      {confirmDelete && (
        <div
          className="diary-modal-overlay"
          onClick={() => setConfirmDelete(false)}
        >
          <div className="diary-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="diary-confirm-icon">🗑</div>
            <h3 className="diary-confirm-title">이 대화를 삭제할까요?</h3>
            <p className="diary-confirm-desc">
              {dateLabel(selectedDate)} 상담 기록이 모두 지워져요. 되돌릴 수 없어요.
            </p>
            <div className="diary-confirm-buttons">
              <button
                type="button"
                className="diary-confirm-cancel"
                onClick={() => setConfirmDelete(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="diary-confirm-delete"
                onClick={handleDeleteSession}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toast} onDone={() => setToast("")} />
    </div>
  );
}

export default ChatBot;
