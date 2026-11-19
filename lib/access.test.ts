import { describe, expect, it } from "vitest";
import { canOpen, listLessons } from "./access";
import type { Data, Lesson } from "./types";

const lesson = (id: string, subject: Lesson["subject"], state: Lesson["state"]): Lesson => ({
  id,
  classId: "c1",
  subject,
  title: id,
  state,
});

const data: Data = {
  classrooms: [{ id: "c1", name: "6학년 2반" }],
  students: [
    { id: "s1", classId: "c1", number: 1 },
    { id: "s2", classId: "c1", number: 2 },
    { id: "s3", classId: "c1", number: 3 },
  ],
  teachers: ["과학", "국어", "영어", "수학"].map((n) => ({ id: `t-${n}`, name: n })),
  assignments: ["과학", "국어", "영어", "수학"].map((s) => ({
    teacherId: `t-${s}`,
    classId: "c1",
    subject: s as Lesson["subject"],
  })),
  lessons: [
    lesson("sci", "과학", "공개"),
    lesson("math-open", "수학", "공개"),
    lesson("sci-draft", "과학", "작성 중"),
    lesson("sci-closed", "과학", "마감"),
  ],
  materials: [{ id: "m-math", lessonId: "math-open", title: "m", body: "b" }],
  concepts: [],
  questionSets: [
    { id: "qs-sci", lessonId: "sci", version: 1, draft: true, questions: [] },
    { id: "qs-math", lessonId: "math-open", version: 1, draft: true, questions: [] },
    { id: "qs-closed", lessonId: "sci-closed", version: 1, draft: true, questions: [] },
  ],
  evaluations: [],
  retellings: [],
  attempts: [
    { id: "a-s1", studentId: "s1", questionSetId: "qs-sci", key: "k", answers: [], submittedAt: "" },
    { id: "a-math", studentId: "s1", questionSetId: "qs-math", key: "k", answers: [], submittedAt: "" },
    { id: "a-closed", studentId: "s2", questionSetId: "qs-closed", key: "k", answers: [], submittedAt: "" },
  ],
};

const teacher = (s: string) => ({ role: "teacher" as const, id: `t-${s}` });
const student = (n: number) => ({ role: "student" as const, id: `s${n}` });

describe("canOpen", () => {
  it("과학 교사는 같은 학급 수학 수업의 답안·수업·자료를 열 수 없다", () => {
    expect(canOpen(data, teacher("과학"), { kind: "attempt", id: "a-math" })).toBe(false);
    expect(canOpen(data, teacher("과학"), { kind: "lesson", id: "math-open" })).toBe(false);
    expect(canOpen(data, teacher("과학"), { kind: "material", id: "m-math" })).toBe(false);
  });

  it("교사는 담당 과목의 수업(작성 중 포함)과 답안을 열 수 있다", () => {
    expect(canOpen(data, teacher("과학"), { kind: "lesson", id: "sci-draft" })).toBe(true);
    expect(canOpen(data, teacher("과학"), { kind: "attempt", id: "a-s1" })).toBe(true);
  });

  it("학생은 다른 학생의 시도를 열 수 없다", () => {
    expect(canOpen(data, student(2), { kind: "attempt", id: "a-s1" })).toBe(false);
    expect(canOpen(data, student(1), { kind: "attempt", id: "a-s1" })).toBe(true);
  });

  it("학생은 작성 중인 수업을 열 수 없다", () => {
    expect(canOpen(data, student(1), { kind: "lesson", id: "sci-draft" })).toBe(false);
  });

  it("학생은 마감한 수업을 시도했을 때만 열 수 있다", () => {
    expect(canOpen(data, student(1), { kind: "lesson", id: "sci-closed" })).toBe(false);
    expect(canOpen(data, student(2), { kind: "lesson", id: "sci-closed" })).toBe(true);
  });

  it("없는 대상과 범위 밖 대상은 같은 결과(false)다", () => {
    expect(canOpen(data, student(1), { kind: "lesson", id: "nope" })).toBe(false);
    expect(canOpen(data, teacher("과학"), { kind: "attempt", id: "nope" })).toBe(false);
  });

  it("존재하지 않는 사용자는 아무것도 열 수 없다", () => {
    expect(canOpen(data, { role: "student", id: "ghost" }, { kind: "lesson", id: "sci" })).toBe(false);
  });
});

describe("listLessons", () => {
  it("교사는 자기 담당 수업만 본다", () => {
    expect(listLessons(data, teacher("과학")).map((l) => l.id)).toEqual(["sci", "sci-draft", "sci-closed"]);
    expect(listLessons(data, teacher("수학")).map((l) => l.id)).toEqual(["math-open"]);
  });

  it("담당 수업이 없는 교사는 빈 목록이다", () => {
    expect(listLessons(data, teacher("국어"))).toEqual([]);
    expect(listLessons(data, teacher("영어"))).toEqual([]);
  });

  it("학생은 공개 수업과 시도한 마감 수업만 본다", () => {
    expect(listLessons(data, student(3)).map((l) => l.id)).toEqual(["sci", "math-open"]);
    expect(listLessons(data, student(2)).map((l) => l.id)).toEqual(["sci", "math-open", "sci-closed"]);
  });
});
