import { FeedShell } from "@/components/features/feed/feed-shell";

/** `/feed` and `/jobs/<id>` share this layout, so the list stays loaded while a job is open. */
export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return <FeedShell>{children}</FeedShell>;
}
