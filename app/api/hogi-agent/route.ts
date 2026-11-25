// 호기 패널 → Agent SDK. 브라우저는 학생ID(가명), 학생의 말, 세션 번호만 보낸다.
import { NextResponse } from "next/server";
import { askHogi } from "@/lib/hogi-agent.mjs";
import { currentUser } from "@/lib/current-user";

// runtime을 따로 정하지 않는다. 호기는 cacheComponents를 켜 두어 route의 runtime 설정이 빌드 오류가 된다. 기본값이 Node다.

const FALLBACK = "잠시 뒤에 다시 물어봐 주세요";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  const text = typeof body?.text === "string" ? body.text.slice(0, 300) : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;

  // 학생ID는 가명(s-02 모양)만 받는다. 파일 이름으로 쓰이므로 경로 문자를 막는다.
  if (!/^s-\d{2,3}$/.test(studentId) || !text.trim()) {
    return NextResponse.json({ kind: "error", message: FALLBACK }, { status: 400 });
  }
  // 로그인한 학생 본인의 기록만 쓴다. 키가 없는 곳(배포본)에서는 부르지 않는다.
  const user = await currentUser();
  if (user.role !== "student" || user.id !== studentId || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ kind: "error", message: FALLBACK }, { status: 403 });
  }

  const r = await askHogi({ studentId, text, sessionId });
  if (!r.ok) return NextResponse.json({ kind: "error", message: FALLBACK, sessionId: r.sessionId });
  return NextResponse.json({ kind: "question", message: r.answer, sessionId: r.sessionId });
}
