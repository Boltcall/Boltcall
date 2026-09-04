import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from "fs";
import { execFileSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://boltcall.org";
const TODAY = new Date().toISOString().split("T")[0];

// ─── ADD NEW ROUTES HERE when you add them to AppRoutes.tsx ───────────────────
// Excluded: /dashboard/*, /admin*, /auth/*, /setup*, /payment/*,
// *-demo pages, /login, /signup, and redirect-only routes (Navigate components)
const ROUTES = [
  // Core
  { path: "/",                                                    priority: "1.0", changefreq: "weekly"  },
  { path: "/pricing",                                             priority: "0.9", changefreq: "monthly" },
  { path: "/about",                                               priority: "0.8", changefreq: "monthly" },
  { path: "/contact",                                             priority: "0.7", changefreq: "monthly" },
  { path: "/credits",                                             priority: "0.7", changefreq: "monthly" },
  { path: "/help-center",                                         priority: "0.7", changefreq: "monthly" },
  { path: "/partners",                                            priority: "0.7", changefreq: "monthly" },
  { path: "/book-a-call",                                         priority: "0.7", changefreq: "monthly" },
  { path: "/documentation",                                       priority: "0.8", changefreq: "monthly" },
  { path: "/api-documentation",                                   priority: "0.8", changefreq: "monthly" },
  { path: "/integrations",                                        priority: "0.8", changefreq: "monthly" },
  { path: "/integrations/zapier",                                 priority: "0.8", changefreq: "monthly" },
  { path: "/integrations/make",                                   priority: "0.8", changefreq: "monthly" },
  { path: "/integrations/hubspot",                                priority: "0.8", changefreq: "monthly" },
  { path: "/integrations/gohighlevel",                            priority: "0.8", changefreq: "monthly" },
  { path: "/integrations/wix",                                    priority: "0.8", changefreq: "monthly" },
  { path: "/integrations/squarespace",                            priority: "0.8", changefreq: "monthly" },
  { path: "/ai-course",                                           priority: "0.8", changefreq: "monthly" },
  { path: "/privacy-policy",                                      priority: "0.5", changefreq: "yearly"  },
  { path: "/terms-of-service",                                    priority: "0.5", changefreq: "yearly"  },

  // Features
  { path: "/features/ai-receptionist",                           priority: "0.9", changefreq: "monthly" },
  { path: "/features/instant-form-reply",                        priority: "0.9", changefreq: "monthly" },
  { path: "/features/sms-booking-assistant",                     priority: "0.9", changefreq: "monthly" },
  { path: "/features/automated-reminders",                       priority: "0.9", changefreq: "monthly" },
  { path: "/features/ai-follow-up-system",                       priority: "0.9", changefreq: "monthly" },
  { path: "/features/website-widget",                            priority: "0.9", changefreq: "monthly" },
  { path: "/features/lead-reactivation",                         priority: "0.9", changefreq: "monthly" },
  { path: "/features/smart-website",                             priority: "0.9", changefreq: "monthly" },

  // Speed to Lead Topic Cluster
  { path: "/speed-to-lead",            priority: "0.9", changefreq: "monthly" },
  { path: "/speed-to-lead/statistics", priority: "0.8", changefreq: "monthly" },

  // Speed Test Funnel — /speed-test/offer is a funnel step, noindex'd at the
  // page level. Don't list it in the sitemap.
  { path: "/speed-test",                                         priority: "0.8", changefreq: "weekly"  },

  { path: "/response-time-test", priority: "0.8", changefreq: "weekly" },

  // Lead Magnets & Audits
  { path: "/lead-magnet",                                        priority: "0.8", changefreq: "weekly"  },
  { path: "/lead-magnet/claude-code-overnight-kit",              priority: "0.7", changefreq: "monthly" },
  { path: "/lead-magnet/ai-receptionist-buyers-guide",           priority: "0.7", changefreq: "monthly" },
  { path: "/lead-magnet/vanishing-client-report",                    priority: "0.7", changefreq: "monthly" },
  { path: "/lead-magnet/intake-agent-playbook",                   priority: "0.7", changefreq: "monthly" },
  { path: "/after-hours-lead-rescue",                            priority: "0.8", changefreq: "monthly" },
  { path: "/automatic-reviews-agent",                            priority: "0.8", changefreq: "monthly" },
  { path: "/reminders-agent",                                    priority: "0.8", changefreq: "monthly" },
  { path: "/free-website",                                       priority: "0.8", changefreq: "monthly" },
  { path: "/giveaway",                                           priority: "0.6", changefreq: "monthly" },
  { path: "/ai-revenue-audit",                                   priority: "0.8", changefreq: "weekly"  },
  { path: "/lead-response-scorecard",                            priority: "0.8", changefreq: "weekly"  },
  { path: "/seo-audit",                                          priority: "0.8", changefreq: "weekly"  },
  { path: "/website-audit",                                          priority: "0.7", changefreq: "monthly" },
  { path: "/business-audit",                                     priority: "0.8", changefreq: "weekly"  },
  { path: "/ai-audit",                                           priority: "0.8", changefreq: "weekly"  },
  { path: "/seo-aeo-audit",                                      priority: "0.8", changefreq: "monthly" },
  { path: "/conversion-rate-optimizer",                          priority: "0.8", changefreq: "monthly" },
  { path: "/ai-visibility-check",                                priority: "0.8", changefreq: "monthly" },
  { path: "/ai-readiness-scorecard",                             priority: "0.8", changefreq: "monthly" },
  { path: "/ai-receptionist-roi",                                priority: "0.8", changefreq: "monthly" },
  { path: "/industries/lawyer-answering-service",                priority: "0.9", changefreq: "monthly" },
  // /voice-agent-setup is a private multi-step wizard creating billable
  // Retell + Twilio resources — noindex'd at the page level, not for SEO.
  { path: "/funnel-optimizer",                                   priority: "0.7", changefreq: "monthly" },
  { path: "/rank-on-google-offer",                               priority: "0.7", changefreq: "monthly" },
  // Industry Tools
  { path: "/tools/5-minute-response-playbook",                   priority: "0.8", changefreq: "monthly" },

  // Blog Index & AI Guide
  { path: "/blog",                                               priority: "0.9", changefreq: "weekly"  },
  { path: "/ai-guide-for-businesses",                            priority: "0.8", changefreq: "monthly" },
  { path: "/ai-guide-for-businesses/level-1-understanding-ai",  priority: "0.8", changefreq: "monthly" },
  { path: "/ai-guide-for-businesses/level-2-choosing-ai-tools", priority: "0.8", changefreq: "monthly" },
  { path: "/ai-guide-for-businesses/level-3-getting-started",   priority: "0.8", changefreq: "monthly" },

  // Blog Posts
  // Pruned 2026-08-29 (audit round 2): removed the {industry}-lead-response-time
  // cluster — GSC showed the whole cluster as "Discovered - currently not
  // indexed" / "URL unknown to Google" for 90+ days. Google was triaging them
  // as low-value dupes and refusing to crawl. Pages still exist for direct
  // traffic; just stopped asking Google to prioritize crawling them.
  // Also removed non-legal industry blog stubs post-Phase-3/4 pivot.
  { path: "/blog/missed-call-text-back-service", priority: "0.8", changefreq: "weekly" },
  { path: "/blog/missed-call-recovery-service", priority: "0.8", changefreq: "weekly" },
  { path: "/blog/the-new-reality-for-local-businesses",              priority: "0.8", changefreq: "weekly" },
  { path: "/blog/why-speed-matters",                                 priority: "0.8", changefreq: "weekly" },
  { path: "/blog/complete-guide-to-seo",                             priority: "0.8", changefreq: "weekly" },
  { path: "/blog/best-ai-receptionist-tools",                        priority: "0.8", changefreq: "weekly" },
  { path: "/blog/how-ai-receptionist-works",                         priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-answering-service-small-business",               priority: "0.8", changefreq: "weekly" },
  { path: "/blog/is-ai-receptionist-worth-it",                       priority: "0.8", changefreq: "weekly" },
  { path: "/blog/how-to-make-ai-receptionist",                       priority: "0.8", changefreq: "weekly" },
  { path: "/blog/setup-instant-lead-reply",                          priority: "0.8", changefreq: "weekly" },
  { path: "/blog/how-to-schedule-text",                              priority: "0.8", changefreq: "weekly" },
  { path: "/blog/automatic-google-reviews",                          priority: "0.8", changefreq: "weekly" },
  { path: "/blog/understanding-live-answering-service-costs",        priority: "0.8", changefreq: "weekly" },
  { path: "/blog/top-10-ai-receptionist-agencies",                   priority: "0.8", changefreq: "weekly" },
  { path: "/blog/create-gemini-gem-business-assistant",              priority: "0.8", changefreq: "weekly" },
  { path: "/blog/5-signs-you-need-ai-receptionist",                  priority: "0.8", changefreq: "weekly" },
  { path: "/blog/speed-to-lead-local-business",                      priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-receptionist-cost-pricing",                      priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-vs-human-receptionist",                          priority: "0.8", changefreq: "weekly" },
  { path: "/blog/best-ai-receptionist-small-business",               priority: "0.8", changefreq: "weekly" },
  { path: "/blog/best-after-hours-answering-service",                priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-chatbot-vs-live-chat-phone-comparison",          priority: "0.8", changefreq: "weekly" },
  { path: "/blog/missed-calls-statistics-local-business-2026",       priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-agent-for-small-business-24-7-call-answering",   priority: "0.8", changefreq: "weekly" },
  { path: "/blog/never-miss-a-call-after-business-hours",            priority: "0.8", changefreq: "weekly" },


  // Blog FAQ / Industry AEO How-To

  // Comparisons Hub
  { path: "/comparisons",                                        priority: "0.8", changefreq: "monthly" },
  { path: "/comparisons/receptionist-vs-boltcall",              priority: "0.8", changefreq: "monthly" },
  { path: "/comparisons/answering-services-vs-boltcall",        priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-podium",                        priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-gohighlevel",                   priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-birdeye",                       priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-smith-ai",                      priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-goodcall",                      priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-callin",                        priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-lindy",                         priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-convin",                        priority: "0.8", changefreq: "monthly" },
  { path: "/compare/boltcall-vs-soundhound",                    priority: "0.8", changefreq: "monthly" },
  // Pruned 2026-08-29 (audit round 2): boltcall-vs-emitrr, boltcall-vs-calomation,
  // comparisons/{call-centers,crm,voicemail}-vs-boltcall — all 301'd in
  // public/_redirects to /comparisons hub. Sitemap should never list
  // redirected URLs (inflates the "submitted" count, wastes crawl budget).
  { path: "/compare/podium-alternatives",                       priority: "0.8", changefreq: "monthly" },

  // Live blog posts previously flagged by scripts/audit-sitemap-diff.mjs
  // 2026-08-29 audit round 2 prune: /is-ai-receptionist-worth-it was
  // listed twice (dup on line 113 too); ai-receptionist-worth-it-roi,
  // ai-chatbot-vs-live-chat-phone-answering, how-instant-lead-reply-works,
  // instant-lead-reply-guide are all 301'd in _redirects; commercial-roofing-
  // lead-response-time falls under the deprecated -lead-response-time cluster.
  { path: "/blog/what-is-ai-receptionist-guide",                priority: "0.8", changefreq: "monthly" },
  { path: "/blog/phone-call-scripts",                           priority: "0.7", changefreq: "monthly" },
  { path: "/blog/tips-for-professional-telephone-etiquette",    priority: "0.7", changefreq: "monthly" },
  { path: "/blog/answering-service-scheduling",                 priority: "0.7", changefreq: "monthly" },
  { path: "/blog/benefits-of-outsourced-reception-services",    priority: "0.7", changefreq: "monthly" },
  { path: "/blog/ai-receptionist-for-law-firms",                priority: "0.8", changefreq: "monthly" },
  { path: "/blog/speed-to-lead-for-law-firms",                  priority: "0.8", changefreq: "monthly" },
  { path: "/blog/ai-receptionist-lawyer-faq",                   priority: "0.7", changefreq: "monthly" },
  { path: "/blog/roofing-missed-call-answering-service",        priority: "0.8", changefreq: "weekly" },

  // Product + landing pages
  { path: "/ai-agent-comparison",                               priority: "0.8", changefreq: "monthly" },
  { path: "/demo",                                              priority: "0.7", changefreq: "monthly" },
  { path: "/dpa",                                               priority: "0.5", changefreq: "yearly"  },
  { path: "/law-firm-security",                                 priority: "0.5", changefreq: "yearly"  },
  { path: "/funnel-optimiser",                                  priority: "0.6", changefreq: "monthly" },
  { path: "/newsletter",                                        priority: "0.6", changefreq: "monthly" },
  { path: "/personal-injury",                                   priority: "0.7", changefreq: "monthly" },
  { path: "/lead-magnet/speed-to-lead-stack",                   priority: "0.6", changefreq: "monthly" },

  // Public game / lead capture
  { path: "/challenge",                                         priority: "0.6", changefreq: "monthly" },

  // Industry calculators
  { path: "/tools/lawyer-intake-calculator",                    priority: "0.7", changefreq: "monthly" },
];

// Canonicalize: ensure trailing slash on every path so sitemap URLs match
// the live URL Netlify serves (non-slash → 301 → slash). Without this the
// sitemap fights the canonical and Google logs dozens of "Page with redirect"
// entries, wasting crawl budget.
const canonicalPath = (p) => (p === "/" ? "/" : p.replace(/\/?$/, "/"));

export function parseMarkdownFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    frontmatter[key] = value;
  }
  return frontmatter;
}

export function publishedAeoRoutesFromContentDir(contentDir = resolve(__dirname, "../src/content/aeo")) {
  if (!existsSync(contentDir)) return [];

  return readdirSync(contentDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.mdx?$/i.test(entry.name))
    .map((entry) => {
      const raw = readFileSync(resolve(contentDir, entry.name), "utf-8");
      const frontmatter = parseMarkdownFrontmatter(raw);
      const slug = frontmatter.slug || entry.name.replace(/\.mdx?$/i, "");
      return {
        path: `/blog/${slug}`,
        priority: "0.8",
        changefreq: "weekly",
        status: frontmatter.status || "draft",
        lastmod: lastModifiedDate(resolve(contentDir, entry.name)),
      };
    })
    .filter((route) => route.status === "published")
    .map(({ status, ...route }) => route);
}

/** Real last-edit date for a file: git commit date, falling back to mtime. */
function lastModifiedDate(filePath) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", filePath], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out) return out;
  } catch {
    // not a git checkout, or file untracked -- fall through to mtime
  }
  try {
    return statSync(filePath).mtime.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

export function buildSitemapXml({ contentDir = resolve(__dirname, "../src/content/aeo") } = {}) {
  const byPath = new Map();
  for (const route of [...ROUTES, ...publishedAeoRoutesFromContentDir(contentDir)]) {
    byPath.set(canonicalPath(route.path), { ...route, path: canonicalPath(route.path) });
  }
  const routes = [...byPath.values()];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(
  (r) => `  <url>
    <loc>${BASE_URL}${r.path}</loc>${r.lastmod ? `
    <lastmod>${r.lastmod}</lastmod>` : ""}
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
).join("\n")}
</urlset>`;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const xml = buildSitemapXml();
  writeFileSync(resolve(__dirname, "../public/sitemap.xml"), xml, "utf-8");
  const urlCount = [...xml.matchAll(/<url>/g)].length;
  console.log(`sitemap.xml generated - ${urlCount} URLs (${TODAY})`);
}
