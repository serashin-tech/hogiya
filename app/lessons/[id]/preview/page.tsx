import Link from "next/link";
import { notFound } from "next/navigation";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { checkPublishable, latestSet, setSignature } from "@/lib/publishing";
import { store } from "@/lib/store";
import { slidesOf } from "@/lib/teaching";
import { setStateAction, submitAttemptAction } from "@/app/actions";
import { DiagnoseForm } from "@/app/_components/diagnose-form";
import { StateForm } from "@/app/_components/state-form";

// 교사가 학생이 보는 선진단 화면을 미리 보고, 이상이 없으면 복습을 여는 화면(공개). 제출은 하지 않는다.
export default async function PreviewPage({ params }: PageProps<"/lessons/[id]/preview">) {
  const { id } = await params;
  const user = await currentUser();
  if (user.role !== "teacher" || !canOpen(store, user, { kind: "lesson", id })) notFound();

  const lesson = store.lessons.find((l) => l.id === id)!;
  const set = latestSet(store, id);
  const issues = checkPublishable(store, id);
  return (
    <>
      <p className="text-sm">
        <Link href={`/lessons/${id}/questions`}>← 문항과 개념</Link>
      </p>
      <h1 className="mb-1 mt-2 text-3xl font-bold">{lesson.title} 미리보기</h1>
      <p className="mb-6 text-sm text-muted">학생에게 보이는 선진단 화면입니다. 여기서는 제출되지 않아요.</p>

      {set && set.questions.length > 0 ? (
        <DiagnoseForm
          action={submitAttemptAction}
          lessonId={id}
          lessonTitle={lesson.title}
          slides={slidesOf(store, id)}
          signature={setSignature(set)}
          questions={set.questions.map(({ id, stem, choices, hasReason }) => ({ id, stem, choices, hasReason }))}
          preview
        />
      ) : (
        <p className="card text-muted">아직 문항이 없어요. 문항을 먼저 만들어 주세요.</p>
      )}

      <section className="card mt-8 space-y-3">
        <h2 className="text-lg font-semibold">복습 열기</h2>
        {lesson.state === "공개" ? (
          <p className="text-sm text-muted">이미 복습이 열려 있어요.</p>
        ) : issues.length > 0 ? (
          <>
            <p className="text-sm text-muted">복습을 열려면 아래 항목이 더 필요해요.</p>
            <ul className="list-disc pl-5 text-sm">
              {issues.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">공개하면 학생이 선진단을 풀고 복습할 수 있어요.</p>
        )}
        {lesson.state !== "공개" && <StateForm action={setStateAction} lessonId={id} target="공개" />}
      </section>
    </>
  );
}
