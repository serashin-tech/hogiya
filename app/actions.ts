"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/current-user";
import { store } from "@/lib/store";
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
