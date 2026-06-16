// src/utils/guideQuestions.js
// 일기 작성 화면에서 보여줄 "오늘의 질문" 목록과 선택 로직입니다.

export const GUIDE_QUESTIONS = [
  "오늘 가장 감사했던 일은 무엇인가요?",
  "오늘 나를 미소 짓게 한 순간은?",
  "오늘 만난 사람 중 기억에 남는 사람은?",
  "지금 가장 마음을 무겁게 하는 건 무엇인가요?",
  "오늘의 나에게 한마디 해준다면?",
  "내일의 나에게 바라는 점은?",
  "오늘 새롭게 배운 것이 있다면?",
  "최근 가장 설렜던 순간은?",
  "오늘 하루를 색으로 표현하면 무슨 색인가요?",
  "지금 가장 듣고 싶은 말은?",
  "오늘 나를 가장 힘들게 한 건 무엇이고, 어떻게 견뎠나요?",
  "오늘 하루 중 다시 돌아가고 싶은 순간은?",
];

// 같은 날엔 항상 같은 질문이 나오도록 날짜 기반으로 선택합니다.
export function questionForDate(date = new Date()) {
  const idx = date.getDate() % GUIDE_QUESTIONS.length;
  return GUIDE_QUESTIONS[idx];
}

// 현재 질문과 다른 질문을 무작위로 고릅니다.
export function randomQuestion(exclude) {
  if (GUIDE_QUESTIONS.length <= 1) return GUIDE_QUESTIONS[0];
  let q = exclude;
  while (q === exclude) {
    q = GUIDE_QUESTIONS[Math.floor(Math.random() * GUIDE_QUESTIONS.length)];
  }
  return q;
}
