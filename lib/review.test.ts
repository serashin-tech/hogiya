import { beforeEach, describe, expect, it } from "vitest";
import { submitAttempt } from "./attempts";
import { freshData } from "./mock-data";
import { latestSet } from "./publishing";
import { buildReview, lessonProgress, saveRetelling } from "./review";
import type { Data } from "./types";

const s1 = { role: "student", id: "s-01" } as const;
const s2 = { role: "student", id: "s-02" } as const;
const sci = { role: "teacher", id: "t-과학" } as const;

let data: Data;
beforeEach(() => {
  data = freshData();
});

/** wrong에 든 번호(0부터)의 문항은 틀린 선택지를, 나머지는 정답을 고른다. */
function submit(user: typeof s1 | typeof s2, key: string, wrong: number[] = []) {
  const qs = latestSet(data, "l-electric")!.questions;
  const r = submitAttempt(data, user, "l-electric", {
    key,
    answers: qs.map((q, i) => ({
      questionId: q.id,
      choiceIndex: wrong.includes(i) ? (q.answerIndex + 1) % q.choices.length : q.answerIndex,
      reason: "왜냐하면",
    })),
  });
  expect(r.ok).toBe(true);
  return (r as { value: string }).value;
}

describe("제출 시 평가 결과 저장", () => {
  it("개념마다 평가 결과가 시도에 연결되어 저장된다", () => {
    const id = submit(s1, "k1");
    expect(data.evaluations.filter((e) => e.attemptId === id).map((e) => e.conceptId)).toEqual([
      "k-series-parallel",
      "k-circuit",
    ]);
  });

  it("같은 키로 다시 제출해도 평가 결과가 중복되지 않는다", () => {
    submit(s1, "k1");
    submit(s1, "k1");
    expect(data.evaluations).toHaveLength(2);
  });
});

describe("buildReview", () => {
  it("직렬·병렬을 혼동한 답안은 더 알아봐요와 확인 활동 안내가 나온다", () => {
    const id = submit(s1, "k1", [0, 1, 2]); // 직렬·병렬 문항 3개를 모두 틀림
    const review = buildReview(data, id)!;
    const sp = review.cards.find((c) => c.conceptId === "k-series-parallel")!;
    expect(sp.level).toBe("더 알아봐요");
    expect(sp.activityGuide).toBe("전구 2개를 직렬과 병렬로 각각 연결해 밝기를 비교해 보세요.");
    expect(sp.evidence.map((e) => e.correct)).toEqual([false, false, false]);
    expect(sp.evidence[0].stem).toContain("직렬로 연결하면");
    expect(review.allKnown).toBe(false);
  });

  it("잘 알아요 개념에는 확인 활동 안내를 붙이지 않는다", () => {
    const id = submit(s1, "k1", [0, 1, 2]);
    const circuit = buildReview(data, id)!.cards.find((c) => c.conceptId === "k-circuit")!;
    expect(circuit.level).toBe("잘 알아요");
    expect(circuit.activityGuide).toBeUndefined();
  });

  it("모든 개념이 잘 알아요이면 allKnown이다", () => {
    const review = buildReview(data, submit(s1, "k1"))!;
    expect(review.allKnown).toBe(true);
    expect(review.cards.every((c) => c.activityGuide === undefined)).toBe(true);
  });

  it("이유 문장은 저장되지만 판정과 근거에 쓰이지 않는다", () => {
    const a = submit(s1, "k1", [0]);
    const b = submit(s2, "k2", [0]);
    data.attempts.find((x) => x.id === b)!.answers.forEach((x) => (x.reason = "전혀 다른 이유"));
    expect(data.attempts.find((x) => x.id === a)!.answers[0].reason).toBe("왜냐하면");
    expect(buildReview(data, a)!.cards.map((c) => c.level)).toEqual(buildReview(data, b)!.cards.map((c) => c.level));
  });

  it("없는 시도는 undefined다", () => {
    expect(buildReview(data, "a-없음")).toBeUndefined();
  });
});

describe("saveRetelling (다시 설명하기)", () => {
  it("저장해도 이해 수준과 평가 결과가 바뀌지 않는다", () => {
    const id = submit(s1, "k1", [0, 1, 2]);
    const before = structuredClone(data.evaluations);
    const r = saveRetelling(data, s1, id, "k-series-parallel", "전구가 직렬이면 한 줄로 이어져요");
    expect(r.ok).toBe(true);
    expect(data.evaluations).toEqual(before);
    expect(buildReview(data, id)!.cards[0].retelling).toBe("전구가 직렬이면 한 줄로 이어져요");
  });

  it("다시 저장하면 같은 개념의 글이 고쳐진다", () => {
    const id = submit(s1, "k1");
    saveRetelling(data, s1, id, "k-circuit", "첫 글");
    saveRetelling(data, s1, id, "k-circuit", "고친 글");
    expect(data.retellings).toHaveLength(1);
    expect(data.retellings[0].text).toBe("고친 글");
  });

  it("빈 글은 저장되지 않고 그대로 둔다", () => {
    const id = submit(s1, "k1");
    saveRetelling(data, s1, id, "k-circuit", "글");
    const r = saveRetelling(data, s1, id, "k-circuit", "   ");
    expect(r.ok).toBe(false);
    expect(data.retellings[0].text).toBe("글");
  });

  it("다른 학생이나 교사는 쓸 수 없고, 시도에 없는 개념에는 쓸 수 없다", () => {
    const id = submit(s1, "k1");
    expect(saveRetelling(data, s2, id, "k-circuit", "x").ok).toBe(false);
    expect(saveRetelling(data, sci, id, "k-circuit", "x").ok).toBe(false);
    expect(saveRetelling(data, s1, id, "k-없음", "x").ok).toBe(false);
    expect(data.retellings).toHaveLength(0);
  });
});

describe("lessonProgress", () => {
  it("아직 안 함 → 선진단 완료 → 복습 중으로 바뀐다", () => {
    expect(lessonProgress(data, "s-01", "l-electric")).toBe("아직 안 함");
    const id = submit(s1, "k1");
    expect(lessonProgress(data, "s-01", "l-electric")).toBe("선진단 완료");
    saveRetelling(data, s1, id, "k-circuit", "글");
    expect(lessonProgress(data, "s-01", "l-electric")).toBe("복습 중");
    expect(lessonProgress(data, "s-02", "l-electric")).toBe("아직 안 함");
  });
});
