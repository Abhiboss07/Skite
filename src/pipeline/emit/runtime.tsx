/**
 * Live preview renderer.
 *
 * Renders a component tree directly with React, using the *same* `emit()`
 * mapping the TSX writer uses. That sharing is the point: if the preview had its
 * own renderer, the "Generated Code" tab and the "Live Preview" tab could
 * disagree, and a debug UI whose tabs contradict each other is worse than none.
 *
 * There is no `eval` and no iframe-with-a-bundler here. The generated artefact
 * is data — a tree — right up until the emitter turns it into text, so the
 * preview can render the data straight. Compiling generated source at runtime
 * would mean executing model-influenced code in the app's own origin, and the
 * only thing it would buy is a second implementation of this file.
 */

import { Fragment, type CSSProperties, type ReactNode } from "react";

import type { ComponentNode, ComponentTree } from "../ir/schema.ts";
import { emit, IMAGE_DECORATION_CLASSES, IMAGE_DECORATION_STYLE } from "./classes.ts";
import type { DesignTokens } from "../design/tokens.ts";

/** Tags the emitter can produce. Anything unexpected renders as a div. */
const ALLOWED = new Set([
  "main", "header", "footer", "section", "article", "div", "h2", "p", "button", "span",
]);

function toStyle(style: Record<string, string | number> | undefined): CSSProperties | undefined {
  return style as CSSProperties | undefined;
}

function renderNode(
  node: ComponentNode,
  totalColumns: number,
  key: string,
  tokens?: DesignTokens,
): ReactNode {
  const spec = emit(node, totalColumns, tokens);
  const Tag = (ALLOWED.has(spec.tag) ? spec.tag : "div") as "div";

  const children: ReactNode[] = [];

  if (spec.decoration === "image") {
    children.push(
      <div key="decoration" className={IMAGE_DECORATION_CLASSES.wrap}>
        <span className={IMAGE_DECORATION_CLASSES.label} style={toStyle(IMAGE_DECORATION_STYLE)}>
          Image
        </span>
      </div>,
    );
  } else if (spec.text) {
    children.push(<Fragment key="text">{spec.text}</Fragment>);
  }

  node.children.forEach((child, i) => {
    children.push(renderNode(child, totalColumns, `${key}.${i}`, tokens));
  });

  return (
    <Tag
      key={key}
      className={spec.className}
      style={toStyle(spec.style)}
      // Mirrors the attribute the TSX emitter writes, so hovering a node in the
      // IR tab can highlight the same element here.
      data-ir-node={node.irNode ?? undefined}
    >
      {children.length ? children : null}
    </Tag>
  );
}

export function PreviewTree({
  tree,
  columns,
  tokens,
}: {
  tree: ComponentTree;
  columns: number;
  /** Omitted deliberately by the before/after comparison, to show the default. */
  tokens?: DesignTokens;
}) {
  return <>{renderNode(tree.root, columns, "root", tokens)}</>;
}
