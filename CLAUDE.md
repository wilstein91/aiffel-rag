# 아이펠 생활 안내 챗봇 (로컬 RAG)

작업은 강사 가이드(C:\Aiffel_Work\RAG_Chatbot\_reference\로컬RAG_물류창고_재고조사_챗봇.md)의 STEP 0~9 순서를 따른다.
"STEP N"은 그 가이드의 단계를 가리킨다. 주제만 물류창고 대신 아이펠로 바꾼다.

## 제품
- 아이펠의 규정·운영 방침이 공지, 강의, 홈페이지에 흩어져 있어 어디서 찾아야 할지 모르는 사람을 위한 안내 챗봇.
  쓰는 사람: 아이펠 지원 예정자, 신입·기존 수강생, 운영진.
- 흩어진 규정을 한곳에 모은 자료(아이펠 공식 홈페이지 aiffel.io + 수강 규정을 정리한 docs/rules.md)에서
  근거를 찾아 출처와 함께 답한다.
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
- docs/rules.md에는 공개해도 되는 내용만 쓴다. 개인 이름, 연락처, 내부 공지 원문은 넣지 않는다.

## 데이터 계약
- 청크 원본은 data/chunks.json, 배열이고 각 항목은 { id, text, url, section }.
- id는 AF-001부터 연속(AF = AIFFEL), 한 번 붙인 id의 뜻은 바꾸지 않는다.
- text는 최소 120자, 사실 하나. 원문에 없는 말을 보태지 않는다.
- url은 확인 가능한 출처. 웹은 실제 주소(https://aiffel.io/...), 내 문서는 docs/rules.md#제목(공백은 하이픈).

## 임베딩 계약 (src/embedder.mjs 한 곳에서만 정의)
- 모델 onnx-community/embeddinggemma-300m-ONNX, transformers.js
  pipeline("feature-extraction", MODEL, { dtype: "q8" }), 호출 옵션 { pooling: "mean", normalize: true }, 768차원.
- 입력 형식(모델 카드 공식 형식): 문서는 "title: " + section + " | text: " + text, 질문은 "task: search result | query: " + question.
- 파이프라인은 한 번만 만들어 재사용. export: embedDocument(chunk), embedQuery(question), MODEL, DTYPE, DIM.
- 벡터 저장소 data/vectors.json은 { model, dtype, dim, createdAt, chunks: [{ id, text, url, section, vector }] }.
  저장소의 model·dtype이 현재 embedder와 다르면 검색을 거부하고 "build-index를 다시 실행하라"고 안내.

## 결정 필요
- 검색 결과를 몇 개 보여 주고, 점수가 몇 점 아래면 "관련 자료가 약함"으로 볼까?
- LLM에게 어떤 규칙(시스템 메시지)을 줄까?
