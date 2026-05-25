import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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
  { path: "/help-center",                                         priority: "0.7", changefreq: "monthly" },
  { path: "/partners",                                            priority: "0.7", changefreq: "monthly" },
  { path: "/book-a-call",                                         priority: "0.7", changefreq: "monthly" },
  { path: "/documentation",                                       priority: "0.8", changefreq: "monthly" },
  { path: "/api-documentation",                                   priority: "0.8", changefreq: "monthly" },
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

  // Lead Magnets & Audits
  { path: "/lead-magnet",                                        priority: "0.8", changefreq: "weekly"  },
  { path: "/lead-magnet/claude-code-overnight-kit",              priority: "0.7", changefreq: "monthly" },
  { path: "/lead-magnet/ai-receptionist-buyers-guide",           priority: "0.7", changefreq: "monthly" },
  { path: "/free-website",                                       priority: "0.8", changefreq: "monthly" },
  { path: "/giveaway",                                           priority: "0.6", changefreq: "monthly" },
  { path: "/ai-revenue-audit",                                   priority: "0.8", changefreq: "weekly"  },
  { path: "/lead-response-scorecard",                            priority: "0.8", changefreq: "weekly"  },
  { path: "/seo-audit",                                          priority: "0.8", changefreq: "weekly"  },
  { path: "/business-audit",                                     priority: "0.8", changefreq: "weekly"  },
  { path: "/ai-audit",                                           priority: "0.8", changefreq: "weekly"  },
  { path: "/seo-aeo-audit",                                      priority: "0.8", changefreq: "monthly" },
  { path: "/conversion-rate-optimizer",                          priority: "0.8", changefreq: "monthly" },
  { path: "/ai-visibility-check",                                priority: "0.8", changefreq: "monthly" },
  { path: "/ai-readiness-scorecard",                             priority: "0.8", changefreq: "monthly" },
  { path: "/ai-receptionist-roi",                                priority: "0.8", changefreq: "monthly" },
  // /voice-agent-setup is a private multi-step wizard creating billable
  // Retell + Twilio resources — noindex'd at the page level, not for SEO.
  { path: "/solar",                                               priority: "0.9", changefreq: "monthly" },
  { path: "/solar-speed-playbook",                               priority: "0.8", changefreq: "monthly" },
  { path: "/solar-benchmark",                                    priority: "0.8", changefreq: "monthly" },
  { path: "/solar-benchmark-2026",                              priority: "0.9", changefreq: "monthly" },
  { path: "/solar-roi-calculator",                              priority: "0.8", changefreq: "monthly" },
  { path: "/solar-speed-score",                                 priority: "0.8", changefreq: "monthly" },
  { path: "/funnel-optimizer",                                   priority: "0.7", changefreq: "monthly" },
  { path: "/rank-on-google-offer",                               priority: "0.7", changefreq: "monthly" },

  // Industry Tools
  { path: "/tools/5-minute-response-playbook",                   priority: "0.8", changefreq: "monthly" },
  { path: "/tools/vet-clinic-revenue-calculator",                priority: "0.8", changefreq: "monthly" },
  { path: "/tools/dentist-chair-calculator",                     priority: "0.8", changefreq: "monthly" },
  { path: "/tools/hvac-overflow-calculator",                     priority: "0.8", changefreq: "monthly" },
  { path: "/tools/medspa-rebooking-calculator",                  priority: "0.8", changefreq: "monthly" },
  { path: "/tools/plumber-revenue-calculator",                   priority: "0.8", changefreq: "monthly" },
  { path: "/tools/real-estate-speed-scorecard",                  priority: "0.8", changefreq: "monthly" },
  { path: "/tools/solar-profit-calculator",                      priority: "0.8", changefreq: "monthly" },
  { path: "/tools/solar-quote-generator",                        priority: "0.8", changefreq: "monthly" },
  { path: "/tools/solar-sales-closer",                           priority: "0.8", changefreq: "monthly" },

  // Blog Index & AI Guide
  { path: "/blog",                                               priority: "0.9", changefreq: "weekly"  },
  { path: "/ai-guide-for-businesses",                            priority: "0.8", changefreq: "monthly" },
  { path: "/ai-guide-for-businesses/level-1-understanding-ai",  priority: "0.8", changefreq: "monthly" },
  { path: "/ai-guide-for-businesses/level-2-choosing-ai-tools", priority: "0.8", changefreq: "monthly" },
  { path: "/ai-guide-for-businesses/level-3-getting-started",   priority: "0.8", changefreq: "monthly" },

  // Blog Posts
  { path: "/blog/the-new-reality-for-local-businesses",              priority: "0.8", changefreq: "weekly" },
  { path: "/blog/why-speed-matters",                                 priority: "0.8", changefreq: "weekly" },
  { path: "/blog/complete-guide-to-seo",                             priority: "0.8", changefreq: "weekly" },
  { path: "/blog/best-ai-receptionist-tools",                        priority: "0.8", changefreq: "weekly" },
  { path: "/blog/how-ai-receptionist-works",                         priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-answering-service-small-business",               priority: "0.8", changefreq: "weekly" },
  { path: "/blog/is-ai-receptionist-worth-it",                       priority: "0.8", changefreq: "weekly" },
  { path: "/blog/how-to-make-ai-receptionist",                       priority: "0.8", changefreq: "weekly" },
  { path: "/blog/hvac-ai-lead-response",                             priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-appointment-scheduling-hvac",                    priority: "0.8", changefreq: "weekly" },
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
  { path: "/blog/ai-phone-answering-plumbers",                       priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-phone-answering-dentists",                       priority: "0.8", changefreq: "weekly" },
  { path: "/blog/best-after-hours-answering-service",                priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-chatbot-vs-live-chat-phone-comparison",          priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-receptionist-for-plumbers",                      priority: "0.8", changefreq: "weekly" },
  { path: "/blog/missed-calls-statistics-local-business-2026",       priority: "0.8", changefreq: "weekly" },
  { path: "/blog/best-ai-receptionist-home-services",                priority: "0.8", changefreq: "weekly" },
  { path: "/blog/ai-agent-for-small-business-24-7-call-answering",   priority: "0.8", changefreq: "weekly" },
  { path: "/blog/roofing-company-stop-losing-leads-missed-calls",    priority: "0.8", changefreq: "weekly" },
  { path: "/blog/home-service-google-ads-lead-follow-up",            priority: "0.8", changefreq: "weekly" },
  { path: "/blog/best-ai-answering-service-dental-medical-practice", priority: "0.8", changefreq: "weekly" },
  { path: "/blog/after-hours-lead-response-home-services",           priority: "0.8", changefreq: "weekly" },
  { path: "/blog/never-miss-a-call-after-business-hours",            priority: "0.8", changefreq: "weekly" },
  { path: "/blog/whatsapp-appointment-booking-plumbers",             priority: "0.8", changefreq: "weekly" },

  // AEO Answer Pages
  { path: "/blog/does-response-time-affect-local-business-job-conversion", priority: "0.9", changefreq: "weekly" },
  { path: "/blog/why-local-businesses-lose-customers-not-answering-calls",  priority: "0.9", changefreq: "weekly" },
  { path: "/blog/fastest-way-dentist-respond-missed-calls-automatically",   priority: "0.9", changefreq: "weekly" },

  // Blog FAQ / Industry AEO How-To
  { path: "/blog/how-to-set-up-ai-phone-answering-vet-clinic",       priority: "0.8", changefreq: "weekly" },

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
];

// Canonicalize: ensure trailing slash on every path so sitemap URLs match
// the live URL Netlify serves (non-slash → 301 → slash). Without this the
// sitemap fights the canonical and Google logs dozens of "Page with redirect"
// entries, wasting crawl budget.
const canonicalPath = (p) => (p === "/" ? "/" : p.replace(/\/?$/, "/"));

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(
  (r) => `  <url>
    <loc>${BASE_URL}${canonicalPath(r.path)}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
).join("\n")}
</urlset>`;

writeFileSync(resolve(__dirname, "../public/sitemap.xml"), xml, "utf-8");
console.log(`✓ sitemap.xml generated — ${ROUTES.length} URLs (${TODAY})`);
