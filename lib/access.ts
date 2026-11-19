import type { Data, Lesson, Target, User } from "./types";

// 접근 판단은 이 파일의 함수 한 곳에서만 한다(SPEC S01). 3주차에 RLS로 옮길 때 규칙의 원본이 된다.

function lessonOf(data: Data, target: Target): Lesson | undefined {
  const byId = <T extends { id: string }>(xs: T[], id: string) => xs.find((x) => x.id === id);
  let lessonId: string | undefined;
  if (target.kind === "lesson") lessonId = target.id;
  else if (target.kind === "material") lessonId = byId(data.materials, target.id)?.lessonId;
  else {
    const attempt = byId(data.attempts, target.id);
    lessonId = byId(data.questionSets, attempt?.questionSetId ?? "")?.lessonId;
  }
  return lessonId === undefined ? undefined : byId(data.lessons, lessonId);
}

/** 없는 대상과 범위 밖 대상 모두 false를 돌려줘서 존재 여부가 드러나지 않는다. */
export function canOpen(data: Data, user: User, target: Target): boolean {
  const lesson = lessonOf(data, target);
  if (!lesson) return false;

  if (user.role === "teacher") {
    return data.assignments.some(
      (a) => a.teacherId === user.id && a.classId === lesson.classId && a.subject === lesson.subject,
    );
  }

  const student = data.students.find((s) => s.id === user.id);
  if (!student || student.classId !== lesson.classId) return false;

  if (target.kind === "attempt") {
    return data.attempts.find((a) => a.id === target.id)?.studentId === student.id;
  }
  if (lesson.state === "공개") return true;
  if (lesson.state === "작성 중") return false;
  // 마감: 마감 전에 시도한 학생만 결과를 본다.
  const setIds = data.questionSets.filter((q) => q.lessonId === lesson.id).map((q) => q.id);
  return data.attempts.some((a) => a.studentId === student.id && setIds.includes(a.questionSetId));
}

export function listLessons(data: Data, user: User): Lesson[] {
  return data.lessons.filter((l) => canOpen(data, user, { kind: "lesson", id: l.id }));
}
