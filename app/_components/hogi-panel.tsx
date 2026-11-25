"use client";

import { useActionState } from "react";
import { ScreenFrame } from "./screen-frame";

export type HogiTurn = { question: string; kind: string; text: string; sources: string[] };
export type HogiState = { turns: HogiTurn[]; sessionId?: string };

// Agent SDK 모드: 학생ID(가명), 학생의 말, 세션 번호만 /api/hogi-agent로 보낸다. 대화 기억은 SDK가 맡는다.
const FALLBACK = "잠시 뒤에 다시 물어봐 주세요";
function agentAction(studentId: string) {
  return async (prev: HogiState, f: FormData): Promise<HogiState> => {
    const question = String(f.get("question") ?? "");
    const r = await fetch("/api/hogi-agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ studentId, text: question, sessionId: prev.sessionId }),
    })
      .then((res) => res.json())
      .catch(() => ({ kind: "error", message: FALLBACK }));
    return {
      turns: [...prev.turns, { question, kind: r.kind, text: r.message ?? FALLBACK, sources: [] }],
      sessionId: r.sessionId ?? prev.sessionId,
    };
  };
}

/**
 * 복습 화면의 호기. 왼쪽에는 호기가 설명하는 내용을 슬라이드로, 오른쪽에는 대화를 보여 준다.
 * 보고 있는 개념이 바뀌면 key가 바뀌어 대화가 새로 시작된다.
 */
export function HogiPanel({
  action,
  attemptId,
  lessonTitle,
  concept,
  agentStudentId,
}: {
  action: (prev: HogiState, formData: FormData) => Promise<HogiState>;
  attemptId: string;
  lessonTitle: string;
  concept: { id: string; name: string };
  /** 있으면 모의 응답 대신 Agent SDK 라우트로 대화한다(서버에 ANTHROPIC_API_KEY가 있을 때만). */
  agentStudentId?: string;
}) {
  const [state, formAction, pending] = useActionState(agentStudentId ? agentAction(agentStudentId) : action, { turns: [] });
  const latest = state.turns.at(-1);
  return (
    <section aria-label="호기 패널" id="hogi">
      <ScreenFrame
        title={`② 호기와 복습 · ${lessonTitle}`}
        status={agentStudentId ? "호기가 함께합니다 (Agent SDK)" : "호기가 함께합니다 (모의 응답)"}
        main={
          <>
            <div className="screen-label">💡 호기가 설명해 주는 내용</div>
            <div className="screen-slide" aria-live="polite">
              <strong className="text-lg">{latest ? "호기의 설명" : concept.name}</strong>
              <p className="text-sm">
                {latest ? latest.text : "오른쪽에서 호기에게 물어보면 설명이 여기에 나와요."}
              </p>
              {latest && latest.sources.length > 0 && (
                <p className="text-xs text-muted">근거 자료: {latest.sources.join(", ")}</p>
              )}
            </div>
          </>
        }
        side={
          <>
            <div className="screen-label">호기와 대화</div>
            <p className="text-sm">
              지금 보는 개념: <strong>{concept.name}</strong>
            </p>
            <ul className="space-y-2" aria-label="대화">
              {state.turns.map((t, i) => (
                <li key={i} className="space-y-1 text-sm">
                  <p className="ml-auto w-fit max-w-full rounded-lg border border-brand bg-brand-soft px-3 py-2 font-semibold">
                    {t.question}
                  </p>
                  <p className="w-fit max-w-full rounded-lg border border-line bg-surface px-3 py-2">{t.text}</p>
                </li>
              ))}
            </ul>
            <form action={formAction} className="space-y-2">
              <input type="hidden" name="attemptId" value={attemptId} />
              <input type="hidden" name="conceptId" value={concept.id} />
              <label className="block text-sm font-semibold">
                호기에게 물어보기
                <input name="question" type="text" required className="mt-1 w-full font-normal" />
              </label>
              <button type="submit" disabled={pending} className="btn-primary w-full">
                {pending ? "생각하는 중…" : "보내기"}
              </button>
            </form>
          </>
        }
      />
    </section>
  );
}
