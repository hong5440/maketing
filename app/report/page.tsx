import { ReportApp } from "@/components/report/ReportApp";

export const metadata = {
  title: "아차사고 보고 | Near-Miss Report",
};

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ zone?: string }>;
}) {
  const { zone } = await searchParams;
  const zoneId = zone && /^\d+$/.test(zone) ? Number(zone) : null;
  return <ReportApp zoneId={zoneId} />;
}
