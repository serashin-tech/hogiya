import { describe, expect, it } from "vitest";
import { freshData } from "./mock-data";
import { importDeck } from "./teaching";

const teacher = { role: "teacher", id: "t-과학" } as const;
const slides = [
  { title: "전기의 이용", text: "전지와 전구를 잇는다" },
  { title: "직렬과 병렬", text: "" },
];

describe("importDeck (PowerPoint 슬라이드를 수업 자료로)", () => {
  it("슬라이드마다 자료가 하나씩 생기고, 본문이 비면 제목을 본문으로 쓴다", () => {
    const data = freshData();
    const r = importDeck(data, teacher, "l-electric", "수업.pptx", slides);
    expect(r).toEqual({ ok: true, value: 2 });
    const added = data.materials.filter((m) => m.origin === "수업.pptx");
    expect(added.map((m) => [m.title, m.body])).toEqual([
      ["전기의 이용", "전지와 전구를 잇는다"],
      ["직렬과 병렬", "직렬과 병렬"],
    ]);
  });

  it("다른 파일로 바꾸면 이전 파일의 자료만 지우고, 직접 쓴 자료는 남긴다", () => {
    const data = freshData();
    importDeck(data, teacher, "l-electric", "첫째.pptx", slides);
    importDeck(data, teacher, "l-electric", "둘째.pptx", [{ title: "새 슬라이드", text: "새 내용" }]);
    const titles = data.materials.filter((m) => m.lessonId === "l-electric").map((m) => m.title);
    expect(titles).toEqual(["전구의 직렬연결과 병렬연결", "새 슬라이드"]);
  });

  it("담당이 아닌 교사와 학생은 올릴 수 없고, 자료는 바뀌지 않는다", () => {
    const data = freshData();
    const before = structuredClone(data.materials);
    for (const user of [{ role: "teacher", id: "t-국어" }, { role: "student", id: "s-01" }] as const) {
      expect(importDeck(data, user, "l-electric", "수업.pptx", slides)).toMatchObject({ ok: false });
    }
    expect(data.materials).toEqual(before);
  });

  it("슬라이드가 없으면 거절하고 이전 자료를 지우지 않는다", () => {
    const data = freshData();
    importDeck(data, teacher, "l-electric", "첫째.pptx", slides);
    const r = importDeck(data, teacher, "l-electric", "둘째.pptx", []);
    expect(r).toMatchObject({ ok: false, errors: { file: expect.any(String) } });
    expect(data.materials.some((m) => m.origin === "첫째.pptx")).toBe(true);
  });
});
