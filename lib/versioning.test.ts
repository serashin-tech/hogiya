import { beforeEach, describe, expect, it } from "vitest";
import { freshData } from "./mock-data";
import { deleteQuestion, latestSet, saveConcept, saveQuestion, setLessonState, versionsOf } from "./publishing";
import { createLesson } from "./teaching";
import type { Data, Question } from "./types";

const sci = { role: "teacher", id: "t-과학" } as const;

let data: Data;
beforeEach(() => {
  data = freshData();
});

const asInput = (q: Question, over: Record<string, unknown> = {}) => ({
  id: q.id,
  stem: q.stem,
  choices: q.choices,
  answerIndex: q.answerIndex,
  hasReason: q.hasReason,
  conceptIds: [q.conceptId],
  rubric: q.rubric,
  ...over,
});

describe("공개 후 수정은 새 버전이 된다 (ADR 0001)", () => {
  it("공개 뒤 지문을 고치면 버전이 2가 되고, 이전 시도는 버전 1에 연결된 채 조회된다", () => {
    const v1 = latestSet(data, "l-electric")!;
    const target = v1.questions[0];
    const oldStem = target.stem;
    data.attempts.push({ id: "a1", studentId: "s-01", questionSetId: v1.id, key: "k", answers: [], submittedAt: "" });

    expect(saveQuestion(data, sci, "l-electric", asInput(target, { stem: "고친 지문" })).ok).toBe(true);

    const versions = versionsOf(data, "l-electric");
    expect(versions.map((s) => s.version)).toEqual([1, 2]);
    expect(latestSet(data, "l-electric")!.questions[0].stem).toBe("고친 지문");

    const attemptSet = data.questionSets.find((s) => s.id === data.attempts[0].questionSetId)!;
    expect(attemptSet.version).toBe(1);
    expect(attemptSet.questions[0].stem).toBe(oldStem);
  });

  it("이전 버전의 문항과 루브릭이 그대로 보존된다", () => {
    const target = latestSet(data, "l-electric")!.questions[2];
    saveQuestion(data, sci, "l-electric", asInput(target, { rubric: "새 루브릭" }));
    const [v1, v2] = versionsOf(data, "l-electric");
    expect(v1.questions[2].rubric).toBe(target.rubric);
    expect(v2.questions[2].rubric).toBe("새 루브릭");
    expect(v2.questions).toHaveLength(5);
    expect(v2.questions.map((q) => q.id)).toEqual(v1.questions.map((q) => q.id));
  });

  it("공개 뒤 문항을 지워도 새 버전이 되고 이전 버전은 그대로다", () => {
    const v1 = latestSet(data, "l-electric")!;
    deleteQuestion(data, sci, "l-electric", v1.questions[4].id);
    const [old, next] = versionsOf(data, "l-electric");
    expect(old.questions).toHaveLength(5);
    expect(next.questions).toHaveLength(4);
  });

  it("검증에 실패한 수정은 새 버전을 만들지 않는다", () => {
    const target = latestSet(data, "l-electric")!.questions[0];
    expect(saveQuestion(data, sci, "l-electric", asInput(target, { answerIndex: 9 })).ok).toBe(false);
    expect(saveQuestion(data, sci, "l-electric", asInput(target, { id: "q-없음" })).ok).toBe(false);
    expect(versionsOf(data, "l-electric")).toHaveLength(1);
  });

  it("작성 중인 수업의 문항을 고치는 것은 새 버전을 만들지 않는다", () => {
    const lessonId = (createLesson(data, sci, { subject: "과학", title: "자석" }) as { value: string }).value;
    const k = (saveConcept(data, sci, lessonId, { name: "극", activityGuide: "해 보세요" }) as { value: string }).value;
    const q = { stem: "문항", choices: ["가", "나"], answerIndex: 0, hasReason: false, conceptIds: [k], rubric: "r" };
    const id = (saveQuestion(data, sci, lessonId, q) as { value: string }).value;
    saveQuestion(data, sci, lessonId, { ...q, id, stem: "고침" });
    saveQuestion(data, sci, lessonId, { ...q, id, stem: "또 고침" });
    const sets = versionsOf(data, lessonId);
    expect(sets).toHaveLength(1);
    expect(sets[0].questions[0].stem).toBe("또 고침");
  });

  it("마감 중에 고치면 새 버전이 하나만 생기고, 다시 공개하면 그 버전이 굳는다", () => {
    const first = latestSet(data, "l-electric")!.questions[0];
    setLessonState(data, sci, "l-electric", "마감");
    saveQuestion(data, sci, "l-electric", asInput(first, { stem: "마감 중 수정 1" }));
    saveQuestion(data, sci, "l-electric", asInput(first, { stem: "마감 중 수정 2" }));
    expect(versionsOf(data, "l-electric")).toHaveLength(2);

    setLessonState(data, sci, "l-electric", "공개");
    saveQuestion(data, sci, "l-electric", asInput(first, { stem: "공개 뒤 수정" }));
    expect(versionsOf(data, "l-electric").map((s) => s.version)).toEqual([1, 2, 3]);
  });
});
