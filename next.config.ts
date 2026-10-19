import type { NextConfig } from "next";

// 하위 경로 배포용 (예: GitHub Pages → BASE_PATH=/maketing). 비우면 루트 배포.
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // drei <Html>이 StrictMode 이중 마운트에서 루트 unmount 레이스를 일으켜
  // 마커가 간헐적으로 누락됨 → 데모에서는 비활성화
  reactStrictMode: false,
  // 시연 중 dev 인디케이터가 하단 UI를 가리지 않도록
  devIndicators: false,
  // 정적 HTML 데모 빌드 (scripts/build-static.sh 가 설정):
  // API 라우트 없이 out/ 에 순수 정적 사이트를 내보낸다.
  ...(process.env.STATIC_EXPORT === "1"
    ? { output: "export" as const, trailingSlash: true }
    : {}),
};

export default nextConfig;
