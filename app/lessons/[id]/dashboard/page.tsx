import Link from "next/link";
import { notFound } from "next/navigation";
import { aggregate, canOpenDashboard } from "@/lib/dashboard";
import { currentUser } from "@/lib/current-user";
import { store } from "@/lib/store";
import { loadSyntheticAction } from "@/app/actions";
import { ScreenFrame } from "@/app/_components/screen-frame";

export default async function DashboardPage({ params }: PageProps<"/lessons/[id]/dashboard">) {
  const { id } = await params;
  if (!canOpenDashboard(store, await currentUser(), id)) notFound();

  const lesson = store.lessons.find((l) => l.id === id)!;
  const d = aggregate(store, id);
  return (
    <>
      <p className="text-sm">
        <Link href={`/lessons/${id}`}>← {lesson.title}</Link>
      </p>
      <h1 className="mb-1 mt-2 text-3xl font-bold">{lesson.title} 대시보드</h1>
      <p className="mb-6 text-sm text-muted">
        문항 세트 버전 {d.version ?? "-"} 기준 (최신 버전) · 참여 횟수 {d.participation}회
      </p>

      {d.empty ? (
        <div className="card space-y-3">
          <p className="font-semibold">아직 선진단을 한 학생이 없어요.</p>
          <p className="text-sm text-muted">학생이 선진단을 제출하면 개념별 이해 수준이 여기에 모입니다.</p>
          {lesson.state === "공개" && (
            <form action={loadSyntheticAction}>
              <input type="hidden" name="lessonId" value={id} />
              <button type="submit" className="text-sm">
                합성 시도 데이터 불러오기 (모의)
              </button>
            </form>
          )}
        </div>
      ) : (
        <>
          {d.latestVersionAttempts === 0 && (
            <p className="mb-3 text-sm">최신 버전(버전 {d.version})으로 푼 학생이 아직 없어서 분포가 비어 있어요.</p>
          )}
          <ScreenFrame
            title={`③ 우리 반 결과 · ${lesson.title}`}
            status={`응답 ${d.respondents} / ${d.enrolled}명`}
            main={
              <>
                <div className="screen-label">개념별 결과 (학생마다 최근 시도 기준)</div>
                <ul className="space-y-4">
                  {d.distribution.map((c) => (
                    <li key={c.conceptId} className="space-y-1">
                      <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <Link href={`/lessons/${id}/dashboard/${c.conceptId}`} className="font-semibold">
                          {c.name}
                        </Link>
                        <span className="text-sm">
                          더 알아봐요 <strong>{c.counts["더 알아봐요"]}명</strong>
                        </span>
                      </p>
                      <progress
                        value={c.counts["더 알아봐요"]}
                        max={Math.max(1, d.respondents)}
                        aria-label={`${c.name}: 더 알아봐요 ${c.counts["더 알아봐요"]}명`}
                      />
                      <p className="flex flex-wrap gap-2 text-sm">
                        <span className="chip lv-low">더 알아봐요 {c.counts["더 알아봐요"]}명</span>
                        <span className="chip lv-mid">거의 알아요 {c.counts["거의 알아요"]}명</span>
                        <span className="chip lv-high">잘 알아요 {c.counts["잘 알아요"]}명</span>
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted">개념 이름을 누르면 학생별 답안과 판단 근거를 볼 수 있어요.</p>
              </>
            }
            side={
              <>
                <div className="screen-label">다음 수업 준비</div>
                <p className="text-sm">다시 설명할 개념</p>
                {d.reteach.length === 0 ? (
                  <p className="text-sm text-muted">&quot;더 알아봐요&quot;인 학생이 없어요.</p>
                ) : (
                  <>
                    <ol className="list-decimal space-y-1 pl-5">
                      {d.reteach.map((r) => (
                        <li key={r.conceptId}>
                          <Link href={`/lessons/${id}/dashboard/${r.conceptId}`} className="font-semibold">
                            {r.name}
                          </Link>{" "}
                          <span className="text-sm text-muted">{r.count}명</span>
                        </li>
                      ))}
                    </ol>
                    <p className="text-sm text-muted">답안과 판단 근거를 확인해 보세요.</p>
                    <Link
                      href={`/lessons/${id}/dashboard/${d.reteach[0].conceptId}`}
                      className="inline-flex min-h-10 w-full items-center justify-center rounded-full bg-primary px-6 font-semibold text-[var(--primary-ink)] no-underline hover:opacity-85"
                    >
                      답안 살펴보기
                    </Link>
                  </>
                )}
              </>
            }
          />
          <p className="mt-6 text-xs text-muted">
            호기의 진단과 추천은 참고 정보이며, 보충지도 여부는 교사가 정합니다.
          </p>
        </>
      )}
    </>
  );
}
