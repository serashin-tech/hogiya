import Link from "next/link";
import { notFound } from "next/navigation";
import { aggregate, canOpenDashboard } from "@/lib/dashboard";
import { currentUser } from "@/lib/current-user";
import { store } from "@/lib/store";
import { loadSyntheticAction } from "@/app/actions";

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
          <h2 className="mb-2 text-lg font-semibold">개념별 이해 수준 (학생마다 최근 시도 기준)</h2>
          <p className="mb-1 text-xs text-muted sm:hidden">표는 옆으로 밀어서 볼 수 있어요.</p>
          <div className="card mb-8 overflow-x-auto !p-0" tabIndex={0} role="region" aria-label="개념별 이해 수준 표">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3">개념</th>
                  <th className="px-4 py-3"><span className="chip lv-low">더 알아봐요</span></th>
                  <th className="px-4 py-3"><span className="chip lv-mid">거의 알아요</span></th>
                  <th className="px-4 py-3"><span className="chip lv-high">잘 알아요</span></th>
                </tr>
              </thead>
              <tbody>
                {d.distribution.map((c) => (
                  <tr key={c.conceptId} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/lessons/${id}/dashboard/${c.conceptId}`}>{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{c.counts["더 알아봐요"]}명</td>
                    <td className="px-4 py-3 tabular-nums">{c.counts["거의 알아요"]}명</td>
                    <td className="px-4 py-3 tabular-nums">{c.counts["잘 알아요"]}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-2 text-lg font-semibold">다시 다룰 개념 (재지도 대상)</h2>
          {d.reteach.length === 0 ? (
            <p className="text-sm text-muted">&quot;더 알아봐요&quot;인 학생이 없어요.</p>
          ) : (
            <ol className="card list-decimal space-y-1 pl-9">
              {d.reteach.map((r) => (
                <li key={r.conceptId}>
                  <Link href={`/lessons/${id}/dashboard/${r.conceptId}`} className="font-semibold">
                    {r.name}
                  </Link>{" "}
                  <span className="text-sm text-muted">{r.count}명</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 text-xs text-muted">
            호기의 진단과 추천은 참고 정보이며, 보충지도 여부는 교사가 정합니다.
          </p>
        </>
      )}
    </>
  );
}
