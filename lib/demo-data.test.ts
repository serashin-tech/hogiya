import { describe, expect, it } from "vitest";
import { aggregate } from "./dashboard";
import { demoData } from "./demo-data";
import { freshData } from "./mock-data";
import { lessonProgress } from "./review";
import { EXPECTED } from "./synthetic";

describe("demoData (화면 확인용 저장소)", () => {
  it("공개 수업 「전기의 이용」에 자료가 3개 있고 합성 시도가 쌓여 있다", () => {
    const data = demoData();
    expect(data.materials.filter((m) => m.lessonId === "l-electric")).toHaveLength(3);
    const d = aggregate(data, "l-electric");
    expect(d.participation).toBe(EXPECTED.participation);
    expect(d.distribution.map((x) => ({ conceptId: x.conceptId, counts: x.counts }))).toEqual(EXPECTED.distribution);
  });

  it("학생 진행 상태가 섞여 있다(아직 안 함, 선진단 완료, 복습 중)", () => {
    const data = demoData();
    const states = ["s-01", "s-02", "s-20"].map((id) => lessonProgress(data, id, "l-electric"));
    expect(states).toEqual(["선진단 완료", "복습 중", "아직 안 함"]);
  });

  it("테스트용 시드(freshData)는 건드리지 않는다", () => {
    demoData();
    const clean = freshData();
    expect(clean.materials).toHaveLength(1);
    expect(clean.attempts).toHaveLength(0);
  });
});
