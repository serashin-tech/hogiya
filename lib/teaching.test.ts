import { beforeEach, describe, expect, it } from "vitest";
import { listLessons } from "./access";
import { freshData } from "./mock-data";
import { addMaterial, createLesson, deleteMaterial, updateMaterial } from "./teaching";
import type { Data } from "./types";

const sci = { role: "teacher", id: "t-과학" } as const;
const math = { role: "teacher", id: "t-수학" } as const;
const student = { role: "student", id: "s-01" } as const;

let data: Data;
beforeEach(() => {
  data = freshData();
});

describe("createLesson", () => {
  it("새 수업은 작성 중으로 시작하고 학생 목록에 나타나지 않는다", () => {
    const r = createLesson(data, sci, { subject: "과학", title: "자석" });
    expect(r.ok).toBe(true);
    const lesson = data.lessons.find((l) => l.title === "자석")!;
    expect(lesson.state).toBe("작성 중");
    expect(lesson.classId).toBe("c-6-2");
    expect(listLessons(data, student).map((l) => l.title)).not.toContain("자석");
    expect(listLessons(data, sci).map((l) => l.title)).toContain("자석");
  });

  it("담당이 아닌 과목에는 수업을 만들 수 없다", () => {
    const r = createLesson(data, sci, { subject: "수학", title: "분수" });
    expect(r.ok).toBe(false);
    expect(data.lessons.some((l) => l.title === "분수")).toBe(false);
  });

  it("학생은 수업을 만들 수 없고, 제목이 비면 입력 위치를 알려 준다", () => {
    expect(createLesson(data, student, { subject: "과학", title: "x" }).ok).toBe(false);
    const r = createLesson(data, sci, { subject: "과학", title: "  " });
    expect(r.ok === false && Object.keys(r.errors)).toEqual(["title"]);
  });
});

describe("수업 자료", () => {
  it("추가, 수정, 삭제할 수 있다", () => {
    const add = addMaterial(data, sci, "l-electric", { title: "A", body: "본문" });
    expect(add.ok).toBe(true);
    const id = add.ok ? add.value : "";
    expect(updateMaterial(data, sci, id, { title: "B", body: "새 본문" }).ok).toBe(true);
    expect(data.materials.find((m) => m.id === id)).toMatchObject({ title: "B", body: "새 본문" });
    expect(deleteMaterial(data, sci, id).ok).toBe(true);
    expect(data.materials.some((m) => m.id === id)).toBe(false);
  });

  it("제목이나 본문이 비어 있으면 저장되지 않고 빈 칸을 알려 준다", () => {
    const before = data.materials.length;
    const r = addMaterial(data, sci, "l-electric", { title: "", body: " " });
    expect(r.ok === false && Object.keys(r.errors).sort()).toEqual(["body", "title"]);
    expect(data.materials).toHaveLength(before);
    const only = addMaterial(data, sci, "l-electric", { title: "제목", body: "" });
    expect(only.ok === false && Object.keys(only.errors)).toEqual(["body"]);
  });

  it("수정할 때도 빈 값이면 기존 자료가 그대로 남는다", () => {
    const r = updateMaterial(data, sci, "m-electric-1", { title: "", body: "x" });
    expect(r.ok).toBe(false);
    expect(data.materials[0].title).toBe("전구의 직렬연결과 병렬연결");
  });

  it("담당이 아닌 교사와 학생은 자료를 바꿀 수 없다", () => {
    expect(addMaterial(data, math, "l-electric", { title: "a", body: "b" }).ok).toBe(false);
    expect(updateMaterial(data, student, "m-electric-1", { title: "a", body: "b" }).ok).toBe(false);
    expect(deleteMaterial(data, math, "m-electric-1").ok).toBe(false);
    expect(data.materials).toHaveLength(1);
  });
});
