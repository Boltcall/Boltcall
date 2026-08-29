import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  KeyRound,
  Plug,
  Workflow,
} from 'lucide-react';

type IntegrationId = 'zapier' | 'make' | 'hubspot' | 'gohighlevel' | 'wix' | 'squarespace';

type IntegrationPageData = {
  id: IntegrationId;
  name: string;
  slug: string;
  category: string;
  icon: string;
  fallback: string;
  h1: string;
  meta: string;
  answer: string;
  bestFor: string[];
  workflows: string[];
  setup: string[];
  acceptance: string[];
  faqs: Array<{ q: string; a: string }>;
};

const SITE = 'https://boltcall.org';

const integrations: IntegrationPageData[] = [
  {
    id: 'zapier',
    name: 'Zapier',
    slug: 'zapier',
    category: 'Automation',
    icon: '/icons/integrations/zapier.webp',
    fallback: '#FF4F00',
    h1: 'Boltcall Zapier Integration',
    meta: 'Connect Zapier to Boltcall so new leads from forms, ads, sheets, and CRMs get instant speed-to-lead response.',
    answer:
      'The Boltcall Zapier integration lets local service businesses send leads from Zapier into Boltcall and trigger instant AI phone or SMS follow-up. A Zap can capture a Facebook Lead Ad, website form, spreadsheet row, or CRM event, then send the lead name, phone, email, source, and external ID to Boltcall. Boltcall stores the lead, prevents duplicate retries with idempotency keys, starts the first-touch response when a phone number is present, and exposes new leads back to Zapier for downstream workflows. This is best for teams that already use Zapier as their no-code routing layer and want every inbound lead handled before a competitor calls back.',
    bestFor: ['Facebook Lead Ads', 'Webflow and form tools', 'Google Sheets rows', 'CRM routing'],
    workflows: [
      'Facebook Lead Ads -> Boltcall: Send Lead to Boltcall',
      'Google Sheets new row -> Boltcall: Send Lead to Boltcall',
      'Boltcall New Lead -> Slack or email alert',
      'Boltcall New Lead -> HubSpot contact update',
    ],
    setup: [
      'Create a Boltcall API key in Dashboard > Settings > API Keys.',
      'Install or invite the private Boltcall Zapier app.',
      'Connect Zapier with the bc_ API key.',
      'Use Send Lead to Boltcall for inbound lead sources.',
      'Use New Lead when another app should react to Boltcall-captured leads.',
    ],
    acceptance: [
      'Zapier authentication succeeds against api-me.',
      'New Lead returns stable lead IDs for Zapier deduplication.',
      'Send Lead to Boltcall returns first_touch_status and deduped state.',
    ],
    faqs: [
      {
        q: 'Can Zapier start a Boltcall speed-to-lead call?',
        a: 'Yes. When Zapier sends a lead with a phone number, Boltcall captures the lead and starts the configured first-touch response when the workspace has an active phone number and agent.',
      },
      {
        q: 'How does Boltcall avoid duplicate Zapier retries?',
        a: 'Send an external_id or idempotency_key from Zapier. Boltcall returns the existing lead instead of creating a duplicate.',
      },
    ],
  },
  {
    id: 'make',
    name: 'Make',
    slug: 'make',
    category: 'Automation',
    icon: 'https://www.make.com/favicon.ico',
    fallback: '#6D00CC',
    h1: 'Boltcall Make Integration',
    meta: 'Use Make scenarios to send ad, form, CRM, and spreadsheet leads into Boltcall for instant response.',
    answer:
      'The Boltcall Make integration gives local service businesses a visual way to route leads into an instant response system. A Make scenario can watch Facebook Lead Ads, webhook payloads, Google Sheets rows, forms, or CRM changes, then call Boltcall Create Lead with the contact details and source. Boltcall captures the lead, checks idempotency fields to avoid retry duplicates, and starts the first-touch phone or SMS workflow when the workspace is ready. Make can also watch Boltcall leads and push outcomes into HubSpot, Google Sheets, Slack, or internal operations dashboards. This is the practical choice when a team wants flexible visual workflows without waiting for every native app connection.',
    bestFor: ['Visual workflow builders', 'Webhook scenarios', 'Ad lead routing', 'Operations dashboards'],
    workflows: [
      'Facebook Lead Ads -> Boltcall Create Lead',
      'Google Ads Lead Form webhook -> Boltcall Create Lead',
      'Boltcall Watch Leads -> Google Sheets add row',
      'Boltcall Watch Leads -> HubSpot create or update contact',
    ],
    setup: [
      'Create a Boltcall API key in Dashboard > Settings > API Keys.',
      'Create a private Make custom app named Boltcall.',
      'Add the API-key connection and modules from the repo kit.',
      'Create a scenario with Boltcall Create Lead or Watch Leads.',
      'Run a test lead and confirm the first-touch status in Make output.',
    ],
    acceptance: [
      'Make connection validates against api-me.',
      'Create Lead accepts email or phone and returns the captured lead.',
      'Find Lead searches only the authenticated Boltcall workspace.',
    ],
    faqs: [
      {
        q: 'Can Make send webhook leads to Boltcall?',
        a: 'Yes. Use a Make webhook trigger, map the lead fields, then call Boltcall Create Lead.',
      },
      {
        q: 'Can Boltcall trigger Make scenarios?',
        a: 'Yes. Boltcall can send new lead events into a Make webhook through the existing integration hub.',
      },
    ],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    slug: 'hubspot',
    category: 'CRM',
    icon: '/icons/integrations/hubspot.webp',
    fallback: '#FF7A59',
    h1: 'HubSpot Speed-to-Lead Automation',
    meta: 'Sync Boltcall leads into HubSpot so local service teams can follow every instant response inside the CRM.',
    answer:
      'The Boltcall HubSpot integration syncs speed-to-lead activity into the CRM your team already uses. When Boltcall captures a lead from a form, ad, phone call, or automation platform, it can create or update the matching HubSpot contact using email first. Contact fields include name, phone, email, source, lifecycle stage, and lead status, so sales or front-desk teams can continue the conversation with context. Today the fastest implementation uses a HubSpot private app token for contact sync. A later public marketplace app should use OAuth and HubSpot workflow actions. The core outcome is simple: HubSpot stays current while Boltcall handles the urgent first response.',
    bestFor: ['CRM contact sync', 'Inbound sales teams', 'Marketing attribution', 'Local service pipelines'],
    workflows: [
      'Boltcall captured lead -> HubSpot contact create/update',
      'Facebook Lead Ads -> Boltcall -> HubSpot contact',
      'Website form -> Boltcall instant call -> HubSpot contact',
      'Boltcall outcome -> HubSpot lead status review',
    ],
    setup: [
      'Create a HubSpot private app with CRM contact read/write permissions.',
      'Copy the private app token.',
      'Open Boltcall Dashboard > Integrations > HubSpot.',
      'Paste the token and run the connection test.',
      'Submit a test lead and confirm the contact appears in HubSpot.',
    ],
    acceptance: [
      'HubSpot connection test can read contacts.',
      'A new Boltcall lead creates a HubSpot contact.',
      'A matching email updates the existing contact instead of duplicating it.',
    ],
    faqs: [
      {
        q: 'Does the same-day HubSpot integration require OAuth?',
        a: 'No. The same-day path uses a HubSpot private app token for contact sync. OAuth is for the later public marketplace app.',
      },
      {
        q: 'Does Boltcall add HubSpot timeline events today?',
        a: 'No. HubSpot private apps are not the right path for custom timeline events, so the same-day release focuses on reliable contact sync.',
      },
    ],
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    slug: 'gohighlevel',
    category: 'CRM',
    icon: '/gohighlevel_logo.png',
    fallback: '#FF6B35',
    h1: 'GoHighLevel Speed-to-Lead Automation',
    meta: 'Connect GoHighLevel to Boltcall so agencies and local service teams can trigger instant AI lead response.',
    answer:
      'The Boltcall GoHighLevel integration helps agencies and local service businesses turn new HighLevel leads into immediate conversations. The same-day setup uses a HighLevel API key and Location ID to create or update contacts in the selected sub-account. Boltcall tags contacts, preserves lead source, and keeps the CRM aligned with leads captured by ads, web forms, calls, or automation flows. For agencies, the value is speed: HighLevel can remain the operating system, while Boltcall becomes the instant-response layer that calls or texts before competitors reach the same lead. A later public marketplace version should use HighLevel OAuth and install-level token storage.',
    bestFor: ['Agencies', 'Local service CRMs', 'Sub-account routing', 'Pipeline handoff'],
    workflows: [
      'New HighLevel contact -> Boltcall speed-to-lead',
      'Website form -> Boltcall -> GoHighLevel contact',
      'Facebook Lead Ad -> Boltcall -> HighLevel tagged contact',
      'Boltcall lead status -> HighLevel pipeline review',
    ],
    setup: [
      'Copy the HighLevel Location ID from the target sub-account.',
      'Create or copy an API key with contact read/write access.',
      'Open Boltcall Dashboard > Integrations > GoHighLevel.',
      'Paste the API key and Location ID.',
      'Run the connection test and submit a test lead.',
    ],
    acceptance: [
      'GoHighLevel test can read contacts for the configured location.',
      'A new Boltcall lead creates or updates a HighLevel contact.',
      'The contact includes Boltcall tags and source fields.',
    ],
    faqs: [
      {
        q: 'Does Boltcall replace GoHighLevel?',
        a: 'No. Boltcall acts as the speed-to-lead response layer while GoHighLevel remains the CRM and agency operating system.',
      },
      {
        q: 'Is this the final marketplace app?',
        a: 'No. The same-day setup uses API key plus Location ID. The public marketplace app should use HighLevel OAuth.',
      },
    ],
  },
  {
    id: 'wix',
    name: 'Wix',
    slug: 'wix',
    category: 'Website Builder',
    icon: 'https://static.wixstatic.com/media/da27dc_de81c6fd0a4d413cbaea547aeee0a1c8~mv2.png/v1/fill/w_32,h_32/da27dc_de81c6fd0a4d413cbaea547aeee0a1c8~mv2.png',
    fallback: '#0C6EFC',
    h1: 'Boltcall Wix Integration',
    meta: 'Send Wix form submissions to Boltcall for instant speed-to-lead phone and SMS response — no plugin required.',
    answer:
      'The Boltcall Wix integration turns every Wix Forms submission into an instant response call or text. Wix Automations natively supports "Send via Webhook" HTTP requests, so no third-party app or plugin is needed. When a lead fills a Contact form, Wix Automations POSTs the form fields as JSON to Boltcall\'s lead-webhook endpoint, authenticated with a bc_ API key. Boltcall stores the lead, deduplicates against previous submissions, and starts the first-touch response the moment a phone number is present. This works on any paid Wix plan that includes Automations (Light and above).',
    bestFor: ['Wix Contact Forms', 'Wix service booking forms', 'Wix multi-step lead capture', 'Any Wix Automations trigger'],
    workflows: [
      'Wix Contact form → Boltcall instant call',
      'Wix booking form → Boltcall instant SMS',
      'Wix subscribe form → Boltcall CRM sync',
      'Wix Velo custom event → Boltcall lead capture',
    ],
    setup: [
      'Create a Boltcall API key in Dashboard > Settings > API Keys and copy the bc_ token.',
      'In Wix editor, open Automations > + New Automation > pick trigger "Form submitted".',
      'Add action "Send via Webhook" and paste https://boltcall.org/.netlify/functions/lead-webhook as the URL.',
      'Set Method = POST. Add header Authorization = Bearer bc_your_key. Content-Type = application/json.',
      'In the JSON body, map form fields: {"name": "{{Form.name}}", "email": "{{Form.email}}", "phone": "{{Form.phone}}", "source": "wix_form", "external_id": "{{submissionId}}"}',
      'Activate the automation. Submit a real test form and confirm the lead appears in Boltcall Dashboard > Leads.',
    ],
    acceptance: [
      'Wix Automation shows 201 response from Boltcall webhook.',
      'Test lead appears in Boltcall Dashboard > Leads within 5 seconds.',
      'First-touch call fires when the workspace has an active phone number and agent.',
      'Duplicate submissions with the same external_id return the same lead ID (no double-call).',
    ],
    faqs: [
      {
        q: 'Do I need a paid Wix plan?',
        a: 'Yes. Wix Automations "Send via Webhook" requires at least the Wix Light plan. The Free plan does not include Automations. If you are on Free, use the Zapier bridge instead.',
      },
      {
        q: 'Which fields should I map in the JSON body?',
        a: 'At minimum, name and either email or phone. Boltcall also reads source, notes, external_id, idempotency_key, and any custom field into raw_data for later reference.',
      },
      {
        q: 'How do I avoid duplicate leads if Wix retries the webhook?',
        a: 'Map Wix\'s {{submissionId}} to external_id in the JSON body. Boltcall\'s idempotency check returns the existing lead instead of creating a duplicate.',
      },
      {
        q: 'Can I trigger Boltcall from a Wix Velo custom event?',
        a: 'Yes. Any Wix Automation trigger — including custom Velo triggers — can call the Send via Webhook action with the same JSON body.',
      },
    ],
  },
  {
    id: 'squarespace',
    name: 'Squarespace',
    slug: 'squarespace',
    category: 'Website Builder',
    icon: 'https://images.squarespace-cdn.com/content/v1/523bce9ee4b02cb59ce3e94a/1379635238321-1PN9M3ZLA3W83ZKCX7NL/favicon.ico?format=100w',
    fallback: '#000000',
    h1: 'Boltcall Squarespace Integration',
    meta: 'Send Squarespace form submissions to Boltcall for instant speed-to-lead response using Zapier or a small code injection.',
    answer:
      'Squarespace does not offer native webhooks for Form Block submissions — its built-in webhooks are Commerce-only. Boltcall supports two proven paths. Path A (recommended, no code): connect your Squarespace form to Zapier, then use the Zapier "Send Lead to Boltcall" action. Path B (Business plan and above, no third-party fees): inject a small script into Code Injection that intercepts form submits and POSTs to Boltcall\'s lead-webhook. Both routes deliver the same result — a lead lands in Boltcall in under two seconds and triggers the first-touch call or SMS.',
    bestFor: ['Squarespace Personal/Business/Commerce plans', 'Squarespace Form Blocks', 'Newsletter Block signups', 'Cover Page contact forms'],
    workflows: [
      'Squarespace Form Block → Zapier → Boltcall instant response',
      'Squarespace Form Block → Code Injection → Boltcall (Business plan+)',
      'Squarespace booking widget → Boltcall speed-to-lead',
      'Squarespace Commerce order → Zapier → Boltcall follow-up',
    ],
    setup: [
      'Create a Boltcall API key in Dashboard > Settings > API Keys.',
      'Path A (Zapier, easiest): create a Zap with trigger "New Form Submission in Squarespace" and action "Send Lead to Boltcall" — map name, email, phone, source=squarespace_form.',
      'Path B (Code Injection, Business plan+): open Settings > Advanced > Code Injection > Footer.',
      'Paste this script (replace bc_YOUR_KEY): <script>document.addEventListener("submit",async e=>{const f=e.target;if(!f.matches(".form-wrapper form"))return;e.preventDefault();const d=new FormData(f);const b={name:d.get("fname")+" "+d.get("lname"),email:d.get("email"),phone:d.get("phone"),source:"squarespace_form",external_id:crypto.randomUUID()};await fetch("https://boltcall.org/.netlify/functions/lead-webhook",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer bc_YOUR_KEY"},body:JSON.stringify(b)});f.submit();});</script>',
      'Save and publish. Submit a real test form and verify the lead appears in Boltcall Dashboard > Leads.',
    ],
    acceptance: [
      'Zapier task history shows 201 from lead-webhook (Path A).',
      'Browser DevTools Network tab shows 201 lead-webhook POST on submit (Path B).',
      'Test lead visible in Boltcall Dashboard > Leads within 5 seconds.',
      'First-touch call fires when workspace has an active phone number and agent.',
    ],
    faqs: [
      {
        q: 'Why doesn\'t Squarespace have native webhooks for Form Blocks?',
        a: 'Squarespace webhooks are limited to their Commerce API (orders, subscriptions, inventory). Form Block submissions ship data via Google Drive, Mailchimp, or Zapier — not raw webhooks. This is a Squarespace platform limitation, not a Boltcall limitation.',
      },
      {
        q: 'Which path should I choose?',
        a: 'If you already pay for Zapier or want zero code, use Path A. If you are on Squarespace Business or Commerce and want no third-party fees, use Path B (Code Injection).',
      },
      {
        q: 'Does Path B work on the Squarespace Personal plan?',
        a: 'No. Code Injection requires the Business plan or higher. Personal-plan users must use Path A (Zapier).',
      },
      {
        q: 'Will the code injection break the native Squarespace success message?',
        a: 'The snippet calls f.submit() after POSTing to Boltcall so Squarespace still stores the submission and shows the built-in success state. If you prefer, remove the f.submit() line and use only Boltcall storage.',
      },
    ],
  },
];

function useMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const selector = 'meta[name="description"]';
    let meta = document.querySelector(selector);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, [title, description]);
}

function JsonLd({ value }: { value: unknown }) {
  // Escape "</script" so a JSON string containing example HTML (e.g. the
  // Squarespace HowTo step showing a snippet to paste) cannot terminate the
  // outer <script> tag mid-JSON. Without this, block 7 on
  // /integrations/squarespace/ prerendered as invalid JSON — Rich Results
  // reported "Bad escape sequence" per the 2026-08-29 audit.
  const escaped = JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escaped }}
    />
  );
}

function IconBadge({ item }: { item: IntegrationPageData }) {
  return (
    <div
      className="w-14 h-14 rounded-lg border border-gray-200 bg-white flex items-center justify-center shadow-sm overflow-hidden"
      style={{ boxShadow: `inset 0 0 0 3px ${item.fallback}10` }}
    >
      <img src={item.icon} alt="" className="w-8 h-8 object-contain" />
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white text-gray-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        {children}
      </div>
    </main>
  );
}

export const IntegrationsHubPage: React.FC = () => {
  useMeta(
    'Boltcall Integrations | Speed-to-Lead Automation',
    'Connect Boltcall with Zapier, Make, HubSpot, and GoHighLevel for AI speed-to-lead workflows.',
  );

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Boltcall integrations',
    itemListElement: integrations.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE}/integrations/${item.slug}`,
      name: item.name,
    })),
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Which Boltcall integrations are available first?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Boltcall prioritizes Zapier, Make, HubSpot, and GoHighLevel for same-day speed-to-lead workflows.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do these integrations require public marketplace approval?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No for private/developer use. Public marketplace listings require each platform review process.',
        },
      },
    ],
  };

  return (
    <PageShell>
      <JsonLd value={itemListSchema} />
      <JsonLd value={faqSchema} />

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <Plug className="w-4 h-4" />
            Speed-to-lead integrations
          </div>
          <h1 className="mt-5 text-4xl md:text-5xl font-bold tracking-normal text-gray-950">
            Connect Boltcall to the tools that catch your leads first.
          </h1>
          <p className="mt-5 text-lg leading-8 text-gray-600 max-w-2xl">
            Boltcall integrations send local-service leads from forms, ads,
            CRMs, and automation tools into an instant AI response system.
            Every connected source becomes another path to call, text, qualify,
            and book before a competitor responds.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <div className="grid grid-cols-2 gap-3">
            {integrations.map((item) => (
              <Link
                key={item.id}
                to={`/integrations/${item.slug}`}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition"
              >
                <IconBadge item={item} />
                <div className="mt-4 text-sm font-semibold text-gray-950">{item.name}</div>
                <div className="mt-1 text-xs text-gray-500">{item.category}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-gray-950">Priority integrations</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {integrations.map((item) => (
            <Link
              key={item.id}
              to={`/integrations/${item.slug}`}
              className="group rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition"
            >
              <div className="flex items-center gap-4">
                <IconBadge item={item} />
                <div>
                  <h3 className="font-semibold text-gray-950">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.meta}</p>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                View setup <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
};

function IntegrationDetailPage({ item }: { item: IntegrationPageData }) {
  useMeta(`${item.h1} | Boltcall`, item.meta);

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `Boltcall ${item.name} integration`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: `${SITE}/integrations/${item.slug}`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    provider: { '@type': 'Organization', name: 'Boltcall', url: SITE },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: item.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to connect ${item.name} to Boltcall`,
    step: item.setup.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      text: step,
    })),
  };

  return (
    <PageShell>
      <JsonLd value={softwareSchema} />
      <JsonLd value={faqSchema} />
      <JsonLd value={howToSchema} />

      <Link to="/integrations" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
        <ArrowRight className="w-4 h-4 rotate-180" />
        All integrations
      </Link>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div>
          <div className="flex items-center gap-4">
            <IconBadge item={item} />
            <div>
              <div className="text-sm font-semibold text-blue-700">{item.category}</div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-normal text-gray-950">{item.h1}</h1>
            </div>
          </div>
          <p className="mt-6 text-lg leading-8 text-gray-600">{item.meta}</p>

          <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-950">
              <Clock className="w-5 h-5 text-blue-700" />
              Direct answer
            </h2>
            <p className="mt-3 text-base leading-7 text-gray-800">{item.answer}</p>
          </div>
        </div>

        <aside className="rounded-lg border border-gray-200 bg-gray-50 p-5">
          <h2 className="text-lg font-semibold text-gray-950">Best for</h2>
          <div className="mt-4 grid gap-2">
            {item.bestFor.map((entry) => (
              <div key={entry} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {entry}
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-3">
        <InfoPanel icon={<Workflow className="w-5 h-5" />} title="Workflows" items={item.workflows} />
        <InfoPanel icon={<KeyRound className="w-5 h-5" />} title="Setup" items={item.setup} ordered />
        <InfoPanel icon={<CheckCircle2 className="w-5 h-5" />} title="Acceptance" items={item.acceptance} />
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-950">Questions</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {item.faqs.map((faq) => (
            <div key={faq.q} className="rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-950">{faq.q}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function InfoPanel({
  icon,
  title,
  items,
  ordered = false,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  ordered?: boolean;
}) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-950">
        <span className="text-blue-700">{icon}</span>
        {title}
      </h2>
      <List className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
        {items.map((item, index) => (
          <li key={item} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {ordered ? index + 1 : ''}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </List>
    </div>
  );
}

const byId = Object.fromEntries(integrations.map((item) => [item.id, item])) as Record<IntegrationId, IntegrationPageData>;

export const ZapierIntegrationPage = () => <IntegrationDetailPage item={byId.zapier} />;
export const MakeIntegrationPage = () => <IntegrationDetailPage item={byId.make} />;
export const HubSpotIntegrationPage = () => <IntegrationDetailPage item={byId.hubspot} />;
export const GoHighLevelIntegrationPage = () => <IntegrationDetailPage item={byId.gohighlevel} />;
export const WixIntegrationPage = () => <IntegrationDetailPage item={byId.wix} />;
export const SquarespaceIntegrationPage = () => <IntegrationDetailPage item={byId.squarespace} />;

export default IntegrationsHubPage;
