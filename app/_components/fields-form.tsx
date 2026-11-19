"use client";

import { useActionState } from "react";

export type FormState = { errors?: Record<string, string>; values?: Record<string, string> };
export type Field = { name: string; label: string; multiline?: boolean; defaultValue?: string };

/** 서버 액션과 연결된 입력 폼. 비어 있는 칸 아래에 안내 문구를 보여 주고 입력값은 지키지 않고 남긴다. */
export function FieldsForm({
  action,
  fields,
  hidden = {},
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fields: Field[];
  hidden?: Record<string, string>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {fields.map((f) => {
        const error = state.errors?.[f.name];
        const common = {
          id: `${f.name}-${hidden.id ?? "new"}`,
          name: f.name,
          defaultValue: state.values?.[f.name] ?? f.defaultValue ?? "",
          "aria-invalid": error ? true : undefined,
          className: `w-full rounded border px-2 py-1 ${error ? "border-red-600" : ""}`,
        };
        return (
          <div key={f.name}>
            <label htmlFor={common.id} className="block text-sm">
              {f.label}
            </label>
            {f.multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );
      })}
      {state.errors?.form && <p className="text-sm text-red-600">{state.errors.form}</p>}
      <button type="submit" disabled={pending} className="rounded border px-3 py-1">
        {submitLabel}
      </button>
    </form>
  );
}
