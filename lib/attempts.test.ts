import { beforeEach, describe, expect, it } from "vitest";
import { participationCount, submitAttempt, type SubmittedAnswer } from "./attempts";
import { freshData } from "./mock-data";
import { latestSet, saveQuestion, setLessonState, setSignature } from "./publishing";
import type { Data } from "./types";

const s1 = { role: "student", id: "s-01" } as const;
const s2 = { role: "student", id: "s-02" } as const;
const sci = { role: "teacher", id: "t-과학" } as const;

let data: Data;
beforeEach(() => {
  data = freshData();
});

const complete = (): SubmittedAnswer[] =>
  latestSet(data, "l-electric")!.questions.map((q) => ({ questionId: q.id, choiceIndex: 0, reason: "" }));

describe("submitAttempt", () => {
  it("한 문항을 비우면 막히고, 비운 문항 중 첫 번째가 오류 목록의 처음에 온다", () => {
    const answers = complete();
    answers[2].choiceIndex = null;
    answers[4].choiceIndex = null;
    const r = submitAttempt(data, s1, "l-electric", { key: "k1", answers });
    expect(r.ok).toBe(false);
    const missing = r.ok ? [] : Object.keys(r.errors);
    expect(missing).toEqual([answers[2].questionId, answers[4].questionId]);
    expect(data.attempts).toHaveLength(0);
  });

  it("선택지 범위를 벗어난 선택은 미응답으로 본다", () => {
    const answers = complete();
    answers[0].choiceIndex = 7;
    expect(submitAttempt(data, s1, "l-electric", { key: "k1", answers }).ok).toBe(false);
  });

  it("같은 시도 키로 두 번 제출해도 시도는 한 번만 기록된다", () => {
    const a = submitAttempt(data, s1, "l-electric", { key: "k1", answers: complete() });
    const b = submitAttempt(data, s1, "l-electric", { key: "k1", answers: complete() });
    expect(a.ok && b.ok && a.value === b.value).toBe(true);
    expect(data.attempts).toHaveLength(1);
  });

  it("다른 학생이 같은 키를 써도 별개의 시도다", () => {
    submitAttempt(data, s1, "l-electric", { key: "same", answers: complete() });
    submitAttempt(data, s2, "l-electric", { key: "same", answers: complete() });
    expect(data.attempts).toHaveLength(2);
  });

  it("같은 학생이 새 키로 다시 풀면 시도가 2개가 되고 참여 횟수가 2가 된다", () => {
    submitAttempt(data, s1, "l-electric", { key: "k1", answers: complete() });
    submitAttempt(data, s1, "l-electric", { key: "k2", answers: complete() });
    expect(data.attempts).toHaveLength(2);
    expect(participationCount(data, "l-electric")).toBe(2);
  });

  it("이유 칸이 있는 문항의 이유 문장은 저장되고, 없는 문항의 이유는 버린다", () => {
    const answers = complete().map((a) => ({ ...a, reason: " 이유 " }));
    submitAttempt(data, s1, "l-electric", { key: "k1", answers });
    const saved = data.attempts[0].answers;
    expect(saved[0].reason).toBe("이유");
    expect(saved[4].reason).toBeUndefined();
  });

  it("이유 문장이 비어 있어도 제출된다(선택 입력)", () => {
    expect(submitAttempt(data, s1, "l-electric", { key: "k1", answers: complete() }).ok).toBe(true);
  });

  it("시도 키가 없으면 거절한다", () => {
    expect(submitAttempt(data, s1, "l-electric", { key: " ", answers: complete() }).ok).toBe(false);
  });

  it("마감한 수업, 교사, 없는 수업에는 제출할 수 없다", () => {
    expect(submitAttempt(data, sci, "l-electric", { key: "k", answers: complete() }).ok).toBe(false);
    expect(submitAttempt(data, s1, "l-없음", { key: "k", answers: [] }).ok).toBe(false);
    const answers = complete();
    setLessonState(data, sci, "l-electric", "마감");
    expect(submitAttempt(data, s1, "l-electric", { key: "k", answers }).ok).toBe(false);
    expect(data.attempts).toHaveLength(0);
  });

  it("마감 전에 낸 시도의 같은 키 재요청은 기존 시도를 돌려준다", () => {
    const first = submitAttempt(data, s1, "l-electric", { key: "k1", answers: complete() });
    setLessonState(data, sci, "l-electric", "마감");
    const again = submitAttempt(data, s1, "l-electric", { key: "k1", answers: complete() });
    expect(again.ok && first.ok && again.value === first.value).toBe(true);
  });

  it("시도 키는 수업 안에서만 같은 시도를 가리킨다", () => {
    const other = structuredClone(latestSet(data, "l-electric")!);
    other.id = "qs-other";
    other.lessonId = "l-other";
    other.questions.forEach((q) => (q.id = `${q.id}-o`));
    data.questionSets.push(other);
    data.lessons.push({ id: "l-other", classId: "c-6-2", subject: "과학", title: "다른 수업", state: "공개" });

    const a = submitAttempt(data, s1, "l-electric", { key: "same", answers: complete() });
    const b = submitAttempt(data, s1, "l-other", {
      key: "same",
      answers: other.questions.map((q) => ({ questionId: q.id, choiceIndex: 0 })),
    });
    expect(a.ok && b.ok && a.value !== b.value).toBe(true);
    expect(data.attempts).toHaveLength(2);
  });

  it("폼을 연 뒤 문항이 바뀌었으면(서명이 다르면) 제출을 거절하고 시도를 만들지 않는다", () => {
    const signature = setSignature(latestSet(data, "l-electric")!);
    const q = latestSet(data, "l-electric")!.questions[0];
    saveQuestion(data, sci, "l-electric", {
      id: q.id, stem: "교사가 고침", choices: q.choices, answerIndex: q.answerIndex,
      hasReason: q.hasReason, conceptIds: [q.conceptId], rubric: q.rubric,
    });
    const stale = submitAttempt(data, s1, "l-electric", { key: "k1", signature, answers: complete() });
    expect(stale.ok).toBe(false);
    expect(data.attempts).toHaveLength(0);

    const fresh = submitAttempt(data, s1, "l-electric", {
      key: "k1",
      signature: setSignature(latestSet(data, "l-electric")!),
      answers: complete(),
    });
    expect(fresh.ok).toBe(true);
  });

  it("공개 뒤 새 버전이 생기면 새로 푼 시도는 버전 2에 연결되고, 이전 시도는 버전 1에 남는다", () => {
    submitAttempt(data, s1, "l-electric", { key: "k1", answers: complete() });
    const q = latestSet(data, "l-electric")!.questions[0];
    saveQuestion(data, sci, "l-electric", {
      id: q.id, stem: "고침", choices: q.choices, answerIndex: q.answerIndex,
      hasReason: q.hasReason, conceptIds: [q.conceptId], rubric: q.rubric,
    });
    submitAttempt(data, s1, "l-electric", { key: "k2", answers: complete() });
    const versionOf = (i: number) => data.questionSets.find((s) => s.id === data.attempts[i].questionSetId)!.version;
    expect([versionOf(0), versionOf(1)]).toEqual([1, 2]);
  });
});
