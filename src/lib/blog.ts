/**
 * Blog content. Flat data rather than MDX: Phase 1 is a marketing site, and a
 * content pipeline is a decision worth making when the writing cadence is real
 * rather than at scaffold time. Swap for MDX or a CMS when that happens.
 *
 * `body` paragraphs are plain strings; `kind` distinguishes headings and lists
 * so the renderer stays simple and there is no HTML to sanitise.
 */

export type BlogBlock =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
  category: string;
  author: { name: string; role: string };
  featured?: boolean;
  body: BlogBlock[];
};

export const posts: BlogPost[] = [
  {
    slug: "why-we-compile-sketches-instead-of-prompting",
    title: "Why we compile sketches instead of prompting them",
    excerpt:
      "A prompt gives a model freedom. A sketch is a specification. Treating the difference seriously is the entire architecture of SKITE.",
    date: "2026-06-18",
    readingTime: "6 min",
    category: "Engineering",
    author: { name: "Marisol Vega", role: "Co-founder & CTO" },
    featured: true,
    body: [
      {
        kind: "p",
        text: "The obvious way to turn a drawing into a website is to hand the image to a capable multimodal model and ask nicely. We built that in an afternoon. It produced pages that were frequently beautiful and almost never right.",
      },
      {
        kind: "p",
        text: "The failure was consistent and instructive. Ask a model to reproduce a three-column layout with a wide left rail and it will give you a three-column layout — usually a very tasteful one, with the rail on the right, because that composition is more common in its training data. It was not ignoring the sketch. It was treating the sketch as inspiration, which is exactly what a prompt is.",
      },
      { kind: "h2", text: "A drawing is not a suggestion" },
      {
        kind: "p",
        text: "When someone draws a wireframe, every decision in it is deliberate, including the ones they could not articulate. The rail is on the left because they read left to right and the navigation matters more than the content beside it. Reinterpreting that is not helpfulness. It is data loss.",
      },
      {
        kind: "quote",
        text: "The model was not wrong about design. It was wrong about whose design it was building.",
      },
      {
        kind: "p",
        text: "So we stopped asking for a page and started asking for a structure. Before any generation happens, the drawing is compiled into a typed constraint graph: regions, their proportions, their nesting, their reading order, and the relationships between them. It is a small, boring, inspectable JSON document. It is also the entire product.",
      },
      { kind: "h2", text: "What the graph buys you" },
      {
        kind: "list",
        items: [
          "Generation is constrained rather than guided — the model fills a specification instead of inventing one.",
          "Edits are diffs against the graph, so revision five costs what revision one cost and nothing you approved silently drifts.",
          "Fidelity becomes measurable. You can compute intersection-over-union against a human reconstruction, which means you can regression-test taste-adjacent behaviour.",
          "Failures become legible. When output is wrong you can look at the graph and see whether the structure pass misread a stroke or the synthesis pass ignored a constraint.",
        ],
      },
      {
        kind: "p",
        text: "That last point is worth dwelling on. The hardest thing about shipping generative software is that when it fails, you often cannot say why. An explicit intermediate representation turns an unfalsifiable complaint — 'it doesn't feel right' — into a bug with a location.",
      },
      { kind: "h2", text: "The cost" },
      {
        kind: "p",
        text: "This architecture is slower to build and it constrains what we can promise. SKITE will not improve your layout. If you drew something unbalanced, you will get something unbalanced, faithfully. We think that is the correct trade: a tool that silently overrides your intent is not a tool, it is a collaborator you did not ask for.",
      },
    ],
  },
  {
    slug: "reading-a-whiteboard-photographed-badly",
    title: "Reading a whiteboard that was photographed badly",
    excerpt:
      "Glare, keystone distortion, a colleague's arm, and marker that has been half-erased twice. Notes on the ingest pass nobody sees.",
    date: "2026-05-02",
    readingTime: "5 min",
    category: "Research",
    author: { name: "Dae-Ho Lim", role: "Research Engineer" },
    body: [
      {
        kind: "p",
        text: "Every impressive demo of sketch-to-code uses a clean, flat, well-lit drawing. Every real input is a photograph taken at an angle by someone standing up, with ceiling lights reflecting off the board and a hand still holding the marker.",
      },
      {
        kind: "p",
        text: "We spent most of a quarter on the pass that happens before anything interesting happens, because it turns out that the quality ceiling of the whole pipeline is set by ingest.",
      },
      { kind: "h2", text: "Three problems, in order" },
      {
        kind: "list",
        items: [
          "Keystone distortion. Corner detection on the board itself, then a homography to flatten it. Angles up to roughly forty degrees recover cleanly; beyond that the far edge loses too much resolution to be worth pretending.",
          "Specular glare. Ceiling lights produce blown-out regions that read as erasures. We estimate the illumination field and divide it out, which recovers strokes that were there but invisible.",
          "Stroke separation. Whiteboards accumulate history — half-erased diagrams from the previous meeting sit underneath the current one. Stroke age is estimable from edge sharpness and saturation, and old material is down-weighted rather than deleted.",
        ],
      },
      {
        kind: "p",
        text: "The last one produced our favourite failure. An early build confidently reconstructed a beautiful layout that nobody in the room had drawn — it had recovered a ghost diagram from a sprint planning session two weeks earlier and rendered it faithfully.",
      },
      {
        kind: "quote",
        text: "It was, technically, working perfectly. It was reading the wrong meeting.",
      },
      {
        kind: "p",
        text: "The practical upshot for anyone using SKITE: fill the frame with the drawing, and step to one side rather than turning the lights off. Cropping beats resolution, and glare is easier to remove than darkness is to invent.",
      },
    ],
  },
  {
    slug: "the-rebuild-step-was-never-design-work",
    title: "The rebuild step was never design work",
    excerpt:
      "Redrawing your own whiteboard in Figma, then redrawing the Figma file in code, is translation. We have been calling it craft for twenty years.",
    date: "2026-03-27",
    readingTime: "4 min",
    category: "Product",
    author: { name: "Aisha Kone", role: "Co-founder & CEO" },
    body: [
      {
        kind: "p",
        text: "Ask a designer what they did last week and a surprising fraction of the honest answer is: I recreated something that already existed, in a different file format, so that someone else could recreate it again in a third one.",
      },
      {
        kind: "p",
        text: "We have industrialised this. There are job titles for it, tools sold against it, conference talks about doing it more efficiently. But moving a layout from a whiteboard into Figma adds no information. Moving it from Figma into React adds no information. Both steps are lossy transcription performed by expensive people.",
      },
      { kind: "h2", text: "What is actually design" },
      {
        kind: "p",
        text: "The twenty minutes at the whiteboard is design. The argument about whether the testimonial belongs above or below pricing is design. Choosing what to cut is design. None of that is threatened by automation, because none of it is transcription.",
      },
      {
        kind: "list",
        items: [
          "Deciding what the page is for.",
          "Deciding what goes on it and in what order.",
          "Deciding what to leave off.",
          "Deciding when it is finished.",
        ],
      },
      {
        kind: "p",
        text: "Everything on that list survives. What does not survive is the two days in the middle, and we have yet to meet a designer who describes those two days as the part they would miss.",
      },
      { kind: "h2", text: "The uncomfortable version" },
      {
        kind: "p",
        text: "If a meaningful share of a role is transcription, removing transcription changes the role. We would rather say that plainly than pretend otherwise. Our bet is that it changes in the direction of more drawing and more deciding — the parts people took the job for.",
      },
    ],
  },
  {
    slug: "shipping-accessibility-as-a-gate-not-a-score",
    title: "Shipping accessibility as a gate, not a score",
    excerpt:
      "Generated markup should not need an audit. Here is why axe runs before the output reaches you, and what we do when it fails.",
    date: "2026-01-14",
    readingTime: "5 min",
    category: "Engineering",
    author: { name: "Marisol Vega", role: "Co-founder & CTO" },
    body: [
      {
        kind: "p",
        text: "Most generated front-end code is inaccessible in the same handful of ways: divs where buttons belong, images without alternative text, colour contrast chosen for a screenshot rather than a person, and heading levels picked for size instead of structure.",
      },
      {
        kind: "p",
        text: "These are not subtle failures. They are the first four things any audit finds, which means they are also the easiest to make impossible.",
      },
      { kind: "h2", text: "Deterministic checks belong outside the model" },
      {
        kind: "p",
        text: "Whether a contrast ratio clears 4.5:1 is arithmetic. Whether a control is reachable by keyboard is a property of the markup. Neither is a matter of judgement, so neither should be delegated to something probabilistic.",
      },
      {
        kind: "p",
        text: "Every generation is type-checked, linted and run through axe before it is returned. A generation that fails is repaired and re-checked. If repair fails twice, the job errors rather than returning output we know is broken.",
      },
      {
        kind: "quote",
        text: "An accessibility score tells you how much work is left. A gate means there is none.",
      },
      {
        kind: "p",
        text: "This costs us latency and occasionally costs us a generation. It is the least controversial trade we have made.",
      },
    ],
  },
];

export function getPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export function getAdjacentPosts(slug: string) {
  const index = posts.findIndex((post) => post.slug === slug);
  return {
    previous: index > 0 ? posts[index - 1] : undefined,
    next: index >= 0 && index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}
