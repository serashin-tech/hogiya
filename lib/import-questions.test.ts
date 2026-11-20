import { describe, expect, it } from "vitest";
import { freshData } from "./mock-data";
import { importQuestions, latestSet } from "./publishing";
import type { SheetRow } from "./question-sheet";

const teacher = { role: "teacher", id: "t-과학" } as const;
const sheetRow = (n: number, over: Partial<SheetRow> = {}): SheetRow => ({
  row: n,
  stem: `문항 ${n}`,
  choices: ["가", "나", "", ""],
  answerIndex: 0,
  hasReason: false,
  concept: "전기 회로의 구성",
  activityGuide: "",
  rubric: "닫힌 회로를 안다",
  misconception: "",
  ...over,
});

/** 문항이 없는 새 수업을 만든다. */
function emptyLesson() {
  const data = freshData();
  data.lessons.push({ id: "l-new", classId: "c-6-2", subject: "과학", title: "새 수업", state: "작성 중" });
  return data;
}

describe("importQuestions (엑셀로 문항 한꺼번에 올리기)", () => {
  it("한 줄마다 문항이 하나씩 생기고, 예상 오개념도 저장된다", () => {
    const data = emptyLesson();
    data.concepts.push({ id: "k-new", lessonId: "l-new", name: "회로", activityGuide: "해 보세요" });
    const r = importQuestions(data, teacher, "l-new", [sheetRow(2, { concept: "회로", misconception: "전지 개수만 본다" }), sheetRow(3, { concept: "회로" })]);
    expect(r).toEqual({ ok: true, value: 2 });
    const questions = latestSet(data, "l-new")!.questions;
    expect(questions.map((q) => q.stem)).toEqual(["문항 2", "문항 3"]);
    expect(questions[0]).toMatchObject({ conceptId: "k-new", misconception: "전지 개수만 본다", choices: ["가", "나"] });
  });

  it("없는 개념 이름은 새 개념으로 만들고 확인 활동 안내를 함께 저장한다", () => {
    const data = emptyLesson();
    importQuestions(data, teacher, "l-new", [sheetRow(2, { concept: "건전지", activityGuide: "건전지를 이어 보세요" })]);
    expect(data.concepts.find((c) => c.lessonId === "l-new")).toMatchObject({ name: "건전지", activityGuide: "건전지를 이어 보세요" });
  });

  it("같은 이름의 개념은 다시 만들지 않는다", () => {
    const data = emptyLesson();
    importQuestions(data, teacher, "l-new", [sheetRow(2, { concept: "건전지" }), sheetRow(3, { concept: "건전지" })]);
    expect(data.concepts.filter((c) => c.lessonId === "l-new")).toHaveLength(1);
  });

  it("한 줄이라도 틀리면 전부 거절하고, 틀린 행 번호를 알려 주며, 아무것도 저장하지 않는다", () => {
    const data = emptyLesson();
    const before = structuredClone(data);
    const r = importQuestions(data, teacher, "l-new", [sheetRow(2), sheetRow(3, { answerIndex: null }), sheetRow(4, { stem: "" })]);
    expect(r).toMatchObject({ ok: false, errors: { "row-3": expect.stringContaining("3행"), "row-4": expect.stringContaining("4행") } });
    expect(data).toEqual(before);
  });

  it("줄이 없으면 거절한다", () => {
    expect(importQuestions(emptyLesson(), teacher, "l-new", [])).toMatchObject({ ok: false, errors: { file: expect.any(String) } });
  });

  it("담당이 아닌 교사와 학생은 올릴 수 없다", () => {
    const data = emptyLesson();
    for (const user of [{ role: "teacher", id: "t-국어" }, { role: "student", id: "s-01" }] as const) {
      expect(importQuestions(data, user, "l-new", [sheetRow(2)])).toMatchObject({ ok: false });
    }
    expect(latestSet(data, "l-new")).toBeUndefined();
  });

  it("공개 중인 수업에서 문항 수가 5개를 넘게 되면 거절하고 되돌린다", () => {
    const data = freshData(); // 전기의 이용: 공개, 문항 5개
    const before = structuredClone(data.questionSets);
    const r = importQuestions(data, teacher, "l-electric", [sheetRow(2, { concept: "전기 회로의 구성" })]);
    expect(r.ok).toBe(false);
    expect(data.questionSets).toEqual(before);
  });
});
