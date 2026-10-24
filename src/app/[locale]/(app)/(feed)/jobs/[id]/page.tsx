import { JobDetailScreen } from "@/components/features/feed/job-detail";
import { pageTitle } from "@/lib/page-title";

export const generateMetadata = pageTitle("job", "pageTitle");

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetailScreen id={id} />;
}
