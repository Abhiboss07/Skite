/**
 * Pass 8 — code validation.
 *
 * Generated code that does not compile is worse than no code: it costs the user
 * a debugging session to discover that the generator was wrong. So the pipeline
 * checks its own output before handing it over, and reports the result rather
 * than assuming success.
 *
 * Two levels, deliberately separated because they answer different questions:
 *
 *   • `syntax`     — does this parse? Runs in-process in ~1ms via the TypeScript
 *                    transpiler, so every generation can afford it.
 *   • `responsive` — is the output actually fluid, or did we bake the sketch's
 *                    pixel dimensions into the page? This is a static lint, not
 *                    a rendered test; it catches the failure mode that matters
 *                    (fixed widths) without needing a browser.
 *
 * A rendered check at real viewport widths is a different, stronger test and it
 * belongs to the preview surface, which has a browser. Naming this one a lint
 * keeps the distinction honest in the report.
 */

import ts from "typescript";

export type ValidationIssue = {
  level: "error" | "warning";
  rule: string;
  message: string;
  line?: number;
};

export type Validation = {
  /** Parses as TSX. */
  syntaxValid: boolean;
  /** Parses and trips no responsive lint errors. */
  ok: boolean;
  issues: ValidationIssue[];
  ms: number;
};

/**
 * A width frozen in pixels. `w-[420px]` reproduces the sketch at exactly one
 * viewport and breaks at every other, which is the single most likely way for a
 * layout-preserving generator to produce something unusable.
 *
 * Heights are excluded: a `min-h-[…]` preserves vertical proportion while still
 * letting content grow, which is intended. So is `max-w-[…]` — a maximum caps
 * the content column on a large display and still shrinks on a small one, which
 * is the opposite of the failure being looked for.
 */
const FIXED_WIDTH = /(?<![\w-])(?:w|min-w|basis)-\[(\d+)px\]/g;
/** Horizontal padding or margin in raw pixels — same problem, smaller blast radius. */
const FIXED_INSET = /\b(?:p|m)[xlr]?-\[(\d+)px\]/g;

export function validateCode(code: string, filename = "Generated.tsx"): Validation {
  const started = Date.now();
  const issues: ValidationIssue[] = [];

  // ── syntax ───────────────────────────────────────────────────────
  // `transpileModule` reports syntactic diagnostics without needing a Program,
  // a filesystem, or the rest of the project's types — the right tool when the
  // question is only "did we emit something parseable".
  const transpiled = ts.transpileModule(code, {
    fileName: filename,
    reportDiagnostics: true,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  });

  const source = ts.createSourceFile(filename, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);

  for (const d of transpiled.diagnostics ?? []) {
    const line =
      d.start !== undefined ? source.getLineAndCharacterOfPosition(d.start).line + 1 : undefined;
    issues.push({
      level: "error",
      rule: "syntax",
      message: ts.flattenDiagnosticMessageText(d.messageText, " "),
      line,
    });
  }

  const syntaxValid = issues.length === 0;

  // ── responsive lint ──────────────────────────────────────────────
  const lineAt = (index: number) => source.getLineAndCharacterOfPosition(index).line + 1;

  for (const match of code.matchAll(FIXED_WIDTH)) {
    issues.push({
      level: "error",
      rule: "fixed-width",
      message: `\`${match[0]}\` pins a width in pixels; the layout will not adapt below that size.`,
      line: lineAt(match.index),
    });
  }

  for (const match of code.matchAll(FIXED_INSET)) {
    // Small insets are cosmetic and survive any viewport; large ones are the
    // sketch's own margins leaking into the output.
    if (Number(match[1]) < 48) continue;
    issues.push({
      level: "warning",
      rule: "fixed-inset",
      message: `\`${match[0]}\` is a large pixel inset and will crowd small viewports.`,
      line: lineAt(match.index),
    });
  }

  if (!/\b(?:sm|md|lg):/.test(code) && /grid-cols-[2-9]/.test(code)) {
    issues.push({
      level: "error",
      rule: "unresponsive-grid",
      message:
        "A multi-column grid is declared with no breakpoint variant, so it stays multi-column on phones.",
    });
  }

  return {
    syntaxValid,
    ok: syntaxValid && !issues.some((i) => i.level === "error"),
    issues,
    ms: Date.now() - started,
  };
}
