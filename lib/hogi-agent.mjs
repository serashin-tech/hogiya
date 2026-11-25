// 호기 Agent SDK 설정 한 곳. 터미널 스크립트와 서버 라우트가 같이 쓴다.
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";

const RECORDS = path.resolve("learning-records");

// learning-records 밖 파일 읽기·쓰기를 막는 훅
async function onlyRecords(input) {
  const file = input.tool_input?.file_path;
  const inside = file && path.resolve(file).startsWith(RECORDS + path.sep);
  if (inside) return {};
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "learning-records 폴더 밖의 파일은 쓸 수 없습니다",
    },
  };
}

export const hogiOptions = (sessionId) => ({
  settingSources: ["project"],               // .claude/skills/hogi-teach를 찾는다
  model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5",
  allowedTools: ["Read", "Write"],           // 묻지 않고 허락 (막는 것은 아래 둘)
  disallowedTools: ["Bash", "Edit", "Glob", "Grep", "WebFetch", "WebSearch", "Agent", "NotebookEdit"],
  permissionMode: "dontAsk",                 // 허락하지 않은 호출은 거절
  hooks: { PreToolUse: [{ matcher: "Read|Write", hooks: [onlyRecords] }] },
  maxTurns: 6,
  maxBudgetUsd: 0.05,
  ...(sessionId ? { resume: sessionId } : {}),
});

// 학생의 말 하나를 보내고 답·세션 번호·사용량을 돌려준다
export async function askHogi({ studentId, text, sessionId }) {
  const prompt = sessionId
    ? text
    : `학생ID ${studentId}와 복습 대화를 시작한다. hogi-teach Skill을 따른다. 학생의 첫 말: ${text}`;
  const out = { answer: "", sessionId, turns: 0, costUsd: 0, ok: false };
  try {
    for await (const msg of query({ prompt, options: hogiOptions(sessionId) })) {
      if (msg.type === "system" && msg.subtype === "init") out.sessionId = msg.session_id;
      if (msg.type === "result") {
        out.turns = msg.num_turns;
        out.costUsd = msg.total_cost_usd;
        if (msg.subtype === "success") { out.answer = msg.result; out.ok = true; }
      }
    }
  } catch {
    out.ok = false; // 상한·실패 뒤 query가 예외를 던진다
  }
  return out;
}
