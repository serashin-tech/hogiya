"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { store } from "@/lib/store";
import { submitAttempt } from "@/lib/attempts";
import { loadSynthetic } from "@/lib/synthetic";
import { parsePptx } from "@/lib/pptx";
import { parseQuestionSheet } from "@/lib/question-sheet";
import { askHogi } from "@/lib/hogi";
import { saveRetelling } from "@/lib/review";
import { deleteQuestion, importQuestions, latestSet, saveConcept, saveQuestion, setLessonState } from "@/lib/publishing";
import { addMaterial, createLesson, deleteMaterial, importDeck, updateMaterial } from "@/lib/teaching";
import type { FormState } from "./_components/fields-form";
import type { UploadState } from "./_components/upload-form";
import type { HogiState } from "./_components/hogi-panel";
import type { Subject } from "@/lib/types";

const text = (f: FormData, k: string) => String(f.get(k) ?? "");
const values = (f: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, text(f, k)]));

export async function createLessonAction(_: FormState, f: FormData): Promise<FormState> {
  const r = createLesson(store, await currentUser(), { subject: text(f, "subject") as Subject, title: text(f, "title") });
  if (!r.ok) return { errors: r.errors, values: values(f, ["title"]) };
  redirect(`/lessons/${r.value}`);
}

export async function saveMaterialAction(_: FormState, f: FormData): Promise<FormState> {
  const user = await currentUser();
  const input = { title: text(f, "title"), body: text(f, "body") };
  const id = text(f, "id");
  const r = id ? updateMaterial(store, user, id, input) : addMaterial(store, user, text(f, "lessonId"), input);
  if (!r.ok) return { errors: r.errors, values: input };
  revalidatePath("/lessons/[id]", "page");
  return id ? {} : { values: { title: "", body: "" } };
}

export async function deleteMaterialAction(f: FormData) {
  deleteMaterial(store, await currentUser(), text(f, "id"));
  revalidatePath("/lessons/[id]", "page");
}

export async function saveConceptAction(_: FormState, f: FormData): Promise<FormState> {
  const input = { id: text(f, "id") || undefined, name: text(f, "name"), activityGuide: text(f, "activityGuide") };
  const r = saveConcept(store, await currentUser(), text(f, "lessonId"), input);
  if (!r.ok) return { errors: r.errors, values: values(f, ["name", "activityGuide"]) };
  revalidatePath("/lessons/[id]", "layout");
  return input.id ? {} : { values: { name: "", activityGuide: "" } };
}

export async function saveQuestionAction(_: FormState, f: FormData): Promise<FormState> {
  const answer = f.get("answer");
  const r = saveQuestion(store, await currentUser(), text(f, "lessonId"), {
    id: text(f, "id") || undefined,
    stem: text(f, "stem"),
    choices: [0, 1, 2, 3].map((i) => text(f, `choice${i}`)),
    answerIndex: answer === null ? null : Number(answer),
    hasReason: f.get("hasReason") === "on",
    conceptIds: f.getAll("conceptId").map(String).filter(Boolean),
    rubric: text(f, "rubric"),
    misconception: text(f, "misconception"),
  });
  if (!r.ok) return { errors: r.errors };
  revalidatePath("/lessons/[id]", "layout");
  return {};
}

const MB = 1024 * 1024;

/** 업로드한 파일을 읽는다. 종류와 크기가 맞지 않으면 안내 문구를 돌려준다. */
async function readUpload(f: FormData, ext: string, label: string, maxBytes: number) {
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: `${label} 파일을 골라 주세요` };
  if (!file.name.toLowerCase().endsWith(ext)) return { error: `${label}(${ext}) 파일만 올릴 수 있습니다` };
  if (file.size > maxBytes) return { error: `파일은 ${maxBytes / MB}MB까지 올릴 수 있습니다` };
  return { file, bytes: new Uint8Array(await file.arrayBuffer()) };
}

export async function uploadDeckAction(_: UploadState, f: FormData): Promise<UploadState> {
  const up = await readUpload(f, ".pptx", "PowerPoint", 10 * MB);
  if (!up.file) return { errors: { file: up.error } };
  const parsed = await parsePptx(up.bytes);
  if (!parsed.ok) return { errors: parsed.errors };
  const r = importDeck(store, await currentUser(), text(f, "lessonId"), up.file.name, parsed.value);
  if (!r.ok) return { errors: r.errors };
  revalidatePath("/lessons/[id]", "layout");
  return { count: r.value };
}

export async function importQuestionsAction(_: UploadState, f: FormData): Promise<UploadState> {
  const up = await readUpload(f, ".xlsx", "엑셀", 1 * MB);
  if (!up.file) return { errors: { file: up.error } };
  const parsed = await parseQuestionSheet(up.bytes);
  if (!parsed.ok) return { errors: parsed.errors };
  const r = importQuestions(store, await currentUser(), text(f, "lessonId"), parsed.value);
  if (!r.ok) return { errors: r.errors };
  revalidatePath("/lessons/[id]", "layout");
  return { count: r.value };
}

export async function deleteQuestionAction(f: FormData) {
  deleteQuestion(store, await currentUser(), text(f, "lessonId"), text(f, "id"));
  revalidatePath("/lessons/[id]", "layout");
}

export async function setStateAction(_: FormState, f: FormData): Promise<FormState> {
  const r = setLessonState(store, await currentUser(), text(f, "lessonId"), text(f, "target") as "공개" | "마감");
  if (!r.ok) return { errors: r.errors };
  revalidatePath("/", "layout");
  return {};
}

export async function submitAttemptAction(_: FormState, f: FormData): Promise<FormState> {
  const kept: Record<string, string> = {};
  for (const [k, v] of f.entries()) if (k.startsWith("choice-") || k.startsWith("reason-")) kept[k] = String(v);

  let attemptId: string;
  try {
    const lessonId = text(f, "lessonId");
    const questions = latestSet(store, lessonId)?.questions ?? [];
    const r = submitAttempt(store, await currentUser(), lessonId, {
      key: text(f, "key"),
      signature: text(f, "signature"),
      answers: questions.map((q) => {
        const choice = f.get(`choice-${q.id}`);
        return { questionId: q.id, choiceIndex: choice === null ? null : Number(choice), reason: text(f, `reason-${q.id}`) };
      }),
    });
    if (!r.ok) return { errors: r.errors, values: kept };
    attemptId = r.value;
  } catch {
    // 처리 중 예외가 나도 입력한 답은 화면에 남기고, 같은 시도 키로 다시 제출하게 한다.
    return { errors: { form: "제출하지 못했어요. 입력한 답은 그대로 있으니 다시 눌러 주세요." }, values: kept };
  }
  revalidatePath("/", "layout");
  redirect(`/attempts/${attemptId}`);
}

export async function saveRetellingAction(_: FormState, f: FormData): Promise<FormState> {
  const r = saveRetelling(store, await currentUser(), text(f, "attemptId"), text(f, "conceptId"), text(f, "text"));
  if (!r.ok) return { errors: r.errors, values: values(f, ["text"]) };
  revalidatePath("/", "layout");
  return {};
}

export async function askHogiAction(prev: HogiState, f: FormData): Promise<HogiState> {
  const question = text(f, "question");
  // 호기는 읽기만 한다. 실패해도 askHogi가 오류 응답으로 바꿔 돌려주므로 시도와 결과는 건드리지 않는다.
  const reply = askHogi(store, await currentUser(), text(f, "attemptId"), text(f, "conceptId"), question);
  return { turns: [...prev.turns, { question, ...reply }] };
}

export async function loadSyntheticAction(f: FormData) {
  loadSynthetic(store, await currentUser(), text(f, "lessonId"));
  revalidatePath("/", "layout");
}
