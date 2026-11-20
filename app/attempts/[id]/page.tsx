import Link from "next/link";
import { notFound } from "next/navigation";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { buildReview } from "@/lib/review";
import { store } from "@/lib/store";
import { askHogiAction, saveRetellingAction } from "@/app/actions";
import { HogiPanel } from "@/app/_components/hogi-panel";
import { FieldsForm } from "@/app/_components/fields-form";

const levelStyle = {
  "더 알아봐요": "lv-low",
  "거의 알아요": "lv-mid",
  "잘 알아요": "lv-high",
} as const;

// 학생의 결과·복습 화면(S05). 교사의 개인 답안 화면은 08번 티켓에서 만든다.
export default async function AttemptPage({ params, searchParams }: PageProps<"/attempts/[id]">) {
  const { id } = await params;
  const { concept: conceptParam } = await searchParams;
  const user = await currentUser();
  if (user.role !== "student" || !canOpen(store, user, { kind: "attempt", id })) notFound();

  const review = buildReview(store, id)!;
  const attempt = store.attempts.find((a) => a.id === id)!;
  const set = store.questionSets.find((s) => s.id === attempt.questionSetId)!;
  const lesson = store.lessons.find((l) => l.id === set.lessonId)!;
  // 호기 패널의 문맥: 왼쪽에서 고른 개념. 고르지 않았으면 가장 먼저 "더 알아봐요"인 개념, 없으면 첫 개념이다.
  const current =
    review.cards.find((c) => c.conceptId === conceptParam) ??
    review.cards.find((c) => c.level === "더 알아봐요") ??
    review.cards[0];

  return (
    <>
      <p className="text-sm">
        <Link href={`/lessons/${lesson.id}`}>← {lesson.title}</Link>
      </p>
      <h1 className="mb-6 mt-2 text-3xl font-bold">{lesson.title} 결과와 복습</h1>
      {set.draft && <p className="mb-4 text-sm text-muted">검수 전 초안 문항으로 만든 결과입니다.</p>}

      {review.allKnown && <p className="lv-high mb-4 rounded-lg p-3 font-semibold">모두 잘 알고 있어요.</p>}

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
      <ul className="space-y-4">
        {review.cards.map((c) => (
          <li key={c.conceptId} className={`card ${c.conceptId === current?.conceptId ? "!border-brand ring-2 ring-brand" : ""}`}>
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {c.name}
              <span className={`chip ${levelStyle[c.level]}`}>{c.level}</span>
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {c.evidence.map((e) => (
                <li key={e.questionId}>
                  <span className="font-semibold text-ink">{e.correct ? "맞혔어요" : "틀렸어요"}</span> · {e.stem}
                </li>
              ))}
            </ul>
            {c.activityGuide && <p className="lv-low mt-3 rounded-lg p-3">확인 활동: {c.activityGuide}</p>}
            <p className="mt-3 text-sm font-semibold">
              <Link href={`/attempts/${id}?concept=${c.conceptId}`} scroll={false}>
                이 개념을 호기에게 물어보기
              </Link>
            </p>
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
      {current && (
        <aside className="md:sticky md:top-4 md:self-start">
          <HogiPanel key={current.conceptId} action={askHogiAction} attemptId={id} concept={{ id: current.conceptId, name: current.name }} />
        </aside>
      )}
      </div>
    </>
  );
}
