import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { buildAuthorization, oauthCookies } from "@/lib/vercel-oauth";

// Vercel 로그인 시작: 일회용 값을 10분짜리 쿠키에 담고 Vercel 인증 화면으로 보낸다.
export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL("/login?error=not_configured", req.nextUrl));

  const { url, state, nonce, verifier } = buildAuthorization(req.nextUrl.origin, clientId);
  const jar = await cookies();
  const options = {
    maxAge: 10 * 60,
    httpOnly: true,
    sameSite: "lax", // Vercel에서 돌아오는 최상위 이동에는 쿠키가 실려야 한다.
    secure: process.env.NODE_ENV === "production",
    path: "/",
  } as const;
  jar.set(oauthCookies.state, state, options);
  jar.set(oauthCookies.nonce, nonce, options);
  jar.set(oauthCookies.verifier, verifier, options);
  return NextResponse.redirect(url);
}
