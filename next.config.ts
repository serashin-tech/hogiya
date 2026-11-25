import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // PowerPoint 업로드(최대 10MB)가 서버 액션 본문 한도(기본 1MB)에 걸리지 않게 한다.
  // 화면이 쿠키의 사용자와 경로의 id마다 달라서 공유할 앱 셸이 없다. 즉시 이동 검증은 직접 선언한 경로만 한다.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
    instantInsights: { validationLevel: "manual-warning" },
  },
  // exceljs는 번들하지 않고 Node의 패키지로 불러온다.
  serverExternalPackages: ["exceljs", "@anthropic-ai/claude-agent-sdk"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
