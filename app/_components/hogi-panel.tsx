"use client";

import { useActionState } from "react";

export type HogiTurn = { question: string; kind: string; text: string; sources: string[] };
export type HogiState = { turns: HogiTurn[] };

/** 복습 화면 오른쪽의 호기 패널. 왼쪽에서 고른 개념이 바뀌면 key가 바뀌어 대화가 새로 시작된다. */
export function HogiPanel({
  action,
  attemptId,
  concept,
}: {
  action: (prev: HogiState, formData: FormData) => Promise<HogiState>;
  attemptId: string;
  concept: { id: string; name: string };
}) {
  const [state, formAction, pending] = useActionState(action, { turns: [] });
  return (
    <section aria-label="호기 패널" className="card">
      <h2 className="text-lg font-semibold">호기</h2>
      <p className="chip mb-2 bg-brand-soft !text-xs text-brand">모의 응답입니다</p>
      <p className="mb-3 text-sm">
        지금 보는 개념: <strong>{concept.name}</strong>
      </p>
      <ul className="mb-3 space-y-3" aria-live="polite">
        {state.turns.map((t, i) => (
          <li key={i} className="space-y-1 text-sm">
            <p className="ml-auto w-fit max-w-full rounded-lg bg-brand-soft px-3 py-2 font-semibold">{t.question}</p>
            <p className="w-fit max-w-full rounded-lg border border-line px-3 py-2">{t.text}</p>
            {t.sources.length > 0 && <p className="text-xs text-muted">근거 자료: {t.sources.join(", ")}</p>}
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
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? "생각하는 중…" : "묻기"}
        </button>
      </form>
    </section>
  );
}
