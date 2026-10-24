import { Check, X } from "lucide-react";
import { notFound } from "next/navigation";
import { ICON_SM, iconProps } from "@/components/ui/icon";
import { contrastRatio } from "@/lib/design/contrast";
import { CONTRAST_PAIRS, parseTokens, readTokensCss } from "@/lib/design/tokens";
import { Specimen } from "./specimen";

export const metadata = { title: "Style page" };

/**
 * Every token and component, in light and dark, left to right and right to left.
 * Not built in production: this file is page.dev.tsx, a page extension that
 * next.config.ts only enables outside production. Developer tool, English only.
 */
export default function StylePage() {
  if (process.env.NODE_ENV === "production") notFound();

  const { light, dark } = parseTokens(readTokensCss());
  const names = Object.keys(light).filter((name) => !name.startsWith("shadow"));

  const results = CONTRAST_PAIRS.map((pair) => {
    const l = contrastRatio(light[pair.fg] as string, light[pair.bg] as string);
    const d = contrastRatio(dark[pair.fg] as string, dark[pair.bg] as string);
    return { pair, l, d, pass: l >= pair.min && d >= pair.min };
  });
  const failures = results.filter((r) => !r.pass).length;

  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl">Style page</h1>
      <p className="mt-2 max-w-prose text-slate">
        Every token and component from <code>fursa design.md</code>, in light and dark, left to
        right and right to left. Developer tool: not part of the production build.
      </p>

      <section className="mt-8">
        <h2 className="text-xl">Tokens</h2>
        <div className="mt-4 overflow-x-auto rounded-panel border border-line bg-panel">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-line text-slate">
                <th className="px-4 py-2 text-start font-medium">Token</th>
                <th className="px-4 py-2 text-start font-medium">Light</th>
                <th className="px-4 py-2 text-start font-medium">Dark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {names.map((name) => (
                <tr key={name}>
                  <td className="tabular px-4 py-2">--{name}</td>
                  {[light, dark].map((map, i) => (
                    <td key={i} className="px-4 py-2">
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="inline-block size-4 rounded-chip border border-line"
                          style={{ backgroundColor: map[name] }}
                        />
                        <span className="tabular text-slate">{map[name]}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Contrast</h2>
        <p className="mt-2 text-slate">
          The same pairs the build test checks. Text needs 4.5:1, parts of the interface 3:1.{" "}
          {failures === 0 ? "All pairs pass." : `${failures} pair(s) fail.`}
        </p>
        <div className="mt-4 overflow-x-auto rounded-panel border border-line bg-panel">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-slate">
                <th className="px-4 py-2 text-start font-medium">Pair</th>
                <th className="px-4 py-2 text-start font-medium">Use</th>
                <th className="px-4 py-2 text-start font-medium">Min</th>
                <th className="px-4 py-2 text-start font-medium">Light</th>
                <th className="px-4 py-2 text-start font-medium">Dark</th>
                <th className="px-4 py-2 text-start font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {results.map(({ pair, l, d, pass }) => (
                <tr key={`${pair.fg}-${pair.bg}-${pair.use}`}>
                  <td className="tabular px-4 py-2">
                    {pair.fg} on {pair.bg}
                  </td>
                  <td className="px-4 py-2 text-slate">{pair.use}</td>
                  <td className="tabular px-4 py-2">{pair.min}</td>
                  <td className="tabular px-4 py-2">{l.toFixed(1)}</td>
                  <td className="tabular px-4 py-2">{d.toFixed(1)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        pass
                          ? "inline-flex items-center gap-1 text-success"
                          : "inline-flex items-center gap-1 text-danger"
                      }
                    >
                      {pass ? (
                        <Check width={ICON_SM} height={ICON_SM} {...iconProps} />
                      ) : (
                        <X width={ICON_SM} height={ICON_SM} {...iconProps} />
                      )}
                      {pass ? "Pass" : "Fail"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Components</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <Specimen theme="light" dir="ltr" />
          <Specimen theme="light" dir="rtl" />
          <Specimen theme="dark" dir="ltr" />
          <Specimen theme="dark" dir="rtl" />
        </div>
      </section>
    </main>
  );
}
