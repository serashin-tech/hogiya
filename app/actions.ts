"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { store } from "@/lib/store";
import { deleteQuestion, saveConcept, saveQuestion, setLessonState } from "@/lib/publishing";
import { addMaterial, createLesson, deleteMaterial, updateMaterial } from "@/lib/teaching";
import type { FormState } from "./_components/fields-form";
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
  });
  if (!r.ok) return { errors: r.errors };
  revalidatePath("/lessons/[id]", "layout");
  return {};
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
