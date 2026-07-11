import dayjs from 'dayjs';
import type { Lead, Kpis, TimeSeriesPoint, ChannelPerf, Faq, Transcript, Alert, FunnelStep, Channel, Intent } from '../types/dashboard';

// Generate 60 days of mock data
const generateTimeSeriesData = (): TimeSeriesPoint[] => {
  const data: TimeSeriesPoint[] = [];
  const today = dayjs();
  
  for (let i = 59; i >= 0; i--) {
    const date = today.subtract(i, 'day');
    const baseLeads = Math.floor(Math.random() * 50) + 20;
    const baseBookings = Math.floor(baseLeads * (0.1 + Math.random() * 0.2));
    
    data.push({
      date: date.format('YYYY-MM-DD'),
      leads: baseLeads,
      bookings: baseBookings,
    });
  }
  
  return data;
};

const generateLeads = (): Lead[] => {
  const channels: Channel[] = ['form', 'sms', 'whatsapp', 'dm', 'missed_call'];
  const intents: Intent[] = ['new', 'engaged', 'qualified', 'booked', 'closed'];
  const sources = ['ads', 'organic', 'dm', 'referral', 'missed_call'];
  const names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown', 'Lisa Davis', 'Tom Miller', 'Amy Garcia'];
  const owners = ['Alice', 'Bob', 'Charlie', 'Diana'];
  const tags = ['VIP', 'Hot Lead', 'Follow-up', 'Demo Request', 'Price Inquiry'];
  
  const leads: Lead[] = [];
  
  for (let i = 0; i < 150; i++) {
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const intent = intents[Math.floor(Math.random() * intents.length)];
    const createdAt = dayjs().subtract(Math.floor(Math.random() * 30), 'day').toISOString();
    const qualified = Math.random() > 0.3;
    const booked = qualified && Math.random() > 0.4;
    const showed = booked && Math.random() > 0.2;
    
    leads.push({
      id: `lead-${i + 1}`,
      createdAt,
      name: names[Math.floor(Math.random() * names.length)],
      phone: `+1-555-${Math.floor(Math.random() * 9000) + 1000}`,
      email: `user${i + 1}@example.com`,
      channel,
      source: sources[Math.floor(Math.random() * sources.length)],
      intent,
      firstReplySec: Math.floor(Math.random() * 120) + 15,
      qualified,
      booked,
      bookingAt: booked ? dayjs(createdAt).add(Math.floor(Math.random() * 7), 'day').toISOString() : undefined,
      showed,
      owner: owners[Math.floor(Math.random() * owners.length)],
      tags: Math.random() > 0.5 ? [tags[Math.floor(Math.random() * tags.length)]] : [],
      lastMessage: 'Thanks for reaching out! I\'d love to learn more about your services.',
    });
  }
  
  return leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const generateKpis = (): Kpis => {
  return {
    leads: 1247,
    qualifiedPct: 0.68,
    bookings: 89,
    speedToFirstReplyMedianSec: 28,
    showRatePct: 0.82,
    deltas: {
      leads: 12.5,
      qualifiedPct: -2.3,
      bookings: 8.7,
      speedToFirstReplyMedianSec: -15.2,
      showRatePct: 3.1,
    },
  };
};

const generateChannelPerf = (): ChannelPerf[] => {
  const channels: Channel[] = ['form', 'sms', 'whatsapp', 'dm', 'missed_call'];
  
  return channels.map(channel => ({
    channel,
    qualified: Math.floor(Math.random() * 50) + 20,
    booked: Math.floor(Math.random() * 20) + 5,
  }));
};

const generateFaqs = (): Faq[] => {
  return [
    { id: '1', question: 'What are your business hours?', count: 45, avgTimeToAnswer: 12, suggestedTweak: 'Add to auto-reply' },
    { id: '2', question: 'Do you offer payment plans?', count: 38, avgTimeToAnswer: 8, suggestedTweak: 'Create FAQ page' },
    { id: '3', question: 'What is your pricing?', count: 32, avgTimeToAnswer: 15, suggestedTweak: 'Add pricing link' },
    { id: '4', question: 'Do you have a free trial?', count: 28, avgTimeToAnswer: 6, suggestedTweak: 'Update homepage' },
    { id: '5', question: 'How do I cancel my subscription?', count: 25, avgTimeToAnswer: 20, suggestedTweak: 'Add self-service' },
    { id: '6', question: 'What payment methods do you accept?', count: 22, avgTimeToAnswer: 10, suggestedTweak: 'Update checkout' },
    { id: '7', question: 'Is there a setup fee?', count: 18, avgTimeToAnswer: 5, suggestedTweak: 'Clarify pricing' },
    { id: '8', question: 'Do you offer refunds?', count: 15, avgTimeToAnswer: 25, suggestedTweak: 'Add policy page' },
    { id: '9', question: 'What is your response time?', count: 12, avgTimeToAnswer: 3, suggestedTweak: 'Update expectations' },
    { id: '10', question: 'Do you have a mobile app?', count: 10, avgTimeToAnswer: 7, suggestedTweak: 'Add app links' },
  ];
};

const generateTranscripts = (): Transcript[] => {
  const channels: Channel[] = ['form', 'sms', 'whatsapp', 'dm', 'missed_call'];
  const outcomes = ['Booked', 'Qualified', 'Follow-up', 'Not Interested', 'Callback'];
  
  return Array.from({ length: 20 }, (_, i) => ({
    id: `transcript-${i + 1}`,
    channel: channels[Math.floor(Math.random() * channels.length)],
    snippet: 'Hi, I\'m interested in your services. Can you tell me more about your pricing?',
    outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
    timestamp: dayjs().subtract(i, 'hour').toISOString(),
  }));
};

const generateAlerts = (): Alert[] => {
  return [];
};

const generateFunnelSteps = (): FunnelStep[] => {
  return [
    { name: 'Leads', count: 1247, rate: 100, totalRate: 100 },
    { name: 'Engaged', count: 892, rate: 71.5, totalRate: 71.5 },
    { name: 'Qualified', count: 456, rate: 51.1, totalRate: 36.6 },
    { name: 'Booked', count: 89, rate: 19.5, totalRate: 7.1 },
    { name: 'Showed', count: 73, rate: 82.0, totalRate: 5.9 },
  ];
};

export const mockData = {
  timeSeries: generateTimeSeriesData(),
  leads: generateLeads(),
  kpis: generateKpis(),
  channelPerf: generateChannelPerf(),
  faqs: generateFaqs(),
  transcripts: generateTranscripts(),
  alerts: generateAlerts(),
  funnelSteps: generateFunnelSteps(),
};
