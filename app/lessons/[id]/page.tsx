import { notFound } from "next/navigation";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { data } from "@/lib/mock-data";

export default async function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  const { id } = await params;
  if (!canOpen(data, await currentUser(), { kind: "lesson", id })) notFound();

  const lesson = data.lessons.find((l) => l.id === id)!;
  const sets = data.questionSets.filter((s) => s.lessonId === id);
  return (
    <>
      <h1 className="text-2xl font-semibold">{lesson.title}</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {lesson.subject} · {lesson.state}
        {sets.some((s) => s.draft) && " · 검수 전 초안"}
      </p>
      <h2 className="mb-2 font-semibold">수업 자료</h2>
      <ul className="list-disc pl-5">
        {data.materials
          .filter((m) => m.lessonId === id)
          .map((m) => (
            <li key={m.id}>{m.title}</li>
          ))}
      </ul>
    </>
  );
}
