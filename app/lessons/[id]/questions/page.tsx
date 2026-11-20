import Link from "next/link";
import { notFound } from "next/navigation";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { latestSet, versionsOf } from "@/lib/publishing";
import { store } from "@/lib/store";
import { deleteQuestionAction, saveConceptAction, saveQuestionAction } from "@/app/actions";
import { FieldsForm } from "@/app/_components/fields-form";
import { QuestionForm } from "@/app/_components/question-form";

export default async function QuestionsPage({ params }: PageProps<"/lessons/[id]/questions">) {
  const { id } = await params;
  const user = await currentUser();
  if (user.role !== "teacher" || !canOpen(store, user, { kind: "lesson", id })) notFound();

  const lesson = store.lessons.find((l) => l.id === id)!;
  const set = latestSet(store, id);
  const concepts = store.concepts.filter((c) => c.lessonId === id);
  const empty = { stem: "", choices: [], answerIndex: -1, hasReason: false, conceptId: "", rubric: "" };
  return (
    <>
      <p className="text-sm">
        <Link href={`/lessons/${id}`}>← {lesson.title}</Link>
      </p>
      <h1 className="mb-1 mt-2 text-3xl font-bold">문항과 개념</h1>
      {set && (
        <p className="mb-6 text-sm text-muted">
          문항 세트 버전 {set.version}
          {set.draft && " · 검수 전 초안"}
        </p>
      )}

      <h2 className="mb-2 text-lg font-semibold">개념과 확인 활동 안내</h2>
      <ul className="space-y-3">
        {concepts.map((c) => (
          <li key={c.id} className="card">
            <FieldsForm
              action={saveConceptAction}
              fields={[
                { name: "name", label: "개념 이름", defaultValue: c.name },
                { name: "activityGuide", label: "확인 활동 안내 (한 줄)", defaultValue: c.activityGuide },
              ]}
              hidden={{ id: c.id, lessonId: id }}
              submitLabel="저장"
            />
          </li>
        ))}
      </ul>
      <div className="card mt-3">
        <FieldsForm
          action={saveConceptAction}
          fields={[
            { name: "name", label: "새 개념 이름" },
            { name: "activityGuide", label: "확인 활동 안내 (한 줄)" },
          ]}
          hidden={{ lessonId: id }}
          submitLabel="개념 추가"
        />
      </div>

      <h2 className="mb-2 mt-10 text-lg font-semibold">문항 ({set?.questions.length ?? 0}개)</h2>
      <ul className="space-y-4">
        {set?.questions.map((q, i) => (
          <li key={q.id} className="card">
            <p className="mb-2 text-sm font-semibold">{i + 1}번 문항</p>
            <QuestionForm action={saveQuestionAction} lessonId={id} concepts={concepts} defaults={q} submitLabel="저장" />
            <form action={deleteQuestionAction} className="mt-2">
              <input type="hidden" name="lessonId" value={id} />
              <input type="hidden" name="id" value={q.id} />
              <button type="submit" className="!min-h-0 !py-1 text-sm">
                삭제
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="card mt-4">
        <p className="mb-2 text-sm font-semibold">새 문항</p>
        <QuestionForm action={saveQuestionAction} lessonId={id} concepts={concepts} defaults={empty} submitLabel="문항 추가" />
      </div>

      {versionsOf(store, id).length > 1 && (
        <section className="mt-10">
          <h2 className="mb-2 text-lg font-semibold">이전 버전</h2>
          {versionsOf(store, id)
            .slice(0, -1)
            .reverse()
            .map((v) => (
              <details key={v.id} className="card mb-2 !p-3">
                <summary className="cursor-pointer font-semibold">
                  버전 {v.version} (시도 {store.attempts.filter((a) => a.questionSetId === v.id).length}회)
                </summary>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                  {v.questions.map((q) => (
                    <li key={q.id}>
                      {q.stem} <span className="text-muted">· 루브릭: {q.rubric}</span>
                    </li>
                  ))}
                </ol>
              </details>
            ))}
        </section>
      )}
    </>
  );
}
