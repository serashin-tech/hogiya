import { canOpen } from "./access";
import { assess } from "./assessment";
import { newId } from "./id";
import { latestSet } from "./publishing";
import { fail, ok, type Result } from "./result";
import type { Data, User } from "./types";

export type SubmittedAnswer = { questionId: string; choiceIndex: number | null; reason?: string };

/** 공개 상태인 수업만 새 시도를 시작할 수 있다(S02, S04). */
export function canStartAttempt(data: Data, user: User, lessonId: string): boolean {
  if (user.role !== "student" || !canOpen(data, user, { kind: "lesson", id: lessonId })) return false;
  return data.lessons.find((l) => l.id === lessonId)?.state === "공개";
}

/** 참여 횟수: 한 수업에서 낸 모든 시도의 합. 같은 학생의 여러 시도도 각각 센다(ADR 0002). */
export function participationCount(data: Data, lessonId: string): number {
  const setIds = new Set(data.questionSets.filter((s) => s.lessonId === lessonId).map((s) => s.id));
  return data.attempts.filter((a) => setIds.has(a.questionSetId)).length;
}

/**
 * 선진단을 제출한다. 같은 학생이 같은 시도 키로 다시 요청하면 새 시도를 만들지 않고 기존 시도를 돌려준다.
 * 실패하면 미응답 문항의 id가 문항 순서대로 오류 키가 된다.
 */
export function submitAttempt(
  data: Data,
  user: User,
  lessonId: string,
  input: { key: string; answers: SubmittedAnswer[] },
): Result<string> {
  if (user.role !== "student" || !canOpen(data, user, { kind: "lesson", id: lessonId })) {
    return fail({ form: "열 수 없는 자료입니다" });
  }
  const key = input.key.trim();
  if (!key) return fail({ form: "제출 정보가 올바르지 않아요. 화면을 새로 열어 주세요" });

  const duplicate = data.attempts.find((a) => a.studentId === user.id && a.key === key);
  if (duplicate) return ok(duplicate.id);

  if (!canStartAttempt(data, user, lessonId)) return fail({ form: "마감한 수업이라 새로 풀 수 없어요" });
  const set = latestSet(data, lessonId);
  if (!set) return fail({ form: "아직 문항이 준비되지 않았어요" });

  const missing: Record<string, string> = {};
  const answers = set.questions.map((q) => {
    const given = input.answers.find((a) => a.questionId === q.id);
    const choice = given?.choiceIndex;
    if (choice === null || choice === undefined || !(choice >= 0 && choice < q.choices.length)) {
      missing[q.id] = "답을 골라 주세요";
    }
    const reason = q.hasReason ? given?.reason?.trim() : undefined;
    return { questionId: q.id, choiceIndex: choice ?? -1, ...(reason ? { reason } : {}) };
  });
  if (Object.keys(missing).length) return fail(missing);

  const id = newId("a");
  data.attempts.push({ id, studentId: user.id, questionSetId: set.id, key, answers, submittedAt: new Date().toISOString() });
  // 평가 결과는 제출 당시 버전으로 계산해 시도와 함께 저장한다. 이후 버전이 바뀌어도 학생이 본 결과는 그대로다(ADR 0001).
  for (const e of assess(set, answers)) data.evaluations.push({ attemptId: id, ...e });
  return ok(id);
}
