import { Cta } from "@/components/sections/cta";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/ui/code-block";
import { GlassCard } from "@/components/ui/glass-card";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { createMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata = createMetadata({
  title: "API Reference",
  description:
    "REST endpoints, SDKs and webhooks for the SKITE redraw engine — create redraws, stream progress, refine generations and fetch artefacts.",
  path: "/api",
  keywords: ["SKITE API", "sketch to code API", "design to code REST API"],
});

const METHOD_TONE = {
  GET: "aqua",
  POST: "accent",
  DELETE: "warning",
} as const;

const ENDPOINTS = [
  {
    method: "POST" as const,
    path: "/v1/redraws",
    summary: "Create a redraw from an uploaded sketch or a source URL.",
    params: [
      ["source", "string | file", "A multipart upload, a public URL, or a Figma frame link."],
      ["mode", "\"code\" | \"render\"", "Production code, or a photoreal image. Defaults to code."],
      ["project", "string", "Binds the redraw to a project's design system."],
      ["webhook", "string", "Called on completion. Omit to poll instead."],
    ],
  },
  {
    method: "GET" as const,
    path: "/v1/redraws/{id}",
    summary: "Fetch a redraw, its status, its constraint graph and its artefacts.",
    params: [
      ["id", "string", "The redraw identifier returned at creation."],
      ["include", "string[]", "Optionally expand `graph`, `artifacts` or `events`."],
    ],
  },
  {
    method: "GET" as const,
    path: "/v1/redraws/{id}/events",
    summary: "Server-sent stream of pipeline progress events.",
    params: [["id", "string", "The redraw identifier."]],
  },
  {
    method: "POST" as const,
    path: "/v1/redraws/{id}/refine",
    summary: "Apply a plain-language edit against the existing constraint graph.",
    params: [
      ["instruction", "string", "For example: \"make the hero taller\"."],
      ["scope", "string", "Optional node id to limit the edit to a subtree."],
    ],
  },
  {
    method: "DELETE" as const,
    path: "/v1/redraws/{id}",
    summary: "Permanently delete a redraw and every artefact derived from it.",
    params: [["id", "string", "The redraw identifier."]],
  },
];

export default function ApiPage() {
  return (
    <>
      <PageHero
        eyebrow="API reference"
        crumbs={[{ label: "API Reference", href: "/api" }]}
        title={
          <>
            The same engine, <Accent>behind an endpoint</Accent>.
          </>
        }
        lead="Everything the dashboard can do, the API can do. Typed SDKs for TypeScript and Python, webhook callbacks for long jobs, and a server-sent event stream for live progress."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent" size="sm" className="font-mono">
            Base: https://api.skite.ai
          </Badge>
          <Badge variant="outline" size="sm" className="font-mono">
            v1
          </Badge>
        </div>
      </PageHero>

      <section className="section-y">
        <div className="container-skite flex flex-col gap-16">
          <Reveal>
            <div className="grid gap-4 lg:grid-cols-2">
              <CodeBlock
                filename="typescript"
                language="typescript"
                code={`import Skite from "@skite/sdk";

const skite = new Skite({ apiKey: process.env.SKITE_API_KEY });

const redraw = await skite.redraws.create({
  source: fs.createReadStream("./whiteboard.heic"),
  mode: "code",
  project: "acme-marketing",
});

for await (const event of skite.redraws.stream(redraw.id)) {
  console.log(event.stage, event.progress);
}

const { artifacts } = await skite.redraws.get(redraw.id, {
  include: ["artifacts"],
});`}
              />
              <CodeBlock
                filename="curl"
                code={`curl https://api.skite.ai/v1/redraws \\
  -H "Authorization: Bearer $SKITE_API_KEY" \\
  -F source=@./whiteboard.heic \\
  -F mode=code \\
  -F project=acme-marketing

# => { "id": "gen_8fa21c", "status": "queued", ... }`}
              />
            </div>
          </Reveal>

          <div className="flex flex-col gap-5">
            <SectionHeading
              as="h2"
              eyebrow="Endpoints"
              title="Five endpoints, and that is the whole surface."
              titleClassName="text-title"
            />

            <div className="mt-6 flex flex-col gap-4">
              {ENDPOINTS.map((endpoint, index) => (
                <Reveal key={endpoint.path} delay={index * 0.05}>
                  <GlassCard radius="lg" padding="none" className="overflow-hidden">
                    <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
                      <Badge
                        variant={METHOD_TONE[endpoint.method]}
                        size="sm"
                        className="font-mono font-semibold"
                      >
                        {endpoint.method}
                      </Badge>
                      <code className="font-mono text-[0.875rem] text-foreground">
                        {endpoint.path}
                      </code>
                    </div>

                    <div className="flex flex-col gap-4 px-6 py-5">
                      <p className="text-[0.9375rem] text-muted">{endpoint.summary}</p>

                      <dl className="flex flex-col divide-y divide-border">
                        {endpoint.params.map(([name, type, description]) => (
                          <div
                            key={name}
                            className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr] sm:gap-4"
                          >
                            <dt className="flex flex-col gap-0.5">
                              <code className="font-mono text-[0.8125rem] text-electric-300">
                                {name}
                              </code>
                              <code className="font-mono text-[11px] text-subtle">{type}</code>
                            </dt>
                            <dd className="text-[0.875rem] text-muted">{description}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </GlassCard>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal>
            <div className={cn("grid gap-4 md:grid-cols-3")}>
              {[
                {
                  title: "Rate limits",
                  body: "60 requests per minute on Studio, negotiated on Atelier. Limits are returned on every response as X-RateLimit headers.",
                },
                {
                  title: "Idempotency",
                  body: "Pass an Idempotency-Key header on POST requests. Replays within 24 hours return the original response rather than creating a duplicate.",
                },
                {
                  title: "Errors",
                  body: "Conventional HTTP status codes, with a machine-readable `code` and a human-readable `message` in the body. No stack traces, ever.",
                },
              ].map((item) => (
                <GlassCard key={item.title} radius="lg" padding="md" className="flex flex-col gap-2">
                  <h3 className="font-display text-base font-semibold">{item.title}</h3>
                  <p className="text-[0.875rem] leading-relaxed text-muted">{item.body}</p>
                </GlassCard>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Cta />
    </>
  );
}
