import React, { useState, useEffect, useRef } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import {
  Code,
  Key,
  Phone,
  MessageSquare,
  Users,
  Calendar,
  BarChart3,
  Bot,
  Copy,
  Check,
  ChevronRight,
  Search,
  BookOpen,
  Shield,
  Zap,
  ArrowRight,
  ExternalLink,
  Terminal,
  FileJson,
  AlertCircle,
  Globe,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import GiveawayBar from '../components/GiveawayBar';
import Breadcrumbs from '../components/Breadcrumbs';
import { Link } from 'react-router-dom';

// ── Types ────────────────────────────────────────────────────────────────
interface Param {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  params?: Param[];
  body?: Param[];
  response: string;
}

interface ApiSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  endpoints: Endpoint[];
}

// ── Helpers ──────────────────────────────────────────────────────────────
const methodColors: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'json' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-gray-400 text-xs">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 bg-gray-900 text-gray-100 text-sm overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const MethodBadge: React.FC<{ method: string }> = ({ method }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold tracking-wide ${methodColors[method]}`}>
    {method}
  </span>
);

// ── API Data ─────────────────────────────────────────────────────────────
const apiSections: ApiSection[] = [
  {
    id: 'agents',
    title: 'Agents',
    icon: <Bot className="w-5 h-5" />,
    description: 'Create, configure, and manage your AI voice agents.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/agents',
        description: 'List all agents in your workspace.',
        params: [
          { name: 'page', type: 'integer', required: false, description: 'Page number (default: 1)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20, max: 100)' },
        ],
        response: `{
  "data": [
    {
      "id": "agent_abc123",
      "name": "Front Desk Agent",
      "voice_id": "voice_sarah",
      "status": "active",
      "phone_number": "+1234567890",
      "created_at": "2025-01-15T08:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3 }
}`,
      },
      {
        method: 'POST',
        path: '/v1/agents',
        description: 'Create a new AI agent.',
        body: [
          { name: 'name', type: 'string', required: true, description: 'Display name for the agent' },
          { name: 'voice_id', type: 'string', required: true, description: 'Voice to use (see Voice Library)' },
          { name: 'greeting', type: 'string', required: false, description: 'Custom greeting message' },
          { name: 'prompt', type: 'string', required: false, description: 'System prompt / persona instructions' },
          { name: 'knowledge_base_id', type: 'string', required: false, description: 'Linked knowledge base ID' },
        ],
        response: `{
  "id": "agent_def456",
  "name": "After-Hours Agent",
  "voice_id": "voice_james",
  "status": "active",
  "created_at": "2025-03-20T14:00:00Z"
}`,
      },
      {
        method: 'PATCH',
        path: '/v1/agents/:agent_id',
        description: 'Update an existing agent.',
        body: [
          { name: 'name', type: 'string', required: false, description: 'Updated display name' },
          { name: 'greeting', type: 'string', required: false, description: 'Updated greeting message' },
          { name: 'status', type: 'string', required: false, description: '"active" or "paused"' },
        ],
        response: `{
  "id": "agent_def456",
  "name": "After-Hours Agent v2",
  "status": "active",
  "updated_at": "2025-03-21T10:00:00Z"
}`,
      },
      {
        method: 'DELETE',
        path: '/v1/agents/:agent_id',
        description: 'Delete an agent. This cannot be undone.',
        response: `{ "deleted": true }`,
      },
    ],
  },
  {
    id: 'calls',
    title: 'Calls',
    icon: <Phone className="w-5 h-5" />,
    description: 'Access call history, recordings, and transcripts.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/calls',
        description: 'List call records with optional filters.',
        params: [
          { name: 'agent_id', type: 'string', required: false, description: 'Filter by agent' },
          { name: 'direction', type: 'string', required: false, description: '"inbound" or "outbound"' },
          { name: 'from', type: 'string', required: false, description: 'ISO 8601 start date' },
          { name: 'to', type: 'string', required: false, description: 'ISO 8601 end date' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20)' },
        ],
        response: `{
  "data": [
    {
      "id": "call_xyz789",
      "agent_id": "agent_abc123",
      "direction": "inbound",
      "caller": "+1987654321",
      "duration_seconds": 142,
      "status": "completed",
      "sentiment": "positive",
      "recording_url": "https://api.boltcall.org/v1/calls/call_xyz789/recording",
      "transcript_url": "https://api.boltcall.org/v1/calls/call_xyz789/transcript",
      "created_at": "2025-03-20T09:15:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 156 }
}`,
      },
      {
        method: 'GET',
        path: '/v1/calls/:call_id',
        description: 'Get detailed information for a single call.',
        response: `{
  "id": "call_xyz789",
  "agent_id": "agent_abc123",
  "direction": "inbound",
  "caller": "+1987654321",
  "duration_seconds": 142,
  "status": "completed",
  "sentiment": "positive",
  "summary": "Caller requested appointment for Friday.",
  "tags": ["appointment", "new-customer"],
  "recording_url": "https://...",
  "transcript": [
    { "role": "agent", "text": "Hello, thanks for calling..." },
    { "role": "caller", "text": "Hi, I'd like to book..." }
  ],
  "created_at": "2025-03-20T09:15:00Z"
}`,
      },
      {
        method: 'POST',
        path: '/v1/calls/outbound',
        description: 'Initiate an outbound call from an agent.',
        body: [
          { name: 'agent_id', type: 'string', required: true, description: 'Agent to place the call' },
          { name: 'to', type: 'string', required: true, description: 'Phone number in E.164 format' },
          { name: 'context', type: 'string', required: false, description: 'Briefing context for the agent' },
        ],
        response: `{
  "id": "call_out001",
  "status": "ringing",
  "agent_id": "agent_abc123",
  "to": "+1555000111",
  "created_at": "2025-03-20T14:30:00Z"
}`,
      },
    ],
  },
  {
    id: 'leads',
    title: 'Leads',
    icon: <Users className="w-5 h-5" />,
    description: 'Manage leads captured from calls, forms, and ads.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/leads',
        description: 'List all leads with filtering and sorting.',
        params: [
          { name: 'status', type: 'string', required: false, description: '"new", "contacted", "qualified", "converted"' },
          { name: 'source', type: 'string', required: false, description: '"call", "sms", "form", "facebook", "google"' },
          { name: 'sort', type: 'string', required: false, description: 'Field to sort by (default: created_at)' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20)' },
        ],
        response: `{
  "data": [
    {
      "id": "lead_001",
      "name": "Jane Smith",
      "phone": "+1555123456",
      "email": "jane@example.com",
      "status": "new",
      "source": "call",
      "score": 85,
      "tags": ["high-intent", "dental-cleaning"],
      "created_at": "2025-03-20T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42 }
}`,
      },
      {
        method: 'POST',
        path: '/v1/leads',
        description: 'Create a lead manually.',
        body: [
          { name: 'name', type: 'string', required: true, description: 'Full name' },
          { name: 'phone', type: 'string', required: false, description: 'Phone number (E.164)' },
          { name: 'email', type: 'string', required: false, description: 'Email address' },
          { name: 'source', type: 'string', required: false, description: 'Lead source label' },
          { name: 'tags', type: 'string[]', required: false, description: 'Tags for segmentation' },
        ],
        response: `{
  "id": "lead_002",
  "name": "John Doe",
  "status": "new",
  "created_at": "2025-03-20T11:30:00Z"
}`,
      },
    ],
  },
  {
    id: 'messages',
    title: 'Messages',
    icon: <MessageSquare className="w-5 h-5" />,
    description: 'Send and receive SMS, WhatsApp, and email messages.',
    endpoints: [
      {
        method: 'POST',
        path: '/v1/messages/sms',
        description: 'Send an SMS message.',
        body: [
          { name: 'to', type: 'string', required: true, description: 'Recipient phone number (E.164)' },
          { name: 'body', type: 'string', required: true, description: 'Message content (max 1600 chars)' },
          { name: 'from_number', type: 'string', required: false, description: 'Sender number (defaults to workspace number)' },
        ],
        response: `{
  "id": "msg_sms001",
  "channel": "sms",
  "status": "sent",
  "to": "+1555000111",
  "created_at": "2025-03-20T15:00:00Z"
}`,
      },
      {
        method: 'POST',
        path: '/v1/messages/whatsapp',
        description: 'Send a WhatsApp message.',
        body: [
          { name: 'to', type: 'string', required: true, description: 'Recipient phone number (E.164)' },
          { name: 'template', type: 'string', required: true, description: 'Approved template name' },
          { name: 'variables', type: 'object', required: false, description: 'Template variable values' },
        ],
        response: `{
  "id": "msg_wa001",
  "channel": "whatsapp",
  "status": "sent",
  "to": "+1555000111",
  "created_at": "2025-03-20T15:05:00Z"
}`,
      },
      {
        method: 'GET',
        path: '/v1/messages',
        description: 'List message history across all channels.',
        params: [
          { name: 'channel', type: 'string', required: false, description: '"sms", "whatsapp", or "email"' },
          { name: 'lead_id', type: 'string', required: false, description: 'Filter by lead' },
          { name: 'limit', type: 'integer', required: false, description: 'Items per page (default: 20)' },
        ],
        response: `{
  "data": [
    {
      "id": "msg_sms001",
      "channel": "sms",
      "direction": "outbound",
      "to": "+1555000111",
      "body": "Thanks for calling! Your appointment is confirmed.",
      "status": "delivered",
      "created_at": "2025-03-20T15:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 89 }
}`,
      },
    ],
  },
  {
    id: 'appointments',
    title: 'Appointments',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Manage appointments booked by your AI agents.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/appointments',
        description: 'List all appointments.',
        params: [
          { name: 'status', type: 'string', required: false, description: '"upcoming", "completed", "cancelled"' },
          { name: 'agent_id', type: 'string', required: false, description: 'Filter by booking agent' },
          { name: 'from', type: 'string', required: false, description: 'ISO 8601 start date' },
          { name: 'to', type: 'string', required: false, description: 'ISO 8601 end date' },
        ],
        response: `{
  "data": [
    {
      "id": "apt_001",
      "lead_id": "lead_001",
      "agent_id": "agent_abc123",
      "title": "Dental Cleaning",
      "start_time": "2025-03-25T10:00:00Z",
      "end_time": "2025-03-25T11:00:00Z",
      "status": "upcoming",
      "created_at": "2025-03-20T09:20:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12 }
}`,
      },
      {
        method: 'DELETE',
        path: '/v1/appointments/:appointment_id',
        description: 'Cancel an appointment.',
        response: `{ "id": "apt_001", "status": "cancelled" }`,
      },
    ],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    icon: <Globe className="w-5 h-5" />,
    description: 'Subscribe to real-time events from your workspace.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/webhooks',
        description: 'List all registered webhook endpoints.',
        response: `{
  "data": [
    {
      "id": "wh_001",
      "url": "https://yourapp.com/hooks/boltcall",
      "events": ["call.completed", "lead.created"],
      "status": "active",
      "created_at": "2025-02-10T12:00:00Z"
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/v1/webhooks',
        description: 'Register a new webhook endpoint.',
        body: [
          { name: 'url', type: 'string', required: true, description: 'HTTPS endpoint URL' },
          { name: 'events', type: 'string[]', required: true, description: 'Event types to subscribe to' },
          { name: 'secret', type: 'string', required: false, description: 'Signing secret for verification' },
        ],
        response: `{
  "id": "wh_002",
  "url": "https://yourapp.com/hooks/boltcall",
  "events": ["call.completed", "lead.created", "appointment.booked"],
  "status": "active",
  "secret": "whsec_abc123...",
  "created_at": "2025-03-20T16:00:00Z"
}`,
      },
      {
        method: 'DELETE',
        path: '/v1/webhooks/:webhook_id',
        description: 'Remove a webhook subscription.',
        response: `{ "deleted": true }`,
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    description: 'Retrieve usage metrics and performance analytics.',
    endpoints: [
      {
        method: 'GET',
        path: '/v1/analytics/overview',
        description: 'Get a summary of key metrics for a date range.',
        params: [
          { name: 'from', type: 'string', required: true, description: 'ISO 8601 start date' },
          { name: 'to', type: 'string', required: true, description: 'ISO 8601 end date' },
        ],
        response: `{
  "period": { "from": "2025-03-01", "to": "2025-03-31" },
  "calls": { "total": 487, "answered": 472, "missed": 15 },
  "leads": { "captured": 89, "qualified": 34, "converted": 12 },
  "messages": { "sent": 312, "delivered": 308 },
  "appointments": { "booked": 56, "completed": 48, "cancelled": 8 },
  "avg_response_time_seconds": 4.2
}`,
      },
      {
        method: 'GET',
        path: '/v1/analytics/usage',
        description: 'Get token and minute usage for billing period.',
        response: `{
  "billing_period": { "from": "2025-03-01", "to": "2025-03-31" },
  "minutes_used": 1243,
  "minutes_limit": 2000,
  "sms_sent": 312,
  "sms_limit": 500,
  "api_calls": 4521
}`,
      },
    ],
  },
];

const webhookEvents = [
  { event: 'call.started', description: 'An inbound or outbound call has started' },
  { event: 'call.completed', description: 'A call has ended (includes transcript & recording URLs)' },
  { event: 'call.missed', description: 'An inbound call was not answered' },
  { event: 'lead.created', description: 'A new lead was captured' },
  { event: 'lead.updated', description: 'Lead status or details were changed' },
  { event: 'appointment.booked', description: 'An appointment was scheduled' },
  { event: 'appointment.cancelled', description: 'An appointment was cancelled' },
  { event: 'message.received', description: 'An inbound SMS or WhatsApp message arrived' },
  { event: 'message.delivered', description: 'An outbound message was delivered' },
];

// ── Component ────────────────────────────────────────────────────────────
const ApiDocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('agents');
  const [searchQuery, setSearchQuery] = useState('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'API Documentation | Boltcall';
    updateMetaDescription(
      'Boltcall REST API documentation. Integrate AI voice agents, calls, leads, messages, appointments, webhooks, and analytics into your applications.'
    );
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredSections = searchQuery
    ? apiSections.filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.endpoints.some(
            (e) =>
              e.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
              e.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : apiSections;

  return (
    <div className="min-h-screen bg-white">
      <GiveawayBar />
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-blue-50/30">
        <div className="max-w-4xl mx-auto">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Resources', href: '/documentation' },
              { label: 'API Documentation', href: '/api-documentation' },
            ]}
          />
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full mb-6">
                <Code className="w-4 h-4" />
                <span className="font-semibold">REST API v1</span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Boltcall <span className="text-blue-600">API Documentation</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Integrate AI voice agents, calls, leads, and messaging into your apps with our simple REST API.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/setup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Key className="w-4 h-4" />
                  Get API Key
                </Link>
                <button
                  onClick={() => scrollToSection('agents')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <BookOpen className="w-4 h-4" />
                  Explore Endpoints
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Quick Start</span>
            </h2>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {[
                {
                  step: '1',
                  icon: <Key className="w-5 h-5 text-blue-600" />,
                  title: 'Get your API key',
                  desc: 'Generate a key from Settings \u2192 API Keys in your dashboard.',
                },
                {
                  step: '2',
                  icon: <Terminal className="w-5 h-5 text-blue-600" />,
                  title: 'Make your first call',
                  desc: 'Use any HTTP client to call the API with your key.',
                },
                {
                  step: '3',
                  icon: <Globe className="w-5 h-5 text-blue-600" />,
                  title: 'Listen for events',
                  desc: 'Register webhooks to get real-time notifications.',
                },
              ].map((item) => (
                <div key={item.step} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-sm font-bold text-blue-600">{item.step}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>

            <CodeBlock
              language="bash"
              code={`curl -X GET https://api.boltcall.org/v1/agents \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
            />
          </motion.div>
        </div>
      </section>

      {/* Authentication */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Authentication</span>
            </h2>

            <div className="space-y-6">
              <p className="text-gray-600">
                All API requests require a Bearer token in the <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">Authorization</code> header.
                Generate keys in your dashboard under <strong>Settings \u2192 API Keys</strong>.
              </p>

              <CodeBlock
                language="http"
                code={`Authorization: Bearer sk_live_abc123def456...`}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-5 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Live keys</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Prefixed with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">sk_live_</code>.
                    Use in production. All actions are real.
                  </p>
                </div>
                <div className="bg-white rounded-lg p-5 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-gray-900">Test keys</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Prefixed with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">sk_test_</code>.
                    Safe for development. No calls are placed.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-800 font-medium">Keep your keys secure</p>
                  <p className="text-sm text-amber-700 mt-1">
                    Never expose API keys in client-side code or public repositories. Use environment variables and server-side requests.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Base URL & Rate Limits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Base URL & Rate Limits</span>
            </h2>

            <div className="space-y-6">
              <CodeBlock language="text" code="https://api.boltcall.org/v1" />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-3 pr-4 font-semibold text-gray-900">Plan</th>
                      <th className="py-3 pr-4 font-semibold text-gray-900">Rate Limit</th>
                      <th className="py-3 font-semibold text-gray-900">Burst</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-4">Starter</td>
                      <td className="py-3 pr-4">60 requests / minute</td>
                      <td className="py-3">10</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 pr-4">Pro</td>
                      <td className="py-3 pr-4">300 requests / minute</td>
                      <td className="py-3">50</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4">Elite</td>
                      <td className="py-3 pr-4">1,000 requests / minute</td>
                      <td className="py-3">200</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-gray-500">
                Rate limit headers (<code className="font-mono">X-RateLimit-Remaining</code>, <code className="font-mono">X-RateLimit-Reset</code>) are included in every response.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Endpoint Reference */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Endpoint Reference</span>
            </h2>
            <p className="text-gray-600 mb-8 ml-4">
              Complete list of available API endpoints organized by resource.
            </p>
          </motion.div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search endpoints..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar nav */}
            <div className="lg:col-span-1">
              <nav className="sticky top-28 bg-white rounded-xl border border-gray-200 p-4 space-y-1">
                {apiSections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                      activeSection === s.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s.icon}
                    {s.title}
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                ))}
              </nav>
            </div>

            {/* Endpoint cards */}
            <div className="lg:col-span-3 space-y-12">
              {filteredSections.map((section, idx) => (
                <motion.div
                  key={section.id}
                  ref={(el) => { sectionRefs.current[section.id] = el; }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">{section.icon}</div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                      <p className="text-sm text-gray-500">{section.description}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {section.endpoints.map((ep, epIdx) => (
                      <div
                        key={epIdx}
                        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                      >
                        {/* Endpoint header */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                          <MethodBadge method={ep.method} />
                          <code className="text-sm font-mono text-gray-800">{ep.path}</code>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                          <p className="text-gray-600 text-sm">{ep.description}</p>

                          {/* Query params */}
                          {ep.params && ep.params.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Query Parameters
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left border-b border-gray-100">
                                      <th className="pb-2 pr-3 font-medium text-gray-700">Name</th>
                                      <th className="pb-2 pr-3 font-medium text-gray-700">Type</th>
                                      <th className="pb-2 pr-3 font-medium text-gray-700">Required</th>
                                      <th className="pb-2 font-medium text-gray-700">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ep.params.map((p) => (
                                      <tr key={p.name} className="border-b border-gray-50">
                                        <td className="py-2 pr-3 font-mono text-xs text-blue-600">{p.name}</td>
                                        <td className="py-2 pr-3 text-gray-500 text-xs">{p.type}</td>
                                        <td className="py-2 pr-3">
                                          {p.required ? (
                                            <span className="text-xs font-medium text-red-600">required</span>
                                          ) : (
                                            <span className="text-xs text-gray-400">optional</span>
                                          )}
                                        </td>
                                        <td className="py-2 text-gray-600 text-xs">{p.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Request body */}
                          {ep.body && ep.body.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Request Body
                              </h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left border-b border-gray-100">
                                      <th className="pb-2 pr-3 font-medium text-gray-700">Field</th>
                                      <th className="pb-2 pr-3 font-medium text-gray-700">Type</th>
                                      <th className="pb-2 pr-3 font-medium text-gray-700">Required</th>
                                      <th className="pb-2 font-medium text-gray-700">Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ep.body.map((b) => (
                                      <tr key={b.name} className="border-b border-gray-50">
                                        <td className="py-2 pr-3 font-mono text-xs text-blue-600">{b.name}</td>
                                        <td className="py-2 pr-3 text-gray-500 text-xs">{b.type}</td>
                                        <td className="py-2 pr-3">
                                          {b.required ? (
                                            <span className="text-xs font-medium text-red-600">required</span>
                                          ) : (
                                            <span className="text-xs text-gray-400">optional</span>
                                          )}
                                        </td>
                                        <td className="py-2 text-gray-600 text-xs">{b.description}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Response */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              Response
                            </h4>
                            <CodeBlock code={ep.response} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Webhook Events */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Webhook Events</span>
            </h2>

            <p className="text-gray-600 mb-6">
              Subscribe to these events to receive real-time POST requests at your webhook URL.
              Each payload includes an <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">event</code> field
              and a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">data</code> object with the full resource.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-3 pr-4 font-semibold text-gray-900">Event</th>
                    <th className="py-3 font-semibold text-gray-900">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {webhookEvents.map((e) => (
                    <tr key={e.event} className="border-b border-gray-100">
                      <td className="py-3 pr-4">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono text-blue-600">
                          {e.event}
                        </code>
                      </td>
                      <td className="py-3 text-gray-600">{e.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-3">Example webhook payload</h3>
              <CodeBlock
                code={`{
  "event": "call.completed",
  "timestamp": "2025-03-20T09:17:22Z",
  "data": {
    "id": "call_xyz789",
    "agent_id": "agent_abc123",
    "direction": "inbound",
    "caller": "+1987654321",
    "duration_seconds": 142,
    "status": "completed",
    "sentiment": "positive",
    "summary": "Caller requested appointment for Friday.",
    "recording_url": "https://api.boltcall.org/v1/calls/call_xyz789/recording"
  }
}`}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Error Codes */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>Error Codes</span>
            </h2>

            <p className="text-gray-600 mb-6">
              All errors follow a consistent structure with an HTTP status code and a JSON body.
            </p>

            <CodeBlock
              code={`{
  "error": {
    "code": "invalid_api_key",
    "message": "The API key provided is invalid or expired.",
    "status": 401
  }
}`}
            />

            <div className="overflow-x-auto mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-3 pr-4 font-semibold text-gray-900">Status</th>
                    <th className="py-3 pr-4 font-semibold text-gray-900">Code</th>
                    <th className="py-3 font-semibold text-gray-900">Description</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  {[
                    { status: '400', code: 'bad_request', desc: 'The request body is malformed or missing required fields.' },
                    { status: '401', code: 'invalid_api_key', desc: 'API key is missing, invalid, or expired.' },
                    { status: '403', code: 'forbidden', desc: 'Your key does not have permission for this resource.' },
                    { status: '404', code: 'not_found', desc: 'The requested resource does not exist.' },
                    { status: '409', code: 'conflict', desc: 'The resource already exists or has a conflicting state.' },
                    { status: '422', code: 'validation_error', desc: 'Request data failed validation. Check the error message.' },
                    { status: '429', code: 'rate_limited', desc: 'Too many requests. Back off and retry with exponential delay.' },
                    { status: '500', code: 'internal_error', desc: 'Something went wrong on our end. Contact support if it persists.' },
                  ].map((row) => (
                    <tr key={row.code} className="border-b border-gray-100">
                      <td className="py-3 pr-4 font-mono text-xs">{row.status}</td>
                      <td className="py-3 pr-4">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{row.code}</code>
                      </td>
                      <td className="py-3">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SDKs & Libraries */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-1 self-stretch bg-blue-600 rounded-full"></div>
              <span>SDKs & Libraries</span>
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { lang: 'Node.js', install: 'npm install @boltcall/sdk', icon: <FileJson className="w-5 h-5 text-green-600" /> },
                { lang: 'Python', install: 'pip install boltcall', icon: <FileJson className="w-5 h-5 text-blue-500" /> },
                { lang: 'cURL', install: 'Works out of the box', icon: <Terminal className="w-5 h-5 text-gray-700" /> },
              ].map((sdk) => (
                <div key={sdk.lang} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    {sdk.icon}
                    <h3 className="font-semibold text-gray-900">{sdk.lang}</h3>
                  </div>
                  <code className="text-xs font-mono text-gray-600 bg-white px-2 py-1 rounded border border-gray-200 block overflow-x-auto">
                    {sdk.install}
                  </code>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="font-semibold text-gray-900 mb-3">Node.js example</h3>
              <CodeBlock
                language="javascript"
                code={`import Boltcall from '@boltcall/sdk';

const client = new Boltcall({ apiKey: process.env.BOLTCALL_API_KEY });

// List agents
const agents = await client.agents.list();
console.log(agents.data);

// Initiate an outbound call
const call = await client.calls.create({
  agent_id: 'agent_abc123',
  to: '+1555000111',
  context: 'Follow up on dental cleaning inquiry',
});
console.log('Call started:', call.id);`}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <div className="flex justify-center gap-3 mb-4">
                {[Code, Zap, Shield].map((Icon, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.15 }}
                    className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"
                  >
                    <Icon className="w-5 h-5 text-blue-600" />
                  </motion.div>
                ))}
              </div>
              <h2 className="text-3xl md:text-4xl font-medium text-gray-900 mt-4">
                Ready to integrate?
              </h2>
              <p className="text-base text-gray-600 mt-2 max-w-lg mx-auto">
                Get your API key and start building with Boltcall in minutes. Free tier includes 100 API calls per day.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <Link
                  to="/setup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Get API Key
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  Contact Sales
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ApiDocsPage;
