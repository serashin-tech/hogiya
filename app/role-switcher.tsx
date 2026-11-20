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

export async function RoleSwitcher() {
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
