import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import "./globals.css";
import { RoleSwitcher } from "./role-switcher";

export const metadata: Metadata = {
  title: "호기야",
  description: "수업 직후 선진단으로 헷갈리는 개념을 찾고 복습하는 학습 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col break-keep">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <Link href="/" className="font-semibold">
            호기야
          </Link>
          <Suspense>
            <RoleSwitcher />
          </Suspense>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          <Suspense>{children}</Suspense>
        </main>
      </body>
    </html>
  );
}
