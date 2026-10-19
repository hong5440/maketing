/**
 * 3D 씬 로딩 스플래시 — 로고 + 레이더 스윕 애니메이션.
 */
export function LoadingSplash() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-console-bg">
      <div className="radar-ring relative h-28 w-28">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/logo.webp"
          alt="아차사고 레이더"
          className="h-28 w-28 rounded-3xl object-cover"
        />
        <span className="radar-sweep absolute inset-0 rounded-3xl" />
      </div>
      <div className="text-center">
        <p className="text-lg font-bold">아차사고 레이더</p>
        <p className="mt-1 animate-pulse text-xs text-console-muted">
          거제사업장 3D 맵 불러오는 중…
        </p>
      </div>
    </div>
  );
}
