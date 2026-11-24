import type { Data, User } from "./types";

/** Vercel 계정의 이메일로 호기야 사용자를 찾는다. 등록되지 않았으면 undefined. */
export function userByEmail(data: Data, email: string): User | undefined {
  const want = email.trim().toLowerCase();
  if (!want) return undefined;
  const same = (e?: string) => e?.toLowerCase() === want;
  const teacher = data.teachers.find((t) => same(t.email));
  if (teacher) return { role: "teacher", id: teacher.id };
  const student = data.students.find((s) => same(s.email));
  return student ? { role: "student", id: student.id } : undefined;
}
