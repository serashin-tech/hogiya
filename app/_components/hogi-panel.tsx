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
    <section aria-label="호기 패널" className="rounded border p-4">
      <h2 className="font-semibold">호기</h2>
      <p className="mb-1 inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs">모의 응답입니다</p>
      <p className="mb-3 text-sm">
        지금 보는 개념: <strong>{concept.name}</strong>
      </p>
      <ul className="mb-3 space-y-3" aria-live="polite">
        {state.turns.map((t, i) => (
          <li key={i} className="text-sm">
            <p className="font-semibold">나: {t.question}</p>
            <p>호기: {t.text}</p>
            {t.sources.length > 0 && <p className="text-xs text-zinc-500">근거 자료: {t.sources.join(", ")}</p>}
          </li>
        ))}
      </ul>
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="attemptId" value={attemptId} />
        <input type="hidden" name="conceptId" value={concept.id} />
        <label className="block text-sm">
          호기에게 물어보기
          <input name="question" type="text" required className="w-full rounded border px-2 py-1" />
        </label>
        <button type="submit" disabled={pending} className="rounded border px-3 py-1 text-sm">
          {pending ? "생각하는 중…" : "묻기"}
        </button>
      </form>
    </section>
  );
}
