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

/**
 * Vercel 로그인 결과로 호기야 사용자를 정한다.
 * 확인된 이메일이 등록돼 있으면 그 교사·학생이다. 아니면 Vercel 계정(sub)으로 학생을 찾고, 없으면 첫 학급의 새 학생으로 만든다.
 * 교사는 확인된 이메일로만 될 수 있어서, 아무 Vercel 계정이 교사 권한을 얻지는 못한다.
 */
export function userForVercel(
  data: Data,
  who: { sub: string; email?: string; emailVerified?: boolean },
): User {
  const registered = who.email && who.emailVerified !== false ? userByEmail(data, who.email) : undefined;
  if (registered) return registered;

  let student = data.students.find((s) => s.vercelId === who.sub);
  if (!student) {
    student = {
      id: `s-v-${who.sub}`,
      classId: data.classrooms[0].id,
      number: Math.max(0, ...data.students.map((s) => s.number)) + 1,
      vercelId: who.sub,
    };
    data.students.push(student);
  }
  return { role: "student", id: student.id };
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
