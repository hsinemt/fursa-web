import { notFound } from "next/navigation";

// Any unknown address inside a locale shows the translated not-found page.
export default function CatchAll() {
  notFound();
}
