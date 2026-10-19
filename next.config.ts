import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
