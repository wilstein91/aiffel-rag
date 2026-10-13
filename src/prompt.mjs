// 시스템 메시지와 프롬프트 조립 — CLAUDE.md "생성 계약"
import { WEAK_THRESHOLD } from "./search.mjs";

// 현준님이 작성한 챗봇 규칙 (LLM의 역할과 경계)
export const SYSTEM_MESSAGE = [
  "당신은 아이펠 AI 에이전트 과정의 운영과 생활 규정(출결, 공가, 훈련장려금, 수료 등)을 안내하는 도우미입니다.",
  "주어진 자료에 있는 내용만으로 답하고, 자료에 없는 내용은 지어내지 않습니다.",
  "자료에 답이 없으면 '해당 문의사항은 본 서비스를 통해 답변이 불가능합니다. 담당 퍼실리테이터 또는 매니저에게 문의 바랍니다.'라고 답합니다.",
  "개인의 출결·장려금 현황이나 '제 경우 수료 가능한가요?' 같은 개인 판정 질문에는 '개인정보 관련사항에 대해서는 HRD-Net 출결 앱 또는 담당 운영 매니저에게 확인 바랍니다.'라고 안내합니다.",
  "2기 수강생 질문에는 2기 공지 자료를 우선하고, 근거 조각의 ID만 [AF-008]처럼 대괄호로 감싸 해당 문장 끝에 표시합니다.",
].join(" ");

// hits: search()가 돌려준 [{ chunk, score }] (점수 내림차순)
export function buildPrompt(question, hits) {
  const now = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric",
    weekday: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date());
  const weak = (hits[0]?.score ?? 0) < WEAK_THRESHOLD;
  return [
    // ① 자료 소개
    "다음 자료는 아이펠 공식 홈페이지, AI 에이전트 2기 공지, 온보딩 강의에서 뽑은 조각입니다.",
    // ② 근거 원칙 — 검색 점수가 낮으면 더 조심스러운 문구
    weak
      ? "주의: 검색된 조각의 유사도가 낮습니다. 질문과 완전히 맞는 근거가 아닐 수 있으니, 근거에 있는 내용만 짧게 답하고 자료에 없는 부분은 없다고 말합니다."
      : "자료에 근거한 내용만 답하고, 자료에 없으면 없다고 말합니다.",
    // ③ 출처 규칙
    "근거가 된 조각의 ID만 [AF-008]처럼 대괄호로 감싸 해당 문장 끝에 표시합니다.",
    // ④ 시간 기준
    `현재 시각은 ${now}(KST)입니다. '지금', '올해', '다음 주' 같은 상대 표현은 이 시각을 기준으로 해석합니다.`,
    // ⑤ 자료 (대괄호 안에는 ID만, 제목은 괄호로)
    "",
    "[자료]",
    hits.map(({ chunk }) => `[${chunk.id}] (${chunk.section}) ${chunk.text}`).join("\n\n"),
    // ⑥ 질문
    "",
    "[질문]",
    question,
    // ⑦ 출처 규칙 한 번 더 — 작은 모델은 맨 끝 지시를 가장 잘 따른다
    "",
    "(답할 때 근거로 쓴 자료의 ID를 [AF-008]처럼 문장 끝에 붙입니다.)",
  ].join("\n");
}
