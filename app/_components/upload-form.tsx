"use client";

import { useActionState, useId } from "react";

export type UploadState = { errors?: Record<string, string>; count?: number };
const INITIAL: UploadState = {};

/** 파일 하나를 올리는 폼(PowerPoint, 엑셀). 틀린 곳은 목록으로 보여 주고, 성공하면 몇 개를 가져왔는지 알린다. */
export function UploadForm({
  action,
  lessonId,
  accept,
  label,
  submitLabel,
  done,
  secondary = false,
}: {
  action: (prev: UploadState, formData: FormData) => Promise<UploadState>;
  lessonId: string;
  accept: string;
  label: string;
  submitLabel: string;
  /** 성공했을 때 보여 줄 문장. `{n}` 자리에 가져온 개수가 들어간다. 서버 컴포넌트에서 넘기므로 함수가 아닌 문자열이다. */
  done: string;
  secondary?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const id = useId();
  const errors = state.errors ? Object.values(state.errors) : [];
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="lessonId" value={lessonId} />
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name="file"
        type="file"
        accept={accept}
        required
        aria-invalid={errors.length ? true : undefined}
        className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-2 file:font-semibold"
      />
      <button type="submit" disabled={pending} className={`w-full ${secondary ? "" : "btn-primary"}`}>
        {pending ? "올리는 중…" : submitLabel}
      </button>
      <div role="status" aria-live="polite">
        {state.count !== undefined && !errors.length && (
          <p className="text-sm font-semibold text-brand">✓ {done.replace("{n}", String(state.count))}</p>
        )}
        {errors.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-danger">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
