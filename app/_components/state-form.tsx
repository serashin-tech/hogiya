"use client";

import { useActionState } from "react";
import type { FormState } from "./fields-form";

/** 공개·마감 단추. 거절되면 부족한 항목을 목록으로 보여 준다. */
export function StateForm({
  action,
  lessonId,
  target,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  lessonId: string;
  target: "공개" | "마감";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="inline-block align-top">
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="target" value={target} />
      <button type="submit" disabled={pending} className="rounded border px-3 py-1">
        {target}하기
      </button>
      {state.errors && (
        <ul className="mt-2 list-disc pl-5 text-sm text-red-600" role="alert">
          {Object.values(state.errors).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
