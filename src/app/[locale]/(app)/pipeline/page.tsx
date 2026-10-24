import { PipelineBoard } from "@/components/features/pipeline/pipeline-board";
import { pageTitle } from "@/lib/page-title";

export const generateMetadata = pageTitle("pages.pipeline");

export default function PipelinePage() {
  return <PipelineBoard />;
}
