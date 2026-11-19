import Link from "next/link";
import { listLessons } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { lessonProgress } from "@/lib/review";
import { store } from "@/lib/store";
import { createLessonAction } from "./actions";
import { FieldsForm } from "./_components/fields-form";

export default async function Home() {
  const user = await currentUser();
  const lessons = listLessons(store, user);
  const subject = store.assignments.find((a) => a.teacherId === user.id)?.subject;
  const subjects = [...new Set(lessons.map((l) => l.subject))];
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">수업 목록</h1>
      {lessons.length === 0 ? (
        <p>{user.role === "teacher" ? "담당하는 수업이 아직 없습니다." : "아직 열린 수업이 없어요."}</p>
      ) : (
        subjects.map((s) => (
          <section key={s} className="mb-4">
            <h2 className="mb-1 font-semibold">{s}</h2>
            <ul className="space-y-2">
              {lessons
                .filter((l) => l.subject === s)
                .map((l) => (
                  <li key={l.id}>
                    <Link href={`/lessons/${l.id}`} className="underline">
                      {l.title}
                    </Link>{" "}
                    <span className="text-sm text-zinc-500">
                      {user.role === "teacher" ? l.state : lessonProgress(store, user.id, l.id)}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
      {user.role === "teacher" && subject && (
        <section className="mt-8">
          <h2 className="mb-2 font-semibold">새 수업 만들기 ({subject})</h2>
          <FieldsForm
            action={createLessonAction}
            fields={[{ name: "title", label: "수업 제목" }]}
            hidden={{ subject }}
            submitLabel="수업 만들기"
          />
        </section>
      )}
    </>
  );
}
