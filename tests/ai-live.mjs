// tests/ai-live.mjs — 실제 OpenRouter 모델로 감성 분석 JSON 파이프라인 검증
import { readFileSync } from "node:fs";
import { buildAnalysisPrompt, parseAnalysis } from "../src/utils/aiAnalysis.js";
import { EMOTIONS } from "../src/utils/emotions.js";

// .env 파싱
const env = {};
for (const line of readFileSync(process.cwd() + "/.env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const KEY = env.VITE_OPENROUTER_API_KEY;
const MODEL = env.VITE_OPENROUTER_MODEL;
console.log("model:", MODEL);

const diary = "오늘 오랜만에 친구를 만나서 맛있는 저녁을 먹고 많이 웃었다. 헤어질 때 조금 아쉬웠지만 정말 행복한 하루였다.";

const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: MODEL,
    messages: [{ role: "user", content: buildAnalysisPrompt(diary, false) }],
  }),
});

console.log("HTTP", res.status);
if (!res.ok) {
  console.log("FAIL: API error", await res.text());
  process.exit(1);
}
const data = await res.json();
const raw = data?.choices?.[0]?.message?.content || "";
console.log("\n--- raw model output ---\n" + raw + "\n------------------------");

const parsed = parseAnalysis(raw);
console.log("\nparsed:", JSON.stringify(parsed, null, 2));

let ok = true;
const emotionKeys = EMOTIONS.map((e) => e.key);
function chk(name, cond) {
  console.log((cond ? "  ✓ " : "  ✗ ") + name);
  if (!cond) ok = false;
}
chk("JSON 파싱 성공(parsed=true)", parsed.parsed === true);
chk("emotion이 8개 중 하나", emotionKeys.includes(parsed.emotion));
chk("score 1~5 범위", parsed.score >= 1 && parsed.score <= 5);
chk("comment 비어있지 않음", !!parsed.comment);
chk("activity 존재", typeof parsed.activity === "string");
console.log(ok ? "\nAI 파이프라인 OK ✅" : "\nAI 파이프라인 실패 ❌");
process.exit(ok ? 0 : 1);
