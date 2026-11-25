"use client";

import { useActionState, useState } from "react";
import type { FormState } from "./fields-form";
import { ScreenFrame } from "./screen-frame";
import { SlideViewer, type SlideView } from "./slide-viewer";

export type DiagnoseQuestion = { id: string; stem: string; choices: string[]; hasReason: boolean };

/**
 * 선진단 입력 폼. 왼쪽에는 수업 자료, 오른쪽에는 문항을 한 장씩 보여 준다.
 * 모든 문항이 한 폼 안에 있어서(안 보이는 문항은 숨김) 제출은 한 번이다.
 * 화면을 열 때마다 시도 키를 새로 만들고, 같은 화면에서 다시 제출하면 같은 키를 보낸다.
 * 제출이 실패해도 입력한 선택과 이유는 state.values로 되살리고, 틀린 첫 문항으로 돌아간다.
 * 이름, 전화번호, 이메일은 묻지 않는다(FR-09).
 * preview이면 교사가 학생 화면을 미리 보는 것이라 제출하지 않는다.
 */
export function DiagnoseForm({
  action,
  lessonId,
  lessonTitle,
  signature,
  questions,
  slides,
  preview = false,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  lessonId: string;
  lessonTitle: string;
  /** 폼을 열 때의 문항 서명. 제출할 때 문항이 바뀌었는지 서버가 확인한다. */
  signature: string;
  questions: DiagnoseQuestion[];
  slides: SlideView[];
  preview?: boolean;
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [state, formAction, pending] = useActionState(action, {});
  const [index, setIndex] = useState(0);

  // 제출이 거절되어 새 상태가 오면 틀린 첫 문항을 보여 준다(렌더 중에 상태를 맞추는 방식).
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    const invalid = questions.findIndex((q) => state.errors?.[q.id]);
    if (invalid >= 0) setIndex(invalid);
  }

  const last = index === questions.length - 1;
  return (
    <form
      action={formAction}
      onSubmit={(e) => preview && e.preventDefault()}
      className="space-y-4"
    >
      <input type="hidden" name="lessonId" value={lessonId} />
      <input type="hidden" name="key" value={key} />
      <input type="hidden" name="signature" value={signature} />
      <ScreenFrame
        title={`① 진단하기 · ${lessonTitle}`}
        status={`문항 ${index + 1} / ${questions.length}`}
        main={
          <>
            <div className="screen-label">📖 선생님이 올린 수업 자료</div>
            <SlideViewer slides={slides} />
          </>
        }
        side={
          <>
            {questions.map((q, i) => {
              const error = state.errors?.[q.id];
              return (
                <fieldset
                  key={q.id}
                  id={`q-${q.id}`}
                  hidden={i !== index}
                  aria-invalid={error ? true : undefined}
                  className={`space-y-3 ${error ? "rounded-lg border border-danger bg-danger-soft p-2" : ""}`}
                >
                  <legend className="mb-2 font-semibold">
                    <span className="screen-label">질문 {i + 1}</span>
                    <span className="mt-1 block">{q.stem}</span>
                  </legend>
                  <div className="space-y-2">
                    {q.choices.map((c, ci) => (
                      <label
                        key={ci}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2 hover:border-brand has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                      >
                        <input
                          type="radio"
                          name={`choice-${q.id}`}
                          value={ci}
                          defaultChecked={state.values?.[`choice-${q.id}`] === String(ci)}
                        />
                        <span>{c}</span>
                      </label>
                    ))}
                  </div>
                  {error && (
                    <p className="text-sm font-semibold text-danger" role="alert">
                      {error}
                    </p>
                  )}
                  {q.hasReason && (
                    <label className="block text-sm font-semibold">
                      왜 그렇게 생각했나요? <span className="font-normal text-muted">(쓰지 않아도 돼요)</span>
                      <textarea
                        name={`reason-${q.id}`}
                        rows={2}
                        defaultValue={state.values?.[`reason-${q.id}`] ?? ""}
                        className="mt-1 w-full font-normal"
                      />
                    </label>
                  )}
                </fieldset>
              );
            })}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0}>
                이전 문항
              </button>
              {!last && (
                <button type="button" onClick={() => setIndex(index + 1)} className="btn-primary">
                  다음 문항
                </button>
              )}
              {last && (
                <button type="submit" disabled={pending || preview} className="btn-primary">
                  {preview ? "미리보기에서는 제출하지 않아요" : pending ? "제출하는 중…" : "답안 제출"}
                </button>
              )}
            </div>
          </>
        }
      />
      {state.errors?.form && (
        <p className="text-danger" role="alert">
          {state.errors.form}
        </p>
      )}
    </form>
  );
}
