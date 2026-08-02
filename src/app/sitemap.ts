import type { MetadataRoute } from "next";

import { posts } from "@/lib/blog";
import { allRoutes, siteConfig } from "@/lib/site";

/**
 * Generated from the same route table that powers the command palette, so a new
 * page cannot be added to navigation and forgotten in the sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const priorityFor = (path: string) => {
    if (path === "/") return 1;
    if (["/features", "/pricing", "/how-it-works", "/showcase"].includes(path)) return 0.9;
    if (["/privacy", "/terms"].includes(path)) return 0.3;
    return 0.7;
  };

  const pages: MetadataRoute.Sitemap = allRoutes.map((route) => ({
    url: `${siteConfig.url}${route.href}`,
    lastModified: now,
    changeFrequency: route.href === "/" ? "weekly" : "monthly",
    priority: priorityFor(route.href),
  }));

  const articles: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(`${post.date}T00:00:00Z`),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...pages, ...articles];
}
