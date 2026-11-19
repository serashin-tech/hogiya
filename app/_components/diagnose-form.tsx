"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "./fields-form";

export type DiagnoseQuestion = { id: string; stem: string; choices: string[]; hasReason: boolean };

/**
 * 선진단 입력 폼. 화면을 열 때마다 시도 키를 새로 만들고, 같은 화면에서 다시 제출하면 같은 키를 보낸다.
 * 제출이 실패해도 입력한 선택과 이유는 state.values로 되살린다.
 * 이름, 전화번호, 이메일은 묻지 않는다(FR-09).
 */
export function DiagnoseForm({
  action,
  lessonId,
  signature,
  questions,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  lessonId: string;
  /** 폼을 열 때의 문항 서명. 제출할 때 문항이 바뀌었는지 서버가 확인한다. */
  signature: string;
  questions: DiagnoseQuestion[];
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [state, formAction, pending] = useActionState(action, {});
  const firstInvalid = questions.find((q) => state.errors?.[q.id])?.id;

  useEffect(() => {
    if (firstInvalid) document.getElementById(`q-${firstInvalid}`)?.scrollIntoView({ block: "center" });
  }, [firstInvalid, state]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="key" value={key} />
      <input type="hidden" name="signature" value={signature} />
      {questions.map((q, i) => {
        const error = state.errors?.[q.id];
        return (
          <fieldset
            key={q.id}
            id={`q-${q.id}`}
            tabIndex={-1}
            aria-invalid={error ? true : undefined}
            className={`rounded border p-3 ${error ? "border-red-600 bg-red-50" : ""}`}
          >
            <legend className="px-1 font-semibold">
              {i + 1}. {q.stem}
            </legend>
            {q.choices.map((c, ci) => (
              <label key={ci} className="block py-0.5">
                <input
                  type="radio"
                  name={`choice-${q.id}`}
                  value={ci}
                  defaultChecked={state.values?.[`choice-${q.id}`] === String(ci)}
                />{" "}
                {c}
              </label>
            ))}
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            {q.hasReason && (
              <label className="mt-2 block text-sm">
                왜 그렇게 생각했나요? (쓰지 않아도 돼요)
                <textarea
                  name={`reason-${q.id}`}
                  rows={2}
                  defaultValue={state.values?.[`reason-${q.id}`] ?? ""}
                  className="w-full rounded border px-2 py-1"
                />
              </label>
            )}
          </fieldset>
        );
      })}
      {state.errors?.form && (
        <p className="text-red-600" role="alert">
          {state.errors.form}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded border px-4 py-2">
        {pending ? "제출하는 중…" : "제출하기"}
      </button>
    </form>
  );
}
