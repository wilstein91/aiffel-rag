# 아이펠 생활 안내 챗봇 (로컬 RAG)

작업은 강사 가이드(C:\Aiffel_Work\RAG_Chatbot\_reference\로컬RAG_물류창고_재고조사_챗봇.md)의 STEP 0~9 순서를 따른다.
"STEP N"은 그 가이드의 단계를 가리킨다. 주제만 물류창고 대신 아이펠로 바꾼다.

## 제품
- 아이펠의 규정·운영 방침이 공지, 강의, 홈페이지에 흩어져 있어 어디서 찾아야 할지 모르는 사람을 위한 안내 챗봇.
  쓰는 사람: 아이펠 지원 예정자, 신입·기존 수강생, 운영진.
- 흩어진 규정을 한곳에 모은 자료에서 근거를 찾아 출처와 함께 답한다. 자료는 세 가지:
  아이펠 공식 홈페이지(aiffel.io, 다음 기수 모집 기준), docs/cohort2.md(2기 노션 공지 정리), docs/rules.md(온보딩 강의 정리).
  2기 규정이 서로 다르면 docs/cohort2.md를 따른다.
- 1단계: 질문과 비슷한 자료를 찾아 점수와 함께 보여 준다(검색만). 2단계: 찾은 자료를 질문과 함께 LLM에 넣어 답을 받는다.

## 비목표
- 웹 화면, 서버, 배포는 만들지 않는다.
- 개인 정보 조회(내 출석률, 내 남은 결석 일수 등)는 하지 않는다. 자료에 없으므로 "LMS에서 확인하세요"로 안내한다.
- 최신 공지·일정은 다루지 않는다. 자료를 만든 시점 이후 바뀐 내용은 "최신 공지를 확인하세요"로 안내한다.
- 개인 사정에 대한 공식 판정(예: "제 경우 수료 가능한가요?")을 대신하지 않는다. 규정 내용만 안내하고 판정은 운영진에게 안내한다.

## 환경
- 내 PC(Windows)에서만 실행한다. Node.js로 만들고 PowerShell에서 실행한다.
- LLM은 Ollama의 qwen3.5:2b (2단계에서만 사용).

## 작업 규칙
- 요청한 STEP의 파일만 만들거나 고친다. 이미 정한 계약을 바꿔야 하면 먼저 묻는다.
- 확인하지 않은 규정·숫자·URL을 지어내지 않는다. 확인 못 한 것은 [검증 필요]로 표시한다.
- 코드를 만든 뒤 직접 실행해 보고, 실행 결과와 함께 보고한다.
- docs/의 문서에는 규정·안내 내용만 쓴다. 개인 이름, 출결 기록, 연락처, 신청 폼 주소는 넣지 않는다.
- docs/cohort2.md는 2기 내부 노션 공지가 출처다. 2026-10-13 현준님이 공개 저장소로 올리기로 결정했다.

## 데이터 계약
- 청크 원본은 data/chunks.json, 배열이고 각 항목은 { id, text, url, section }.
- id는 AF-001부터 연속(AF = AIFFEL), 한 번 붙인 id의 뜻은 바꾸지 않는다.
- text는 최소 120자, 사실 하나. 원문에 없는 말을 보태지 않는다.
- url은 확인 가능한 출처. 웹은 실제 주소(https://aiffel.io/...), 내 문서는 docs/파일.md#제목(공백은 하이픈).

## 임베딩 계약 (src/embedder.mjs 한 곳에서만 정의)
- 모델 onnx-community/embeddinggemma-300m-ONNX, transformers.js
  pipeline("feature-extraction", MODEL, { dtype: "q8" }), 호출 옵션 { pooling: "mean", normalize: true }, 768차원.
- 입력 형식(모델 카드 공식 형식): 문서는 "title: " + section + " | text: " + text, 질문은 "task: search result | query: " + question.
- 파이프라인은 한 번만 만들어 재사용. export: embedDocument(chunk), embedQuery(question), MODEL, DTYPE, DIM.
- 벡터 저장소 data/vectors.json은 { model, dtype, dim, createdAt, chunks: [{ id, text, url, section, vector }] }.
  저장소의 model·dtype이 현재 embedder와 다르면 검색을 거부하고 "build-index를 다시 실행하라"고 안내.

## 검색 계약 (src/search.mjs)
- 벡터는 정규화되어 있으므로 코사인 유사도 = 내적. 점수 내림차순 top-k(기본 3, --k로 변경).
- 약한 근거 기준 WEAK_THRESHOLD = 0.55는 src/search.mjs에서만 정의·export하고 다른 파일은 import.
  1위 점수가 이보다 낮으면 "관련 자료가 약함" 표시. 결과는 버리지 않는다.
- search.mjs는 다른 파일이 search()를 import해도 CLI가 실행되지 않게, 직접 실행됐을 때만 CLI를 돈다
  (import.meta.url === pathToFileURL(process.argv[1]).href 확인).

## 생성 계약 (2단계)
- 시스템 메시지(현준님 작성): "당신은 아이펠 AI 에이전트 과정의 운영과 생활 규정(출결, 공가, 훈련장려금, 수료 등)을 안내하는 도우미입니다.
  주어진 자료에 있는 내용만으로 답하고, 자료에 없는 내용은 지어내지 않습니다.
  자료에 답이 없으면 '해당 문의사항은 본 서비스를 통해 답변이 불가능합니다. 담당 퍼실리테이터 또는 매니저에게 문의 바랍니다.'라고 답합니다.
  개인의 출결·장려금 현황이나 '제 경우 수료 가능한가요?' 같은 개인 판정 질문에는 '개인정보 관련사항에 대해서는 HRD-Net 출결 앱 또는 담당 운영 매니저에게 확인 바랍니다.'라고 안내합니다.
  2기 수강생 질문에는 2기 공지 자료를 우선하고, 근거 조각의 ID만 [AF-008]처럼 대괄호로 감싸 해당 문장 끝에 표시합니다."
- 사용자 메시지(프롬프트) 순서: ① 자료 소개 ② 근거 원칙(1위 점수 < WEAK_THRESHOLD면 보수 문구) ③ 출처 규칙 ④ KST 현재 시각
  ⑤ [자료] + "[AF-xxx] (section) text" 줄들(대괄호 안에는 ID만) ⑥ [질문] + 질문 ⑦ 출처 규칙 한 번 더.
- LLM: Ollama http://localhost:11434, 모델 qwen3.5:2b, POST /api/chat,
  { model, messages, stream: true, think: false, options: { temperature: 0 } }. 응답은 NDJSON,
  TextDecoder는 { stream: true }로 써서 한글이 조각 경계에서 깨지지 않게.
- 근거 표시는 LLM에 맡기지 않는다. 답변 뒤에 LLM에게 넘긴 자료를 모두 보여 주고, 답변에 ID가 적힌 자료에 ✓를 붙인다.
- Ollama 연결 확인은 실제로 LLM을 호출할 때만 한다(--show-prompt는 Ollama 없이도 동작).
  연결이 안 되면 "Ollama가 실행 중인지 확인하세요"와 확인 명령을 안내하고 종료.

## 결정 필요
- (없음)
