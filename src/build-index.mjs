// 청크 → 벡터 저장소. 실행: node src/build-index.mjs
// data/chunks.json을 읽어 청크마다 벡터(768개 숫자)를 만들고 data/vectors.json에 저장한다.
import { readFileSync, writeFileSync } from "node:fs";
import { embedDocument, MODEL, DTYPE, DIM } from "./embedder.mjs";

const chunks = JSON.parse(readFileSync("data/chunks.json", "utf-8"));

// 1) 데이터 계약 검사: 필드 누락·중복 id는 중단, 120자 미만은 경고
const seen = new Set();
for (const c of chunks) {
  for (const f of ["id", "text", "url", "section"]) {
    if (!c[f]) throw new Error(`${c.id ?? "(id 없음)"}: ${f} 필드가 비어 있습니다`);
  }
  if (seen.has(c.id)) throw new Error(`중복 id: ${c.id}`);
  seen.add(c.id);
  if (c.text.length < 120) console.warn(`⚠ ${c.id}: text가 ${c.text.length}자 (120자 미만)`);
}

// 2) 청크마다 임베딩
const out = [];
for (const c of chunks) {
  const vector = await embedDocument(c);
  out.push({ ...c, vector });
  console.log(`✓ ${c.id} (${c.section})`);
}

// 3) 모든 벡터가 768차원인지 검사
for (const c of out) {
  if (c.vector.length !== DIM) throw new Error(`${c.id}: ${c.vector.length}차원 (기대값 ${DIM})`);
}

writeFileSync(
  "data/vectors.json",
  JSON.stringify({ model: MODEL, dtype: DTYPE, dim: DIM, createdAt: new Date().toISOString(), chunks: out }),
);

// 학습용: 첫 벡터의 앞 5개 숫자와 길이(노름). 정규화했으므로 노름은 1.0이어야 한다.
const v = out[0].vector;
const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
console.log(`첫 벡터 앞 5개: [${v.slice(0, 5).map((x) => x.toFixed(4)).join(", ")}] 노름: ${norm.toFixed(4)}`);
console.log(`저장: data/vectors.json — ${out.length}청크 × ${DIM}차원`);
