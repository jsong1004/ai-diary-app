// tests/integration.mjs
// 실제 ai-diary-js Firestore에 테스트 유저로 붙어 새 기능들의 데이터 흐름을 검증합니다.
// 끝나면 생성한 모든 데이터를 삭제합니다.
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  deleteUser,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

import { summarize, distribution, recentTrend, topEmotions } from "../src/utils/stats.js";
import { filterDiaries } from "../src/utils/search.js";
import { filterByPeriod, buildMarkdown, buildChatMarkdown } from "../src/utils/exportDiary.js";
import { getEmotion } from "../src/utils/emotions.js";

const cfg = {
  apiKey: "AIzaSyCqI89aCAocXMN10AvLWOHMmxlFuR_e06Q",
  authDomain: "ai-diary-js.firebaseapp.com",
  projectId: "ai-diary-js",
  storageBucket: "ai-diary-js.firebasestorage.app",
  messagingSenderId: "660195078083",
  appId: "1:660195078083:web:c5dccf66a94f7e69d65776",
};

const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = "claude.tester@example.com";
const PASS = "REDACTED";

let pass = 0,
  fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

const DAY = 86400000;
function tsDaysAgo(d) {
  return Timestamp.fromDate(new Date(Date.now() - d * DAY));
}

async function main() {
  // --- 로그인 (없으면 생성) ---
  let uid;
  try {
    const c = await signInWithEmailAndPassword(auth, EMAIL, PASS);
    uid = c.user.uid;
    console.log("signed in existing test user");
  } catch {
    const c = await createUserWithEmailAndPassword(auth, EMAIL, PASS);
    uid = c.user.uid;
    console.log("created test user");
  }
  console.log("uid:", uid, "\n");

  const created = [];
  const chatIds = [];

  try {
    // --- 1. 쓰기: 다양한 감정/날짜의 일기 ---
    console.log("1. 일기 저장 (실제 Firestore 쓰기)");
    const seed = [
      { content: "오늘 발표가 잘 끝나서 행복했다", emotion: "기쁨", score: 5, comment: "**발표** 성공 축하해요", activity: "산책", createdAt: tsDaysAgo(0), coverImage: "" },
      { content: "비가 와서 조금 우울한 하루", emotion: "슬픔", score: 2, comment: "비 오는 날의 차분함", activity: "음악 감상", createdAt: tsDaysAgo(1), coverImage: "" },
      { content: "잔잔하고 평온한 하루였다", emotion: "평온", score: 3, comment: "휴식이 필요했어요", activity: "독서", createdAt: tsDaysAgo(5), coverImage: "" },
      { content: "오래전 감사했던 기록", emotion: "감사", score: 4, comment: "고마운 사람들", activity: "편지 쓰기", createdAt: tsDaysAgo(45), coverImage: "" },
    ];
    for (const s of seed) {
      const ref = await addDoc(collection(db, "diaries"), { ...s, userId: uid });
      created.push(ref.id);
    }
    check("4개 일기 저장됨", created.length === 4);

    // 챗봇 메시지
    for (const m of [
      { role: "user", content: "요즘 너무 지쳐요" },
      { role: "assistant", content: "충분히 잘하고 계세요" },
    ]) {
      const ref = await addDoc(collection(db, "chatMessages"), {
        ...m,
        userId: uid,
        timestamp: tsDaysAgo(0),
      });
      chatIds.push(ref.id);
    }
    check("2개 챗봇 메시지 저장됨", chatIds.length === 2);

    // 도시 설정 (앱은 localStorage 기본 + Firestore best-effort)
    try {
      await setDoc(doc(db, "users", uid), { city: "서울" }, { merge: true });
      console.log("  ℹ users Firestore 쓰기 가능 (규칙 허용됨)");
    } catch (e) {
      console.log(
        "  ℹ users Firestore 규칙이 막혀 있음(",
        e.code,
        ") → 앱은 localStorage로 도시 보존하므로 정상 동작"
      );
    }

    // --- 2. 읽기 ---
    console.log("\n2. 일기 읽기 (query userId)");
    const snap = await getDocs(
      query(collection(db, "diaries"), where("userId", "==", uid))
    );
    const diaries = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    check("내 일기 4개 조회됨", diaries.length === 4, `got ${diaries.length}`);

    // --- 3. 통계 (최근 30일) ---
    console.log("\n3. 통계 집계 (Stats 로직)");
    const recent = diaries.filter((d) => {
      const ms = d.createdAt?.toMillis ? d.createdAt.toMillis() : 0;
      return ms >= Date.now() - 30 * DAY;
    });
    check("30일 필터: 3개 (45일전 제외)", recent.length === 3, `got ${recent.length}`);
    const sum = summarize(recent);
    check("요약 count=3", sum.count === 3);
    check("요약 평균점수 계산됨", typeof sum.avgScore === "number" && sum.avgScore > 0);
    const dist = distribution(recent);
    check("분포: 기쁨 1건", dist.find((x) => x.key === "기쁨").count === 1);
    check("분포: 감사 0건 (30일밖)", dist.find((x) => x.key === "감사").count === 0);
    check("추이 데이터 존재", recentTrend(recent, 14).length >= 1);
    check("TOP 감정 존재", topEmotions(recent, 3).length >= 1);

    // --- 4. 캘린더 그룹핑 ---
    console.log("\n4. 캘린더 날짜 그룹핑");
    const byDay = new Map();
    for (const d of diaries) {
      const ms = d.createdAt?.toMillis ? d.createdAt.toMillis() : null;
      if (ms == null) continue;
      const dt = new Date(ms);
      const key = `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
      byDay.set(key, [...(byDay.get(key) || []), d]);
    }
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const todayItems = byDay.get(todayKey);
    check("오늘 칸에 일기 존재", !!todayItems && todayItems.length === 1);
    check("오늘 일기 감정 이모지 매핑", !!todayItems && getEmotion(todayItems[0].emotion).emoji === "😊");

    // --- 5. 검색 & 필터 ---
    console.log("\n5. 검색 & 감정 필터");
    check("검색 '우울' → 1건", filterDiaries(diaries, { term: "우울" }).length === 1);
    check("검색 '발표' → 1건", filterDiaries(diaries, { term: "발표" }).length === 1);
    check("감정 '기쁨' 필터 → 1건", filterDiaries(diaries, { emotion: "기쁨" }).length === 1);
    check("term+emotion AND → 0건", filterDiaries(diaries, { term: "우울", emotion: "기쁨" }).length === 0);

    // --- 6. 내보내기 ---
    console.log("\n6. 내보내기 (마크다운 + 챗봇)");
    const chatSnap = await getDocs(
      query(collection(db, "chatMessages"), where("userId", "==", uid))
    );
    const chat = chatSnap.docs
      .map((d) => d.data())
      .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));
    check("내보내기 'all' → 4편", filterByPeriod(diaries, "all").length === 4);
    check("내보내기 'month' 포함", filterByPeriod(diaries, "month").length >= 1);
    const md = buildMarkdown(filterByPeriod(diaries, "all"), { title: "테스트", includeAi: true });
    check("마크다운에 본문 포함", md.includes("발표가 잘 끝나"));
    check("마크다운에 감정뱃지 포함", md.includes("😊 기쁨 (5/5)"));
    check("마크다운에 AI코멘트 포함", md.includes("💬 AI 코멘트"));
    const chatMd = buildChatMarkdown(chat);
    check("챗봇 내보내기 포함", chatMd.includes("대화 기록") && chatMd.includes("지쳐"));

    // --- 7. 삭제 ---
    console.log("\n7. 삭제 (deleteDoc)");
    await deleteDoc(doc(db, "diaries", created[0]));
    const afterDel = await getDocs(
      query(collection(db, "diaries"), where("userId", "==", uid))
    );
    check("삭제 후 3개 남음", afterDel.docs.length === 3, `got ${afterDel.docs.length}`);
  } catch (e) {
    fail++;
    console.log("\n  ✗ 통합 테스트 중 오류:", e.code || e.message);
  } finally {
    // --- 정리: 생성한 모든 데이터 삭제 ---
    console.log("\n8. 정리 (생성 데이터 삭제)");
    let cleaned = 0;
    const all = await getDocs(
      query(collection(db, "diaries"), where("userId", "==", uid))
    );
    for (const d of all.docs) {
      await deleteDoc(d.ref);
      cleaned++;
    }
    for (const id of chatIds) {
      try {
        await deleteDoc(doc(db, "chatMessages", id));
      } catch {
        /* 무시 */
      }
    }
    try {
      await deleteDoc(doc(db, "users", uid));
    } catch {
      /* 무시 */
    }
    const verify = await getDocs(
      query(collection(db, "diaries"), where("userId", "==", uid))
    );
    check("정리 완료 (남은 일기 0)", verify.empty, `남음 ${verify.size}`);
    console.log(`    삭제한 일기: ${cleaned}개`);

    // 테스트용 Auth 계정도 삭제 (Auth 목록에 남지 않도록)
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
        console.log("    테스트 계정 삭제됨");
      }
    } catch (e) {
      console.log("    테스트 계정 삭제 실패:", e.code || e.message);
    }
  }

  console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
