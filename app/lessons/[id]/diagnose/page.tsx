import Link from "next/link";
import { notFound } from "next/navigation";
import { canOpen } from "@/lib/access";
import { canStartAttempt } from "@/lib/attempts";
import { currentUser } from "@/lib/current-user";
import { latestSet, setSignature } from "@/lib/publishing";
import { store } from "@/lib/store";
import { submitAttemptAction } from "@/app/actions";
import { DiagnoseForm } from "@/app/_components/diagnose-form";

export default async function DiagnosePage({ params }: PageProps<"/lessons/[id]/diagnose">) {
  const { id } = await params;
  const user = await currentUser();
  if (user.role !== "student" || !canOpen(store, user, { kind: "lesson", id })) notFound();

  const lesson = store.lessons.find((l) => l.id === id)!;
  const set = latestSet(store, id);
  return (
    <>
      <p className="text-sm">
        <Link href={`/lessons/${id}`} className="underline">
          ← {lesson.title}
        </Link>
      </p>
      <h1 className="my-2 text-2xl font-semibold">{lesson.title} 선진단</h1>
      {set?.draft && <p className="mb-4 text-sm text-zinc-500">검수 전 초안 문항입니다.</p>}
      {canStartAttempt(store, user, id) && set ? (
        <DiagnoseForm
          action={submitAttemptAction}
          lessonId={id}
          signature={setSignature(set)}
          questions={set.questions.map(({ id, stem, choices, hasReason }) => ({ id, stem, choices, hasReason }))}
        />
      ) : (
        <p>마감한 수업이라 새로 풀 수 없어요. 이전 결과는 수업 화면에서 볼 수 있어요.</p>
      )}
    </>
  );
}
