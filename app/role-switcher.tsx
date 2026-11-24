import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser, userCookieName, userOptions } from "@/lib/current-user";

async function switchUser(form: FormData) {
  "use server";
  const value = String(form.get("who"));
  if (userOptions.some((o) => o.value === value)) {
    (await cookies()).set(userCookieName, value, { path: "/" });
  }
  redirect("/");
}

// 개발 전용. 운영에서는 currentUser()가 로그인 화면으로 보내므로, 여기서 부르면 /login에서도 되돌아가는 고리가 생긴다.
export async function RoleSwitcher() {
  if (process.env.NODE_ENV === "production") return null;
  const user = await currentUser();
  return (
    <form action={switchUser} className="flex items-center gap-2 text-sm">
      <label htmlFor="who" className="text-muted">
        현재 사용자
      </label>
      <select id="who" name="who" defaultValue={`${user.role}:${user.id}`} className="py-1">
        {userOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button type="submit" className="!min-h-0 !py-1">
        전환
      </button>
    </form>
  );
}
