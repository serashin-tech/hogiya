import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "./types";

// 서명한 로그인 쿠키. 값은 "<base64url(JSON)>.<HMAC-SHA256>"이다. 서명이 맞고 만료 전일 때만 User로 돌려준다.
export const sessionCookie = "hogiya-session";
export const sessionMaxAgeSec = 7 * 24 * 60 * 60;

/** 세션 서명에 쓸 비밀값. 32자 미만이면 없는 것으로 본다. 발급과 검증이 모두 이 함수를 거쳐 약한 값으로는 어느 쪽도 동작하지 않는다. */
export function sessionSecret(): string | undefined {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

const mac =(body: string, secret: string) => createHmac("sha256", secret).update(body).digest("base64url");

export function signSession(user: User, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ ...user, exp: now + sessionMaxAgeSec * 1000 })).toString("base64url");
  return `${body}.${mac(body, secret)}`;
}

export function verifySession(value: string | undefined, secret: string, now = Date.now()): User | undefined {
  const [body, sig, extra] = value?.split(".") ?? [];
  if (!body || !sig || extra !== undefined) return undefined;
  const want = Buffer.from(mac(body, secret));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return undefined;
  try {
    const { role, id, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof exp !== "number" || exp <= now) return undefined;
    if ((role !== "teacher" && role !== "student") || typeof id !== "string") return undefined;
    return { role, id };
  } catch {
    return undefined;
  }
}
