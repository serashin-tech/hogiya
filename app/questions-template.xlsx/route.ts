import { connection } from "next/server";
import { buildTemplate } from "@/lib/question-sheet";

// 문항 엑셀 양식 내려받기. 개인 정보가 없는 공통 양식이라 로그인 여부를 묻지 않는다.
export async function GET() {
  await connection(); // 만든 시각이 파일에 들어가므로 요청마다 만든다
  const bytes = await buildTemplate();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"questions-template.xlsx\"; filename*=UTF-8''%EB%AC%B8%ED%95%AD-%EC%96%91%EC%8B%9D.xlsx",
    },
  });
}
