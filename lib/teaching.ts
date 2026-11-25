import { canOpen } from "./access";
import { newId } from "./id";
import { fail, ok, type Result } from "./result";
import type { Data, Subject, User } from "./types";

const isTeacher = (user: User) => user.role === "teacher";

export function createLesson(
  data: Data,
  user: User,
  input: { subject: Subject; title: string },
): Result<string> {
  const assignment = isTeacher(user)
    ? data.assignments.find((a) => a.teacherId === user.id && a.subject === input.subject)
    : undefined;
  if (!assignment) return fail({ subject: "담당하는 과목에만 수업을 만들 수 있습니다" });
  const title = input.title.trim();
  if (!title) return fail({ title: "수업 제목을 입력하세요" });

  const id = newId("l");
  data.lessons.push({ id, classId: assignment.classId, subject: input.subject, title, state: "작성 중" });
  return ok(id);
}

/** 수업 자료를 슬라이드 모양으로 바꾼다. 올린 PowerPoint와 직접 쓴 자료가 같은 순서로 보인다. */
export const slidesOf = (data: Data, lessonId: string) =>
  data.materials.filter((m) => m.lessonId === lessonId).map((m) => ({ id: m.id, title: m.title, text: m.body }));

function validateMaterial(input: { title: string; body: string }) {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) errors.title = "자료 제목을 입력하세요";
  if (!input.body.trim()) errors.body = "자료 본문을 입력하세요";
  return errors;
}

export function addMaterial(
  data: Data,
  user: User,
  lessonId: string,
  input: { title: string; body: string },
): Result<string> {
  if (!canOpen(data, user, { kind: "lesson", id: lessonId }) || !isTeacher(user)) {
    return fail({ lesson: "열 수 없는 자료입니다" });
  }
  const errors = validateMaterial(input);
  if (Object.keys(errors).length) return fail(errors);
  const id = newId("m");
  data.materials.push({ id, lessonId, title: input.title.trim(), body: input.body.trim() });
  return ok(id);
}

export function updateMaterial(
  data: Data,
  user: User,
  materialId: string,
  input: { title: string; body: string },
): Result {
  if (!canOpen(data, user, { kind: "material", id: materialId }) || !isTeacher(user)) {
    return fail({ material: "열 수 없는 자료입니다" });
  }
  const errors = validateMaterial(input);
  if (Object.keys(errors).length) return fail(errors);
  const m = data.materials.find((x) => x.id === materialId)!;
  m.title = input.title.trim();
  m.body = input.body.trim();
  return ok();
}

/**
 * PowerPoint에서 뽑은 슬라이드를 수업 자료로 바꿔 넣는다. 슬라이드마다 자료 하나다.
 * 같은 수업에 이전에 올린 파일의 자료는 지우고, 직접 쓴 자료는 남긴다("다른 파일로 바꾸기").
 * 슬라이드가 없으면 이전 자료를 지우지 않고 거절한다.
 */
export function importDeck(
  data: Data,
  user: User,
  lessonId: string,
  fileName: string,
  slides: { title: string; text: string }[],
): Result<number> {
  if (!canOpen(data, user, { kind: "lesson", id: lessonId }) || !isTeacher(user)) {
    return fail({ lesson: "열 수 없는 자료입니다" });
  }
  if (slides.length === 0) return fail({ file: "가져올 슬라이드가 없습니다" });
  data.materials = data.materials.filter((m) => !(m.lessonId === lessonId && m.origin));
  for (const s of slides) {
    const title = s.title.trim().slice(0, 100);
    data.materials.push({
      id: newId("m"),
      lessonId,
      title,
      body: s.text.trim().slice(0, 2000) || title,
      origin: fileName,
    });
  }
  return ok(slides.length);
}

export function deleteMaterial(data: Data, user: User, materialId: string): Result {
  if (!canOpen(data, user, { kind: "material", id: materialId }) || !isTeacher(user)) {
    return fail({ material: "열 수 없는 자료입니다" });
  }
  data.materials = data.materials.filter((m) => m.id !== materialId);
  return ok();
}
