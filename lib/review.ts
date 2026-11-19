import { canOpen } from "./access";
import { fail, ok, type Result } from "./result";
import type { Data, Level, User } from "./types";

export type ReviewCard = {
  conceptId: string;
  name: string;
  level: Level;
  evidence: { questionId: string; stem: string; correct: boolean }[];
  /** 더 알아봐요인 개념에만 붙는다. */
  activityGuide?: string;
  retelling?: string;
};
export type Review = { attemptId: string; cards: ReviewCard[]; allKnown: boolean };

/** 복습 화면의 왼쪽 내용: 개념별 이해 수준 카드와 근거, 확인 활동 안내, 다시 설명하기 글(S05). */
export function buildReview(data: Data, attemptId: string): Review | undefined {
  const attempt = data.attempts.find((a) => a.id === attemptId);
  const set = data.questionSets.find((s) => s.id === attempt?.questionSetId);
  if (!attempt || !set) return undefined;

  const cards = data.evaluations
    .filter((e) => e.attemptId === attemptId)
    .map((e): ReviewCard => {
      const concept = data.concepts.find((c) => c.id === e.conceptId);
      return {
        conceptId: e.conceptId,
        name: concept?.name ?? e.conceptId,
        level: e.level,
        evidence: e.evidence.map((x) => ({
          ...x,
          stem: set.questions.find((q) => q.id === x.questionId)?.stem ?? "",
        })),
        ...(e.level === "더 알아봐요" && concept?.activityGuide ? { activityGuide: concept.activityGuide } : {}),
        retelling: data.retellings.find((r) => r.attemptId === attemptId && r.conceptId === e.conceptId)?.text,
      };
    });
  return { attemptId, cards, allKnown: cards.length > 0 && cards.every((c) => c.level === "잘 알아요") };
}

/** 다시 설명하기 글은 시도의 부속 기록이다. 이해 수준과 집계에는 영향을 주지 않는다. */
export function saveRetelling(
  data: Data,
  user: User,
  attemptId: string,
  conceptId: string,
  text: string,
): Result {
  if (user.role !== "student" || !canOpen(data, user, { kind: "attempt", id: attemptId })) {
    return fail({ form: "열 수 없는 자료입니다" });
  }
  if (!data.evaluations.some((e) => e.attemptId === attemptId && e.conceptId === conceptId)) {
    return fail({ form: "이 시도에 없는 개념이에요" });
  }
  const body = text.trim();
  if (!body) return fail({ text: "글을 쓰면 저장할 수 있어요" });

  const existing = data.retellings.find((r) => r.attemptId === attemptId && r.conceptId === conceptId);
  if (existing) existing.text = body;
  else data.retellings.push({ attemptId, conceptId, text: body });
  return ok();
}

export type Progress = "아직 안 함" | "선진단 완료" | "복습 중";

/** 학생의 수업별 진행 상태(S02). 다시 설명하기 글이 하나라도 있으면 복습 중이다. */
export function lessonProgress(data: Data, studentId: string, lessonId: string): Progress {
  const setIds = new Set(data.questionSets.filter((s) => s.lessonId === lessonId).map((s) => s.id));
  const mine = data.attempts.filter((a) => a.studentId === studentId && setIds.has(a.questionSetId));
  if (mine.length === 0) return "아직 안 함";
  return data.retellings.some((r) => mine.some((a) => a.id === r.attemptId)) ? "복습 중" : "선진단 완료";
}
