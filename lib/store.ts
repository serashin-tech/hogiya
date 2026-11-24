import { demoData } from "./demo-data";
import { applyEmails } from "./login";
import type { Data } from "./types";

// 서버 프로세스 메모리에 둔 모의 저장소. HMR에도 유지하려고 globalThis에 보관한다.
// 3주차에 DB로 바꿀 때 이 파일만 교체한다.
function create(): Data {
  const data = demoData();
  const rejected = applyEmails(data, process.env.HOGIYA_USER_EMAILS);
  // 이메일 값은 개인정보라 로그에 남기지 않고 항목 번호만 알린다.
  if (rejected.length > 0) console.warn(`HOGIYA_USER_EMAILS에서 반영하지 못한 항목이 ${rejected.length}개 있습니다.`);
  return data;
}
const g = globalThis as { __hogiyaStore?: Data };
export const store: Data = (g.__hogiyaStore ??= create());
