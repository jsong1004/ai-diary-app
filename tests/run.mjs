// tests/run.mjs
// 순수 로직 단위 테스트 (외부 프레임워크 없이 node로 실행: `node tests/run.mjs`)
import assert from "node:assert/strict";

import { weatherFromCode } from "../src/utils/weather.js";
import { parseAnalysis, buildAnalysisPrompt } from "../src/utils/aiAnalysis.js";
import {
  summarize,
  distribution,
  recentTrend,
  topEmotions,
} from "../src/utils/stats.js";
import { filterDiaries, highlightParts } from "../src/utils/search.js";
import { getEmotion, EMOTIONS } from "../src/utils/emotions.js";
import {
  renderMarkdown,
  parseAiResult,
  stripMarkdown,
} from "../src/utils/aiMarkdown.js";
import {
  buildImageRequestBody,
  extractImageUrl,
} from "../src/utils/coverImage.js";
import {
  GUIDE_QUESTIONS,
  questionForDate,
  randomQuestion,
} from "../src/utils/guideQuestions.js";
import {
  shouldFire,
  pickMessage,
  hhmm,
  dayKey,
  DEFAULT_MESSAGE,
} from "../src/utils/notify.js";
import {
  periodRange,
  filterByPeriod,
  buildMarkdown,
  buildChatMarkdown,
} from "../src/utils/exportDiary.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("weather.weatherFromCode");
test("clear → sunny", () => assert.equal(weatherFromCode(0).key, "sunny"));
test("overcast → cloudy", () => assert.equal(weatherFromCode(3).key, "cloudy"));
test("rain → rain", () => assert.equal(weatherFromCode(61).key, "rain"));
test("snow → snow", () => assert.equal(weatherFromCode(75).key, "snow"));
test("thunder → thunder", () =>
  assert.equal(weatherFromCode(95).key, "thunder"));
test("unknown → cloudy fallback", () =>
  assert.equal(weatherFromCode(999).key, "cloudy"));
test("has gradient + icon", () => {
  const w = weatherFromCode(0);
  assert.ok(w.gradient.includes("linear-gradient"));
  assert.ok(w.icon.length > 0);
});

console.log("aiAnalysis.parseAnalysis");
test("parses clean JSON", () => {
  const r = parseAnalysis(
    '{"emotion":"기쁨","score":5,"comment":"좋아요","activity":"산책"}'
  );
  assert.equal(r.emotion, "기쁨");
  assert.equal(r.score, 5);
  assert.equal(r.comment, "좋아요");
  assert.equal(r.activity, "산책");
  assert.equal(r.parsed, true);
});
test("extracts JSON from surrounding text/codefence", () => {
  const r = parseAnalysis(
    '```json\n{"emotion":"슬픔","score":2,"comment":"힘내요"}\n```'
  );
  assert.equal(r.emotion, "슬픔");
  assert.equal(r.score, 2);
});
test("clamps out-of-range score", () => {
  assert.equal(parseAnalysis('{"emotion":"평온","score":9}').score, 5);
  assert.equal(parseAnalysis('{"emotion":"평온","score":-3}').score, 1);
});
test("falls back on invalid JSON", () => {
  const r = parseAnalysis("그냥 텍스트입니다");
  assert.equal(r.emotion, "평온");
  assert.equal(r.score, 3);
  assert.equal(r.parsed, false);
});
test("handles empty/null", () => {
  assert.equal(parseAnalysis("").emotion, "평온");
  assert.equal(parseAnalysis(null).score, 3);
});
test("prompt includes image field only when requested", () => {
  assert.ok(!buildAnalysisPrompt("hi", false).includes("imagePrompt"));
  assert.ok(buildAnalysisPrompt("hi", true).includes("imagePrompt"));
});

console.log("emotions");
test("all 8 emotions present", () => assert.equal(EMOTIONS.length, 8));
test("unknown emotion → 평온", () =>
  assert.equal(getEmotion("없는감정").key, "평온"));
test("known emotion lookup", () =>
  assert.equal(getEmotion("기쁨").emoji, "😊"));

console.log("stats");
const sample = [
  { emotion: "기쁨", score: 5, createdAt: 1000 },
  { emotion: "기쁨", score: 4, createdAt: 2000 },
  { emotion: "슬픔", score: 2, createdAt: 3000 },
  { emotion: undefined, score: undefined, createdAt: 4000 }, // 구버전 → 평온/3
];
test("summarize counts + avg + top", () => {
  const s = summarize(sample);
  assert.equal(s.count, 4);
  assert.equal(s.avgScore, 3.5); // (5+4+2+3)/4
  assert.equal(s.topEmotion.key, "기쁨");
});
test("summarize empty", () => {
  const s = summarize([]);
  assert.equal(s.count, 0);
  assert.equal(s.topEmotion, null);
});
test("distribution counts per emotion", () => {
  const d = distribution(sample);
  assert.equal(d.find((x) => x.key === "기쁨").count, 2);
  assert.equal(d.find((x) => x.key === "슬픔").count, 1);
  assert.equal(d.find((x) => x.key === "평온").count, 1);
});
test("recentTrend averages per day, sorted asc", () => {
  const t = recentTrend(
    [
      { emotion: "기쁨", score: 4, createdAt: new Date("2026-06-10").getTime() },
      { emotion: "기쁨", score: 2, createdAt: new Date("2026-06-10").getTime() },
      { emotion: "슬픔", score: 5, createdAt: new Date("2026-06-11").getTime() },
    ],
    14
  );
  assert.equal(t.length, 2);
  assert.equal(t[0].score, 3); // (4+2)/2
  assert.ok(t[0].ms < t[1].ms);
});
test("topEmotions returns sorted top n", () => {
  const top = topEmotions(sample, 2);
  assert.equal(top[0].key, "기쁨");
  assert.equal(top.length, 2);
});

console.log("search");
const diaries = [
  { content: "오늘 행복한 하루", comment: "좋네요", emotion: "기쁨" },
  { content: "비가 와서 우울", comment: "힘내요", emotion: "슬픔" },
  { content: "그냥 평범한 날", aiComment: "행복하세요", emotion: "평온" },
];
test("filter by term (content)", () => {
  assert.equal(filterDiaries(diaries, { term: "우울" }).length, 1);
});
test("filter by term searches comment too", () => {
  assert.equal(filterDiaries(diaries, { term: "행복" }).length, 2); // content + aiComment
});
test("filter by emotion", () => {
  assert.equal(filterDiaries(diaries, { emotion: "슬픔" }).length, 1);
});
test("filter term + emotion = AND", () => {
  assert.equal(
    filterDiaries(diaries, { term: "행복", emotion: "기쁨" }).length,
    1
  );
});
test("empty filter returns all", () => {
  assert.equal(filterDiaries(diaries, {}).length, 3);
});
test("highlightParts splits matches", () => {
  const parts = highlightParts("행복한 행복", "행복");
  const matches = parts.filter((p) => p.match);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].text, "행복");
});
test("highlightParts no term = single part", () => {
  assert.equal(highlightParts("abc", "").length, 1);
});

console.log("aiMarkdown");
test("renders bold + heading", () => {
  const html = renderMarkdown("### 제목\n**굵게**");
  assert.ok(html.includes("<h3>제목</h3>"));
  assert.ok(html.includes("<strong>굵게</strong>"));
});
test("escapes HTML (XSS)", () => {
  const html = renderMarkdown("<script>alert(1)</script>");
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});
test("parseAiResult splits sections", () => {
  const r = parseAiResult("### 감성 분석\n기쁨\n### 짧은 코멘트\n> 좋아요");
  assert.ok(r.analysis.includes("기쁨"));
  assert.ok(r.comment.includes("좋아요"));
  assert.equal(r.hasSections, true);
});
test("stripMarkdown removes symbols", () => {
  assert.equal(stripMarkdown("### 제목 **굵게**"), "제목 굵게");
});

console.log("coverImage");
test("buildImageRequestBody shape", () => {
  const body = buildImageRequestBody("a cat");
  assert.deepEqual(body.modalities, ["image", "text"]);
  assert.equal(body.messages[0].content, "a cat");
  assert.ok(body.model.includes("gemini"));
});
test("extractImageUrl reads nested url", () => {
  const url = extractImageUrl({
    choices: [{ message: { images: [{ image_url: { url: "data:abc" } }] } }],
  });
  assert.equal(url, "data:abc");
});
test("extractImageUrl null when missing", () => {
  assert.equal(extractImageUrl({ choices: [{ message: {} }] }), null);
});

console.log("guideQuestions");
test("12 questions", () => assert.equal(GUIDE_QUESTIONS.length, 12));
test("questionForDate deterministic per date", () => {
  const d = new Date("2026-06-15");
  assert.equal(questionForDate(d), questionForDate(d));
});
test("randomQuestion differs from exclude", () => {
  const q = GUIDE_QUESTIONS[0];
  for (let i = 0; i < 20; i++) assert.notEqual(randomQuestion(q), q);
});

console.log("notify");
test("hhmm pads", () => assert.equal(hhmm(new Date(2026, 5, 1, 9, 5)), "09:05"));
test("dayKey format", () =>
  assert.equal(dayKey(new Date(2026, 5, 1)), "2026-6-1"));
test("shouldFire true when time matches and not sent", () => {
  const now = new Date(2026, 5, 1, 21, 0);
  assert.equal(
    shouldFire({ enabled: true, time: "21:00" }, now, "2026-6-2"),
    true
  );
});
test("shouldFire false when disabled", () => {
  const now = new Date(2026, 5, 1, 21, 0);
  assert.equal(shouldFire({ enabled: false, time: "21:00" }, now, ""), false);
});
test("shouldFire false when already sent today", () => {
  const now = new Date(2026, 5, 1, 21, 0);
  assert.equal(
    shouldFire({ enabled: true, time: "21:00" }, now, "2026-6-1"),
    false
  );
});
test("shouldFire false when time mismatch", () => {
  const now = new Date(2026, 5, 1, 20, 0);
  assert.equal(shouldFire({ enabled: true, time: "21:00" }, now, ""), false);
});
test("pickMessage returns custom when not random", () =>
  assert.equal(pickMessage({ message: "hi", random: false }), "hi"));
test("pickMessage default fallback", () =>
  assert.equal(pickMessage({}), DEFAULT_MESSAGE));

console.log("exportDiary");
const exDiaries = [
  { content: "6월 일기", emotion: "기쁨", score: 4, comment: "좋아요", createdAt: new Date("2026-06-10").getTime() },
  { content: "1월 일기", emotion: "슬픔", score: 2, createdAt: new Date("2026-01-05").getTime() },
];
test("periodRange month start", () => {
  const [start] = periodRange("month", new Date("2026-06-15").getTime());
  assert.equal(new Date(start).getMonth(), 5);
  assert.equal(new Date(start).getDate(), 1);
});
test("filterByPeriod month keeps only June", () => {
  const r = filterByPeriod(exDiaries, "month", { now: new Date("2026-06-15").getTime() });
  assert.equal(r.length, 1);
  assert.equal(r[0].content, "6월 일기");
});
test("filterByPeriod all keeps both, sorted desc", () => {
  const r = filterByPeriod(exDiaries, "all");
  assert.equal(r.length, 2);
  assert.equal(r[0].content, "6월 일기");
});
test("buildMarkdown includes heading, emotion, comment", () => {
  const md = buildMarkdown(exDiaries, { title: "나의 일기", includeAi: true });
  assert.ok(md.includes("# 나의 일기"));
  assert.ok(md.includes("😊 기쁨 (4/5)"));
  assert.ok(md.includes("> 💬 AI 코멘트"));
  assert.ok(md.includes("6월 일기"));
});
test("buildMarkdown excludes AI when includeAi=false", () => {
  const md = buildMarkdown(exDiaries, { includeAi: false });
  assert.ok(!md.includes("AI 코멘트"));
});
test("buildChatMarkdown formats roles", () => {
  const md = buildChatMarkdown([
    { role: "user", content: "안녕" },
    { role: "assistant", content: "반가워요" },
  ]);
  assert.ok(md.includes("🙋 나"));
  assert.ok(md.includes("💗 AI"));
  assert.ok(md.includes("대화 기록"));
});
test("buildChatMarkdown empty → empty string", () =>
  assert.equal(buildChatMarkdown([]), ""));

console.log(`\n${passed} assertions passed.`);
if (process.exitCode === 1) {
  console.error("\nSOME TESTS FAILED");
} else {
  console.log("ALL TESTS PASSED ✅");
}
