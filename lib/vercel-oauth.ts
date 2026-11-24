import { createHash, randomBytes } from "node:crypto";

// Sign in with Vercel(OAuth 2.0 인증 코드 + PKCE S256). 근거: vercel.com/docs/sign-in-with-vercel/getting-started
export const authorizeEndpoint = "https://vercel.com/oauth/authorize";

/** 로그인 도중에만 쓰는 쿠키 이름. 콜백 route가 같은 이름으로 읽고 지운다. */
export const oauthCookies = {
  state: "oauth_state",
  nonce: "oauth_nonce",
  verifier: "oauth_code_verifier",
} as const;

const random = () => randomBytes(32).toString("base64url"); // 43자

export function buildAuthorization(origin: string, clientId: string) {
  const state = random();
  const nonce = random();
  const verifier = random();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/callback`,
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    response_type: "code",
    scope: "openid email profile offline_access",
  });
  return { url: `${authorizeEndpoint}?${params}`, state, nonce, verifier };
}
