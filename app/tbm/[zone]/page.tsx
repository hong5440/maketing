import { TbmView } from "@/components/tbm/TbmView";

export const metadata = {
  title: "TBM 안전 브리핑 | 아차사고 레이더",
};

/** 정적 내보내기용: 22개 구역 페이지를 모두 생성 */
export function generateStaticParams() {
  return Array.from({ length: 22 }, (_, i) => ({ zone: String(i + 1) }));
}

export default async function TbmPage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone } = await params;
  const zoneId = /^\d+$/.test(zone) ? Number(zone) : 0;
  return <TbmView zoneId={zoneId} />;
}
