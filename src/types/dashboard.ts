export type Channel = "form" | "sms" | "whatsapp" | "dm" | "missed_call";
export type Intent = "new" | "engaged" | "qualified" | "booked" | "closed";

export interface Lead {
  id: string;
  createdAt: string; // ISO
  name?: string;
  phone?: string;
  email?: string;
  channel: Channel;
  source?: string; // "ads|organic|dm|referral|missed_call"
  intent: Intent;
  firstReplySec?: number;
  qualified: boolean;
  booked: boolean;
  bookingAt?: string; // ISO
  showed?: boolean;
  owner?: string;
  tags?: string[];
  lastMessage?: string;
}

export interface Kpis {
  leads: number;
  qualifiedPct: number; // 0..1
  bookings: number;
  speedToFirstReplyMedianSec: number;
  showRatePct: number; // 0..1
  deltas: Record<keyof Omit<Kpis, "deltas">, number>; // percentage deltas
}

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  leads: number;
  bookings: number;
}

export interface ChannelPerf {
  channel: Channel;
  qualified: number;
  booked: number;
}

export interface Faq {
  id: string;
  question: string;
  count: number;
  avgTimeToAnswer: number;
  suggestedTweak?: string;
}

export interface Transcript {
  id: string;
  channel: Channel;
  snippet: string;
  outcome: string;
  timestamp: string;
}

export interface Alert {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
  title?: string;
  link?: string;
}

export interface FunnelStep {
  name: string;
  count: number;
  rate: number; // percentage from previous step
  totalRate: number; // percentage from start
}
