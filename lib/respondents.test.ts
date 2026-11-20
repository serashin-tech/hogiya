import { describe, expect, it } from "vitest";
import { aggregate } from "./dashboard";
import { freshData } from "./mock-data";
import { loadSynthetic } from "./synthetic";

const teacher = { role: "teacher", id: "t-과학" } as const;

describe("aggregate의 응답 인원", () => {
  it("시도가 없으면 응답 0명이고, 학급 인원은 20명이다", () => {
    const d = aggregate(freshData(), "l-electric");
    expect([d.respondents, d.enrolled]).toEqual([0, 20]);
  });

  it("같은 학생이 여러 번 풀어도 한 명으로 센다(참여 횟수와 다르다)", () => {
    const data = freshData();
    loadSynthetic(data, teacher, "l-electric");
    // 합성 시도: 8명이 9번 시도한다(participation 9)
    const d = aggregate(data, "l-electric");
    expect(d.participation).toBe(9);
    expect(d.respondents).toBe(8);
  });
});
