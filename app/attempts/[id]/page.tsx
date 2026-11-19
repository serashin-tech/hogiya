import Link from "next/link";
import { notFound } from "next/navigation";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { buildReview } from "@/lib/review";
import { store } from "@/lib/store";
import { saveRetellingAction } from "@/app/actions";
import { FieldsForm } from "@/app/_components/fields-form";

const levelStyle = {
  "더 알아봐요": "bg-amber-100 text-amber-900",
  "거의 알아요": "bg-sky-100 text-sky-900",
  "잘 알아요": "bg-green-100 text-green-900",
} as const;

// 학생의 결과·복습 화면(S05). 교사의 개인 답안 화면은 08번 티켓에서 만든다.
export default async function AttemptPage({ params }: PageProps<"/attempts/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  if (user.role !== "student" || !canOpen(store, user, { kind: "attempt", id })) notFound();

  const review = buildReview(store, id)!;
  const attempt = store.attempts.find((a) => a.id === id)!;
  const set = store.questionSets.find((s) => s.id === attempt.questionSetId)!;
  const lesson = store.lessons.find((l) => l.id === set.lessonId)!;

  return (
    <>
      <p className="text-sm">
        <Link href={`/lessons/${lesson.id}`} className="underline">
          ← {lesson.title}
        </Link>
      </p>
      <h1 className="my-2 text-2xl font-semibold">{lesson.title} 결과와 복습</h1>
      {set.draft && <p className="mb-4 text-sm text-zinc-500">검수 전 초안 문항으로 만든 결과입니다.</p>}

      {review.allKnown && <p className="mb-4 rounded bg-green-50 p-3">모두 잘 알고 있어요.</p>}

      <ul className="space-y-4">
        {review.cards.map((c) => (
          <li key={c.conceptId} className="rounded border p-4">
            <h2 className="font-semibold">
              {c.name}{" "}
              <span className={`ml-2 rounded px-2 py-0.5 text-sm ${levelStyle[c.level]}`}>{c.level}</span>
            </h2>
            <ul className="mt-2 text-sm">
              {c.evidence.map((e) => (
                <li key={e.questionId}>
                  {e.correct ? "맞혔어요" : "틀렸어요"} · {e.stem}
                </li>
              ))}
            </ul>
            {c.activityGuide && <p className="mt-3 rounded bg-amber-50 p-2">확인 활동: {c.activityGuide}</p>}
            <div className="mt-3">
              <FieldsForm
                action={saveRetellingAction}
                fields={[{ name: "text", label: `${c.name}을(를) 내 말로 다시 설명해 보세요`, multiline: true, defaultValue: c.retelling }]}
                hidden={{ attemptId: id, conceptId: c.conceptId }}
                submitLabel={c.retelling ? "고쳐 저장" : "저장"}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
