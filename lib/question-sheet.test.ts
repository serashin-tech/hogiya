import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildTemplate, parseQuestionSheet, SHEET_COLUMNS } from "./question-sheet";

/** 시험용 엑셀. 첫 시트에 머리글과 행을 쓴다. */
async function makeSheet(header: string[], rows: (string | number)[][]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("문항");
  ws.addRow(header);
  rows.forEach((r) => ws.addRow(r));
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
const row = (over: Partial<Record<(typeof SHEET_COLUMNS)[number], string | number>> = {}) =>
  SHEET_COLUMNS.map((c) => over[c] ?? "");

describe("buildTemplate", () => {
  it("양식은 머리글만 있는 첫 시트와 작성 예시 시트로 이루어져 있고, 첫 시트는 빈 표로 읽힌다", async () => {
    const r = await parseQuestionSheet(await buildTemplate());
    expect(r).toEqual({ ok: true, value: [] });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await buildTemplate()) as never);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["문항", "작성 예시"]);
    expect(wb.worksheets[0].getRow(1).values).toEqual([undefined, ...SHEET_COLUMNS]);
  });
});

describe("parseQuestionSheet", () => {
  it("한 줄을 한 문항으로 읽는다(정답 번호는 1부터, 이유 칸은 예/아니오)", async () => {
    const bytes = await makeSheet([...SHEET_COLUMNS], [
      row({
        지문: "병렬로 연결하면?",
        "선택지 1": "꺼진다",
        "선택지 2": "계속 켜진다",
        "정답 번호": 2,
        "이유 칸": "예",
        "확인할 개념": "직렬과 병렬",
        "확인 활동 안내": "직접 연결해 보세요",
        루브릭: "갈래가 독립임을 설명함",
        "예상 오개념": "전지 개수만 본다",
      }),
    ]);
    const r = await parseQuestionSheet(bytes);
    expect(r).toEqual({
      ok: true,
      value: [
        {
          row: 2,
          stem: "병렬로 연결하면?",
          choices: ["꺼진다", "계속 켜진다", "", ""],
          answerIndex: 1,
          hasReason: true,
          concept: "직렬과 병렬",
          activityGuide: "직접 연결해 보세요",
          rubric: "갈래가 독립임을 설명함",
          misconception: "전지 개수만 본다",
        },
      ],
    });
  });

  it("빈 줄은 건너뛰고 행 번호는 시트의 번호를 지킨다", async () => {
    const bytes = await makeSheet([...SHEET_COLUMNS], [row(), row({ 지문: "둘째" })]);
    const r = await parseQuestionSheet(bytes);
    expect(r.ok && r.value.map((x) => x.row)).toEqual([3]);
  });

  it("정답 번호가 숫자가 아니면 null이다", async () => {
    const r = await parseQuestionSheet(await makeSheet([...SHEET_COLUMNS], [row({ 지문: "q", "정답 번호": "가" })]));
    expect(r.ok && r.value[0].answerIndex).toBeNull();
  });

  it("열 순서가 바뀌어도 머리글 이름으로 읽는다", async () => {
    const reversed = [...SHEET_COLUMNS].reverse();
    const r = await parseQuestionSheet(await makeSheet(reversed, [reversed.map((c) => (c === "지문" ? "거꾸로" : ""))]));
    expect(r.ok && r.value[0].stem).toBe("거꾸로");
  });

  it("필요한 열이 없으면 어느 열인지 알려 준다", async () => {
    const r = await parseQuestionSheet(await makeSheet(["지문"], [["q"]]));
    expect(r).toMatchObject({ ok: false, errors: { file: expect.stringContaining("정답 번호") } });
  });

  it("엑셀이 아닌 파일은 거절한다", async () => {
    const r = await parseQuestionSheet(new TextEncoder().encode("hello"));
    expect(r).toMatchObject({ ok: false, errors: { file: expect.stringContaining("엑셀") } });
  });

  it("문항은 100줄까지만 받는다", async () => {
    const rows = Array.from({ length: 101 }, (_, i) => row({ 지문: `q${i}` }));
    const r = await parseQuestionSheet(await makeSheet([...SHEET_COLUMNS], rows));
    expect(r).toMatchObject({ ok: false, errors: { file: expect.stringContaining("100") } });
  });
});
