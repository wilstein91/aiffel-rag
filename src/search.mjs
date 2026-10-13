// [1단계 완성품] 질문 → 비슷한 자료 보여주기
// 사용법: node src/search.mjs "질문1" ["질문2" …] [--k 3]
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { embedQuery, MODEL, DTYPE } from "./embedder.mjs";

// 1위 점수가 이 값보다 낮으면 "관련 자료가 약함". 다른 파일은 이 값을 import해서 쓴다.
export const WEAK_THRESHOLD = 0.55;

let store = null;

function loadStore() {
  if (store) return store;
  store = JSON.parse(readFileSync("data/vectors.json", "utf-8"));
  // 문서 벡터와 질문 벡터가 같은 모델·설정이어야 비교가 의미 있다
  if (store.model !== MODEL || store.dtype !== DTYPE) {
    console.error(
      `벡터 저장소(${store.model}, ${store.dtype})와 현재 임베딩 설정(${MODEL}, ${DTYPE})이 다릅니다.\n` +
        "node src/build-index.mjs 를 다시 실행하세요.",
    );
    process.exit(1);
  }
  return store;
}

// 질문을 벡터로 바꾸고, 모든 청크와 내적(= 코사인 유사도)을 계산해 상위 k개를 돌려준다
export async function search(question, k = 3) {
  const { chunks } = loadStore();
  const q = await embedQuery(question);
  return chunks
    .map((chunk) => {
      let score = 0;
      for (let i = 0; i < q.length; i++) score += q[i] * chunk.vector[i];
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function bar(score) {
  const n = Math.max(0, Math.min(20, Math.round(score * 20)));
  return "█".repeat(n) + "░".repeat(20 - n);
}

async function main() {
  const args = process.argv.slice(2);
  let k = 3;
  const questions = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--k") k = Number(args[++i]);
    else questions.push(args[i]);
  }
  if (!questions.length) {
    console.log('사용법: node src/search.mjs "질문1" ["질문2" …] [--k 3]');
    return;
  }
  for (const question of questions) {
    const hits = await search(question, k);
    const weak = hits[0].score < WEAK_THRESHOLD ? `  ⚠ 관련 자료가 약함(<${WEAK_THRESHOLD})` : "";
    console.log(`\nQ: ${question}${weak}`);
    hits.forEach(({ chunk, score }, i) => {
      console.log(`  ${i + 1}. ${chunk.id}  ${score.toFixed(3)}  ${bar(score)}  [${chunk.section}]`);
      console.log(`     ${chunk.text.slice(0, 60)}…`);
      console.log(`     출처: ${chunk.url}`);
    });
  }
}

// 다른 파일이 search()를 import할 때는 CLI를 돌리지 않는다
if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
