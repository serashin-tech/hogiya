import { beforeEach, describe, expect, it } from "vitest";
import { listLessons } from "./access";
import { canStartAttempt } from "./attempts";
import { freshData } from "./mock-data";
import { checkPublishable, saveConcept, saveQuestion, setLessonState } from "./publishing";
import { createLesson } from "./teaching";
import type { Data } from "./types";

const sci = { role: "teacher", id: "t-과학" } as const;
const math = { role: "teacher", id: "t-수학" } as const;
const student = { role: "student", id: "s-01" } as const;

let data: Data;
let lessonId: string;
let conceptA: string;

const question = (n: number, conceptId: string, over = {}) => ({
  stem: `문항 ${n}`,
  choices: ["가", "나", "다"],
  answerIndex: 1,
  hasReason: false,
  conceptIds: [conceptId],
  rubric: "근거",
  ...over,
});

function must<T>(r: { ok: boolean; value?: T }): T {
  expect(r.ok).toBe(true);
  return r.value as T;
}

beforeEach(() => {
  data = freshData();
  lessonId = must(createLesson(data, sci, { subject: "과학", title: "자석" }));
  conceptA = must(saveConcept(data, sci, lessonId, { name: "자석의 극", activityGuide: "자석 두 개를 붙여 보세요." }));
});

const addQuestions = (n: number) => {
  for (let i = 1; i <= n; i++) must(saveQuestion(data, sci, lessonId, question(i, conceptA)));
};

describe("saveQuestion", () => {
  it("정답이 선택지에 없으면 저장되지 않는다", () => {
    expect(saveQuestion(data, sci, lessonId, question(1, conceptA, { answerIndex: 5 })).ok).toBe(false);
    expect(saveQuestion(data, sci, lessonId, question(1, conceptA, { answerIndex: null })).ok).toBe(false);
    // 빈 선택지를 정답으로 고를 수 없다
    const r = saveQuestion(data, sci, lessonId, question(1, conceptA, { choices: ["가", "", "다"], answerIndex: 1 }));
    expect(r.ok).toBe(false);
    expect(data.questionSets.filter((s) => s.lessonId === lessonId)).toEqual([]);
  });

  it("빈 선택지는 정리되고 정답 위치가 따라간다", () => {
    must(saveQuestion(data, sci, lessonId, question(1, conceptA, { choices: ["가", "", "다"], answerIndex: 2 })));
    const q = data.questionSets.find((s) => s.lessonId === lessonId)!.questions[0];
    expect(q.choices).toEqual(["가", "다"]);
    expect(q.answerIndex).toBe(1);
  });

  it("문항 하나에 개념을 둘 이상 연결하려 하면 막힌다", () => {
    const b = must(saveConcept(data, sci, lessonId, { name: "B", activityGuide: "x" }));
    expect(saveQuestion(data, sci, lessonId, question(1, conceptA, { conceptIds: [conceptA, b] })).ok).toBe(false);
  });

  it("다른 수업의 개념은 연결할 수 없다", () => {
    expect(saveQuestion(data, sci, lessonId, question(1, "k-circuit")).ok).toBe(false);
  });

  it("개념 하나에 문항 여러 개를 연결할 수 있다", () => {
    addQuestions(3);
    expect(data.questionSets.find((s) => s.lessonId === lessonId)!.questions).toHaveLength(3);
  });

  it("담당이 아닌 교사는 저장할 수 없다", () => {
    expect(saveQuestion(data, math, lessonId, question(1, conceptA)).ok).toBe(false);
  });
});

describe("checkPublishable", () => {
  it("문항이 4개이면 '문항 1개가 더 필요합니다'를 알려 준다", () => {
    addQuestions(4);
    expect(checkPublishable(data, lessonId)).toContain("문항 1개가 더 필요합니다");
  });

  it("문항이 하나도 없으면 5개가 더 필요하다", () => {
    expect(checkPublishable(data, lessonId)).toContain("문항 5개가 더 필요합니다");
  });

  it("문항이 6개이면 줄이라고 알려 준다", () => {
    addQuestions(6);
    expect(checkPublishable(data, lessonId)).toContain("문항 1개를 줄여야 합니다");
  });

  it("개념이나 루브릭이 빠진 문항을 항목별로 알려 준다", () => {
    addQuestions(4);
    must(saveQuestion(data, sci, lessonId, question(5, conceptA, { conceptIds: [], rubric: " " })));
    const issues = checkPublishable(data, lessonId);
    expect(issues).toContain("5번 문항에 개념이 필요합니다");
    expect(issues).toContain("5번 문항에 루브릭이 필요합니다");
  });

  it("확인 활동 안내가 없는 개념을 알려 준다", () => {
    const b = must(saveConcept(data, sci, lessonId, { name: "전자석", activityGuide: "" }));
    addQuestions(4);
    must(saveQuestion(data, sci, lessonId, question(5, b)));
    expect(checkPublishable(data, lessonId)).toEqual(['개념 "전자석"의 확인 활동 안내가 필요합니다']);
  });

  it("조건이 갖춰지면 빈 목록이다", () => {
    addQuestions(5);
    expect(checkPublishable(data, lessonId)).toEqual([]);
    expect(checkPublishable(data, "l-electric")).toEqual([]);
  });
});

describe("setLessonState", () => {
  it("조건이 부족하면 공개가 거절되고 작성 중으로 남는다", () => {
    addQuestions(4);
    const r = setLessonState(data, sci, lessonId, "공개");
    expect(r.ok === false && Object.values(r.errors)).toContain("문항 1개가 더 필요합니다");
    expect(data.lessons.find((l) => l.id === lessonId)!.state).toBe("작성 중");
  });

  it("공개하면 학생 전원의 목록에 나타난다", () => {
    addQuestions(5);
    must(setLessonState(data, sci, lessonId, "공개"));
    for (const s of data.students) {
      expect(listLessons(data, { role: "student", id: s.id }).map((l) => l.id)).toContain(lessonId);
    }
  });

  it("마감하면 새 시도가 막히고, 다시 공개할 수 있다", () => {
    addQuestions(5);
    must(setLessonState(data, sci, lessonId, "공개"));
    expect(canStartAttempt(data, student, lessonId)).toBe(true);
    must(setLessonState(data, sci, lessonId, "마감"));
    expect(canStartAttempt(data, student, lessonId)).toBe(false);
    must(setLessonState(data, sci, lessonId, "공개"));
    expect(canStartAttempt(data, student, lessonId)).toBe(true);
  });

  it("작성 중인 수업은 마감할 수 없고, 학생과 담당 밖 교사는 바꿀 수 없다", () => {
    expect(setLessonState(data, sci, lessonId, "마감").ok).toBe(false);
    expect(setLessonState(data, student, "l-electric", "마감").ok).toBe(false);
    expect(setLessonState(data, math, "l-electric", "마감").ok).toBe(false);
  });
});
