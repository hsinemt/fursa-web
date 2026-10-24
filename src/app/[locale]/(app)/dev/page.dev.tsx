import { notFound } from "next/navigation";
import { DevConsole } from "@/components/dev/console";

export const metadata = { title: "Dev console" };

/**
 * The dev console, at /dev (in every language). Not built in production: this file is
 * page.dev.tsx, a page extension that next.config.ts only enables outside production.
 * It is inside the app group, so the proxy asks for a signed-in session.
 */
export default function DevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevConsole />;
}
