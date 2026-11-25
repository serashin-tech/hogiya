import { cookies } from "next/headers";
import { connection } from "next/server";
import { sessionCookie, sessionSecret, verifySession } from "@/lib/session";

// 로그인한 사람에게만 보이는 로그아웃 단추. 개발의 데모 사용자에게는 세션이 없어서 보이지 않는다.
export async function SignOut() {
  const secret = sessionSecret();
  const value = (await cookies()).get(sessionCookie)?.value;
  await connection(); // verifySession이 Date.now()를 쓰므로 요청 시점에 실행해야 한다.
  if (!secret || !verifySession(value, secret)) return null;
  return (
    <form action="/api/auth/signout" method="post">
      <button type="submit" className="!min-h-0 !py-1 text-sm">
        로그아웃
      </button>
    </form>
  );
}
