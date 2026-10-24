import { Wordmark } from "@/components/layout/wordmark";

/** Sign in and sign up pages: just the wordmark above the form. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center px-4 sm:px-6">
          <Wordmark />
        </div>
      </header>
      <main id="main">{children}</main>
    </>
  );
}
