import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoData } from "./demo-data";
import { importQuestions } from "./publishing";
import { parseQuestionSheet } from "./question-sheet";
import { parsePptx } from "./pptx";
import { createLesson, importDeck, slidesOf } from "./teaching";
import { freshData } from "./mock-data";

const teacher = { role: "teacher", id: "t-과학" } as const;

// samples/의 가상 선생님 자료가 앱의 가져오기를 그대로 통과해야 한다.
describe("samples/ 가상 선생님 자료", () => {
  it("PowerPoint와 엑셀을 새 수업에 올릴 수 있다", async () => {
    const data = freshData();
    const made = createLesson(data, teacher, { subject: "과학", title: "샘플 수업" });
    if (!made.ok) throw new Error("수업을 만들지 못했다");

    const deck = await parsePptx(readFileSync("samples/연소와-소화_수업자료.pptx"));
    if (!deck.ok) throw new Error(JSON.stringify(deck.errors));
    expect(deck.value).toHaveLength(6);
    expect(importDeck(data, teacher, made.value, "연소와-소화_수업자료.pptx", deck.value)).toEqual({ ok: true, value: 6 });
    expect(slidesOf(data, made.value)[2].title).toBe("물질이 타는 조건");

    const sheet = await parseQuestionSheet(readFileSync("samples/연소와-소화_진단문항.xlsx"));
    if (!sheet.ok) throw new Error(JSON.stringify(sheet.errors));
    expect(importQuestions(data, teacher, made.value, sheet.value)).toEqual({ ok: true, value: 5 });
  });

  it("화면 확인용 데이터의 「연소와 소화」는 루브릭과 예상 오개념까지 갖췄다", () => {
    const data = demoData();
    const set = data.questionSets.find((s) => s.lessonId === "l-combustion");
    expect(set?.questions).toHaveLength(5);
    expect(set?.questions.every((q) => q.rubric && q.misconception)).toBe(true);
    expect(data.materials.filter((m) => m.lessonId === "l-combustion")).toHaveLength(6);
  });
});
