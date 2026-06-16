// src/hooks/useGuideQuestion.js
// "오늘의 질문" 카드 표시 여부(localStorage) + 현재 질문 관리 훅입니다.
import { useCallback, useState } from "react";
import { questionForDate, randomQuestion } from "../utils/guideQuestions";

const KEY = "hideGuideQuestion";

function loadHidden() {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function useGuideQuestion() {
  const [hidden, setHiddenState] = useState(loadHidden);
  const [question, setQuestion] = useState(() => questionForDate());

  const setHidden = useCallback((value) => {
    setHiddenState(value);
    try {
      localStorage.setItem(KEY, String(value));
    } catch {
      // 무시
    }
  }, []);

  const shuffle = useCallback(() => {
    setQuestion((q) => randomQuestion(q));
  }, []);

  return { hidden, setHidden, question, shuffle };
}
