import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // drei <Html>이 StrictMode 이중 마운트에서 루트 unmount 레이스를 일으켜
  // 마커가 간헐적으로 누락됨 → 데모에서는 비활성화
  reactStrictMode: false,
};

export default nextConfig;
