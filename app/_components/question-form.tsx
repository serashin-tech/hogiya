"use client";

import { useActionState } from "react";
import type { FormState } from "./fields-form";

export type QuestionDefaults = {
  id?: string;
  stem: string;
  choices: string[];
  answerIndex: number;
  hasReason: boolean;
  conceptId: string;
  rubric: string;
};
const CHOICE_SLOTS = 4;

export function QuestionForm({
  action,
  lessonId,
  concepts,
  defaults,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  lessonId: string;
  concepts: { id: string; name: string }[];
  defaults: QuestionDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const e = state.errors ?? {};
  const err = (k: string) => e[k] && <p className="text-sm text-danger">{e[k]}</p>;
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="lessonId" value={lessonId} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <label className="block text-sm font-semibold">
        지문
        <textarea name="stem" rows={2} defaultValue={defaults.stem} className="mt-1 w-full font-normal" />
      </label>
      {err("stem")}
      <div className="space-y-2 text-sm font-semibold">
        선택지 (정답을 하나 고르세요)
        {Array.from({ length: CHOICE_SLOTS }, (_, i) => (
          <div key={i} className="flex items-center gap-2 font-normal">
            <input
              type="radio"
              name="answer"
              value={i}
              defaultChecked={defaults.answerIndex === i}
              aria-label={`${i + 1}번 선택지를 정답으로`}
            />
            <input
              type="text"
              name={`choice${i}`}
              defaultValue={defaults.choices[i] ?? ""}
              className="w-full"
              aria-label={`${i + 1}번 선택지`}
            />
          </div>
        ))}
      </div>
      {err("choices")}
      {err("answer")}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="hasReason" defaultChecked={defaults.hasReason} /> 이유 칸 두기
      </label>
      <label className="block text-sm font-semibold">
        연결 개념
        <select name="conceptId" defaultValue={defaults.conceptId} className="ml-2 font-normal">
          <option value="">선택 안 함</option>
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {err("concept")}
      <label className="block text-sm font-semibold">
        루브릭 (판단 근거 문장)
        <textarea name="rubric" rows={2} defaultValue={defaults.rubric} className="mt-1 w-full font-normal" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
