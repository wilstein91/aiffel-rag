// 임베딩 공통 모듈 — CLAUDE.md "임베딩 계약"을 이 파일 한 곳에서만 정의한다.
// 문서용(build-index)과 질문용(search)이 반드시 같은 모델·설정을 쓰게 하려는 것.
import { pipeline } from "@huggingface/transformers";

export const MODEL = "onnx-community/embeddinggemma-300m-ONNX";
export const DTYPE = "q8";
export const DIM = 768;

// 모델 카드의 공식 입력 형식(접두어). 문서와 질문에 서로 다른 머리말을 붙인다.
const DOC_PREFIX = (section) => `title: ${section} | text: `;
const QUERY_PREFIX = "task: search result | query: ";

let extractor = null;

// 파이프라인은 처음 한 번만 만들고 재사용한다 (모델 불러오기가 오래 걸리므로).
async function getExtractor() {
  if (!extractor) {
    console.log("임베딩 모델 불러오는 중…(첫 실행은 다운로드)");
    extractor = await pipeline("feature-extraction", MODEL, { dtype: DTYPE });
  }
  return extractor;
}

// 문장 → 768개 숫자. mean pooling(토큰 벡터 평균) + normalize(길이 1로 맞춤)
async function embed(input) {
  const ex = await getExtractor();
  const out = await ex(input, { pooling: "mean", normalize: true });
  return Array.from(out.data);
}

export function embedDocument(chunk) {
  return embed(DOC_PREFIX(chunk.section) + chunk.text);
}

export function embedQuery(question) {
  return embed(QUERY_PREFIX + question);
}
