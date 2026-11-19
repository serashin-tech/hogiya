import { notFound } from "next/navigation";
import { canOpen } from "@/lib/access";
import { currentUser } from "@/lib/current-user";
import { store as data } from "@/lib/store";

// 시도 화면은 05번 티켓에서 채운다. 여기서는 접근 판단만 지난다.
export default async function AttemptPage({ params }: PageProps<"/attempts/[id]">) {
  const { id } = await params;
  if (!canOpen(data, await currentUser(), { kind: "attempt", id })) notFound();
  return <h1 className="text-2xl font-semibold">시도 {id}</h1>;
}
