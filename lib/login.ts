import type { Data, User } from "./types";

/**
 * 환경 변수 HOGIYA_USER_EMAILS의 "사용자 id=이메일"을 쉼표·세미콜론·줄바꿈으로 이어 쓴 값을 데이터에 반영한다.
 * 예: "t-과학=sci@school.kr, s-01=kid@school.kr". 개인정보라 저장소에는 두지 않는다.
 * 데이터에 없는 id와 형식이 틀린 항목은 반영하지 않고 돌려준다. 오타 때문에 조용히 로그인이 막히지 않게 하려는 것이다.
 */
export function applyEmails(data: Data, spec: string | undefined): string[] {
  const rejected: string[] = [];
  for (const entry of (spec ?? "").split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)) {
    const at = entry.indexOf("=");
    const id = entry.slice(0, at).trim();
    const email = entry.slice(at + 1).trim();
    const person = at > 0 && email.includes("@") ? [...data.teachers, ...data.students].find((p) => p.id === id) : undefined;
    if (person) person.email = email;
    else rejected.push(entry);
  }
  return rejected;
}

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
