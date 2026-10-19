import { TbmView } from "@/components/tbm/TbmView";

export const metadata = {
  title: "TBM 안전 브리핑 | 아차사고 레이더",
};

export default async function TbmPage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone } = await params;
  const zoneId = /^\d+$/.test(zone) ? Number(zone) : 0;
  return <TbmView zoneId={zoneId} />;
}
