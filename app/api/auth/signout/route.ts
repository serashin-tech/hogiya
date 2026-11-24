import { type NextRequest, NextResponse } from "next/server";
import { sessionCookie } from "@/lib/session";

// 로그아웃: 세션 쿠키를 지우고 /login으로 보낸다. 다른 사이트가 링크나 이미지로 로그아웃시키지 못하도록 POST만 받는다.
// 세션이 서명만 있는 무상태 쿠키라서, 지운 뒤에도 그 값을 복사해 둔 사람은 만료(7일)까지 쓸 수 있다.
export function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.nextUrl), 303); // 303: 이동한 뒤에는 GET으로 읽게 한다.
  res.cookies.delete(sessionCookie);
  return res;
}
