import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { scoreBand } from "@/lib/utils/score";
import { Faq } from "./faq";
import { Ledger } from "./ledger";
import { Reveal } from "./reveal";
import { ServicesIndex } from "./services-index";
import { SortedList, type SortedJob } from "./sorted-list";

const STEPS = ["one", "two", "three"] as const;
const SAMPLE_SCORES = { one: 82, two: 68, three: 51 } as const;

/**
 * A section with a "margin heading": on laptop the heading sits in a left column (right
 * in Arabic) with the content beside it, under a hairline. Above the content on phones.
 */
function Section({
  id,
  title,
  help,
  children,
}: {
  id?: string;
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  const headingId = `${id ?? title}-title`.replace(/\s+/g, "-");
  return (
    <Reveal className="mt-12">
      <section
        id={id}
        aria-labelledby={headingId}
        className="scroll-mt-6 border-t border-line pt-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10"
      >
        <div className="lg:sticky lg:top-6 lg:self-start">
          <h2 id={headingId} className="text-lg text-ink">
            {title}
          </h2>
          {help ? <p className="mt-1 text-sm text-slate">{help}</p> : null}
        </div>
        <div className="mt-6 lg:mt-0">{children}</div>
      </section>
    </Reveal>
  );
}

/**
 * The welcome page, set like the front page of a newspaper (see "Welcome page identity" in
 * fursa design.md). Static content, no API call.
 */
export function WelcomeContent() {
  const t = useTranslations("welcome");
  const actions = useTranslations("actions");
  const score = useTranslations("score");

  const steps = STEPS.map((key) => ({
    key,
    title: t(`how.steps.${key}.title`),
    text: t(`how.steps.${key}.text`),
  }));

  const jobs: SortedJob[] = STEPS.map((key) => ({
    id: key,
    title: t(`example.jobs.${key}.title`),
    meta: t(`example.jobs.${key}.meta`),
    reason: t(`example.jobs.${key}.reason`),
    score: SAMPLE_SCORES[key],
    scoreLabel: score(scoreBand(SAMPLE_SCORES[key])),
  }));

  return (
    <>
      <section
        aria-labelledby="welcome-title"
        className="mx-auto w-full max-w-5xl px-4 pt-12 pb-4 sm:px-6 sm:pt-16 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:gap-16"
      >
        <div>
          <h1 id="welcome-title" className="max-w-xl text-xl sm:text-2xl">
            {t("headline")}
          </h1>
          <p className="mt-4 max-w-xl text-md text-slate">{t("intro")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/signup">{actions("createAccount")}</Link>
            </Button>
            <Button asChild>
              <Link href="/login">{actions("signIn")}</Link>
            </Button>
          </div>
        </div>

        <aside
          aria-label={t("hero.tag")}
          className="mt-10 rounded-panel border border-line border-s-[3px] border-s-accent bg-panel p-6 lg:mt-0"
        >
          <p className="text-xs text-slate">{t("hero.tag")}</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="tabular font-heading text-2xl text-accent">{SAMPLE_SCORES.one}</span>
            <span className="text-sm text-slate">{score(scoreBand(SAMPLE_SCORES.one))}</span>
          </p>
          <p dir="auto" className="mt-1 font-medium text-ink">
            {t("hero.title")}
          </p>
          <p dir="auto" className="mt-2 text-slate">
            {t("hero.why")}
          </p>
        </aside>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <Section id="how" title={t("how.title")}>
          <Ledger steps={steps} />
        </Section>

        <Section id="example" title={t("example.title")} help={t("example.help")}>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <p className="font-medium text-ink">
              <span className="me-3 text-xs font-normal text-slate">{t("example.tag")}</span>
              {t("example.count")}
            </p>
            <p className="text-sm text-slate">{t("example.order")}</p>
          </div>
          <SortedList jobs={jobs} label={t("example.label")} replayLabel={t("example.replay")} />
        </Section>

        <Section id="services" title={t("services.title")} help={t("services.help")}>
          <ServicesIndex />
          <p className="mt-8 max-w-prose text-sm text-slate">{t("services.later")}</p>
        </Section>

        <Section title={t("promise.title")}>
          <blockquote className="border-s-2 border-accent ps-6">
            <p className="max-w-xl font-heading text-xl text-ink">{t("promise.quote")}</p>
            <p className="mt-3 max-w-prose text-slate">{t("promise.text")}</p>
          </blockquote>
        </Section>

        <Section id="data" title={t("data.title")}>
          <p className="max-w-prose text-md text-ink">{t("data.text")}</p>
          <p className="mt-2 max-w-prose text-slate">{t("data.note")}</p>
        </Section>

        <Section id="faq" title={t("faq.title")}>
          <Faq />
        </Section>

        <Reveal className="mt-12">
          <section
            aria-labelledby="closing-title"
            className="border-t-2 border-ink pt-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10"
          >
            <div />
            <div>
              <h2 id="closing-title" className="text-xl text-ink">
                {t("closing.title")}
              </h2>
              <p className="mt-2 max-w-prose text-slate">{t("closing.text")}</p>
              <div className="mt-6">
                <Button asChild variant="primary">
                  <Link href="/signup">{actions("createAccount")}</Link>
                </Button>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </>
  );
}
