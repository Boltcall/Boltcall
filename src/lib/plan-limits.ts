/**
 * Centralized plan limits configuration.
 * All per-resource limits for each plan tier are defined here.
 */

export type ResourceType =
  | 'ai_voice_minutes'
  | 'ai_chat_messages'
  | 'sms_sent'
  | 'phone_numbers'
  | 'team_members'
  | 'kb_storage_mb';

export type PlanTier = 'free' | 'starter' | 'pro' | 'ultimate' | 'enterprise';

export interface ResourceLimit {
  limit: number; // -1 means unlimited
  label: string;
  unit: string;
  icon: string; // lucide icon name
  description: string;
}

export interface PlanConfig {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyTokens: number;
  limits: Record<ResourceType, ResourceLimit>;
}

// -1 = unlimited
const UNLIMITED = -1;

export const POOLED_USAGE_RESOURCES = [
  'ai_voice_minutes',
  'ai_chat_messages',
  'sms_sent',
] as const satisfies ResourceType[];

export const STRUCTURAL_LIMIT_RESOURCES = [
  'phone_numbers',
  'team_members',
  'kb_storage_mb',
] as const satisfies ResourceType[];

export const PLAN_LIMITS: Record<PlanTier, PlanConfig> = {
  free: {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyTokens: 50,
    limits: {
      ai_voice_minutes: { limit: 10, label: 'AI Voice Minutes', unit: 'min', icon: 'Phone', description: 'Minutes of AI phone conversations' },
      ai_chat_messages: { limit: 50, label: 'AI Chat Messages', unit: 'msgs', icon: 'MessageCircle', description: 'AI chatbot messages sent' },
      sms_sent: { limit: 20, label: 'SMS Sent', unit: 'sms', icon: 'MessageSquare', description: 'Text messages sent to leads' },
      phone_numbers: { limit: 0, label: 'Phone Numbers', unit: '', icon: 'Smartphone', description: 'Active phone numbers' },
      team_members: { limit: 1, label: 'Team Members', unit: 'seats', icon: 'Users', description: 'Team member seats' },
      kb_storage_mb: { limit: 10, label: 'KB Storage', unit: 'MB', icon: 'Database', description: 'Knowledge base storage' },
    },
  },
  starter: {
    name: 'Starter',
    monthlyPrice: 99,
    yearlyPrice: 948,
    monthlyTokens: 1000,
    limits: {
      ai_voice_minutes: { limit: 100, label: 'AI Voice Minutes', unit: 'min', icon: 'Phone', description: 'Minutes of AI phone conversations' },
      ai_chat_messages: { limit: 500, label: 'AI Chat Messages', unit: 'msgs', icon: 'MessageCircle', description: 'AI chatbot messages sent' },
      sms_sent: { limit: 200, label: 'SMS Sent', unit: 'sms', icon: 'MessageSquare', description: 'Text messages sent to leads' },
      phone_numbers: { limit: 1, label: 'Phone Numbers', unit: '', icon: 'Smartphone', description: 'Active phone numbers' },
      team_members: { limit: 1, label: 'Team Members', unit: 'seats', icon: 'Users', description: 'Team member seats' },
      kb_storage_mb: { limit: 100, label: 'KB Storage', unit: 'MB', icon: 'Database', description: 'Knowledge base storage' },
    },
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 179,
    yearlyPrice: 1716,
    monthlyTokens: 3000,
    limits: {
      ai_voice_minutes: { limit: 500, label: 'AI Voice Minutes', unit: 'min', icon: 'Phone', description: 'Minutes of AI phone conversations' },
      ai_chat_messages: { limit: 2000, label: 'AI Chat Messages', unit: 'msgs', icon: 'MessageCircle', description: 'AI chatbot messages sent' },
      sms_sent: { limit: 1000, label: 'SMS Sent', unit: 'sms', icon: 'MessageSquare', description: 'Text messages sent to leads' },
      phone_numbers: { limit: 3, label: 'Phone Numbers', unit: '', icon: 'Smartphone', description: 'Active phone numbers' },
      team_members: { limit: 3, label: 'Team Members', unit: 'seats', icon: 'Users', description: 'Team member seats' },
      kb_storage_mb: { limit: 500, label: 'KB Storage', unit: 'MB', icon: 'Database', description: 'Knowledge base storage' },
    },
  },
  ultimate: {
    name: 'Ultimate',
    monthlyPrice: 249,
    yearlyPrice: 2388,
    monthlyTokens: 10000,
    limits: {
      ai_voice_minutes: { limit: 2000, label: 'AI Voice Minutes', unit: 'min', icon: 'Phone', description: 'Minutes of AI phone conversations' },
      ai_chat_messages: { limit: 10000, label: 'AI Chat Messages', unit: 'msgs', icon: 'MessageCircle', description: 'AI chatbot messages sent' },
      sms_sent: { limit: 5000, label: 'SMS Sent', unit: 'sms', icon: 'MessageSquare', description: 'Text messages sent to leads' },
      phone_numbers: { limit: 10, label: 'Phone Numbers', unit: '', icon: 'Smartphone', description: 'Active phone numbers' },
      team_members: { limit: 10, label: 'Team Members', unit: 'seats', icon: 'Users', description: 'Team member seats' },
      kb_storage_mb: { limit: 2048, label: 'KB Storage', unit: 'MB', icon: 'Database', description: 'Knowledge base storage' },
    },
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 997,
    yearlyPrice: 11964,
    monthlyTokens: 50000,
    limits: {
      ai_voice_minutes: { limit: UNLIMITED, label: 'AI Voice Minutes', unit: 'min', icon: 'Phone', description: 'Minutes of AI phone conversations' },
      ai_chat_messages: { limit: UNLIMITED, label: 'AI Chat Messages', unit: 'msgs', icon: 'MessageCircle', description: 'AI chatbot messages sent' },
      sms_sent: { limit: UNLIMITED, label: 'SMS Sent', unit: 'sms', icon: 'MessageSquare', description: 'Text messages sent to leads' },
      phone_numbers: { limit: UNLIMITED, label: 'Phone Numbers', unit: '', icon: 'Smartphone', description: 'Active phone numbers' },
      team_members: { limit: UNLIMITED, label: 'Team Members', unit: 'seats', icon: 'Users', description: 'Team member seats' },
      kb_storage_mb: { limit: 10240, label: 'KB Storage', unit: 'MB', icon: 'Database', description: 'Knowledge base storage' },
    },
  },
};

// ── Helper functions ──

/**
 * Get the limit for a specific resource on a specific plan.
 * Returns -1 for unlimited.
 */
export function getPlanLimit(plan: PlanTier, resource: ResourceType): number {
  return PLAN_LIMITS[plan]?.limits[resource]?.limit ?? 0;
}

/**
 * Check if current usage has hit the limit for a resource.
 * Returns false for unlimited plans (-1).
 */
export function isAtLimit(plan: PlanTier, resource: ResourceType, currentUsage: number): boolean {
  const limit = getPlanLimit(plan, resource);
  if (limit === UNLIMITED) return false;
  return currentUsage >= limit;
}

/**
 * Get usage percentage (0-100). Returns 0 for unlimited plans.
 */
export function getUsagePercentage(plan: PlanTier, resource: ResourceType, currentUsage: number): number {
  const limit = getPlanLimit(plan, resource);
  if (limit === UNLIMITED || limit === 0) return 0;
  return Math.min((currentUsage / limit) * 100, 100);
}

/**
 * Check if usage is approaching limit (>= 80%).
 */
export function isApproachingLimit(plan: PlanTier, resource: ResourceType, currentUsage: number): boolean {
  const pct = getUsagePercentage(plan, resource, currentUsage);
  return pct >= 80 && pct < 100;
}

/**
 * Format a limit value for display.
 */
export function formatLimit(limit: number, unit: string): string {
  if (limit === UNLIMITED) return 'Unlimited';
  if (unit === 'MB' && limit >= 1024) return `${(limit / 1024).toFixed(0)} GB`;
  return `${limit.toLocaleString()}${unit ? ` ${unit}` : ''}`;
}

/**
 * Get the resource config (label, unit, icon, description) for a resource.
 */
export function getResourceConfig(resource: ResourceType): ResourceLimit {
  // Use starter as reference for labels (they're the same across plans)
  return PLAN_LIMITS.starter.limits[resource];
}

/**
 * Get the color for a usage percentage.
 */
export function getUsageColor(percentage: number): 'green' | 'yellow' | 'red' {
  if (percentage >= 90) return 'red';
  if (percentage >= 75) return 'yellow';
  return 'green';
}

/**
 * Get the CSS classes for a usage bar based on percentage.
 */
export function getUsageBarClasses(percentage: number): { bar: string; text: string } {
  if (percentage >= 90) return { bar: 'bg-red-500', text: 'text-red-600' };
  if (percentage >= 75) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-blue-500', text: 'text-blue-600' };
}

/**
 * Get all resources as an array with their configs.
 */
export function getAllResources(): Array<{ key: ResourceType } & ResourceLimit> {
  const resources: ResourceType[] = [
    'ai_voice_minutes',
    'ai_chat_messages',
    'sms_sent',
    'phone_numbers',
    'team_members',
    'kb_storage_mb',
  ];
  return resources.map((key) => ({
    key,
    ...getResourceConfig(key),
  }));
}

export function isPooledUsageResource(resource: ResourceType): boolean {
  return (POOLED_USAGE_RESOURCES as readonly ResourceType[]).includes(resource);
}

export function isStructuralLimitResource(resource: ResourceType): boolean {
  return (STRUCTURAL_LIMIT_RESOURCES as readonly ResourceType[]).includes(resource);
}

/**
 * Get the next upgrade plan from current plan.
 */
export function getNextPlan(currentPlan: PlanTier): PlanTier | null {
  const order: PlanTier[] = ['free', 'starter', 'pro', 'ultimate', 'enterprise'];
  const idx = order.indexOf(currentPlan);
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}
