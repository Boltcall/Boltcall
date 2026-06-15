/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  PDF RENDERER ADAPTER — Agency OS, Layer 4 (Drivers)                     ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  HEAVY SERVERLESS DEPENDENCY — READ BEFORE TOUCHING                      ║
 * ║                                                                          ║
 * ║  This adapter renders HTML to PDF for the reporting-scribe agent's       ║
 * ║  Friday auto-reports (per i-ahev-so-much-steady-frog.md, agent           ║
 * ║  reporting-scribe upgraded spec). The upgraded scribe is narrative-first ║
 * ║  with charts-as-evidence — every chart carries an AI-generated caption   ║
 * ║  rendered inline, so the PDF layout must preserve <figure><figcaption>   ║
 * ║  pairs and not crop them.                                                ║
 * ║                                                                          ║
 * ║  RUNTIME REQUIREMENTS — the next deployer MUST set these in netlify.toml ║
 * ║  for any function that imports this module (e.g. the reporting-scribe    ║
 * ║  scheduled function, render-client-report endpoint, etc.):               ║
 * ║                                                                          ║
 * ║      [functions."reporting-scribe"]                                      ║
 * ║        timeout      = 300            # cold start + render budget        ║
 * ║        memory       = 1024           # MAX — Chromium needs it           ║
 * ║        included_files = [                                                ║
 * ║          "node_modules/@sparticuz/chromium/**",                          ║
 * ║        ]                                                                 ║
 * ║                                                                          ║
 * ║  DEPENDENCIES (install before this module is reachable in any handler):  ║
 * ║      npm i puppeteer-core @sparticuz/chromium                            ║
 * ║                                                                          ║
 * ║  STRATEGY                                                                ║
 * ║      1. Try puppeteer-core + @sparticuz/chromium (full fidelity).        ║
 * ║      2. If Chromium init fails (cold-start OOM, missing binary, native   ║
 * ║         bindings issue) — fall back to uploading the raw HTML as an      ║
 * ║         email-renderable artifact and return a share URL pointing at     ║
 * ║         the HTML. Emit an `agency_event` with severity='warn' so the     ║
 * ║         delivery-monitor and loop-monitor see the degradation.           ║
 * ║      3. NEVER throw upstream. The reporting-scribe agent must always     ║
 * ║         get something it can ship; the founder gets a queued artifact    ║
 * ║         either way.                                                      ║
 * ║                                                                          ║
 * ║  EVENT EMISSIONS                                                         ║
 * ║      - 'report_sent'        — successful PDF render + upload             ║
 * ║      - 'report_degraded'    — HTML fallback used (warn severity)         ║
 * ║      - 'report_failed'      — both paths failed (error severity)         ║
 * ║                                                                          ║
 * ║  STORAGE                                                                 ║
 * ║      Bucket: 'agency-reports' (must exist; create via supabase migration ║
 * ║      with `insert into storage.buckets (id, name, public) values         ║
 * ║      ('agency-reports','agency-reports',false);`). Access via signed     ║
 * ║      URLs only (default 30-day expiry for client-facing share links).    ║
 * ║                                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { getServiceSupabase } from '../token-utils';
import {
  emitAgencyEvent as kernelEmitAgencyEvent,
  type AgencyEventType,
  type AgencyEventSeverity,
} from '../emit-agency-event';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PageFormat = 'A4' | 'Letter';

export interface PdfMargins {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface RenderToPdfOpts {
  html: string;
  page_format?: PageFormat;
  margins?: PdfMargins;
  header_html?: string;
  footer_html?: string;
  /** Optional client_id so the success/failure event lands on the right row. */
  client_id?: string;
  /** Optional storage path prefix (defaults to `reports/<isoDate>`). */
  storage_prefix?: string;
  /** Signed URL TTL in seconds. Default: 30 days. */
  signed_url_ttl_sec?: number;
}

export interface RenderToPdfResult {
  pdf_url: string;
  page_count: number;
  size_bytes: number;
  /** 'pdf' under normal operation, 'html' when the graceful fallback fired. */
  artifact_kind: 'pdf' | 'html';
  /** True when the puppeteer path failed and the HTML fallback was returned. */
  degraded: boolean;
}

export interface BrandConfig {
  logo_url?: string;
  primary_color?: string;
  accent_color?: string;
  business_name?: string;
}

export interface RenderClientReportOpts {
  client_id: string;
  week_starting: string; // YYYY-MM-DD
  report_html: string;
  brand: BrandConfig;
  /** Signed URL TTL in seconds. Default: 30 days (2_592_000). */
  signed_url_ttl_sec?: number;
}

export interface RenderClientReportResult {
  pdf_url: string;
  share_url: string;
  artifact_kind: 'pdf' | 'html';
  degraded: boolean;
  size_bytes: number;
  page_count: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const STORAGE_BUCKET = 'agency-reports';
const DEFAULT_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_MARGINS: PdfMargins = {
  top: '24mm',
  right: '16mm',
  bottom: '24mm',
  left: '16mm',
};

// ---------------------------------------------------------------------------
// Internal: lazy puppeteer loader (so a missing dep doesn't crash cold start)
// ---------------------------------------------------------------------------

interface PuppeteerBundle {
  puppeteer: typeof import('puppeteer-core');
  chromium: {
    args: string[];
    defaultViewport: { width: number; height: number } | null;
    executablePath: () => Promise<string>;
    headless: boolean | 'new';
  };
}

async function loadPuppeteer(): Promise<PuppeteerBundle | null> {
  try {
    // Dynamic import keeps the heavy modules out of the cold-path bundle when
    // the function importing this adapter never actually renders.
    const [puppeteerMod, chromiumMod] = await Promise.all([
      import('puppeteer-core'),
      import('@sparticuz/chromium'),
    ]);
    const puppeteer = (puppeteerMod.default ?? puppeteerMod) as unknown as typeof import('puppeteer-core');
    const chromium = (chromiumMod.default ?? chromiumMod) as unknown as PuppeteerBundle['chromium'];
    return { puppeteer, chromium };
  } catch (err) {
    console.warn(
      '[pdf-renderer] puppeteer-core/@sparticuz/chromium unavailable:',
      (err as Error)?.message,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal: event emission helper — delegates to shared kernel emitter.
//
// Spec §7: pdf-renderer event types are already in the allowed AgencyEventType
// union (report_sent / report_degraded / report_failed). The kernel emitter
// handles the aios_event_log mirror via mirrorToAiosEventLog — we do NOT
// double-write. Telemetry failures must never break a report render.
// ---------------------------------------------------------------------------

async function emitAgencyEvent(args: {
  client_id?: string;
  agent_name?: string;
  type: AgencyEventType;
  severity?: AgencyEventSeverity;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await kernelEmitAgencyEvent({
      client_id: args.client_id ?? '',
      agent_name: args.agent_name ?? 'pdf-renderer',
      type: args.type,
      severity: args.severity ?? 'info',
      payload: args.payload ?? {},
    });
  } catch (err) {
    // Telemetry must never break the caller — spec §7 (never throw upstream).
    console.warn('[pdf-renderer] emitAgencyEvent failed:', (err as Error)?.message);
  }
}

// ---------------------------------------------------------------------------
// Internal: storage upload + signed URL
// ---------------------------------------------------------------------------

async function uploadAndSign(args: {
  bucket: string;
  path: string;
  body: Buffer;
  contentType: string;
  ttlSec: number;
}): Promise<{ signedUrl: string; sizeBytes: number }> {
  const supabase = getServiceSupabase();
  const { error: uploadErr } = await supabase.storage.from(args.bucket).upload(args.path, args.body, {
    contentType: args.contentType,
    upsert: true,
  });
  if (uploadErr) {
    throw new Error(`storage.upload failed: ${uploadErr.message}`);
  }
  const { data: signed, error: signErr } = await supabase.storage
    .from(args.bucket)
    .createSignedUrl(args.path, args.ttlSec);
  if (signErr || !signed?.signedUrl) {
    throw new Error(`storage.createSignedUrl failed: ${signErr?.message ?? 'no url'}`);
  }
  return { signedUrl: signed.signedUrl, sizeBytes: args.body.byteLength };
}

// ---------------------------------------------------------------------------
// Internal: estimate page count without re-parsing the PDF
//
// puppeteer.pdf() doesn't return page count. We sniff the buffer for `/Type /Page`
// occurrences — cheap and accurate enough for an artifact metric.
// ---------------------------------------------------------------------------

function estimatePageCount(pdf: Buffer): number {
  const ascii = pdf.toString('latin1');
  // Match `/Type /Page` (with optional whitespace) but NOT `/Type /Pages` (the catalog node).
  const matches = ascii.match(/\/Type\s*\/Page(?![s/A-Za-z])/g);
  return matches ? matches.length : 1;
}

// ---------------------------------------------------------------------------
// Public: renderToPdf — low-level HTML to PDF with graceful HTML fallback
// ---------------------------------------------------------------------------

export async function renderToPdf(opts: RenderToPdfOpts): Promise<RenderToPdfResult> {
  const {
    html,
    page_format = 'Letter',
    margins = DEFAULT_MARGINS,
    header_html = '',
    footer_html = '',
    client_id,
    storage_prefix,
    signed_url_ttl_sec = DEFAULT_TTL_SEC,
  } = opts;

  if (!html || typeof html !== 'string') {
    throw new Error('renderToPdf: opts.html is required');
  }

  const isoDate = new Date().toISOString().slice(0, 10);
  const prefix = storage_prefix ?? `reports/${isoDate}`;
  const baseName = `${prefix}/${cryptoRandomId()}`;

  const bundle = await loadPuppeteer();

  // Path A: full Puppeteer render --------------------------------------------
  if (bundle) {
    let browser: import('puppeteer-core').Browser | null = null;
    try {
      browser = await bundle.puppeteer.launch({
        args: bundle.chromium.args,
        defaultViewport: bundle.chromium.defaultViewport,
        executablePath: await bundle.chromium.executablePath(),
        headless: bundle.chromium.headless as boolean,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
      // Force background colors (brand banners, chart fills) into print output.
      await page.emulateMediaType('screen');

      const pdfBuffer = await page.pdf({
        format: page_format,
        printBackground: true,
        displayHeaderFooter: Boolean(header_html || footer_html),
        headerTemplate: header_html || '<span></span>',
        footerTemplate:
          footer_html ||
          '<div style="font-size:9px;width:100%;text-align:center;color:#999;">' +
            '<span class="pageNumber"></span> / <span class="totalPages"></span>' +
            '</div>',
        margin: margins,
        preferCSSPageSize: false,
      });

      // Buffer.from coerces the Uint8Array return into a Node Buffer for upload.
      const buf = Buffer.from(pdfBuffer);
      const pageCount = estimatePageCount(buf);

      const { signedUrl, sizeBytes } = await uploadAndSign({
        bucket: STORAGE_BUCKET,
        path: `${baseName}.pdf`,
        body: buf,
        contentType: 'application/pdf',
        ttlSec: signed_url_ttl_sec,
      });

      await emitAgencyEvent({
        client_id,
        agent_name: 'pdf-renderer',
        type: 'report_sent',
        severity: 'info',
        payload: {
          path: `${baseName}.pdf`,
          size_bytes: sizeBytes,
          page_count: pageCount,
          page_format,
          ttl_sec: signed_url_ttl_sec,
        },
      });

      return {
        pdf_url: signedUrl,
        page_count: pageCount,
        size_bytes: sizeBytes,
        artifact_kind: 'pdf',
        degraded: false,
      };
    } catch (err) {
      // Fall through to Path B — never throw upstream.
      console.warn(
        '[pdf-renderer] puppeteer render failed, falling back to HTML:',
        (err as Error)?.message,
      );
      await emitAgencyEvent({
        client_id,
        agent_name: 'pdf-renderer',
        type: 'report_degraded',
        severity: 'warn',
        payload: {
          reason: 'puppeteer_render_failed',
          error: (err as Error)?.message ?? String(err),
        },
      });
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          console.warn('[pdf-renderer] browser.close failed:', (closeErr as Error)?.message);
        }
      }
    }
  } else {
    await emitAgencyEvent({
      client_id,
      agent_name: 'pdf-renderer',
      type: 'report_degraded',
      severity: 'warn',
      payload: { reason: 'puppeteer_unavailable' },
    });
  }

  // Path B: HTML fallback ----------------------------------------------------
  try {
    const htmlBuffer = Buffer.from(wrapHtmlForEmail(html), 'utf8');
    const { signedUrl, sizeBytes } = await uploadAndSign({
      bucket: STORAGE_BUCKET,
      path: `${baseName}.html`,
      body: htmlBuffer,
      contentType: 'text/html; charset=utf-8',
      ttlSec: signed_url_ttl_sec,
    });

    return {
      pdf_url: signedUrl,
      page_count: 1,
      size_bytes: sizeBytes,
      artifact_kind: 'html',
      degraded: true,
    };
  } catch (fallbackErr) {
    await emitAgencyEvent({
      client_id,
      agent_name: 'pdf-renderer',
      type: 'report_failed',
      severity: 'error',
      payload: {
        reason: 'fallback_html_upload_failed',
        error: (fallbackErr as Error)?.message ?? String(fallbackErr),
      },
    });
    // Last-resort: return an inline data URL so the agent can still queue something.
    const dataUrl = `data:text/html;base64,${Buffer.from(html, 'utf8').toString('base64')}`;
    return {
      pdf_url: dataUrl,
      page_count: 1,
      size_bytes: Buffer.byteLength(html, 'utf8'),
      artifact_kind: 'html',
      degraded: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Public: renderClientReport — branded Friday auto-report wrapper
// ---------------------------------------------------------------------------

export async function renderClientReport(
  opts: RenderClientReportOpts,
): Promise<RenderClientReportResult> {
  const { client_id, week_starting, report_html, brand, signed_url_ttl_sec = DEFAULT_TTL_SEC } = opts;

  if (!client_id) throw new Error('renderClientReport: client_id is required');
  if (!week_starting) throw new Error('renderClientReport: week_starting is required');
  if (!report_html) throw new Error('renderClientReport: report_html is required');

  const primary = sanitizeColor(brand.primary_color, '#0B5FFF');
  const accent = sanitizeColor(brand.accent_color, '#10B981');
  const safeLogo = sanitizeUrl(brand.logo_url);
  const businessName = escapeHtml(brand.business_name ?? 'Your Business');

  const styledHtml = wrapBranded({
    body: report_html,
    primaryColor: primary,
    accentColor: accent,
    logoUrl: safeLogo,
    businessName,
    weekStarting: week_starting,
  });

  const header = buildHeader({ logoUrl: safeLogo, businessName, primaryColor: primary });
  const footer = buildFooter({ weekStarting: week_starting, accentColor: accent });

  const result = await renderToPdf({
    html: styledHtml,
    page_format: 'Letter',
    margins: { top: '28mm', right: '16mm', bottom: '24mm', left: '16mm' },
    header_html: header,
    footer_html: footer,
    client_id,
    storage_prefix: `clients/${client_id}/weekly/${week_starting}`,
    signed_url_ttl_sec,
  });

  return {
    pdf_url: result.pdf_url,
    share_url: result.pdf_url, // signed URL already carries TTL — same surface for the client
    artifact_kind: result.artifact_kind,
    degraded: result.degraded,
    size_bytes: result.size_bytes,
    page_count: result.page_count,
  };
}

// ---------------------------------------------------------------------------
// Internal: HTML wrappers — keep all branding in one place so the design
// review skill can audit them without touching the render logic.
// ---------------------------------------------------------------------------

function wrapBranded(args: {
  body: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  businessName: string;
  weekStarting: string;
}): string {
  // Note: figure/figcaption pairs from the upgraded reporting-scribe MUST stay
  // glued together. `break-inside: avoid` + `page-break-inside: avoid` keeps
  // each chart and its AI-generated caption on the same page.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Weekly Report - ${args.businessName}</title>
<style>
  :root {
    --primary: ${args.primaryColor};
    --accent: ${args.accentColor};
    --ink: #0f172a;
    --muted: #64748b;
    --rule: #e2e8f0;
    --bg: #ffffff;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3 { color: var(--ink); margin: 0 0 0.4em; line-height: 1.25; }
  h1 { font-size: 22pt; letter-spacing: -0.01em; }
  h2 { font-size: 15pt; margin-top: 1.4em; border-bottom: 2px solid var(--primary); padding-bottom: 0.25em; }
  h3 { font-size: 12pt; color: var(--primary); }
  a { color: var(--primary); }
  p { margin: 0 0 0.8em; }
  hr { border: none; border-top: 1px solid var(--rule); margin: 1.5em 0; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 1em 0; }
  .kpi { border: 1px solid var(--rule); border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 9pt; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi-value { font-size: 20pt; font-weight: 600; color: var(--ink); margin-top: 4px; }
  .kpi-delta-up { color: ${args.accentColor}; font-size: 10pt; }
  .kpi-delta-down { color: #dc2626; font-size: 10pt; }
  /* Charts-as-evidence: never split a chart from its AI caption. */
  figure {
    margin: 1.2em 0;
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid var(--rule);
    border-radius: 8px;
    padding: 12px;
  }
  figure img, figure svg { max-width: 100%; height: auto; }
  figcaption {
    font-size: 10pt;
    color: var(--muted);
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed var(--rule);
    font-style: italic;
  }
  blockquote {
    border-left: 3px solid var(--accent);
    padding: 4px 0 4px 12px;
    margin: 1em 0;
    color: var(--ink);
    background: #f8fafc;
  }
  .next-week-ask {
    margin-top: 2em;
    padding: 16px;
    border: 2px solid var(--accent);
    border-radius: 10px;
    background: #f0fdf4;
  }
  .next-week-ask h3 { color: var(--accent); margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  th, td { border: 1px solid var(--rule); padding: 6px 8px; text-align: left; font-size: 10pt; }
  th { background: #f1f5f9; }
  @page { size: Letter; }
</style>
</head>
<body>
${args.body}
</body>
</html>`;
}

function wrapHtmlForEmail(rawHtml: string): string {
  // Used by the HTML fallback path — the artifact is meant to be opened in a
  // browser or embedded in an email, so we add a minimal banner explaining
  // the degraded state so the client never sees a context-less HTML file.
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Weekly Report</title></head>
<body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
<div style="background:#fef3c7;color:#92400e;padding:8px 14px;font-size:12px;border-bottom:1px solid #fbbf24;">
  This report was delivered as HTML instead of PDF. Content is unchanged.
</div>
${rawHtml}
</body></html>`;
}

function buildHeader(args: {
  logoUrl: string | null;
  businessName: string;
  primaryColor: string;
}): string {
  const logo = args.logoUrl
    ? `<img src="${args.logoUrl}" style="height:18px;vertical-align:middle;margin-right:8px;" />`
    : '';
  return `<div style="font-size:9px;width:100%;padding:0 16mm;color:#64748b;display:flex;align-items:center;justify-content:space-between;">
    <span>${logo}<strong style="color:${args.primaryColor};">${args.businessName}</strong></span>
    <span>Boltcall - Weekly Report</span>
  </div>`;
}

function buildFooter(args: { weekStarting: string; accentColor: string }): string {
  return `<div style="font-size:9px;width:100%;padding:0 16mm;color:#94a3b8;display:flex;justify-content:space-between;">
    <span>Week of ${escapeHtml(args.weekStarting)}</span>
    <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;
}

// ---------------------------------------------------------------------------
// Internal: tiny sanitizers — brand input is founder-controlled but we still
// validate to keep injected CSS/URLs sane (founder may paste a bad value).
// ---------------------------------------------------------------------------

function sanitizeColor(input: string | undefined, fallback: string): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return trimmed;
  if (/^rgb(a)?\([\d.,\s%]+\)$/i.test(trimmed)) return trimmed;
  return fallback;
}

function sanitizeUrl(input: string | undefined): string | null {
  if (!input) return null;
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:' && u.protocol !== 'http:' && u.protocol !== 'data:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cryptoRandomId(): string {
  // Avoid pulling in `crypto` types just for one id. Math.random + ts is fine
  // for a storage path — collision probability is negligible at agency scale.
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}
