import { describe, expect, it } from "vitest";
import { listLessons } from "./access";
import { data } from "./mock-data";

describe("시드 수업 「전기의 이용」", () => {
  const set = data.questionSets[0];

  it("문항 5개와 개념 2~3개를 갖고, 검수 전 초안으로 표시된다", () => {
    expect(set.questions).toHaveLength(5);
    expect(data.concepts.length).toBeGreaterThanOrEqual(2);
    expect(data.concepts.length).toBeLessThanOrEqual(3);
    expect(set.draft).toBe(true);
  });

  it("모든 문항의 정답이 선택지 안에 있고 개념에 연결된다", () => {
    for (const q of set.questions) {
      expect(q.choices[q.answerIndex]).toBeDefined();
      expect(data.concepts.some((c) => c.id === q.conceptId)).toBe(true);
    }
  });

  it("학생 20명 모두에게 공개 수업으로 보이고, 담당 없는 교사 셋은 빈 목록이다", () => {
    for (const s of data.students) {
      expect(listLessons(data, { role: "student", id: s.id })).toHaveLength(1);
    }
    for (const subject of ["국어", "영어", "수학"]) {
      expect(listLessons(data, { role: "teacher", id: `t-${subject}` })).toEqual([]);
    }
  });
});
