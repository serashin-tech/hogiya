import Link from "next/link";
import { listLessons } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { data } from "@/lib/mock-data";

export default async function Home() {
  const lessons = listLessons(data, await currentUser());
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">수업 목록</h1>
      {lessons.length === 0 ? (
        <p>담당하는 수업이 아직 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link href={`/lessons/${l.id}`} className="underline">
                [{l.subject}] {l.title}
              </Link>{" "}
              <span className="text-sm text-zinc-500">{l.state}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
