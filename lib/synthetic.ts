import { canOpenDashboard } from "./dashboard";
import { submitAttempt } from "./attempts";
import { latestSet } from "./publishing";
import { fail, ok, type Result } from "./result";
import type { Data, Level, User } from "./types";

// 합성 시도 데이터(S07). 「전기의 이용」 기본 문항(직렬·병렬 3개, 회로 2개) 기준이다.
// wrong은 틀리게 고를 문항 번호(0부터)이고, 같은 학생의 뒤쪽 항목이 더 최근 시도다.
const PLAN: { student: string; wrong: number[] }[] = [
  { student: "s-01", wrong: [0, 1, 2, 3, 4] }, // 첫 시도: 전부 틀림
  { student: "s-01", wrong: [] }, // 다시 풀어서 전부 맞힘(최근 시도)
  { student: "s-02", wrong: [0, 1, 2] },
  { student: "s-03", wrong: [0, 1, 2] },
  { student: "s-04", wrong: [0] },
  { student: "s-05", wrong: [0, 3] },
  { student: "s-06", wrong: [3, 4] },
  { student: "s-07", wrong: [] },
  { student: "s-08", wrong: [0, 1] },
];

const counts = (low: number, mid: number, high: number): Record<Level, number> => ({
  "더 알아봐요": low,
  "거의 알아요": mid,
  "잘 알아요": high,
});

/** PLAN을 손으로 세어 둔 기대 집계. 화면과 집계 함수의 값을 이것과 비교한다. */
export const EXPECTED = {
  participation: 9,
  distribution: [
    { conceptId: "k-series-parallel", counts: counts(3, 2, 3) },
    { conceptId: "k-circuit", counts: counts(1, 1, 6) },
  ],
  reteach: [
    ["k-series-parallel", 3],
    ["k-circuit", 1],
  ] as [string, number][],
};

/** 합성 시도를 쌓는다. 담당 교사가 공개 수업에, 시도가 없을 때만 한 번 쓸 수 있다. */
export function loadSynthetic(data: Data, user: User, lessonId: string): Result {
  if (!canOpenDashboard(data, user, lessonId)) return fail({ form: "열 수 없는 자료입니다" });
  if (data.lessons.find((l) => l.id === lessonId)?.state !== "공개") return fail({ form: "공개 중인 수업에만 불러올 수 있어요" });
  const set = latestSet(data, lessonId);
  if (!set || data.attempts.some((a) => a.questionSetId === set.id)) return fail({ form: "시도가 없는 수업에만 불러올 수 있어요" });

  PLAN.forEach(({ student, wrong }, i) => {
    submitAttempt(data, { role: "student", id: student }, lessonId, {
      key: `synthetic-${i}`,
      answers: set.questions.map((q, qi) => ({
        questionId: q.id,
        choiceIndex: wrong.includes(qi) ? (q.answerIndex + 1) % q.choices.length : q.answerIndex,
        reason: q.hasReason ? "합성 데이터의 이유 문장" : undefined,
      })),
    });
  });
  return ok();
}
