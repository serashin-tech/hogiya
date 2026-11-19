import { cookies } from "next/headers";
import { data } from "./mock-data";
import type { User } from "./types";

const COOKIE = "hogiya-user"; // 값은 "teacher:t-과학" 또는 "student:s-01" 형태

export const userOptions: { value: string; label: string }[] = [
  ...data.teachers.map((t) => ({ value: `teacher:${t.id}`, label: t.name })),
  ...data.students.map((s) => ({ value: `student:${s.id}`, label: `학생 ${s.number}번` })),
];

export async function currentUser(): Promise<User> {
  const raw = (await cookies()).get(COOKIE)?.value;
  const valid = userOptions.some((o) => o.value === raw);
  const [role, id] = (valid ? raw! : userOptions[0].value).split(":");
  return { role: role as User["role"], id };
}

export const userCookieName = COOKIE;
