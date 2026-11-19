import { beforeEach, describe, expect, it } from "vitest";
import { submitAttempt } from "./attempts";
import { aggregate, canOpenDashboard, conceptDetail } from "./dashboard";
import { freshData } from "./mock-data";
import { latestSet, saveQuestion, setLessonState } from "./publishing";
import { EXPECTED, loadSynthetic } from "./synthetic";
import type { Data } from "./types";

const sci = { role: "teacher", id: "t-과학" } as const;
const math = { role: "teacher", id: "t-수학" } as const;
const s1 = { role: "student", id: "s-01" } as const;
const s9 = { role: "student", id: "s-09" } as const;

let data: Data;
beforeEach(() => {
  data = freshData();
});

function submit(user: { role: "student"; id: string }, key: string, wrong: number[]) {
  const qs = latestSet(data, "l-electric")!.questions;
  const r = submitAttempt(data, user, "l-electric", {
    key,
    answers: qs.map((q, i) => ({
      questionId: q.id,
      choiceIndex: wrong.includes(i) ? (q.answerIndex + 1) % q.choices.length : q.answerIndex,
      reason: `이유(${user.id.slice(2)}-${key})`,
    })),
  });
  expect(r.ok).toBe(true);
}

describe("aggregate: 합성 데이터와 기대 집계", () => {
  it("참여 횟수, 수준별 분포, 재지도 대상 개념이 기대 집계와 일치한다", () => {
    expect(loadSynthetic(data, sci, "l-electric").ok).toBe(true);
    const d = aggregate(data, "l-electric");
    expect(d.participation).toBe(EXPECTED.participation);
    expect(d.distribution.map((x) => ({ conceptId: x.conceptId, counts: x.counts }))).toEqual(EXPECTED.distribution);
    expect(d.reteach.map((x) => [x.conceptId, x.count])).toEqual(EXPECTED.reteach);
  });

  it("합성 데이터는 담당 교사만, 공개된 수업에만, 한 번만 불러올 수 있다", () => {
    expect(loadSynthetic(data, math, "l-electric").ok).toBe(false);
    expect(loadSynthetic(data, sci, "l-electric").ok).toBe(true);
    expect(loadSynthetic(data, sci, "l-electric").ok).toBe(false);
    expect(data.attempts).toHaveLength(EXPECTED.participation);
  });
});

describe("aggregate: ADR 0002 (최근 시도 기준)", () => {
  it("한 학생이 두 번 시도하면 분포에는 최근 시도만, 참여 횟수에는 두 번이 모두 반영된다", () => {
    submit(s1, "k1", [0, 1, 2, 3, 4]); // 전부 틀림
    let d = aggregate(data, "l-electric");
    expect(d.distribution[0].counts["더 알아봐요"]).toBe(1);

    submit(s1, "k2", []); // 다시 풀어서 전부 맞힘
    d = aggregate(data, "l-electric");
    expect(d.participation).toBe(2);
    expect(d.distribution[0].counts).toEqual({ "더 알아봐요": 0, "거의 알아요": 0, "잘 알아요": 1 });
    expect(d.distribution[1].counts).toEqual({ "더 알아봐요": 0, "거의 알아요": 0, "잘 알아요": 1 });
    expect(d.reteach).toEqual([]);
  });

  it("학생이 새 시도를 제출하면 분포가 즉시 바뀐다", () => {
    submit(s9, "k1", [0, 1, 2]);
    const before = aggregate(data, "l-electric").distribution[0].counts;
    expect(before["더 알아봐요"]).toBe(1);
    submit(s9, "k2", []);
    const after = aggregate(data, "l-electric").distribution[0].counts;
    expect(after).toEqual({ "더 알아봐요": 0, "거의 알아요": 0, "잘 알아요": 1 });
  });

  it("재지도 대상 개념은 더 알아봐요 인원이 많은 순서이고, 0명인 개념은 넣지 않는다", () => {
    submit({ role: "student", id: "s-02" }, "a", [3, 4]); // 회로만 틀림
    submit({ role: "student", id: "s-03" }, "a", [3]); // 회로 1/2 → 거의
    submit({ role: "student", id: "s-04" }, "a", [3, 4]);
    const d = aggregate(data, "l-electric");
    expect(d.reteach.map((r) => [r.name, r.count])).toEqual([["전기 회로의 구성", 2]]);
  });
});

describe("aggregate: 표시 정보와 개인정보", () => {
  it("시도가 없으면 empty이고 버전은 표시된다", () => {
    const d = aggregate(data, "l-electric");
    expect(d.empty).toBe(true);
    expect(d.participation).toBe(0);
    expect(d.version).toBe(1);
  });

  it("문항 세트 버전을 표시한다. 새 버전이 생기면 최신 버전 기준으로 보이고 참여 횟수는 전체를 센다", () => {
    submit(s1, "k1", [0]);
    const q = latestSet(data, "l-electric")!.questions[0];
    saveQuestion(data, sci, "l-electric", {
      id: q.id, stem: "고침", choices: q.choices, answerIndex: q.answerIndex,
      hasReason: q.hasReason, conceptIds: [q.conceptId], rubric: q.rubric,
    });
    const d = aggregate(data, "l-electric");
    expect(d.version).toBe(2);
    expect(d.participation).toBe(1);
    expect(d.empty).toBe(false);
    expect(d.latestVersionAttempts).toBe(0);
    expect(d.distribution.every((x) => Object.values(x.counts).every((n) => n === 0))).toBe(true);
  });

  it("학급 전체 집계에는 학생 이름, 번호, 합성 ID가 들어 있지 않다", () => {
    loadSynthetic(data, sci, "l-electric");
    const json = JSON.stringify(aggregate(data, "l-electric"));
    expect(json).not.toMatch(/s-\d\d/);
    expect(json).not.toMatch(/studentNumber|number|이름/);
  });
});

describe("conceptDetail (개인 답안으로 내려가기)", () => {
  it("학생 번호, 선택, 이유 문장, 판단 근거가 보이고 이름과 합성 ID는 없다", () => {
    submit({ role: "student", id: "s-03" }, "a", [0]);
    submit({ role: "student", id: "s-02" }, "a", []);
    const rows = conceptDetail(data, "l-electric", "k-series-parallel");
    expect(rows.map((r) => r.studentNumber)).toEqual([2, 3]);
    const r = rows[1];
    expect(r.level).toBe("거의 알아요");
    expect(r.answers).toHaveLength(3);
    expect(r.answers[0]).toMatchObject({ correct: false, reason: "이유(03-a)" });
    expect(r.answers[0].choice).toBeTruthy();
    expect(r.answers[0].stem).toContain("직렬로 연결하면");
    expect(r.answers[2].reason).toBeUndefined(); // 이유 칸이 없는 문항
    expect(JSON.stringify(rows)).not.toMatch(/s-\d\d/);
  });

  it("학생마다 최근 시도 하나만 보인다", () => {
    submit(s1, "k1", [0, 1, 2]);
    submit(s1, "k2", []);
    const rows = conceptDetail(data, "l-electric", "k-circuit");
    expect(rows).toHaveLength(1);
    expect(rows[0].answers.every((a) => a.correct)).toBe(true);
  });
});

describe("canOpenDashboard", () => {
  it("담당 교사만 열 수 있고 다른 과목 교사와 학생은 열 수 없다", () => {
    expect(canOpenDashboard(data, sci, "l-electric")).toBe(true);
    expect(canOpenDashboard(data, math, "l-electric")).toBe(false);
    expect(canOpenDashboard(data, s1, "l-electric")).toBe(false);
    expect(canOpenDashboard(data, sci, "l-없음")).toBe(false);
  });

  it("마감한 수업의 대시보드도 담당 교사는 계속 볼 수 있다", () => {
    submit(s1, "k1", []);
    setLessonState(data, sci, "l-electric", "마감");
    expect(canOpenDashboard(data, sci, "l-electric")).toBe(true);
    expect(aggregate(data, "l-electric").participation).toBe(1);
  });
});
