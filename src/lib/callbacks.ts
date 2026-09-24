import { supabase } from './supabase';
import type { Callback, CreateCallbackRequest, UpdateCallbackRequest, CallbackFilters, CallbackStats } from '../types/callbacks';

export class CallbackService {
  /**
   * Create a new callback request
   */
  static async createCallback(callbackData: CreateCallbackRequest): Promise<Callback> {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('callbacks')
      .insert([{ ...callbackData, user_id: user?.id }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create callback: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all callbacks with optional filtering
   */
  static async getCallbacks(filters?: CallbackFilters): Promise<Callback[]> {
    let query = supabase
      .from('callbacks')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          company,
          phone
        ),
        assigned_agent:assigned_agent_id (
          id,
          email,
          name
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.urgency && filters.urgency.length > 0) {
        query = query.in('urgency', filters.urgency);
      }
      if (filters.assigned_agent_id) {
        query = query.eq('assigned_agent_id', filters.assigned_agent_id);
      }
      if (filters.source && filters.source.length > 0) {
        query = query.in('source', filters.source);
      }
      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after);
      }
      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before);
      }
      if (filters.scheduled_after) {
        query = query.gte('scheduled_at', filters.scheduled_after);
      }
      if (filters.scheduled_before) {
        query = query.lte('scheduled_at', filters.scheduled_before);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch callbacks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single callback by ID
   */
  static async getCallbackById(id: string): Promise<Callback | null> {
    const { data, error } = await supabase
      .from('callbacks')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          company,
          phone
        ),
        assigned_agent:assigned_agent_id (
          id,
          email,
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch callback: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a callback
   */
  static async updateCallback(id: string, updates: UpdateCallbackRequest): Promise<Callback> {
    const { data, error } = await supabase
      .from('callbacks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update callback: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a callback
   */
  static async deleteCallback(id: string): Promise<void> {
    const { error } = await supabase
      .from('callbacks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete callback: ${error.message}`);
    }
  }

  /**
   * Get callbacks by lead ID
   */
  static async getCallbacksByLeadId(leadId: string): Promise<Callback[]> {
    const { data, error } = await supabase
      .from('callbacks')
      .select(`
        *,
        assigned_agent:assigned_agent_id (
          id,
          email,
          name
        )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch callbacks for lead: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get callbacks assigned to a specific agent
   */
  static async getCallbacksByAgent(agentId: string): Promise<Callback[]> {
    const { data, error } = await supabase
      .from('callbacks')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          company,
          phone
        )
      `)
      .eq('assigned_agent_id', agentId)
      // ponytail: callbacks.priority doesn't exist in prod; order by created_at.
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch callbacks for agent: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get pending callbacks that need to be scheduled
   */
  static async getPendingCallbacks(): Promise<Callback[]> {
    const { data, error } = await supabase
      .from('callbacks')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          company,
          phone
        )
      `)
      .eq('status', 'pending')
      // ponytail: callbacks.priority doesn't exist in prod; order by created_at.
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch pending callbacks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get scheduled callbacks for a specific date range
   */
  static async getScheduledCallbacks(startDate: string, endDate: string): Promise<Callback[]> {
    const { data, error } = await supabase
      .from('callbacks')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          company,
          phone
        ),
        assigned_agent:assigned_agent_id (
          id,
          email,
          name
        )
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate)
      .order('scheduled_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch scheduled callbacks: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark a callback as completed
   */
  static async markCallbackCompleted(id: string, outcome: string, outcomeNotes?: string): Promise<Callback> {
    const updates: UpdateCallbackRequest = {
      status: 'completed',
      outcome: outcome as any,
      outcome_notes: outcomeNotes,
      completed_at: new Date().toISOString()
    };

    return this.updateCallback(id, updates);
  }

  /**
   * Schedule a callback
   */
  static async scheduleCallback(id: string, scheduledAt: string, assignedAgentId?: string): Promise<Callback> {
    const updates: UpdateCallbackRequest = {
      status: 'scheduled',
      scheduled_at: scheduledAt,
      assigned_agent_id: assignedAgentId
    };

    return this.updateCallback(id, updates);
  }

  /**
   * Record a callback attempt
   */
  static async recordCallbackAttempt(id: string, outcome: string, notes?: string): Promise<Callback> {
    const callback = await this.getCallbackById(id);
    if (!callback) {
      throw new Error('Callback not found');
    }

    const updates: UpdateCallbackRequest = {
      attempted_at: new Date().toISOString(),
      attempt_count: callback.attempt_count + 1,
      outcome: outcome as any,
      outcome_notes: notes
    };

    return this.updateCallback(id, updates);
  }

  /**
   * Get callback statistics
   */
  static async getCallbackStats(): Promise<CallbackStats> {
    const { data: callbacks, error } = await supabase
      .from('callbacks')
      .select('status, urgency, outcome, attempt_count');

    if (error) {
      throw new Error(`Failed to fetch callback stats: ${error.message}`);
    }

    const stats: CallbackStats = {
      total: callbacks?.length || 0,
      pending: 0,
      scheduled: 0,
      completed: 0,
      cancelled: 0,
      no_answer: 0,
      by_urgency: {
        urgent: 0,
        normal: 0,
        low: 0
      },
      by_outcome: {
        successful: 0,
        no_answer: 0,
        busy: 0,
        wrong_number: 0,
        callback_requested: 0,
        not_interested: 0,
        voicemail: 0,
        callback_scheduled: 0
      },
      average_attempts: 0,
      completion_rate: 0
    };

    if (!callbacks) return stats;

    let totalAttempts = 0;
    let completedCount = 0;

    callbacks.forEach(callback => {
      // Count by status
      switch (callback.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'scheduled':
          stats.scheduled++;
          break;
        case 'completed':
          stats.completed++;
          completedCount++;
          break;
        case 'cancelled':
          stats.cancelled++;
          break;
        case 'no_answer':
          stats.no_answer++;
          break;
      }

      // Count by urgency
      if (callback.urgency) {
        stats.by_urgency[callback.urgency as keyof typeof stats.by_urgency]++;
      }

      // Count by outcome
      if (callback.outcome) {
        stats.by_outcome[callback.outcome as keyof typeof stats.by_outcome]++;
      }

      // Calculate average attempts
      totalAttempts += callback.attempt_count || 0;
    });

    stats.average_attempts = stats.total > 0 ? totalAttempts / stats.total : 0;
    stats.completion_rate = stats.total > 0 ? (completedCount / stats.total) * 100 : 0;

    return stats;
  }
}
