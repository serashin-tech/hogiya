import { canOpen } from "./access";
import { newId } from "./id";
import { fail, ok, type Result } from "./result";
import type { Data, Lesson, PublishState, Question, QuestionSet, User } from "./types";

export const QUESTION_COUNT = 5;

export type QuestionInput = {
  id?: string;
  stem: string;
  choices: string[];
  answerIndex: number | null;
  hasReason: boolean;
  /** 화면은 하나만 보내지만, 둘 이상이 오면 저장하지 않는다(S03). */
  conceptIds: string[];
  rubric: string;
};

const denied = () => fail({ lesson: "열 수 없는 자료입니다" });

/** 담당 교사만 수업을 고칠 수 있다. */
function teacherLesson(data: Data, user: User, lessonId: string): Lesson | undefined {
  if (user.role !== "teacher" || !canOpen(data, user, { kind: "lesson", id: lessonId })) return undefined;
  return data.lessons.find((l) => l.id === lessonId);
}

export const latestSet = (data: Data, lessonId: string): QuestionSet | undefined =>
  data.questionSets
    .filter((s) => s.lessonId === lessonId)
    .reduce<QuestionSet | undefined>((a, s) => (!a || s.version > a.version ? s : a), undefined);

export const versionsOf = (data: Data, lessonId: string): QuestionSet[] =>
  data.questionSets.filter((s) => s.lessonId === lessonId).sort((a, b) => a.version - b.version);

/**
 * 고칠 문항 세트를 돌려준다. 공개된 적 있는 세트는 덮어쓰지 않고 복사해서 새 버전을 만든다(ADR 0001).
 * 수업이 공개 중이면 새 버전이 곧바로 학생에게 쓰이므로 굳은 채로 시작한다.
 */
function editableSet(data: Data, lesson: Lesson): QuestionSet {
  const latest = latestSet(data, lesson.id);
  if (!latest) {
    const first: QuestionSet = { id: newId("qs"), lessonId: lesson.id, version: 1, draft: false, frozen: false, questions: [] };
    data.questionSets.push(first);
    return first;
  }
  if (!latest.frozen) return latest;
  const next: QuestionSet = {
    ...structuredClone(latest),
    id: newId("qs"),
    version: latest.version + 1,
    frozen: lesson.state === "공개",
  };
  data.questionSets.push(next);
  return next;
}

/** 공개 조건 검사. 부족한 항목을 문장으로 돌려주고, 갖춰졌으면 빈 목록이다. */
export function checkPublishable(data: Data, lessonId: string): string[] {
  const questions = latestSet(data, lessonId)?.questions ?? [];
  const issues: string[] = [];
  if (questions.length < QUESTION_COUNT) issues.push(`문항 ${QUESTION_COUNT - questions.length}개가 더 필요합니다`);
  if (questions.length > QUESTION_COUNT) issues.push(`문항 ${questions.length - QUESTION_COUNT}개를 줄여야 합니다`);
  questions.forEach((q, i) => {
    if (q.choices[q.answerIndex] === undefined) issues.push(`${i + 1}번 문항에 정답이 필요합니다`);
    if (!q.conceptId) issues.push(`${i + 1}번 문항에 개념이 필요합니다`);
    if (!q.rubric.trim()) issues.push(`${i + 1}번 문항에 루브릭이 필요합니다`);
  });
  const used = new Set(questions.map((q) => q.conceptId));
  for (const c of data.concepts) {
    if (c.lessonId === lessonId && used.has(c.id) && !c.activityGuide.trim()) {
      issues.push(`개념 "${c.name}"의 확인 활동 안내가 필요합니다`);
    }
  }
  return issues;
}

export function setLessonState(data: Data, user: User, lessonId: string, target: "공개" | "마감"): Result {
  const lesson = teacherLesson(data, user, lessonId);
  if (!lesson) return denied();
  const allowed: Record<PublishState, PublishState[]> = { "작성 중": ["공개"], 공개: ["마감"], 마감: ["공개"] };
  if (!allowed[lesson.state].includes(target)) return fail({ state: `${lesson.state} 수업은 ${target}할 수 없습니다` });
  if (target === "공개") {
    const issues = checkPublishable(data, lessonId);
    if (issues.length) return fail(Object.fromEntries(issues.map((m, i) => [`issue-${i}`, m])));
  }
  lesson.state = target;
  if (target === "공개") {
    const set = latestSet(data, lessonId);
    if (set) set.frozen = true;
  }
  return ok();
}

export function saveConcept(
  data: Data,
  user: User,
  lessonId: string,
  input: { id?: string; name: string; activityGuide: string },
): Result<string> {
  if (!teacherLesson(data, user, lessonId)) return denied();
  const name = input.name.trim();
  if (!name) return fail({ name: "개념 이름을 입력하세요" });
  const existing = input.id ? data.concepts.find((c) => c.id === input.id && c.lessonId === lessonId) : undefined;
  if (input.id && !existing) return denied();
  if (existing) {
    existing.name = name;
    existing.activityGuide = input.activityGuide.trim();
    return ok(existing.id);
  }
  const id = newId("k");
  data.concepts.push({ id, lessonId, name, activityGuide: input.activityGuide.trim() });
  return ok(id);
}

export function saveQuestion(data: Data, user: User, lessonId: string, input: QuestionInput): Result<string> {
  const lesson = teacherLesson(data, user, lessonId);
  if (!lesson) return denied();

  const errors: Record<string, string> = {};
  const picked = input.choices.map((c, i) => ({ text: c.trim(), i })).filter((c) => c.text);
  if (picked.length < 2) errors.choices = "선택지를 둘 이상 입력하세요";
  const answerAt = picked.findIndex((c) => c.i === input.answerIndex);
  if (input.answerIndex === null || answerAt < 0) errors.answer = "정답은 입력한 선택지 중에서 고르세요";
  if (input.conceptIds.length > 1) errors.concept = "문항 하나에는 개념 하나만 연결할 수 있습니다";
  const conceptId = input.conceptIds[0] ?? "";
  if (conceptId && !data.concepts.some((c) => c.id === conceptId && c.lessonId === lessonId)) {
    errors.concept = "이 수업의 개념만 연결할 수 있습니다";
  }
  if (!input.stem.trim()) errors.stem = "지문을 입력하세요";
  if (Object.keys(errors).length) return fail(errors);

  // 없는 문항을 고치려는 요청은 새 버전을 만들기 전에 거절한다.
  if (input.id && !latestSet(data, lessonId)?.questions.some((q) => q.id === input.id)) return denied();

  const set = editableSet(data, lesson);
  const fields = {
    stem: input.stem.trim(),
    choices: picked.map((c) => c.text),
    answerIndex: answerAt,
    hasReason: input.hasReason,
    conceptId,
    rubric: input.rubric.trim(),
  };
  const existing = input.id ? set.questions.find((q) => q.id === input.id) : undefined;
  if (existing) {
    Object.assign(existing, fields);
    return ok(existing.id);
  }
  const question: Question = { id: newId("q"), ...fields };
  set.questions.push(question);
  return ok(question.id);
}

export function deleteQuestion(data: Data, user: User, lessonId: string, questionId: string): Result {
  const lesson = teacherLesson(data, user, lessonId);
  if (!lesson) return denied();
  if (!latestSet(data, lessonId)?.questions.some((q) => q.id === questionId)) return ok();
  const set = editableSet(data, lesson);
  set.questions = set.questions.filter((q) => q.id !== questionId);
  return ok();
}
