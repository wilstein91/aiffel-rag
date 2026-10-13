// [2단계 완성품] 검색 + 프롬프트 조립 + LLM 답변 + 근거 목록
// 사용법: node src/ask.mjs "질문" [--k 3] [--show-prompt] [--no-rag]
import { search, WEAK_THRESHOLD } from "./search.mjs";
import { SYSTEM_MESSAGE, buildPrompt } from "./prompt.mjs";
import { pingOllama, chatStream } from "./ollama.mjs";

const args = process.argv.slice(2);
let k = 3;
let showPrompt = false;
let noRag = false;
let question = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--k") k = Number(args[++i]);
  else if (args[i] === "--show-prompt") showPrompt = true;
  else if (args[i] === "--no-rag") noRag = true;
  else question = args[i];
}
if (!question) {
  console.log('사용법: node src/ask.mjs "질문" [--k 3] [--show-prompt] [--no-rag]');
  process.exit(0);
}

async function ensureOllama() {
  if (!(await pingOllama())) {
    console.error("Ollama가 실행 중인지 확인하세요 (확인: curl.exe http://localhost:11434/api/tags)");
    process.exit(1);
  }
}

const seconds = (t) => ((performance.now() - t) / 1000).toFixed(1);

// --no-rag: 검색도 규칙도 없이 질문만 보낸다 (RAG가 있을 때와 비교하는 실험용)
if (noRag) {
  await ensureOllama();
  console.log("💬 답변 (RAG 없이)");
  const t = performance.now();
  await chatStream([{ role: "user", content: question }], (tok) => process.stdout.write(tok));
  console.log(`\n⏱ 답변 ${seconds(t)}초`);
  process.exit(0);
}

// 1) 검색
const t0 = performance.now();
const hits = await search(question, k);
const searchSec = seconds(t0);
const weak = hits[0].score < WEAK_THRESHOLD;
const userPrompt = buildPrompt(question, hits);

if (showPrompt) {
  console.log("===== [system] =====\n" + SYSTEM_MESSAGE);
  console.log("\n===== [user] =====\n" + userPrompt);
  process.exit(0);
}

console.log("🔎 검색 결과");
for (const { chunk, score } of hits) {
  console.log(`  ${chunk.id}  ${score.toFixed(3)}  ${chunk.section}${weak ? "  ⚠" : ""}`);
}

// 2) LLM 답변 (스트리밍)
await ensureOllama();
console.log("💬 답변");
const t1 = performance.now();
const answer = await chatStream(
  [
    { role: "system", content: SYSTEM_MESSAGE },
    { role: "user", content: userPrompt },
  ],
  (tok) => process.stdout.write(tok),
);
const answerSec = seconds(t1);

// 3) 근거 목록은 프로그램이 직접 만든다 (작은 LLM은 ID를 빼먹기도 하므로)
console.log("\n📚 근거 (LLM에게 넘긴 자료 · ✓ = 답변에 ID가 표시된 자료)");
let marked = 0;
for (const { chunk } of hits) {
  const used = answer.includes(chunk.id);
  if (used) marked++;
  console.log(`  ${used ? "✓" : " "} ${chunk.id}  ${chunk.section}  ${chunk.url}`);
}
if (weak) console.log("  ⚠ 관련 자료가 약해 이 자료들을 답변의 근거로 보기 어렵습니다");
else if (!marked) console.log("  (답변에 ID 표시가 없습니다. 위 자료와 답변을 비교해 확인하세요)");
console.log(`⏱ 검색 ${searchSec}초 · 답변 ${answerSec}초`);
