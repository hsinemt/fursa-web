import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ExampleFeed } from "./example-feed";

const STEPS = ["one", "two", "three"] as const;

function Section({
  id,
  title,
  help,
  children,
  className,
}: {
  id?: string;
  title: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={className}>
      <h2 id={headingId} className="text-lg text-ink">
        {title}
      </h2>
      {help ? <p className="mt-1 text-slate">{help}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * The welcome page: a hero with the one primary action, then stacked sections that each
 * have a heading and a bordered panel. Static content, no API call.
 */
export function WelcomeContent() {
  const t = useTranslations("welcome");
  const actions = useTranslations("actions");

  return (
    <>
      <section aria-labelledby="welcome-title" className="border-b border-line bg-panel">
        <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <h1 id="welcome-title" className="max-w-2xl text-xl sm:text-2xl">
            {t("headline")}
          </h1>
          <p className="mt-4 max-w-2xl text-md text-slate">{t("intro")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/signup">{actions("createAccount")}</Link>
            </Button>
            <Button asChild>
              <Link href="/login">{actions("signIn")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-4xl px-4 pb-4 sm:px-6">
        <Section id="how" title={t("how.title")} className="mt-12 scroll-mt-6">
          <ol className="divide-y divide-line rounded-panel border border-line bg-panel">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-4 p-4 sm:p-6">
                <span className="tabular w-6 shrink-0 font-heading text-xl text-accent">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-ink">{t(`how.steps.${step}.title`)}</h3>
                  <p className="mt-1 max-w-prose text-slate">{t(`how.steps.${step}.text`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section
          id="example"
          title={t("example.title")}
          help={t("example.help")}
          className="mt-12 scroll-mt-6"
        >
          <ExampleFeed />
        </Section>

        <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-6">
          <Section title={t("doesNot.title")}>
            <p className="rounded-panel border border-line bg-panel p-4 text-ink sm:p-6">
              {t("doesNot.text")}
            </p>
          </Section>
          <Section id="data" title={t("data.title")} className="scroll-mt-6">
            <p className="rounded-panel border border-line bg-panel p-4 text-ink sm:p-6">
              {t("data.text")}
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
