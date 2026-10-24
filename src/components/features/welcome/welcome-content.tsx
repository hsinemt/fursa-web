import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils/cn";
import { scoreBand } from "@/lib/utils/score";
import { Faq } from "./faq";
import { HowStory } from "./how-story";
import { Reveal } from "./reveal";
import { RevealText } from "./reveal-text";
import { AlertScene, ProfileScene, ScoringScene } from "./scenes";
import { ScrollProgress } from "./scroll-progress";
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
  id: string;
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="mt-12">
      <section
        id={id}
        aria-labelledby={`${id}-title`}
        className="scroll-mt-24 border-t border-line pt-6 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10"
      >
        <div className="lg:sticky lg:top-24 lg:self-start">
          <RevealText
            id={`${id}-title`}
            text={title}
            className="font-heading text-title text-ink lg:text-xl"
          />
          {help ? <p className="mt-2 text-sm text-slate">{help}</p> : null}
        </div>
        <div className="mt-6 lg:mt-0">{children}</div>
      </section>
    </Reveal>
  );
}

/**
 * The welcome page, set like the front page of a newspaper: large type, one bold accent
 * band, a pinned scroll story. See "Welcome page identity" and "Motion" in fursa design.md.
 * Static content, no API call.
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

  const twinIsArabic = t("twinLang") === "ar";

  return (
    <>
      <ScrollProgress />

      <section
        aria-labelledby="welcome-title"
        className="mx-auto w-full max-w-5xl px-4 pt-10 pb-10 sm:px-6 sm:pt-14 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:gap-16"
      >
        <div>
          <p className="text-sm text-slate">{t("hero.eyebrow")}</p>
          <RevealText
            as="h1"
            mode="load"
            id="welcome-title"
            text={t("headline")}
            className="mt-4 font-heading text-display text-balance text-ink"
          />
          <p
            lang={t("twinLang")}
            dir="auto"
            className={cn(
              "mt-4 text-title text-slate",
              twinIsArabic ? "font-arabic font-medium" : "font-serif",
            )}
          >
            {t("twin")}
          </p>
          <p className="mt-8 max-w-xl text-md text-ink">{t("intro")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="primary">
              <Link href="/signup">{actions("createAccount")}</Link>
            </Button>
            <Button asChild>
              <Link href="/login">{actions("signIn")}</Link>
            </Button>
          </div>
        </div>

        <aside aria-label={t("hero.tag")} className="mt-14 lg:mt-0">
          <p className="text-xs text-slate">{t("hero.tag")}</p>
          <p className="tabular font-heading text-numeral text-accent">
            <span className="sr-only">{SAMPLE_SCORES.one}</span>
            <span
              aria-hidden="true"
              className="count count-load"
              style={{ "--to": SAMPLE_SCORES.one } as React.CSSProperties}
            />
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span dir="auto" className="font-medium text-ink">
              {t("hero.title")}
            </span>
            <span className="text-sm text-slate">{score(scoreBand(SAMPLE_SCORES.one))}</span>
          </p>
          <p dir="auto" className="mt-2 max-w-xs text-slate">
            {t("hero.why")}
          </p>
        </aside>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <section
          id="how"
          aria-labelledby="how-title"
          className="scroll-mt-24 border-t border-line pt-6"
        >
          <RevealText
            id="how-title"
            text={t("how.title")}
            className="font-heading text-title text-ink"
          />
          <HowStory
            steps={steps}
            scenes={[
              <ProfileScene key="profile" />,
              <ScoringScene key="scoring" />,
              <AlertScene key="alert" />,
            ]}
          />
        </section>

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
      </div>

      <section aria-labelledby="promise-title" className="mt-12 bg-accent text-on-accent">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 id="promise-title" className="text-md font-medium text-on-accent">
            {t("promise.title")}
          </h2>
          <RevealText
            as="p"
            text={t("promise.quote")}
            className="mt-6 max-w-3xl font-heading text-statement text-balance text-on-accent"
          />
          <p className="mt-8 max-w-xl text-md text-on-accent">{t("promise.text")}</p>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <Section id="data" title={t("data.title")}>
          <p className="max-w-prose text-md text-ink">{t("data.text")}</p>
          <p className="mt-2 max-w-prose text-slate">{t("data.note")}</p>
        </Section>

        <Section id="faq" title={t("faq.title")}>
          <Faq />
        </Section>
      </div>

      <section aria-labelledby="closing-title" className="mt-12 bg-tint">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <RevealText
            id="closing-title"
            text={t("closing.title")}
            className="max-w-3xl font-heading text-statement text-balance text-ink"
          />
          <p className="mt-6 max-w-prose text-md text-slate">{t("closing.text")}</p>
          <div className="mt-8">
            <Button asChild variant="primary">
              <Link href="/signup">{actions("createAccount")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
