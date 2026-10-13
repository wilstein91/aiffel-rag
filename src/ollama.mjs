// Ollama와 주고받는 일만 담당 — CLAUDE.md "생성 계약"
const OLLAMA = "http://localhost:11434";
export const DEFAULT_MODEL = "qwen3.5:2b";

// ① 켜져 있나 확인 (모델 목록을 달라고 해서 답이 오면 켜져 있는 것)
export async function pingOllama() {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

// ② 질문 보내기 → ③ 조각(토큰)이 올 때마다 onToken 호출 → ④ 끝나면 전체 답변 반환
export async function chatStream(messages, onToken, model = DEFAULT_MODEL) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ model, messages, stream: true, think: false, options: { temperature: 0 } }),
  });
  if (!res.ok) throw new Error(`Ollama 응답 오류 ${res.status}: ${await res.text()}`);

  // 응답은 한 줄에 JSON 하나씩(NDJSON). 한 줄이 여러 조각으로 나뉘어 올 수 있어 버퍼에 모은다.
  // TextDecoder의 stream:true는 한글 한 글자가 조각 경계에서 잘려도 깨지지 않게 해 준다.
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let answer = "";
  for await (const piece of res.body) {
    buffer += decoder.decode(piece, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // 아직 덜 온 마지막 줄은 다음 조각과 합친다
    for (const line of lines) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      const text = data.message?.content ?? "";
      if (text) {
        answer += text;
        onToken(text);
      }
    }
  }
  return answer;
}
