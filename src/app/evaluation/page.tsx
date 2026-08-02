import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Evaluation",
  description:
    "Benchmark results for the SKITE pipeline: layout fidelity, detection precision and recall, build success and generation time, per corpus and per category.",
  path: "/evaluation",
});

// Results are written by the harness at run time, so this page must read them
// on request rather than at build time.
export const dynamic = "force-dynamic";

type Summary = {
  samples: number;
  layoutFidelity: number;
  geometry: number;
  readingOrder: number;
  coverage: number;
  componentAccuracy: number;
  precision: number;
  recall: number;
  f1: number;
  falsePositives: number;
  falseNegatives: number;
  ocrAccuracy: number | null;
  buildSuccessRate: number;
  responsivePassRate: number;
  medianMs: number;
  p95Ms: number;
};

type Sample = {
  id: string;
  style: string;
  fidelity: number;
  geometry: number;
  coverage: number;
  componentAccuracy: number;
  f1: number;
  falsePositives: number;
  falseNegatives: number;
  ms: number;
  nodeCount: number;
  referenceCount: number;
};

type Report = {
  generatedAt: string;
  set: string;
  classifier: string;
  overall: Summary;
  byStyle: Record<string, Summary>;
  samples: Sample[];
};

async function loadReports(): Promise<Report[]> {
  const dir = join(process.cwd(), "test-dataset", "results");
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    const reports = await Promise.all(
      files.map(async (f) => JSON.parse(await readFile(join(dir, f), "utf8")) as Report),
    );
    return reports.sort((a, b) => a.set.localeCompare(b.set));
  } catch {
    return [];
  }
}

const pct = (v: number | null) => (v === null ? "n/a" : `${(v * 100).toFixed(1)}%`);

/** Green is trustworthy, amber is worth a look, rose is the thing to fix next. */
function tone(value: number, good: number, fair: number) {
  if (value >= good) return "text-emerald-400";
  if (value >= fair) return "text-amber-400";
  return "text-rose-400";
}

const ROWS: {
  label: string;
  get: (s: Summary) => string;
  toneOf?: (s: Summary) => string;
  indent?: boolean;
}[] = [
  { label: "Layout fidelity", get: (s) => pct(s.layoutFidelity), toneOf: (s) => tone(s.layoutFidelity, 0.9, 0.8) },
  { label: "geometry (IoU)", get: (s) => pct(s.geometry), indent: true },
  { label: "reading order", get: (s) => pct(s.readingOrder), indent: true },
  { label: "coverage", get: (s) => pct(s.coverage), indent: true },
  { label: "Component accuracy", get: (s) => pct(s.componentAccuracy), toneOf: (s) => tone(s.componentAccuracy, 0.9, 0.8) },
  { label: "Precision", get: (s) => pct(s.precision), toneOf: (s) => tone(s.precision, 0.9, 0.8) },
  { label: "Recall", get: (s) => pct(s.recall), toneOf: (s) => tone(s.recall, 0.9, 0.8) },
  { label: "F1", get: (s) => pct(s.f1), toneOf: (s) => tone(s.f1, 0.9, 0.8) },
  { label: "False positives", get: (s) => String(s.falsePositives) },
  { label: "False negatives", get: (s) => String(s.falseNegatives) },
  { label: "OCR accuracy", get: (s) => pct(s.ocrAccuracy) },
  { label: "Build success", get: (s) => pct(s.buildSuccessRate), toneOf: (s) => tone(s.buildSuccessRate, 1, 0.95) },
  { label: "Responsive lint", get: (s) => pct(s.responsivePassRate), toneOf: (s) => tone(s.responsivePassRate, 1, 0.95) },
  { label: "Median time", get: (s) => `${s.medianMs} ms` },
  { label: "p95 time", get: (s) => `${s.p95Ms} ms` },
];

export default async function EvaluationPage() {
  const reports = await loadReports();

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-24">
      <header className="mb-10 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Phase 2B · measurement</p>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight md:text-5xl">Evaluation</h1>
        <p className="mt-4 text-pretty text-foreground-subtle">
          Every number here comes from <code className="font-mono text-sm">npm run evaluate</code>,
          scored against ground truth the pipeline never sees. Nothing on this page is estimated.
        </p>
      </header>

      {reports.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-sm text-foreground-subtle">
          <p>No results yet. Generate the corpus and run the harness:</p>
          <pre className="mt-4 rounded-lg bg-black/30 p-4 font-mono text-xs">
            npm run dataset{"\n"}npm run evaluate
          </pre>
        </div>
      ) : (
        <div className="flex flex-col gap-14">
          {reports.map((report) => {
            const styles = Object.keys(report.byStyle);
            const worst = [...report.samples].sort((a, b) => a.fidelity - b.fidelity).slice(0, 8);

            return (
              <section key={`${report.set}-${report.classifier}`} className="flex flex-col gap-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    {report.set} corpus
                  </h2>
                  <p className="font-mono text-xs text-foreground-subtle">
                    {report.overall.samples} samples · {report.classifier} classifier ·{" "}
                    {new Date(report.generatedAt).toLocaleString("en-IN")}
                  </p>
                </div>

                {report.set === "synthetic" && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300">
                    Synthetic samples: ground truth is exact because the generator placed every
                    element, so these numbers are an <strong>upper bound</strong>. They measure
                    whether a change made things worse, not whether the system works on real
                    drawings.
                  </p>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-sm">
                    <caption className="sr-only">Metrics for the {report.set} corpus</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-foreground-subtle">
                        <th scope="col" className="pb-3 pr-4 font-medium">Metric</th>
                        {styles.map((s) => (
                          <th key={s} scope="col" className="pb-3 pr-4 text-right font-medium">{s}</th>
                        ))}
                        <th scope="col" className="pb-3 text-right font-medium">overall</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {ROWS.map((row) => (
                        <tr key={row.label} className="border-b border-border/40">
                          <th
                            scope="row"
                            className={cn(
                              "py-2 pr-4 text-left font-sans font-normal",
                              row.indent ? "pl-4 text-foreground-subtle" : "",
                            )}
                          >
                            {row.indent ? `· ${row.label}` : row.label}
                          </th>
                          {styles.map((s) => (
                            <td key={s} className="py-2 pr-4 text-right tabular-nums">
                              {row.get(report.byStyle[s])}
                            </td>
                          ))}
                          <td
                            className={cn(
                              "py-2 text-right font-semibold tabular-nums",
                              row.toneOf?.(report.overall),
                            )}
                          >
                            {row.get(report.overall)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* The failure gallery. An aggregate says how well it does; this
                    says where to look next, which is the more useful question. */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Weakest samples</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-xs">
                      <caption className="sr-only">The eight lowest-fidelity samples</caption>
                      <thead>
                        <tr className="border-b border-border text-left uppercase tracking-wider text-foreground-subtle">
                          <th scope="col" className="pb-2 pr-4 font-medium">Sample</th>
                          <th scope="col" className="pb-2 pr-4 text-right font-medium">Fidelity</th>
                          <th scope="col" className="pb-2 pr-4 text-right font-medium">Geometry</th>
                          <th scope="col" className="pb-2 pr-4 text-right font-medium">Coverage</th>
                          <th scope="col" className="pb-2 pr-4 text-right font-medium">Missed</th>
                          <th scope="col" className="pb-2 pr-4 text-right font-medium">Spurious</th>
                          <th scope="col" className="pb-2 text-right font-medium">Regions</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {worst.map((s) => (
                          <tr key={s.id} className="border-b border-border/40">
                            <th scope="row" className="py-2 pr-4 text-left font-normal">{s.id}</th>
                            <td className={cn("py-2 pr-4 text-right tabular-nums", tone(s.fidelity, 0.9, 0.8))}>
                              {pct(s.fidelity)}
                            </td>
                            <td className="py-2 pr-4 text-right tabular-nums">{pct(s.geometry)}</td>
                            <td className="py-2 pr-4 text-right tabular-nums">{pct(s.coverage)}</td>
                            <td className="py-2 pr-4 text-right tabular-nums text-rose-400">{s.falseNegatives}</td>
                            <td className="py-2 pr-4 text-right tabular-nums text-amber-400">{s.falsePositives}</td>
                            <td className="py-2 text-right tabular-nums text-foreground-subtle">
                              {s.nodeCount}/{s.referenceCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
