import { canOpen } from "./access";
import type { Data, User } from "./types";

// 호기 패널의 응답 계층(SPEC S06). 1주차에는 개념마다 미리 쓴 설명을 돌려주고,
// 2주차에 respond 함수 안만 Claude API 호출로 바꾼다. 입력의 모양(HogiInput)은 그대로 둔다.

/** 호기에게 전달하는 입력. 현재 개념과 그 수업의 승인된 자료만 담는다(학생 이름, 다른 학생의 답안, 다른 과목 자료 제외). */
export type HogiInput = {
  question: string;
  concept: { id: string; name: string };
  materials: { id: string; title: string; body: string }[];
};
export type HogiReply = {
  kind: "explanation" | "no-source" | "off-topic" | "error";
  text: string;
  /** 설명의 근거가 된 수업 자료의 제목 */
  sources: string[];
};
export type Responder = (input: HogiInput) => HogiReply;

export const NO_SOURCE_TEXT = "자료의 해당 부분을 다시 확인하거나 선생님께 물어보세요";
const ERROR_TEXT = "호기가 지금은 답하지 못해요. 결과와 답안은 그대로 있어요. 잠시 뒤에 다시 물어봐 주세요.";

/** 미리 쓴 설명. 개념마다 키워드, 설명, 근거 자료를 둔다. */
const CANNED: Record<string, { keywords: string[]; explanation: string; materialId: string }> = {
  "k-series-parallel": {
    keywords: ["직렬", "병렬", "전구", "밝기", "갈래"],
    explanation:
      "직렬은 전구를 한 줄로 잇는 방법이라 전구가 늘수록 전류가 줄어 더 어두워져요. 병렬은 갈래마다 따로 전류가 흘러서 한 전구를 빼도 나머지는 켜져 있어요.",
    materialId: "m-electric-1",
  },
  "k-circuit": {
    keywords: ["회로", "스위치", "전지", "전류", "극"],
    explanation: "전지의 + 극에서 − 극까지 끊김 없이 이어진 길이 있어야 전류가 흘러서 전구에 불이 켜져요. 회로가 끊기면 불이 꺼져요.",
    materialId: "m-electric-1",
  },
};
const LESSON_WIDE_KEYWORDS = ["전기", "건전지", "전선", ...Object.values(CANNED).flatMap((c) => c.keywords)];

export function respond(input: HogiInput): HogiReply {
  const q = input.question.trim();
  const canned = CANNED[input.concept.id];
  if (canned && canned.keywords.some((k) => q.includes(k))) {
    const material = input.materials.find((m) => m.id === canned.materialId);
    if (material) return { kind: "explanation", text: canned.explanation, sources: [material.title] };
    return { kind: "no-source", text: NO_SOURCE_TEXT, sources: [] };
  }
  if (LESSON_WIDE_KEYWORDS.some((k) => q.includes(k))) return { kind: "no-source", text: NO_SOURCE_TEXT, sources: [] };
  return {
    kind: "off-topic",
    text: `수업과 관련된 질문에 답할 수 있어요, 지금은 「${input.concept.name}」에 대해 물어볼까요?`,
    sources: [],
  };
}

/** 호기에게 넘길 입력을 만든다. 열 수 없는 시도이거나 그 시도에 없는 개념이면 undefined다. */
export function buildHogiInput(
  data: Data,
  user: User,
  attemptId: string,
  conceptId: string,
  question: string,
): HogiInput | undefined {
  if (user.role !== "student" || !canOpen(data, user, { kind: "attempt", id: attemptId })) return undefined;
  if (!data.evaluations.some((e) => e.attemptId === attemptId && e.conceptId === conceptId)) return undefined;
  const attempt = data.attempts.find((a) => a.id === attemptId)!;
  const lessonId = data.questionSets.find((s) => s.id === attempt.questionSetId)!.lessonId;
  const concept = data.concepts.find((c) => c.id === conceptId);
  if (!concept) return undefined;
  return {
    question,
    concept: { id: concept.id, name: concept.name },
    materials: data.materials
      .filter((m) => m.lessonId === lessonId)
      .map(({ id, title, body }) => ({ id, title, body })),
  };
}

/** 응답 함수가 실패해도 예외를 밖으로 내보내지 않는다. 시도와 결과는 읽기만 하므로 그대로 남는다. */
export function askHogi(
  data: Data,
  user: User,
  attemptId: string,
  conceptId: string,
  question: string,
  responder: Responder = respond,
): HogiReply {
  const input = buildHogiInput(data, user, attemptId, conceptId, question);
  if (!input) return { kind: "error", text: "열 수 없는 자료입니다", sources: [] };
  try {
    return responder(input);
  } catch {
    return { kind: "error", text: ERROR_TEXT, sources: [] };
  }
}
