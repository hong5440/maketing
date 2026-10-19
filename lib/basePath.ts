/**
 * 하위 경로 배포(GitHub Pages 등) 지원.
 * next/link·next/router는 basePath를 자동 적용하지만, 생 <img>/<audio>/<iframe>/fetch
 * 경로는 수동으로 붙여야 한다. 루트 배포(dev·demo/ 번들)에서는 빈 문자열이라 무영향.
 * 값은 빌드 시 next.config.ts 가 BASE_PATH 환경변수에서 주입한다.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const withBase = (path: string) => `${BASE_PATH}${path}`;
