/** 도메인 함수의 공통 결과. 실패하면 입력 위치(키)별 안내 문구를 돌려준다. */
export type Result<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; errors: Record<string, string> };

export const ok = <T = undefined>(value?: T): Result<T> => ({ ok: true, value: value as T });
export const fail = (errors: Record<string, string>): Result<never> => ({ ok: false, errors });
