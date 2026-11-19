import { canOpen } from "./access";
import type { Data, User } from "./types";

/** 공개 상태인 수업만 새 시도를 시작할 수 있다(S02, S04). */
export function canStartAttempt(data: Data, user: User, lessonId: string): boolean {
  if (user.role !== "student" || !canOpen(data, user, { kind: "lesson", id: lessonId })) return false;
  return data.lessons.find((l) => l.id === lessonId)?.state === "공개";
}
