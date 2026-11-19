import Link from "next/link";
import { notFound } from "next/navigation";
import { canOpenDashboard, conceptDetail } from "@/lib/dashboard";
import { currentUser } from "@/lib/current-user";
import { store } from "@/lib/store";

// 개인 답안 화면: 학급 전체 화면에서 개념을 눌러야 열린다. 학생 이름은 없고 번호만 보인다.
export default async function ConceptDetailPage({ params }: PageProps<"/lessons/[id]/dashboard/[conceptId]">) {
  const { id, conceptId } = await params;
  if (!canOpenDashboard(store, await currentUser(), id)) notFound();
  const concept = store.concepts.find((c) => c.id === conceptId && c.lessonId === id);
  if (!concept) notFound();

  const rows = conceptDetail(store, id, conceptId);
  return (
    <>
      <p className="text-sm">
        <Link href={`/lessons/${id}/dashboard`} className="underline">
          ← 대시보드
        </Link>
      </p>
      <h1 className="my-2 text-2xl font-semibold">{concept.name}</h1>
      {rows.length === 0 && <p>최신 버전으로 푼 학생이 아직 없어요.</p>}
      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.studentNumber} className="rounded border p-3">
            <p className="font-semibold">
              {r.studentNumber}번 <span className="ml-2 text-sm font-normal">{r.level}</span>
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              {r.answers.map((a) => (
                <li key={a.questionId}>
                  <p>{a.stem}</p>
                  <p>
                    선택: {a.choice} ({a.correct ? "맞음" : "틀림"})
                  </p>
                  {a.reason && <p className="text-zinc-600">이유: {a.reason}</p>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </>
  );
}
