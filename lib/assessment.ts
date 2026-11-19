import type { Answer, Evaluation, QuestionSet } from "./types";

export type ConceptAssessment = Omit<Evaluation, "attemptId">;

/**
 * 이해 수준을 정하는 유일한 곳이다(SPEC S05). 부수 효과 없는 순수 함수다.
 * 개념에 연결된 문항을 전부 맞히면 잘 알아요, 절반 이상이면 거의 알아요, 절반 미만이면 더 알아봐요.
 * 이유 문장과 다시 설명하기 글은 판정에 쓰지 않는다.
 */
export function assess(set: QuestionSet, answers: Answer[]): ConceptAssessment[] {
  const byConcept = new Map<string, ConceptAssessment["evidence"]>();
  for (const q of set.questions) {
    if (!q.conceptId) continue;
    const given = answers.find((a) => a.questionId === q.id)?.choiceIndex;
    const evidence = byConcept.get(q.conceptId) ?? [];
    evidence.push({ questionId: q.id, correct: given === q.answerIndex });
    byConcept.set(q.conceptId, evidence);
  }
  return [...byConcept].map(([conceptId, evidence]) => {
    const right = evidence.filter((e) => e.correct).length;
    const level =
      right === evidence.length ? "잘 알아요" : right * 2 >= evidence.length ? "거의 알아요" : "더 알아봐요";
    return { conceptId, level, evidence };
  });
}
