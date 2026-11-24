import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildAuthorization } from "./vercel-oauth";

describe("buildAuthorization", () => {
  const { url, state, nonce, verifier } = buildAuthorization("http://localhost:3000", "cid");
  const q = new URL(url).searchParams;

  it("PKCE 챌린지는 verifier의 SHA-256 base64url이다", () => {
    expect(q.get("code_challenge")).toBe(createHash("sha256").update(verifier).digest("base64url"));
    expect(q.get("code_challenge_method")).toBe("S256");
  });

  it("state·nonce·verifier는 43자 이상이고 서로 다르다", () => {
    for (const v of [state, nonce, verifier]) expect(v.length).toBeGreaterThanOrEqual(43);
    expect(new Set([state, nonce, verifier]).size).toBe(3);
  });

  it("콜백 주소와 scope를 문서대로 보낸다", () => {
    expect(new URL(url).origin + new URL(url).pathname).toBe("https://vercel.com/oauth/authorize");
    expect(q.get("redirect_uri")).toBe("http://localhost:3000/api/auth/callback");
    expect(q.get("scope")).toBe("openid email profile offline_access");
    expect(q.get("client_id")).toBe("cid");
    expect(q.get("state")).toBe(state);
    expect(q.get("nonce")).toBe(nonce);
  });
});
