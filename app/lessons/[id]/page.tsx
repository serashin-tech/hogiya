import Link from "next/link";
import { notFound } from "next/navigation";
import { canStartAttempt } from "@/lib/attempts";
import { StateForm } from "@/app/_components/state-form";
import { setStateAction } from "@/app/actions";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { store } from "@/lib/store";
import { deleteMaterialAction, saveMaterialAction } from "@/app/actions";
import { FieldsForm } from "@/app/_components/fields-form";

export default async function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  if (!canOpen(store, user, { kind: "lesson", id })) notFound();

  const lesson = store.lessons.find((l) => l.id === id)!;
  const sets = store.questionSets.filter((s) => s.lessonId === id);
  const materials = store.materials.filter((m) => m.lessonId === id);
  const isTeacher = user.role === "teacher";
  const setIds = new Set(sets.map((s) => s.id));
  const myAttempts = store.attempts.filter((a) => a.studentId === user.id && setIds.has(a.questionSetId));
  return (
    <>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {lesson.subject} · {lesson.state}
        {sets.some((s) => s.draft) && " · 검수 전 초안"}
      </p>
      {isTeacher && (
        <section className="mb-6 space-y-3">
          <p>
            <Link href={`/lessons/${id}/questions`} className="underline">
              문항과 개념 편집
            </Link>
          </p>
          {lesson.state === "공개" ? (
            <StateForm action={setStateAction} lessonId={id} target="마감" />
          ) : (
            <StateForm action={setStateAction} lessonId={id} target="공개" />
          )}
        </section>
      )}
      {!isTeacher && (
        <section className="mb-6 space-y-2">
          {canStartAttempt(store, user, id) ? (
            <p>
              <Link href={`/lessons/${id}/diagnose`} className="underline">
                {myAttempts.length ? "새로 풀기" : "선진단 풀기"}
              </Link>
            </p>
          ) : (
            <p className="text-sm">마감한 수업이에요. 이전 결과는 계속 볼 수 있어요.</p>
          )}
          {myAttempts.length > 0 && (
            <ul className="list-disc pl-5 text-sm">
              {myAttempts.map((a, i) => (
                <li key={a.id}>
                  <Link href={`/attempts/${a.id}`} className="underline">
                    {i + 1}번째 시도 결과
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <h2 className="mb-2 font-semibold">수업 자료</h2>
      {materials.length === 0 && <p className="text-sm">등록된 자료가 없습니다.</p>}
      <ul className="space-y-4">
        {materials.map((m) =>
          isTeacher ? (
            <li key={m.id} className="rounded border p-3">
              <FieldsForm
                action={saveMaterialAction}
                fields={[
                  { name: "title", label: "제목", defaultValue: m.title },
                  { name: "body", label: "본문", multiline: true, defaultValue: m.body },
                ]}
                hidden={{ id: m.id }}
                submitLabel="수정"
              />
              <form action={deleteMaterialAction} className="mt-2">
                <input type="hidden" name="id" value={m.id} />
                <button type="submit" className="rounded border px-3 py-1 text-sm">
                  삭제
                </button>
              </form>
            </li>
          ) : (
            <li key={m.id}>{m.title}</li>
          ),
        )}
      </ul>
      {isTeacher && (
        <section className="mt-6">
          <h3 className="mb-2 font-semibold">자료 추가</h3>
          <FieldsForm
            action={saveMaterialAction}
            fields={[
              { name: "title", label: "제목" },
              { name: "body", label: "본문", multiline: true },
            ]}
            hidden={{ lessonId: id }}
            submitLabel="추가"
          />
        </section>
      )}
    </>
  );
}
