import Link from "next/link";
import { listLessons } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { lessonProgress } from "@/lib/review";
import { store } from "@/lib/store";
import { createLessonAction } from "./actions";
import { Character } from "./_components/character";
import { FieldsForm } from "./_components/fields-form";

export default async function Home() {
  const user = await currentUser();
  const lessons = listLessons(store, user);
  const subject = store.assignments.find((a) => a.teacherId === user.id)?.subject;
  const subjects = [...new Set(lessons.map((l) => l.subject))];
  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">수업 목록</h1>
        <Character role={user.role} className="h-28 w-auto" />
      </div>
      {lessons.length === 0 ? (
        <p className="card text-muted">
          {user.role === "teacher" ? "담당하는 수업이 아직 없습니다." : "아직 열린 수업이 없어요."}
        </p>
      ) : (
        subjects.map((s) => (
          <section key={s} className="mb-8">
            <h2 className="mb-2 text-lg font-semibold text-muted">{s}</h2>
            <ul className="space-y-2">
              {lessons
                .filter((l) => l.subject === s)
                .map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/lessons/${l.id}`}
                      className="card flex flex-wrap items-center justify-between gap-2 !py-4 text-ink no-underline hover:border-brand"
                    >
                      <span className="text-lg font-semibold">{l.title}</span>
                      <span className="chip bg-brand-soft text-brand">
                        {user.role === "teacher" ? l.state : lessonProgress(store, user.id, l.id)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
      {user.role === "teacher" && subject && (
        <section className="card mt-8">
          <h2 className="mb-3 text-lg font-semibold">새 수업 만들기 ({subject})</h2>
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
