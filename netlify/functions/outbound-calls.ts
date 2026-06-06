import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { deductTokens, getServiceSupabase, TOKEN_COSTS } from './_shared/token-utils';
import { notifyError } from './_shared/notify';
import { getUserAgentIds, getUserPhoneNumbers } from './_shared/require-auth';
import { requireMatchingUser } from './_shared/user-auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

function getRetellClient() {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) throw new Error('RETELL_API_KEY not configured');
  return new Retell({ apiKey });
}

async function validateOutboundResources(userId: string, agentId: string, fromNumber: string) {
  const [agentIds, phoneNumbers] = await Promise.all([
    getUserAgentIds(userId),
    getUserPhoneNumbers(userId),
  ]);

  if (!agentIds.includes(agentId)) {
    return { ok: false as const, error: 'agentId does not belong to the authenticated user' };
  }

  if (!phoneNumbers.includes(fromNumber)) {
    return { ok: false as const, error: 'fromNumber does not belong to the authenticated user' };
  }

  return { ok: true as const };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action;
    const auth = await requireMatchingUser(event, body.userId, headers);
    if (!auth.ok) return auth.response;
    body.userId = auth.userId;

    const supabase = getServiceSupabase();

    // ─── CREATE CAMPAIGN ──────────────────────────────────────────
    if (action === 'create_campaign') {
      const { userId, name, agentId, fromNumber, leads } = body;

      if (!userId || !name || !agentId || !fromNumber || !leads?.length) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId, name, agentId, fromNumber, and leads[] are required' }) };
      }

      const resources = await validateOutboundResources(userId, agentId, fromNumber);
      if (!resources.ok) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: resources.error }) };
      }

      // Create campaign
      const { data: campaign, error: campError } = await supabase
        .from('reactivation_campaigns')
        .insert({
          user_id: userId,
          name,
          agent_id: agentId,
          from_number: fromNumber,
          status: 'draft',
          total_leads: leads.length,
        })
        .select('id')
        .single();

      if (campError || !campaign) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: campError?.message || 'Failed to create campaign' }) };
      }

      // Insert leads
      const leadInserts = leads.map((lead: any) => ({
        campaign_id: campaign.id,
        phone: lead.phone,
        name: lead.name || null,
        email: lead.email || null,
        call_status: 'pending',
      }));

      const { error: leadsError } = await supabase
        .from('reactivation_leads')
        .insert(leadInserts);

      if (leadsError) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: leadsError.message }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, campaignId: campaign.id, leadsCount: leads.length }),
      };
    }

    // ─── START CAMPAIGN ───────────────────────────────────────────
    if (action === 'start_campaign') {
      const { campaignId, userId } = body;

      if (!campaignId || !userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'campaignId and userId are required' }) };
      }

      // Get campaign
      const { data: campaign, error: campError } = await supabase
        .from('reactivation_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();

      if (campError || !campaign) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Campaign not found' }) };
      }

      const resources = await validateOutboundResources(userId, campaign.agent_id, campaign.from_number);
      if (!resources.ok) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: resources.error }) };
      }

      // Get pending leads (batch of 10 to avoid timeout)
      const { data: pendingLeads } = await supabase
        .from('reactivation_leads')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('call_status', 'pending')
        .limit(10);

      if (!pendingLeads || pendingLeads.length === 0) {
        // No more leads — mark campaign as completed
        await supabase
          .from('reactivation_campaigns')
          .update({ status: 'completed' })
          .eq('id', campaignId);

        return { statusCode: 200, headers, body: JSON.stringify({ success: true, callsInitiated: 0, status: 'completed' }) };
      }

      // Update campaign status to running
      await supabase
        .from('reactivation_campaigns')
        .update({ status: 'running' })
        .eq('id', campaignId);

      const retell = getRetellClient();
      let callsInitiated = 0;

      for (const lead of pendingLeads) {
        try {
          // Mark as calling
          await supabase
            .from('reactivation_leads')
            .update({ call_status: 'calling', called_at: new Date().toISOString() })
            .eq('id', lead.id);

          // Initiate outbound call via Retell
          const callResponse = await retell.call.createPhoneCall({
            from_number: campaign.from_number,
            to_number: lead.phone,
            agent_id: campaign.agent_id,
            metadata: {
              campaign_id: campaignId,
              lead_id: lead.id,
              lead_name: lead.name || '',
            },
          });

          // Update lead with call ID
          await supabase
            .from('reactivation_leads')
            .update({
              retell_call_id: callResponse.call_id,
              call_status: 'completed',
            })
            .eq('id', lead.id);

          // Update campaign counters
          await supabase
            .from('reactivation_campaigns')
            .update({
              calls_made: (campaign.calls_made || 0) + callsInitiated + 1,
            })
            .eq('id', campaignId);

          // Deduct tokens
          try {
            await deductTokens(
              userId,
              TOKEN_COSTS.outbound_call,
              'outbound_call',
              `Reactivation call to ${lead.phone}`,
              { campaign_id: campaignId, lead_id: lead.id },
              supabase
            );
          } catch (tokenErr) {
            console.error('[outbound-calls] Token deduction failed:', tokenErr);
          }

          callsInitiated++;

          // Rate limit: wait 2 seconds between calls
          if (callsInitiated < pendingLeads.length) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        } catch (callErr: any) {
          console.error(`[outbound-calls] Call to ${lead.phone} failed:`, callErr);
          await supabase
            .from('reactivation_leads')
            .update({ call_status: 'failed', call_outcome: callErr.message || 'Call initiation failed' })
            .eq('id', lead.id);
        }
      }

      // Check if there are more leads remaining
      const { count: remaining } = await supabase
        .from('reactivation_leads')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('call_status', 'pending');

      if (remaining === 0) {
        await supabase
          .from('reactivation_campaigns')
          .update({ status: 'completed' })
          .eq('id', campaignId);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          callsInitiated,
          remaining: remaining || 0,
          status: remaining === 0 ? 'completed' : 'running',
        }),
      };
    }

    // ─── GET STATUS ───────────────────────────────────────────────
    if (action === 'get_status') {
      const { campaignId, userId } = body;

      const { data: campaign } = await supabase
        .from('reactivation_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();

      if (!campaign) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Campaign not found' }) };
      }

      // Get lead breakdown
      const { data: leads } = await supabase
        .from('reactivation_leads')
        .select('call_status')
        .eq('campaign_id', campaignId);

      const breakdown = {
        pending: 0,
        calling: 0,
        completed: 0,
        failed: 0,
        no_answer: 0,
      };

      for (const lead of leads || []) {
        const status = lead.call_status as keyof typeof breakdown;
        if (status in breakdown) breakdown[status]++;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ campaign, breakdown }),
      };
    }

    // ─── PAUSE CAMPAIGN ──────────────────────────────────────────
    if (action === 'pause_campaign') {
      const { campaignId, userId } = body;
      await supabase
        .from('reactivation_campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId)
        .eq('user_id', userId);

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ─── LIST CAMPAIGNS ──────────────────────────────────────────
    if (action === 'list_campaigns') {
      const { userId } = body;
      const { data: campaigns } = await supabase
        .from('reactivation_campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return { statusCode: 200, headers, body: JSON.stringify({ campaigns: campaigns || [] }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
  } catch (err: any) {
    console.error('[outbound-calls] Error:', err);
    await notifyError('outbound-calls: Unhandled exception', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Outbound call processing failed' }) };
  }
};
