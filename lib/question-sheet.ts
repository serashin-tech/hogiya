import ExcelJS from "exceljs";
import { fail, ok, type Result } from "./result";

/** 엑셀 양식의 열. 읽을 때는 순서가 아니라 이 머리글 이름으로 찾는다. */
export const SHEET_COLUMNS = [
  "지문",
  "선택지 1",
  "선택지 2",
  "선택지 3",
  "선택지 4",
  "정답 번호",
  "이유 칸",
  "확인할 개념",
  "확인 활동 안내",
  "루브릭",
  "예상 오개념",
] as const;
type Column = (typeof SHEET_COLUMNS)[number];

export type SheetRow = {
  /** 엑셀 시트의 행 번호(머리글이 1행). 오류를 알릴 때 쓴다. */
  row: number;
  stem: string;
  choices: string[];
  /** 0부터. 숫자로 읽지 못하면 null. */
  answerIndex: number | null;
  hasReason: boolean;
  concept: string;
  activityGuide: string;
  rubric: string;
  misconception: string;
};

const MAX_ROWS = 100;
const NOT_XLSX = "엑셀(.xlsx) 파일이 아닙니다. 양식을 내려받아 작성해 주세요";
const YES = new Set(["예", "y", "yes", "true", "o", "1"]);

const EXAMPLE: Record<Column, string> = {
  지문: "전지를 병렬로 연결하면 전구의 밝기는 어떻게 될까요?",
  "선택지 1": "더 밝아진다",
  "선택지 2": "변하지 않는다",
  "선택지 3": "더 어두워진다",
  "선택지 4": "",
  "정답 번호": "2",
  "이유 칸": "예",
  "확인할 개념": "전지의 직렬·병렬 연결과 전구의 밝기",
  "확인 활동 안내": "전지 2개를 직렬과 병렬로 이어 밝기를 비교해 보세요.",
  루브릭: "연결 방법에 따라 밝기가 달라지는 까닭을 설명하면 알아요, 차이만 말하면 거의 알아요",
  "예상 오개념": "전지 개수만으로 밝기를 판단한다",
};

/** 내려받는 양식. 첫 시트는 머리글만 있고, 작성 예시는 둘째 시트에 있어 실수로 올라가지 않는다. */
export async function buildTemplate(): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("문항");
  sheet.addRow([...SHEET_COLUMNS]).font = { bold: true };
  sheet.columns = SHEET_COLUMNS.map((c) => ({ width: c === "지문" || c === "루브릭" ? 40 : 18 }));
  const example = wb.addWorksheet("작성 예시");
  example.addRow([...SHEET_COLUMNS]).font = { bold: true };
  example.addRow(SHEET_COLUMNS.map((c) => EXAMPLE[c]));
  example.columns = sheet.columns;
  example.addRow([]);
  example.addRow(["정답 번호는 1~4, 이유 칸은 예 또는 아니오로 적습니다. 한 줄에 한 문항입니다."]);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** 첫 시트를 읽어 한 줄을 한 문항으로 바꾼다. 내용의 옳고 그름은 saveQuestion이 판단한다. */
export async function parseQuestionSheet(bytes: Uint8Array | ArrayBuffer): Promise<Result<SheetRow[]>> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(bytes as never);
  } catch {
    return fail({ file: NOT_XLSX });
  }
  const ws = wb.worksheets[0];
  if (!ws) return fail({ file: NOT_XLSX });

  const at = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => at.set(cell.text.trim(), col));
  const missing = SHEET_COLUMNS.filter((c) => !at.has(c));
  if (missing.length) return fail({ file: `첫 시트("문항")의 머리글에 없는 열이 있습니다: ${missing.join(", ")}` });
  if (ws.rowCount - 1 > MAX_ROWS) return fail({ file: `문항은 ${MAX_ROWS}줄까지 올릴 수 있습니다` });

  const rows: SheetRow[] = [];
  for (let n = 2; n <= ws.rowCount; n++) {
    const r = ws.getRow(n);
    const cell = (c: Column) => r.getCell(at.get(c)!).text.trim();
    if (SHEET_COLUMNS.every((c) => !cell(c))) continue;
    const answer = Number(cell("정답 번호"));
    rows.push({
      row: n,
      stem: cell("지문"),
      choices: [cell("선택지 1"), cell("선택지 2"), cell("선택지 3"), cell("선택지 4")],
      answerIndex: Number.isInteger(answer) && answer >= 1 && answer <= 4 ? answer - 1 : null,
      hasReason: YES.has(cell("이유 칸").toLowerCase()),
      concept: cell("확인할 개념"),
      activityGuide: cell("확인 활동 안내"),
      rubric: cell("루브릭"),
      misconception: cell("예상 오개념"),
    });
  }
  return ok(rows);
}
