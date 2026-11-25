// 실행: node scripts/try-agent.mjs        (1단계: Agent SDK로 호기에게 질문 하나)
//       node scripts/try-agent.mjs chat   (3단계: 학생 s-02로 대화)
import readline from "node:readline/promises";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { askHogi } from "../lib/hogi-agent.mjs";

// Agent SDK는 .env.local을 스스로 읽지 않는다. 키가 환경 변수에 없으면 여기서 읽는다(값은 출력하지 않는다).
if (!process.env.ANTHROPIC_API_KEY) process.loadEnvFile(".env.local");

const QUESTION = "전구 두 개를 한 줄로 이으면 밝기가 어떻게 될까?";

async function ask() {
  for await (const msg of query({
    prompt: QUESTION,
    options: {
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5",
      maxTurns: 3,
      disallowedTools: ["Bash", "Write", "Edit", "WebFetch", "WebSearch"],
    },
  })) {
    if (msg.type === "result") console.log(msg.subtype === "success" ? msg.result : msg.subtype);
  }
}

async function chat() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let sessionId;
  console.log("학생 s-02로 대화합니다. 끝내려면 빈 줄을 보냅니다.");
  for (;;) {
    const text = await rl.question("학생> ");
    if (!text.trim()) break;
    const r = await askHogi({ studentId: "s-02", text, sessionId });
    sessionId = r.sessionId;
    console.log(r.ok ? `호기> ${r.answer}` : "호기> 잠시 뒤에 다시 물어봐 주세요");
  }
  rl.close();
}

await (process.argv[2] === "chat" ? chat() : ask());
