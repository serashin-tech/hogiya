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
        <Link href={`/lessons/${id}`} className="underline">
          ← {lesson.title}
        </Link>
      </p>
      <h1 className="my-2 text-2xl font-semibold">{lesson.title} 대시보드</h1>
      <p className="mb-4 text-sm text-zinc-500">
        문항 세트 버전 {d.version ?? "-"} 기준 (최신 버전) · 참여 횟수 {d.participation}회
      </p>

      {d.empty ? (
        <div className="space-y-3">
          <p>아직 선진단을 한 학생이 없어요.</p>
          {lesson.state === "공개" && (
            <form action={loadSyntheticAction}>
              <input type="hidden" name="lessonId" value={id} />
              <button type="submit" className="rounded border px-3 py-1 text-sm">
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
          <h2 className="mb-2 font-semibold">개념별 이해 수준 (학생마다 최근 시도 기준)</h2>
          <table className="mb-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-1">개념</th>
                <th>더 알아봐요</th>
                <th>거의 알아요</th>
                <th>잘 알아요</th>
              </tr>
            </thead>
            <tbody>
              {d.distribution.map((c) => (
                <tr key={c.conceptId} className="border-b">
                  <td className="py-1">
                    <Link href={`/lessons/${id}/dashboard/${c.conceptId}`} className="underline">
                      {c.name}
                    </Link>
                  </td>
                  <td>{c.counts["더 알아봐요"]}명</td>
                  <td>{c.counts["거의 알아요"]}명</td>
                  <td>{c.counts["잘 알아요"]}명</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mb-2 font-semibold">다시 다룰 개념 (재지도 대상)</h2>
          {d.reteach.length === 0 ? (
            <p className="text-sm">&quot;더 알아봐요&quot;인 학생이 없어요.</p>
          ) : (
            <ol className="list-decimal pl-5">
              {d.reteach.map((r) => (
                <li key={r.conceptId}>
                  <Link href={`/lessons/${id}/dashboard/${r.conceptId}`} className="underline">
                    {r.name}
                  </Link>{" "}
                  <span className="text-sm text-zinc-500">{r.count}명</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-6 text-xs text-zinc-500">
            호기의 진단과 추천은 참고 정보이며, 보충지도 여부는 교사가 정합니다.
          </p>
        </>
      )}
    </>
  );
}
