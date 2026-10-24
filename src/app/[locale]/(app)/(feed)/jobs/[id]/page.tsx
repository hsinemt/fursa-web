import { JobDetailScreen } from "@/components/features/feed/job-detail";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetailScreen id={id} />;
}
