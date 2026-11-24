// 로그인 화면. 단추는 /api/auth/authorize로 이동해 Vercel 로그인을 시작한다.
// 오류는 ?error=<코드>로 받아 아래 표의 문구를 보여 준다. 콜백 route가 같은 코드로 이 화면에 돌려보낸다.
const errors: Record<string, string> = {
  access_denied: "Vercel에서 로그인이 취소되었습니다. 다시 시도해 주세요.",
  not_configured: "로그인 설정이 아직 끝나지 않았습니다. 관리자에게 문의해 주세요.",
  invalid_state: "로그인 요청이 만료되었습니다. 처음부터 다시 시도해 주세요.",
  not_registered: "이 Vercel 계정은 호기야에 등록되어 있지 않습니다. 담당 교사에게 이메일 등록을 요청해 주세요.",
};
const fallback = "로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요."; // login_failed도 이 문구를 쓴다.

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const code = Array.isArray(error) ? error[0] : error;
  return (
    <div className="card mx-auto mt-8 max-w-md space-y-4">
      <h1 className="text-3xl font-bold">로그인</h1>
      <p className="text-muted">Vercel 계정으로 로그인하면 내 수업이 열립니다.</p>
      {code !== undefined && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-danger">
          {errors[code] ?? fallback}
        </p>
      )}
      {/* next/link를 쓰지 않는다: Link는 미리 불러오기를 하는데, 이 주소는 쿠키를 심고 외부로 보내는 route다. */}
      <a
        href="/api/auth/authorize"
        className="btn-primary flex min-h-10 w-full items-center justify-center gap-2 rounded-full border px-5 py-1.5 font-semibold no-underline"
      >
        <svg aria-hidden="true" viewBox="0 0 76 65" className="h-4 w-4 fill-current">
          <path d="M37.527 0 75.055 65H0z" />
        </svg>
        Sign in with Vercel
      </a>
    </div>
  );
}
