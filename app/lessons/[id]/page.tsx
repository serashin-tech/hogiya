import Link from "next/link";
import { notFound } from "next/navigation";
import { canStartAttempt } from "@/lib/attempts";
import { StateForm } from "@/app/_components/state-form";
import { setStateAction } from "@/app/actions";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { store } from "@/lib/store";
import { deleteMaterialAction, saveMaterialAction, uploadDeckAction } from "@/app/actions";
import { Character } from "@/app/_components/character";
import { FieldsForm } from "@/app/_components/fields-form";
import { ScreenFrame } from "@/app/_components/screen-frame";
import { SlideViewer } from "@/app/_components/slide-viewer";
import { UploadForm } from "@/app/_components/upload-form";
import { slidesOf } from "@/lib/teaching";

export default async function LessonPage({ params }: PageProps<"/lessons/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  if (!canOpen(store, user, { kind: "lesson", id })) notFound();

  const lesson = store.lessons.find((l) => l.id === id)!;
  const sets = store.questionSets.filter((s) => s.lessonId === id);
  const materials = store.materials.filter((m) => m.lessonId === id);
  const isTeacher = user.role === "teacher";
  const deckFile = materials.find((m) => m.origin)?.origin;
  const setIds = new Set(sets.map((s) => s.id));
  const myAttempts = store.attempts.filter((a) => a.studentId === user.id && setIds.has(a.questionSetId));
  return (
    <>
      <h1 className="text-3xl font-bold">{lesson.title}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        {lesson.subject} · {lesson.state}
        {sets.some((s) => s.draft) && " · 검수 전 초안"}
      </p>
      {isTeacher && (
        <section className="card mb-8 flex items-center justify-between gap-4">
          <div className="space-y-3">
            <p className="flex flex-wrap gap-x-6 gap-y-2 font-semibold">
              <Link href={`/lessons/${id}/questions`}>문항과 개념 편집</Link>
              <Link href={`/lessons/${id}/dashboard`}>대시보드</Link>
            </p>
            {lesson.state === "공개" ? (
              <StateForm action={setStateAction} lessonId={id} target="마감" />
            ) : (
              <StateForm action={setStateAction} lessonId={id} target="공개" />
            )}
          </div>
          <Character role="teacher" />
        </section>
      )}
      {!isTeacher && (
        <section className="card mb-8 flex items-center justify-between gap-4">
          <div className="space-y-3">
            {canStartAttempt(store, user, id) ? (
              <p>
                <Link
                  href={`/lessons/${id}/diagnose`}
                  className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 text-lg font-semibold text-[var(--primary-ink)] no-underline hover:opacity-85"
                >
                  {myAttempts.length ? "새로 풀기" : "선진단 풀기"}
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted">마감한 수업이에요. 이전 결과는 계속 볼 수 있어요.</p>
            )}
            {myAttempts.length > 0 && (
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {myAttempts.map((a, i) => (
                  <li key={a.id}>
                    <Link href={`/attempts/${a.id}`}>{i + 1}번째 시도 결과</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Character role="student" />
        </section>
      )}
      {isTeacher && (
        <section className="mb-8">
          <ScreenFrame
            title="① 수업 자료 올리기"
            status={`수업 이름 · ${lesson.title}`}
            main={
              <>
                <div className="screen-label">📺 학생에게 보이는 모습</div>
                <SlideViewer slides={slidesOf(store, id)} />
              </>
            }
            side={
              <>
                <div className="screen-label">PowerPoint 파일</div>
                {deckFile && <p className="break-all text-sm font-semibold">📎 {deckFile}</p>}
                <p className="text-sm text-muted">
                  올리면 슬라이드의 제목과 글이 수업 자료로 바뀌어 학생이 보는 화면에 나타나요. 그림과 모양은 가져오지 않아요.
                </p>
                <UploadForm
                  action={uploadDeckAction}
                  lessonId={id}
                  accept=".pptx"
                  label="PowerPoint 파일(.pptx, 10MB까지)"
                  submitLabel={deckFile ? "다른 파일로 바꾸기" : "파일 올리기"}
                  done="슬라이드 {n}장을 가져왔어요"
                />
              </>
            }
          />
        </section>
      )}
      <h2 className="mb-3 text-lg font-semibold">{isTeacher ? "수업 자료 고치기" : "수업 자료"}</h2>
      {materials.length === 0 && <p className="text-sm text-muted">등록된 자료가 없습니다.</p>}
      <ul className="space-y-4">
        {materials.map((m) =>
          isTeacher ? (
            <li key={m.id} className="card">
              <FieldsForm
                action={saveMaterialAction}
                fields={[
                  { name: "title", label: "제목", defaultValue: m.title },
                  { name: "body", label: "본문", multiline: true, defaultValue: m.body },
                ]}
                hidden={{ id: m.id }}
                submitLabel="수정"
                secondary
              />
              <form action={deleteMaterialAction} className="mt-2">
                <input type="hidden" name="id" value={m.id} />
                <button type="submit" className="!min-h-0 !py-1 text-sm">
                  삭제
                </button>
              </form>
            </li>
          ) : (
            <li key={m.id} className="card">
              {m.title}
            </li>
          ),
        )}
      </ul>
      {isTeacher && (
        <section className="card mt-8">
          <h3 className="mb-3 text-lg font-semibold">자료 추가</h3>
          <FieldsForm
            action={saveMaterialAction}
            fields={[
              { name: "title", label: "제목" },
              { name: "body", label: "본문", multiline: true },
            ]}
            hidden={{ lessonId: id }}
            submitLabel="추가"
          />
        </section>
      )}
    </>
  );
}
