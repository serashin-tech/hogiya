import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitAttempt } from "./attempts";
import { askHogi, buildHogiInput, NO_SOURCE_TEXT, respond, type HogiInput } from "./hogi";
import { freshData } from "./mock-data";
import { latestSet } from "./publishing";
import { buildReview } from "./review";
import type { Data } from "./types";

const s1 = { role: "student", id: "s-01" } as const;
const s2 = { role: "student", id: "s-02" } as const;
const sci = { role: "teacher", id: "t-과학" } as const;

let data: Data;
let attemptId: string;

function submit(user: typeof s1 | typeof s2, key: string, reason: string) {
  const qs = latestSet(data, "l-electric")!.questions;
  const r = submitAttempt(data, user, "l-electric", {
    key,
    answers: qs.map((q) => ({ questionId: q.id, choiceIndex: (q.answerIndex + 1) % q.choices.length, reason })),
  });
  return (r as { value: string }).value;
}

beforeEach(() => {
  data = freshData();
  // 다른 과목 수업과 자료
  data.lessons.push({ id: "l-math", classId: "c-6-2", subject: "수학", title: "분수", state: "공개" });
  data.materials.push({ id: "m-math", lessonId: "l-math", title: "분수의 덧셈", body: "통분한다" });
  attemptId = submit(s1, "k1", "내이유-하나");
  submit(s2, "k2", "다른학생의-비밀이유");
});

const input = (question: string, conceptId = "k-series-parallel"): HogiInput => {
  const i = buildHogiInput(data, s1, attemptId, conceptId, question);
  expect(i).toBeDefined();
  return i!;
};

describe("respond (모의 응답, S06)", () => {
  it("전구 직렬·병렬 개념에서 질문하면 그 개념의 설명과 자료 제목이 함께 나온다", () => {
    const reply = respond(input("전구를 직렬로 연결하면 왜 어두워져요?"));
    expect(reply.kind).toBe("explanation");
    expect(reply.text).toContain("직렬");
    expect(reply.sources).toEqual(["전구의 직렬연결과 병렬연결"]);
  });

  it("개념을 바꾸면 그 개념의 설명이 나온다", () => {
    const reply = respond(input("회로가 끊기면 어떻게 돼요?", "k-circuit"));
    expect(reply.kind).toBe("explanation");
    expect(reply.text).toContain("회로");
  });

  it("수업 주제이지만 근거 자료가 없는 질문은 추측하지 않고 확인 안내를 한다", () => {
    const reply = respond(input("전기는 누가 처음 발견했어요?"));
    expect(reply.kind).toBe("no-source");
    expect(reply.text).toBe(NO_SOURCE_TEXT);
    expect(reply.sources).toEqual([]);
  });

  it("개념 설명의 근거가 되는 자료가 입력에 없으면 확인 안내를 한다", () => {
    const i = { ...input("전구를 직렬로 하면요?"), materials: [] };
    expect(respond(i).kind).toBe("no-source");
  });

  it("수업과 무관한 질문은 한 문장으로 돌려보내고 현재 개념으로 안내한다", () => {
    const reply = respond(input("점심 메뉴 추천해 줘"));
    expect(reply.kind).toBe("off-topic");
    expect(reply.text).toContain("전지·전구의 직렬·병렬연결");
    expect(reply.text.split(/[.?!]/).filter(Boolean)).toHaveLength(1);
  });

  it("빈 질문도 현재 개념으로 안내한다", () => {
    expect(respond(input("   ")).kind).toBe("off-topic");
  });
});

describe("buildHogiInput (호기에게 전달하는 입력의 제한)", () => {
  it("현재 개념과 그 수업의 자료만 들어 있고, 학생 이름·다른 학생 답안·다른 과목 자료는 없다", () => {
    const i = input("직렬이 뭐예요?");
    expect(Object.keys(i).sort()).toEqual(["concept", "materials", "question"]);
    const json = JSON.stringify(i);
    for (const forbidden of ["s-01", "s-02", "학생 1번", "다른학생의-비밀이유", "내이유-하나", "분수의 덧셈", "통분한다"]) {
      expect(json).not.toContain(forbidden);
    }
    expect(i.materials.map((m) => m.id)).toEqual(["m-electric-1"]);
    expect(i.concept).toEqual({ id: "k-series-parallel", name: "전지·전구의 직렬·병렬연결" });
  });

  it("다른 학생의 시도, 교사, 시도에 없는 개념으로는 만들 수 없다", () => {
    expect(buildHogiInput(data, s2, attemptId, "k-circuit", "x")).toBeUndefined();
    expect(buildHogiInput(data, sci, attemptId, "k-circuit", "x")).toBeUndefined();
    expect(buildHogiInput(data, s1, attemptId, "k-없음", "x")).toBeUndefined();
  });
});

describe("askHogi", () => {
  it("응답 함수에 입력을 넘기고 응답을 돌려준다", () => {
    const responder = vi.fn(respond);
    const reply = askHogi(data, s1, attemptId, "k-circuit", "스위치는 왜 필요해요?", responder);
    expect(responder).toHaveBeenCalledTimes(1);
    expect(reply.kind).toBe("explanation");
  });

  it("응답 함수가 실패해도 결과와 답안은 그대로 조회되고 시도 횟수가 늘지 않는다", () => {
    const attemptsBefore = structuredClone(data.attempts);
    const reviewBefore = buildReview(data, attemptId);
    const reply = askHogi(data, s1, attemptId, "k-circuit", "질문", () => {
      throw new Error("응답 함수 장애");
    });
    expect(reply.kind).toBe("error");
    expect(reply.text).toContain("답하지 못해요");
    expect(data.attempts).toEqual(attemptsBefore);
    expect(buildReview(data, attemptId)).toEqual(reviewBefore);
    expect(data.attempts).toHaveLength(2);
  });

  it("열 수 없는 시도에는 호기도 응답하지 않는다", () => {
    const responder = vi.fn(respond);
    const reply = askHogi(data, s2, attemptId, "k-circuit", "질문", responder);
    expect(reply.kind).toBe("error");
    expect(responder).not.toHaveBeenCalled();
  });
});
