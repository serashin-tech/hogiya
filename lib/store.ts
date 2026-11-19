import { freshData } from "./mock-data";
import type { Data } from "./types";

// 서버 프로세스 메모리에 둔 모의 저장소. HMR에도 유지하려고 globalThis에 보관한다.
// 3주차에 DB로 바꿀 때 이 파일만 교체한다.
const g = globalThis as { __hogiyaStore?: Data };
export const store: Data = (g.__hogiyaStore ??= freshData());
