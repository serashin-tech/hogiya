import { describe, expect, it } from "vitest";
import { userByEmail } from "./login";
import { signSession, verifySession } from "./session";
import type { Data } from "./types";

const data = {
  teachers: [{ id: "t-과학", name: "과학 교사", email: "Sci@School.kr" }, { id: "t-국어", name: "국어 교사" }],
  students: [{ id: "s-01", classId: "c", number: 1, email: "kid@school.kr" }],
} as Data;

describe("userByEmail", () => {
  it("대소문자와 앞뒤 공백을 무시하고 교사·학생을 찾는다", () => {
    expect(userByEmail(data, " sci@school.KR ")).toEqual({ role: "teacher", id: "t-과학" });
    expect(userByEmail(data, "kid@school.kr")).toEqual({ role: "student", id: "s-01" });
  });
  it("등록되지 않았거나 빈 이메일이면 찾지 않는다", () => {
    expect(userByEmail(data, "other@school.kr")).toBeUndefined();
    expect(userByEmail(data, "")).toBeUndefined(); // 이메일 없는 교사와 우연히 맞으면 안 된다
  });
});

describe("session", () => {
  const secret = "x".repeat(32);
  const user = { role: "teacher", id: "t-과학" } as const;
  const token = signSession(user, secret, 1000);

  it("서명이 맞고 만료 전이면 사용자를 돌려준다", () => {
    expect(verifySession(token, secret, 2000)).toEqual(user);
  });
  it("비밀값이 다르거나 내용이 바뀌면 거부한다", () => {
    expect(verifySession(token, "y".repeat(32), 2000)).toBeUndefined();
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ role: "teacher", id: "t-국어", exp: 9e15 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, secret, 2000)).toBeUndefined();
    expect(verifySession(`${body}.${sig}.x`, secret, 2000)).toBeUndefined();
  });
  it("만료되었거나 값이 없으면 거부한다", () => {
    expect(verifySession(token, secret, 1000 + 8 * 24 * 3600 * 1000)).toBeUndefined();
    expect(verifySession(undefined, secret)).toBeUndefined();
  });
});
