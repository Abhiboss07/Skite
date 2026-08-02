"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RunReport } from "@/pipeline/run";

/**
 * The per-generation report.
 *
 * Every number here is measured during the run, not estimated afterwards, and
 * the confidences are shown even when they are poor — especially then. A
 * pipeline that reports 45% on a bad photograph is telling you something useful;
 * one that always reports 95% is telling you nothing.
 *
 * These are *confidences*, deliberately labelled as such. They are the
 * pipeline's own estimate of how well it did, computed without ever seeing a
 * correct answer. Measured fidelity is a different number that requires ground
 * truth, and it comes from the benchmark harness, not from here — conflating
 * the two would let a self-assessment pass as a result.
 */

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <div className="glass rounded-xl p-4">
      <dt className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">{label}</dt>
      <dd
        className={cn(
          "mt-1.5 font-mono text-lg tabular-nums",
          tone === "good" && "text-emerald-400",
          tone === "warn" && "text-amber-400",
          tone === "bad" && "text-rose-400",
        )}
      >
        {value}
      </dd>
      {hint && <p className="mt-1 text-xs text-foreground-subtle">{hint}</p>}
    </div>
  );
}

/** Bands chosen so the colour means something: green is trustworthy, amber is "check it". */
function confidenceTone(value: number): "good" | "warn" | "bad" {
  if (value >= 0.75) return "good";
  if (value >= 0.5) return "warn";
  return "bad";
}

const pct = (v: number) => `${(v * 100).toFixed(0)}%`;

export function ReportPanel({
  report,
  warnings,
}: {
  report: RunReport;
  warnings: string[];
}) {
  const { confidence } = report;

  return (
    <section aria-labelledby="report-heading" className="flex flex-col gap-5">
      <h2 id="report-heading" className="text-sm font-semibold tracking-tight">
        Generation report
      </h2>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <Metric
          label="Total time"
          value={`${report.totalMs} ms`}
          hint={report.passes.map((p) => `${p.pass} ${p.ms}ms`).join(" · ")}
        />
        <Metric
          label="Layout confidence"
          value={pct(confidence.layout)}
          tone={confidenceTone(confidence.layout)}
          hint="How well the grid fitted, not measured fidelity"
        />
        <Metric
          label="Role confidence"
          value={pct(confidence.component)}
          tone={confidenceTone(confidence.component)}
          hint="Mean role confidence"
        />
        <Metric
          label="OCR"
          value={report.textExtracted ? pct(confidence.ocr) : "not run"}
          tone={report.textExtracted ? confidenceTone(confidence.ocr) : "neutral"}
          hint={report.textExtracted ? "Mean transcription confidence" : "Offline classifier cannot read text"}
        />
        <Metric
          label="Overall confidence"
          value={pct(confidence.overall)}
          tone={confidenceTone(confidence.overall)}
          hint="0.5 layout + 0.35 role + 0.15 OCR"
        />
        <Metric label="Regions" value={String(report.nodeCount)} hint="Detected and classified" />
        <Metric
          label="Grid"
          value={`${report.grid.columns} × ${report.grid.gutter}`}
          hint={`margin ${report.grid.margin} · base unit ${report.grid.baseUnit}`}
        />
        <Metric
          label="Build"
          value={report.buildStatus}
          tone={report.buildStatus === "passed" ? "good" : "bad"}
          hint={`${report.validation.issues.length} validation issue(s)`}
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
            Components emitted
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {Object.entries(report.components).map(([name, count]) => (
              <li
                key={name}
                className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-xs"
              >
                {name}
                <span className="ml-1.5 text-foreground-subtle">×{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-xl p-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-foreground-subtle">
            Models used
          </h3>
          {report.models.length ? (
            <ul className="mt-3 space-y-1 font-mono text-xs">
              {report.models.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-foreground-subtle">
              None. This run was entirely deterministic — classical computer vision plus rule-based
              synthesis, no network call.
            </p>
          )}
        </div>
      </div>

      {report.validation.issues.length > 0 && (
        <ul className="space-y-2">
          {report.validation.issues.map((issue, i) => (
            <li
              key={i}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-3 text-xs",
                issue.level === "error"
                  ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-300",
              )}
            >
              {issue.level === "error" ? (
                <XCircle className="mt-px size-3.5 shrink-0" aria-hidden />
              ) : (
                <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
              )}
              <span>
                <span className="font-mono">{issue.rule}</span>
                {issue.line !== undefined && <span className="text-foreground-subtle"> :{issue.line}</span>}
                {" — "}
                {issue.message}
              </span>
            </li>
          ))}
        </ul>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-2">
          {warnings.map((warning, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-300"
            >
              <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      {warnings.length === 0 && report.validation.issues.length === 0 && (
        <p className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="size-3.5" aria-hidden />
          No warnings. Generated code parses and passes the responsive lint.
        </p>
      )}
    </section>
  );
}
