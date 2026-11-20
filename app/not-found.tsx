import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card space-y-3">
      <p className="text-lg font-semibold">열 수 없는 자료입니다.</p>
      <p>
        <Link href="/">수업 목록으로 돌아가기</Link>
      </p>
    </div>
  );
}
