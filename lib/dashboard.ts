import { canOpen } from "./access";
import { participationCount } from "./attempts";
import { latestSet } from "./publishing";
import type { Attempt, Data, Level, User } from "./types";

const LEVELS: Level[] = ["더 알아봐요", "거의 알아요", "잘 알아요"];

export type Dashboard = {
  lessonId: string;
  /** 집계가 기준으로 삼은 문항 세트 버전(최신 버전). ADR 0001 */
  version: number | undefined;
  /** 모든 시도의 합. 같은 학생의 여러 시도도 각각 센다. ADR 0002 */
  participation: number;
  /** 한 번이라도 제출한 학생 수(같은 학생은 한 명). "응답 18 / 20명"의 앞 수 */
  respondents: number;
  /** 수업이 속한 학급의 학생 수. "응답 18 / 20명"의 뒤 수 */
  enrolled: number;
  /** 최신 버전으로 푼 학생 수(분포의 모집단) */
  latestVersionAttempts: number;
  empty: boolean;
  distribution: { conceptId: string; name: string; counts: Record<Level, number> }[];
  /** 더 알아봐요 인원이 많은 순서. 인원이 0인 개념은 넣지 않는다. */
  reteach: { conceptId: string; name: string; count: number }[];
};

/** 담당 교사만 열 수 있다. 마감한 수업도 계속 볼 수 있다(S01, S07). */
export function canOpenDashboard(data: Data, user: User, lessonId: string): boolean {
  return user.role === "teacher" && canOpen(data, user, { kind: "lesson", id: lessonId });
}

/** 최신 문항 세트에 속한 시도 중 학생마다 가장 최근 시도 하나를 고른다. 같은 시각이면 나중에 쌓인 시도가 최근이다. */
function latestAttemptPerStudent(data: Data, lessonId: string): Attempt[] {
  const set = latestSet(data, lessonId);
  const byStudent = new Map<string, Attempt>();
  for (const a of data.attempts) {
    if (a.questionSetId !== set?.id) continue;
    const prev = byStudent.get(a.studentId);
    if (!prev || a.submittedAt >= prev.submittedAt) byStudent.set(a.studentId, a);
  }
  return [...byStudent.values()];
}

/** 학급 전체 집계. 개인을 알아볼 수 있는 값(번호, ID)은 담지 않는다. */
export function aggregate(data: Data, lessonId: string): Dashboard {
  const set = latestSet(data, lessonId);
  const participation = participationCount(data, lessonId);
  const attempts = latestAttemptPerStudent(data, lessonId);
  const attemptIds = new Set(attempts.map((a) => a.id));

  const conceptIds = [...new Set((set?.questions ?? []).map((q) => q.conceptId).filter(Boolean))];
  const distribution = conceptIds.map((conceptId) => {
    const counts = Object.fromEntries(LEVELS.map((l) => [l, 0])) as Record<Level, number>;
    for (const e of data.evaluations) {
      if (e.conceptId === conceptId && attemptIds.has(e.attemptId)) counts[e.level] += 1;
    }
    return { conceptId, name: data.concepts.find((c) => c.id === conceptId)?.name ?? conceptId, counts };
  });
  const reteach = distribution
    .map((d, order) => ({ conceptId: d.conceptId, name: d.name, count: d.counts["더 알아봐요"], order }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .map(({ conceptId, name, count }) => ({ conceptId, name, count }));

  const setIds = new Set(data.questionSets.filter((s) => s.lessonId === lessonId).map((s) => s.id));
  const classId = data.lessons.find((l) => l.id === lessonId)?.classId;
  return {
    lessonId,
    version: set?.version,
    participation,
    respondents: new Set(data.attempts.filter((a) => setIds.has(a.questionSetId)).map((a) => a.studentId)).size,
    enrolled: data.students.filter((s) => s.classId === classId).length,
    latestVersionAttempts: attempts.length,
    empty: participation === 0,
    distribution,
    reteach,
  };
}

export type ConceptDetailRow = {
  /** 학생 이름은 없고 번호만 보인다. 학급 전체 화면에서는 쓰지 않는다. */
  studentNumber: number;
  level: Level;
  answers: { questionId: string; stem: string; choice: string; correct: boolean; reason?: string }[];
};

/** 개념으로 내려가서 보는 개인 답안: 번호, 선택, 이유 문장, 판단 근거(S07). */
export function conceptDetail(data: Data, lessonId: string, conceptId: string): ConceptDetailRow[] {
  const set = latestSet(data, lessonId);
  const questions = (set?.questions ?? []).filter((q) => q.conceptId === conceptId);
  const rows: ConceptDetailRow[] = [];
  for (const attempt of latestAttemptPerStudent(data, lessonId)) {
    const student = data.students.find((s) => s.id === attempt.studentId);
    const evaluation = data.evaluations.find((e) => e.attemptId === attempt.id && e.conceptId === conceptId);
    if (!student || !evaluation) continue;
    rows.push({
      studentNumber: student.number,
      level: evaluation.level,
      answers: questions.map((q) => {
        const given = attempt.answers.find((a) => a.questionId === q.id);
        return {
          questionId: q.id,
          stem: q.stem,
          choice: q.choices[given?.choiceIndex ?? -1] ?? "",
          correct: evaluation.evidence.find((e) => e.questionId === q.id)?.correct ?? false,
          ...(given?.reason ? { reason: given.reason } : {}),
        };
      }),
    });
  }
  return rows.sort((a, b) => a.studentNumber - b.studentNumber);
}
