import { Check, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorPanel } from "@/components/ui/error-panel";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Score } from "@/components/ui/score";
import { Skeleton } from "@/components/ui/skeleton";
import { Status, type JobStatus } from "@/components/ui/status";
import { scoreBand } from "@/lib/utils/score";
import { cn } from "@/lib/utils/cn";

type Theme = "light" | "dark";
type Dir = "ltr" | "rtl";

/** Sample copy. The style page is a developer tool, so it is not translated. */
const SAMPLES = {
  ltr: {
    lang: "en",
    heading: "Senior data engineer",
    body: "Fursa collects jobs from several sources and scores each one against you.",
    rows: [
      { title: "Senior data engineer", meta: "Sample Co · Tunis · 2 days ago", score: 82 },
      { title: "Backend developer", meta: "Example Ltd · Remote · 5 days ago", score: 68 },
      { title: "Platform engineer", meta: "Demo SARL · Sfax · 1 week ago", score: 51 },
    ],
    bands: { strong: "Strong", good: "Good", partial: "Partial" },
    statuses: {
      new: "New",
      saved: "Saved",
      applied: "Applied",
      interview: "Interview",
      offer: "Offer",
      rejected: "Rejected",
    },
    buttons: {
      primary: "Create account",
      secondary: "Sign in",
      ghost: "Cancel",
      destructive: "Delete account",
      solid: "Delete",
    },
    form: {
      label: "Email",
      help: "We only use it to sign you in.",
      error: "Enter an email address like name@example.com.",
    },
    skills: { matched: ["Python", "Docker"], missing: ["Kubernetes"] },
    error: { message: "Too many requests. Try again in 12 seconds.", code: "rate_limited" },
    empty: {
      title: "No matches yet.",
      description: "Add your target roles so Fursa can find jobs.",
      action: "Edit profile",
    },
    dialog: {
      open: "Open dialog",
      title: "Delete your account",
      body: "This cannot be undone. Type DELETE to confirm.",
      close: "Close",
    },
    scale: "The quick brown fox",
  },
  rtl: {
    lang: "ar",
    heading: "مهندس بيانات أول",
    body: "فرصة تجمع الوظائف من عدة مصادر وتقيّم كل وظيفة بحسب ملفك.",
    rows: [
      { title: "مهندس بيانات أول", meta: "شركة نموذج · تونس · منذ يومين", score: 82 },
      { title: "مطوّر Backend", meta: "Example Ltd · عن بعد · منذ 5 أيام", score: 68 },
      { title: "مهندس منصات", meta: "Demo SARL · صفاقس · منذ أسبوع", score: 51 },
    ],
    bands: { strong: "قوية", good: "جيدة", partial: "جزئية" },
    statuses: {
      new: "جديدة",
      saved: "محفوظة",
      applied: "تم التقديم",
      interview: "مقابلة",
      offer: "عرض",
      rejected: "مرفوضة",
    },
    buttons: {
      primary: "إنشاء حساب",
      secondary: "تسجيل الدخول",
      ghost: "إلغاء",
      destructive: "حذف الحساب",
      solid: "حذف",
    },
    form: {
      label: "البريد الإلكتروني",
      help: "نستخدمه فقط لتسجيل دخولك.",
      error: "أدخل بريدًا إلكترونيًا مثل name@example.com.",
    },
    skills: { matched: ["Python", "Docker"], missing: ["Kubernetes"] },
    error: { message: "طلبات كثيرة. حاول مجددًا بعد 12 ثانية.", code: "rate_limited" },
    empty: {
      title: "لا توجد مطابقات بعد.",
      description: "أضف الوظائف المستهدفة ليجد لك فرصة وظائف.",
      action: "تعديل الملف",
    },
    dialog: {
      open: "فتح النافذة",
      title: "حذف حسابك",
      body: "لا يمكن التراجع عن هذا. اكتب DELETE للتأكيد.",
      close: "إغلاق",
    },
    scale: "فرصة عمل جديدة",
  },
} as const;

const FONT_SIZES = [12, 13, 14, 16, 20, 24, 32] as const;
const STATUSES: JobStatus[] = ["new", "saved", "applied", "interview", "offer", "rejected"];

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-4">
      <h3 className="mb-3 text-sm text-slate">{title}</h3>
      {children}
    </div>
  );
}

/** Every component, rendered inside a forced theme and direction. */
export function Specimen({ theme, dir }: { theme: Theme; dir: Dir }) {
  const s = SAMPLES[dir];
  const id = `${theme}-${dir}`;

  return (
    <section
      data-theme={theme}
      dir={dir}
      lang={s.lang}
      aria-label={`${theme} ${dir}`}
      className="flex flex-col gap-4 rounded-panel border border-line bg-page p-6 font-sans text-base leading-(--leading) text-ink"
    >
      <h2 className="text-lg">
        <span className="tabular">{theme === "light" ? "Light" : "Dark"}</span>
        {" · "}
        {dir === "ltr" ? "Left to right" : "Right to left"}
      </h2>

      <Block title="Typography">
        <p className="font-heading text-2xl">{s.heading}</p>
        <p className="mt-2 text-slate">{s.body}</p>
        <ul className="mt-3 flex flex-col">
          {FONT_SIZES.map((px) => (
            <li key={px} className="flex items-baseline gap-3 leading-snug">
              <span className="tabular w-10 shrink-0 text-xs text-slate">{px}</span>
              <span style={{ fontSize: px }}>{s.scale}</span>
            </li>
          ))}
        </ul>
        <p className="tabular mt-3">Weights 400 and 500 · 0123456789 · 82 / 100 · 1,250 TND</p>
      </Block>

      <Block title="Colors (swatch = token)">
        <ul className="grid grid-cols-6 gap-2">
          {[
            "bg-page",
            "bg-panel",
            "bg-ink",
            "bg-slate",
            "bg-line",
            "bg-control",
            "bg-accent",
            "bg-accent-hover",
            "bg-accent-press",
            "bg-tint",
            "bg-success",
            "bg-danger",
            "bg-warning",
            "bg-success-bg",
            "bg-danger-bg",
            "bg-warning-bg",
            "bg-status-interview",
            "bg-status-rejected",
          ].map((cls) => (
            <li key={cls} className="min-w-0">
              <div className={cn("h-8 rounded-chip border border-line", cls)} />
              <p className="mt-1 truncate text-xs text-slate">{cls.slice(3)}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">{s.buttons.primary}</Button>
          <Button variant="secondary">{s.buttons.secondary}</Button>
          <Button variant="ghost">{s.buttons.ghost}</Button>
          <Button variant="destructive">{s.buttons.destructive}</Button>
          <Button variant="destructive-solid">{s.buttons.solid}</Button>
        </div>
      </Block>

      <Block title="Form">
        <div className="flex max-w-sm flex-col gap-1">
          <Label htmlFor={`email-${id}`}>{s.form.label}</Label>
          <Input id={`email-${id}`} type="email" dir="ltr" placeholder="name@example.com" />
          <p className="text-sm text-slate">{s.form.help}</p>
        </div>
        <div className="mt-4 flex max-w-sm flex-col gap-1">
          <Label htmlFor={`email-err-${id}`}>{s.form.label}</Label>
          <Input
            id={`email-err-${id}`}
            type="email"
            dir="ltr"
            defaultValue="name@"
            aria-invalid="true"
            aria-describedby={`err-${id}`}
          />
          <p id={`err-${id}`} className="flex items-center gap-1 text-sm text-danger">
            <CircleAlert width={ICON_SM} height={ICON_SM} {...iconProps} />
            {s.form.error}
          </p>
        </div>
      </Block>

      <Block title="Skill chips">
        <div className="flex flex-wrap gap-2">
          {s.skills.matched.map((k) => (
            <Chip key={k} kind="matched">
              {k}
            </Chip>
          ))}
          {s.skills.missing.map((k) => (
            <Chip key={k} kind="missing">
              {k}
            </Chip>
          ))}
        </div>
      </Block>

      <Block title="Status (dot and word)">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {STATUSES.map((status) => (
            <Status key={status} status={status}>
              {s.statuses[status]}
            </Status>
          ))}
        </div>
      </Block>

      <Block title="Score and rows (selected row: tint and a 3 px accent bar on the start edge)">
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-panel">
          {s.rows.map((row, i) => (
            <li
              key={row.title}
              className={cn(
                "flex items-center gap-4 border-s-[3px] px-4 py-3",
                i === 0 ? "border-accent bg-tint" : "border-transparent",
              )}
            >
              <div className="min-w-0 flex-1">
                <p dir="auto" className="truncate font-medium">
                  {row.title}
                </p>
                <p dir="auto" className="truncate text-sm text-slate">
                  {row.meta}
                </p>
              </div>
              <Score value={row.score} label={s.bands[scoreBand(row.score)]} />
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Loading (skeleton rows)">
        <div className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-panel">
          {[0, 1].map((n) => (
            <div
              key={n}
              className="flex items-center gap-4 border-s-[3px] border-transparent px-4 py-3"
            >
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </Block>

      <Block title="Error and empty state">
        <ErrorPanel message={s.error.message} code={s.error.code} />
        <div className="mt-4 rounded-panel border border-line bg-panel px-4">
          <EmptyState
            title={s.empty.title}
            description={s.empty.description}
            action={<Button variant="primary">{s.empty.action}</Button>}
          />
        </div>
      </Block>

      <Block title="Dialog (soft shadow) and focus ring (press Tab)">
        <div className="flex flex-wrap items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>{s.dialog.open}</Button>
            </DialogTrigger>
            <DialogContent closeLabel={s.dialog.close} data-theme={theme} dir={dir} lang={s.lang}>
              <DialogTitle>{s.dialog.title}</DialogTitle>
              <DialogDescription>{s.dialog.body}</DialogDescription>
              <div className="mt-6 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button>{s.buttons.ghost}</Button>
                </DialogClose>
                <Button variant="destructive-solid">{s.buttons.solid}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <a
            href="#main"
            className="inline-link text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {s.buttons.secondary}
          </a>
          <span className="tabular inline-flex items-center gap-1 text-sm text-slate">
            <Check width={ICON_SM} height={ICON_SM} {...iconProps} />
            ok
          </span>
        </div>
      </Block>
    </section>
  );
}
