import { type NextRequest, NextResponse } from "next/server";
import { sessionCookie, sessionSecret, verifySession } from "@/lib/session";

// 로그인하지 않은 요청을 서버 응답 단계에서 /login으로 보낸다(운영 전용).
// 개발에서는 currentUser()가 데모 쿠키로 되돌아가므로 막지 않는다.
// Proxy는 첫 방어선일 뿐이다. 서버 액션과 화면은 currentUser()로 다시 확인한다(Next.js data-security 가이드).
export function proxy(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/api/auth/")) return NextResponse.next();

  const secret = sessionSecret();
  if (secret && verifySession(req.cookies.get(sessionCookie)?.value, secret)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", req.nextUrl));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
