import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { userForVercel } from "@/lib/login";
import { sessionCookie, sessionMaxAgeSec, sessionSecret, signSession } from "@/lib/session";
import { store } from "@/lib/store";
import { oauthCookies } from "@/lib/vercel-oauth";

// Vercel 로그인 마무리: state 확인 → 코드를 토큰으로 교환 → nonce 확인 → 이메일로 사용자 찾기 → 서명한 세션 쿠키 발급.
const tokenEndpoint = "https://api.vercel.com/login/oauth/token";
const userinfoEndpoint = "https://api.vercel.com/login/oauth/userinfo";

export async function GET(req: NextRequest) {
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, req.nextUrl));

  // 일회용 쿠키는 결과와 상관없이 한 번 읽고 지운다.
  const jar = await cookies();
  const saved = {
    state: jar.get(oauthCookies.state)?.value,
    nonce: jar.get(oauthCookies.nonce)?.value,
    verifier: jar.get(oauthCookies.verifier)?.value,
  };
  for (const name of Object.values(oauthCookies)) jar.delete(name);

  const clientId = process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID;
  const clientSecret = process.env.VERCEL_APP_CLIENT_SECRET;
  const secret = sessionSecret();
  if (!clientId || !clientSecret || !secret) return fail("not_configured");

  const q = req.nextUrl.searchParams;
  if (q.get("error") === "access_denied") return fail("access_denied");
  const code = q.get("code");
  if (!code || !saved.state || !saved.nonce || !saved.verifier || q.get("state") !== saved.state) {
    return fail("invalid_state");
  }

  try {
    const tokenRes = await fetch(tokenEndpoint, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: saved.verifier,
      }),
    });
    if (!tokenRes.ok) return fail("login_failed");
    const tokens: { access_token?: string; id_token?: string } = await tokenRes.json();
    if (!tokens.access_token || !tokens.id_token) return fail("login_failed");

    // 토큰 엔드포인트에서 TLS로 직접 받은 ID 토큰이라 서명 검증은 생략하고 nonce와 대상(aud)만 본다.
    const claims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1] ?? "", "base64url").toString());
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.nonce !== saved.nonce || !aud.includes(clientId)) return fail("invalid_state");

    const infoRes = await fetch(userinfoEndpoint, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!infoRes.ok) return fail("login_failed");
    const info: { sub?: string; email?: string; email_verified?: boolean } = await infoRes.json();
    if (!info.sub) return fail("login_failed");

    // 등록된 이메일은 그 교사·학생으로, 등록되지 않은 Vercel 계정은 새 학생으로 로그인시킨다.
    const user = userForVercel(store, { sub: info.sub, email: info.email, emailVerified: info.email_verified });

    const res = NextResponse.redirect(new URL("/", req.nextUrl));
    res.cookies.set(sessionCookie, signSession(user, secret), {
      maxAge: sessionMaxAgeSec,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return res;
  } catch {
    return fail("login_failed");
  }
}
