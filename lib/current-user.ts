import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { data } from "./mock-data";
import { sessionCookie, sessionSecret, verifySession } from "./session";
import type { User } from "./types";

const COOKIE = "hogiya-user"; // 값은 "teacher:t-과학" 또는 "student:s-01" 형태

export const userOptions: { value: string; label: string }[] = [
  ...data.teachers.map((t) => ({ value: `teacher:${t.id}`, label: t.name })),
  ...data.students.map((s) => ({ value: `student:${s.id}`, label: `학생 ${s.number}번` })),
];

/** 운영에서는 서명한 세션만 믿고, 없으면 로그인 화면으로 보낸다. 개발에서만 아래 데모 쿠키로 되돌아간다. */
export async function currentUser(): Promise<User> {
  const jar = await cookies();
  await connection(); // verifySession이 Date.now()를 쓰므로 요청 시점에 실행해야 한다.
  const secret = sessionSecret();
  const session = secret ? verifySession(jar.get(sessionCookie)?.value, secret) : undefined;
  if (session) return session;
  if (process.env.NODE_ENV === "production") redirect("/login");

  const raw = jar.get(COOKIE)?.value;
  const valid = userOptions.some((o) => o.value === raw);
  const [role, id] = (valid ? raw! : userOptions[0].value).split(":");
  return { role: role as User["role"], id };
}

export const userCookieName = COOKIE;
