import Link from "next/link";
import { notFound } from "next/navigation";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { latestSet } from "@/lib/publishing";
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
        <Link href={`/lessons/${id}`} className="underline">
          ← {lesson.title}
        </Link>
      </p>
      <h1 className="my-2 text-2xl font-semibold">문항과 개념</h1>
      {set && (
        <p className="mb-4 text-sm text-zinc-500">
          문항 세트 버전 {set.version}
          {set.draft && " · 검수 전 초안"}
        </p>
      )}

      <h2 className="mb-2 font-semibold">개념과 확인 활동 안내</h2>
      <ul className="space-y-3">
        {concepts.map((c) => (
          <li key={c.id} className="rounded border p-3">
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
      <div className="mt-3 rounded border p-3">
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

      <h2 className="mb-2 mt-8 font-semibold">문항 ({set?.questions.length ?? 0}개)</h2>
      <ul className="space-y-4">
        {set?.questions.map((q, i) => (
          <li key={q.id} className="rounded border p-3">
            <p className="mb-2 text-sm font-semibold">{i + 1}번 문항</p>
            <QuestionForm action={saveQuestionAction} lessonId={id} concepts={concepts} defaults={q} submitLabel="저장" />
            <form action={deleteQuestionAction} className="mt-2">
              <input type="hidden" name="lessonId" value={id} />
              <input type="hidden" name="id" value={q.id} />
              <button type="submit" className="rounded border px-3 py-1 text-sm">
                삭제
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded border p-3">
        <p className="mb-2 text-sm font-semibold">새 문항</p>
        <QuestionForm action={saveQuestionAction} lessonId={id} concepts={concepts} defaults={empty} submitLabel="문항 추가" />
      </div>
    </>
  );
}
