import { describe, expect, it } from "vitest";
import { assess } from "./assessment";
import type { Answer, Question, QuestionSet } from "./types";

const q = (id: string, conceptId: string): Question => ({
  id,
  stem: id,
  choices: ["가", "나"],
  answerIndex: 0,
  hasReason: false,
  conceptId,
  rubric: "r",
});
const set = (questions: Question[]): QuestionSet => ({
  id: "qs",
  lessonId: "l",
  version: 1,
  draft: false,
  frozen: true,
  questions,
});
const pick = (...picks: [string, number][]): Answer[] =>
  picks.map(([questionId, choiceIndex]) => ({ questionId, choiceIndex }));

describe("assess (이해 수준 판정, S05)", () => {
  const two = set([q("a1", "A"), q("a2", "A")]);

  it("개념에 연결된 문항을 전부 맞히면 잘 알아요", () => {
    expect(assess(two, pick(["a1", 0], ["a2", 0]))[0].level).toBe("잘 알아요");
  });

  it("문항 2개 중 1개를 맞히면 거의 알아요", () => {
    expect(assess(two, pick(["a1", 0], ["a2", 1]))[0].level).toBe("거의 알아요");
  });

  it("문항 2개를 모두 틀리면 더 알아봐요", () => {
    expect(assess(two, pick(["a1", 1], ["a2", 1]))[0].level).toBe("더 알아봐요");
  });

  it("개념에 연결된 문항 1개를 틀리면 더 알아봐요", () => {
    const one = set([q("b1", "B")]);
    expect(assess(one, pick(["b1", 1]))[0].level).toBe("더 알아봐요");
  });

  it("문항 3개 중 1개는 절반 미만이라 더 알아봐요, 2개는 거의 알아요", () => {
    const three = set([q("c1", "C"), q("c2", "C"), q("c3", "C")]);
    expect(assess(three, pick(["c1", 0], ["c2", 1], ["c3", 1]))[0].level).toBe("더 알아봐요");
    expect(assess(three, pick(["c1", 0], ["c2", 0], ["c3", 1]))[0].level).toBe("거의 알아요");
  });

  it("근거에 문항별 정오가 문항 순서대로 들어 있다", () => {
    expect(assess(two, pick(["a1", 0], ["a2", 1]))[0].evidence).toEqual([
      { questionId: "a1", correct: true },
      { questionId: "a2", correct: false },
    ]);
  });

  it("개념별로 따로 판정하고 개념 순서는 문항에 처음 나온 순서를 따른다", () => {
    const mixed = set([q("a1", "A"), q("b1", "B"), q("a2", "A")]);
    const r = assess(mixed, pick(["a1", 0], ["b1", 1], ["a2", 0]));
    expect(r.map((e) => [e.conceptId, e.level])).toEqual([
      ["A", "잘 알아요"],
      ["B", "더 알아봐요"],
    ]);
  });

  it("답이 없는 문항은 틀린 것으로 본다", () => {
    expect(assess(two, pick(["a1", 0]))[0].level).toBe("거의 알아요");
  });

  it("개념이 없는 문항은 판정하지 않는다", () => {
    expect(assess(set([q("x", "")]), pick(["x", 0]))).toEqual([]);
  });

  it("같은 답안과 같은 버전으로 여러 번 호출해도 결과가 같고 입력을 바꾸지 않는다", () => {
    const answers = pick(["a1", 0], ["a2", 1]);
    const snapshot = structuredClone({ two, answers });
    const first = assess(two, answers);
    expect(assess(two, answers)).toEqual(first);
    expect(assess(two, answers)).toEqual(first);
    expect({ two, answers }).toEqual(snapshot);
  });
});
