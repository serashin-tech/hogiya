import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { RoleSwitcher } from "./role-switcher";

export const metadata: Metadata = {
  title: "호기야",
  description: "수업 직후 선진단으로 헷갈리는 개념을 찾고 복습하는 학습 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-3 sm:px-6">
          <Link href="/" className="text-lg font-bold text-ink no-underline">
            호기야
          </Link>
          <Suspense>
            <RoleSwitcher />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
          <Suspense>{children}</Suspense>
        </main>
      </body>
    </html>
  );
}
