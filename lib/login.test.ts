import { afterEach, describe, expect, it, vi } from "vitest";
import { applyEmails, userByEmail, userForVercel } from "./login";
import { sessionSecret, signSession, verifySession } from "./session";
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

describe("userForVercel", () => {
  const fresh = () =>
    ({
      classrooms: [{ id: "c", name: "6학년 2반" }],
      teachers: [{ id: "t-과학", name: "과학 교사", email: "sci@school.kr" }],
      students: [{ id: "s-01", classId: "c", number: 1, email: "kid@school.kr" }],
    }) as Data;

  it("등록된 이메일이면 그 교사·학생으로 로그인하고 학생을 새로 만들지 않는다", () => {
    const d = fresh();
    expect(userForVercel(d, { sub: "u1", email: "SCI@school.kr", emailVerified: true })).toEqual({ role: "teacher", id: "t-과학" });
    expect(userForVercel(d, { sub: "u2", email: "kid@school.kr", emailVerified: true })).toEqual({ role: "student", id: "s-01" });
    expect(d.students).toHaveLength(1);
  });
  it("등록되지 않은 계정은 새 학생이 되고, 다시 로그인해도 같은 학생이다", () => {
    const d = fresh();
    const first = userForVercel(d, { sub: "u3", email: "new@x.kr", emailVerified: true });
    expect(first).toEqual({ role: "student", id: "s-v-u3" });
    expect(d.students.at(-1)).toMatchObject({ id: "s-v-u3", classId: "c", number: 2, vercelId: "u3" });
    expect(userForVercel(d, { sub: "u3", email: "new@x.kr", emailVerified: true })).toEqual(first);
    expect(d.students).toHaveLength(2);
  });
  it("이메일이 없거나 확인되지 않았으면 교사 이메일과 같아도 교사가 되지 않는다", () => {
    const d = fresh();
    expect(userForVercel(d, { sub: "u4", email: "sci@school.kr", emailVerified: false })).toEqual({ role: "student", id: "s-v-u4" });
    expect(userForVercel(d, { sub: "u5" })).toEqual({ role: "student", id: "s-v-u5" });
  });
});

describe("applyEmails", () => {
  const fresh = () =>
    ({
      teachers: [{ id: "t-과학", name: "과학 교사" }],
      students: [{ id: "s-01", classId: "c", number: 1 }],
    }) as Data;

  it("쉼표·세미콜론·줄바꿈으로 이은 목록을 교사와 학생에게 반영한다", () => {
    const d = fresh();
    expect(applyEmails(d, "t-과학=sci@school.kr, s-01 = kid@school.kr")).toEqual([]);
    expect(userByEmail(d, "sci@school.kr")).toEqual({ role: "teacher", id: "t-과학" });
    expect(userByEmail(d, "kid@school.kr")).toEqual({ role: "student", id: "s-01" });
    expect(applyEmails(fresh(), "t-과학=a@x.kr;\ns-01=b@x.kr")).toEqual([]);
  });
  it("없는 id와 형식이 틀린 항목은 반영하지 않고 돌려준다", () => {
    const d = fresh();
    expect(applyEmails(d, "t-없음=a@x.kr, s-01=이메일아님, =a@x.kr, 등호없음")).toHaveLength(4);
    expect(d.students[0].email).toBeUndefined();
  });
  it("값이 없으면 아무것도 하지 않는다", () => {
    expect(applyEmails(fresh(), undefined)).toEqual([]);
  });
});

describe("sessionSecret", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("32자 이상일 때만 돌려준다", () => {
    vi.stubEnv("SESSION_SECRET", "x".repeat(32));
    expect(sessionSecret()).toBe("x".repeat(32));
    vi.stubEnv("SESSION_SECRET", "x".repeat(31));
    expect(sessionSecret()).toBeUndefined();
    vi.stubEnv("SESSION_SECRET", "");
    expect(sessionSecret()).toBeUndefined();
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
