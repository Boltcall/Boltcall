import { Handler } from '@netlify/functions';
import { notifyError } from './_shared/notify';
import { getSupabase } from './_shared/token-utils';
import { generateEmbedding } from './_shared/azure-ai';
import { requireAuth } from './_shared/require-auth';

/**
 * Knowledge Base Search Function
 *
 * Two-tier KB system:
 *   Tier 1 (prompt): Core business info injected directly into agent prompt
 *   Tier 2 (search): Detailed/technical info searched via vector similarity
 *
 * Actions:
 *   - search: Vector similarity search for a user's KB
 *   - add: Add a KB entry with auto-embedding
 *   - add_batch: Add multiple entries at once
 *   - get_prompt_kb: Get all Tier 1 entries formatted for prompt injection
 *   - list: List all KB entries for a user
 *   - delete: Delete a KB entry
 *   - update: Update a KB entry (re-embeds)
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

async function userOwnsRow(supabase: any, table: string, id: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.warn(`[kb-search] Ownership check failed for ${table}:`, error.message || error);
    return false;
  }
  return Boolean(data?.id);
}

async function requireOwnedAgent(supabase: any, userId: string, agentId: string) {
  if (await userOwnsRow(supabase, 'agents', agentId, userId)) {
    return null;
  }
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: 'Agent not found' }),
  };
}

async function requireOwnedFolder(supabase: any, userId: string, kbFolderId: string) {
  if (await userOwnsRow(supabase, 'kb_folders', kbFolderId, userId)) {
    return null;
  }
  return {
    statusCode: 403,
    headers,
    body: JSON.stringify({ error: 'KB folder not found' }),
  };
}

// Generate embedding via Azure (text-embedding-3-large, 3072-dim).
// Falls back to Supabase Edge Function if Azure not configured or fails.
async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    return await generateEmbedding(text);
  } catch (err) {
    console.warn('[kb-search] Azure embedding failed, trying Supabase fallback:', err instanceof Error ? err.message : err);
  }

  if (SUPABASE_URL) {
    try {
      const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';
      const res = await fetch(`${SUPABASE_URL}/functions/v1/embed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.embedding) return data.embedding;
      }
    } catch { /* fall through */ }
  }

  return null;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ── Auth gate — never trust client-supplied userId. Always derive from JWT ──
  const auth = await requireAuth(event);
  if (!auth.ok) return auth.response;
  const authedUserId = auth.userId;

  try {
    const body = JSON.parse(event.body || '{}');
    // Override any client-supplied userId with the authenticated one. This
    // single line closes the spoofable-userId vulnerability across every
    // action below.
    body.userId = authedUserId;
    const { action } = body;
    const userId = authedUserId;
    const supabase = getSupabase();

    // ─── SEARCH: Vector similarity search ───────────────────────────
    if (action === 'search') {
      const { userId, query, limit: matchCount } = body;
      if (!userId || !query) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and query required' }) };
      }

      // Try vector search first if embeddings are available
      const embedding = await getEmbedding(query);
      if (embedding) {
        const { data, error } = await supabase.rpc('search_kb', {
          query_embedding: JSON.stringify(embedding),
          match_user_id: userId,
          match_count: matchCount || 3,
          match_threshold: 0.65,
        });

        if (!error && data && data.length > 0) {
          return { statusCode: 200, headers, body: JSON.stringify({ success: true, results: data, method: 'vector_search' }) };
        }
      }

      // Fallback: smart text search — split query into keywords, search ALL tiers
      const keywords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
      const orConditions = keywords.map((kw: string) => `title.ilike.%${kw}%,content.ilike.%${kw}%`).join(',');

      const { data, error } = await supabase
        .from('knowledge_base')
        .select('id, title, content, category')
        .eq('user_id', userId)
        .eq('status', 'active')
        .or(orConditions)
        .limit(matchCount || 3);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, results: data || [], method: 'text_search' }) };
    }

    // ─── Helper: Get business_profile_id for a user ──────────────────
    async function getProfileId(userId: string): Promise<string | null> {
      const { data } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      return data?.id || null;
    }

    // ─── ADD: Add a single KB entry ─────────────────────────────────
    if (action === 'add') {
      const { userId, title, content, category, tier, tags } = body;
      if (!userId || !title || !content) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId, title, and content required' }) };
      }

      const profileId = await getProfileId(userId);

      // Generate embedding for search-tier entries
      let embedding: number[] | null = null;
      if ((tier || 'search') === 'search') {
        embedding = await getEmbedding(`${title}\n${content}`);
      }

      const { data, error } = await supabase
        .from('knowledge_base')
        .insert({
          user_id: userId,
          business_profile_id: profileId,
          title,
          content,
          category: category || 'general',
          tier: tier || 'search',
          tags: tags || [],
          status: 'active',
          embedding: embedding ? JSON.stringify(embedding) : null,
          kb_folder_id: body.kb_folder_id || null,
        })
        .select('id, title, category, tier')
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, entry: data, embedded: !!embedding }) };
    }

    // ─── ADD_BATCH: Add multiple entries at once ────────────────────
    if (action === 'add_batch') {
      const { userId, entries } = body;
      if (!userId || !entries?.length) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and entries array required' }) };
      }

      const profileId = await getProfileId(userId);
      const results: Array<{ title: string; success: boolean; id?: string; error?: string }> = [];
      for (const entry of entries) {
        let embedding: number[] | null = null;
        if ((entry.tier || 'search') === 'search') {
          embedding = await getEmbedding(`${entry.title}\n${entry.content}`);
        }

        const { data, error } = await supabase
          .from('knowledge_base')
          .insert({
            user_id: userId,
            business_profile_id: profileId,
            title: entry.title,
            content: entry.content,
            category: entry.category || 'general',
            tier: entry.tier || 'search',
            tags: entry.tags || [],
            status: 'active',
            embedding: embedding ? JSON.stringify(embedding) : null,
            kb_folder_id: body.kb_folder_id || entry.kb_folder_id || null,
          })
          .select('id, title, tier')
          .single();

        results.push({ title: entry.title, success: !error, id: data?.id, error: error?.message });
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, added: results.filter(r => r.success).length, total: entries.length, results }) };
    }

    // ─── GET_PROMPT_KB: Get Tier 1 entries formatted for prompt (XML document format) ─────
    // Optional: pass agentId to scope to that agent's linked KB folders
    if (action === 'get_prompt_kb') {
      const { userId, agentId } = body;
      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
      }

      let query = supabase
        .from('knowledge_base')
        .select('title, content, category')
        .eq('user_id', userId)
        .eq('tier', 'prompt')
        .eq('status', 'active');

      // If agentId provided, scope to that agent's folders
      if (agentId) {
        const ownershipError = await requireOwnedAgent(supabase, userId, agentId);
        if (ownershipError) return ownershipError;

        const { data: folderLinks } = await supabase
          .from('agent_kb_folders')
          .select('kb_folder_id')
          .eq('agent_id', agentId);

        if (folderLinks && folderLinks.length > 0) {
          const folderIds = folderLinks.map(l => l.kb_folder_id);
          query = query.in('kb_folder_id', folderIds);
        }
      }

      const { data, error } = await query.order('category', { ascending: true });

      if (error) throw error;

      // Format as XML-in-markdown knowledge base for optimal retrieval
      // Each entry becomes a numbered document with title and category
      const entries = data || [];
      let promptText = '';

      if (entries.length > 0) {
        promptText = '<knowledge_base>\n';
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const content = entry.content || '';
          // If content already has XML document tags, include as-is
          if (content.includes('<document')) {
            promptText += content + '\n';
          } else {
            // Wrap plain content in XML document format
            promptText += `<document index="${i + 1}" title="${(entry.title || '').replace(/"/g, '&quot;')}" category="${entry.category || 'general'}">
Q: ${entry.title}
A: ${content}
</document>\n`;
          }
        }
        promptText += '</knowledge_base>';
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, promptText: promptText.trim(), entryCount: entries.length }),
      };
    }

    // ─── LIST: List all KB entries for a user ───────────────────────
    // Optional: pass kb_folder_id to filter by folder
    if (action === 'list') {
      const { userId, kb_folder_id } = body;
      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
      }

      let query = supabase
        .from('knowledge_base')
        .select('id, title, content, category, tier, tags, status, usage_count, kb_folder_id, created_at, updated_at')
        .eq('user_id', userId);

      if (kb_folder_id) {
        query = query.eq('kb_folder_id', kb_folder_id);
      }

      const { data, error } = await query
        .order('tier', { ascending: true })
        .order('category', { ascending: true });

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, entries: data || [] }) };
    }

    // ─── DELETE: Delete a KB entry ──────────────────────────────────
    if (action === 'delete') {
      const { id, userId } = body;
      if (!id || !userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id and userId required' }) };
      }

      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ─── UPDATE: Update a KB entry and re-embed ─────────────────────
    if (action === 'update') {
      const { id, userId, title, content, category, tier } = body;
      if (!id || !userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id and userId required' }) };
      }

      const updates: any = { updated_at: new Date().toISOString() };
      if (title) updates.title = title;
      if (content) updates.content = content;
      if (category) updates.category = category;
      if (tier) updates.tier = tier;

      // Re-embed if content changed and it's a search-tier entry
      if (content && (tier || 'search') === 'search') {
        const embedding = await getEmbedding(`${title || ''}\n${content}`);
        if (embedding) updates.embedding = JSON.stringify(embedding);
      }

      const { data, error } = await supabase
        .from('knowledge_base')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, title, tier')
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, entry: data }) };
    }

    // ═══════════════════════════════════════════════════════════════
    // KB FOLDER ACTIONS
    // ═══════════════════════════════════════════════════════════════

    // ─── LIST_FOLDERS: Get all folders for a user with doc counts ──
    if (action === 'list_folders') {
      const { userId } = body;
      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
      }

      // Get folders
      const { data: folders, error: fErr } = await supabase
        .from('kb_folders')
        .select('id, name, description, icon, is_default, created_at, updated_at')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (fErr) throw fErr;

      // Get doc counts per folder
      const folderIds = (folders || []).map(f => f.id);
      let docCounts: Record<string, number> = {};
      if (folderIds.length > 0) {
        const { data: counts } = await supabase
          .from('knowledge_base')
          .select('kb_folder_id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .in('kb_folder_id', folderIds);

        if (counts) {
          for (const row of counts) {
            docCounts[row.kb_folder_id] = (docCounts[row.kb_folder_id] || 0) + 1;
          }
        }
      }

      // Get agent links per folder
      let agentLinks: Record<string, Array<{ agent_id: string; agent_name: string }>> = {};
      if (folderIds.length > 0) {
        const { data: links } = await supabase
          .from('agent_kb_folders')
          .select('kb_folder_id, agent_id, agents!inner(id, name, user_id)')
          .in('kb_folder_id', folderIds)
          .eq('agents.user_id', userId);

        if (links) {
          for (const link of links) {
            if (!agentLinks[link.kb_folder_id]) agentLinks[link.kb_folder_id] = [];
            const agentData = link.agents as any;
            agentLinks[link.kb_folder_id].push({
              agent_id: link.agent_id,
              agent_name: agentData?.name || 'Unknown',
            });
          }
        }
      }

      const enriched = (folders || []).map(f => ({
        ...f,
        doc_count: docCounts[f.id] || 0,
        agents: agentLinks[f.id] || [],
      }));

      return { statusCode: 200, headers, body: JSON.stringify({ success: true, folders: enriched }) };
    }

    // ─── CREATE_FOLDER: Create a new KB folder ────────────────────
    if (action === 'create_folder') {
      const { userId, name, description, icon } = body;
      if (!userId || !name) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and name required' }) };
      }

      const profileId = await getProfileId(userId);
      if (!profileId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'No business profile found' }) };
      }

      const { data, error } = await supabase
        .from('kb_folders')
        .insert({
          business_profile_id: profileId,
          user_id: userId,
          name,
          description: description || null,
          icon: icon || 'folder',
          is_default: false,
        })
        .select('id, name, description, icon, is_default')
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, folder: data }) };
    }

    // ─── UPDATE_FOLDER: Update a KB folder ────────────────────────
    if (action === 'update_folder') {
      const { userId, folderId, name, description, icon } = body;
      if (!userId || !folderId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and folderId required' }) };
      }

      const updates: any = { updated_at: new Date().toISOString() };
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (icon) updates.icon = icon;

      const { data, error } = await supabase
        .from('kb_folders')
        .update(updates)
        .eq('id', folderId)
        .eq('user_id', userId)
        .select('id, name, description, icon')
        .single();

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, folder: data }) };
    }

    // ─── DELETE_FOLDER: Delete a KB folder ────────────────────────
    if (action === 'delete_folder') {
      const { userId, folderId, deleteDocs } = body;
      if (!userId || !folderId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and folderId required' }) };
      }

      // Don't allow deleting the default folder
      const { data: folder } = await supabase
        .from('kb_folders')
        .select('is_default')
        .eq('id', folderId)
        .eq('user_id', userId)
        .single();

      if (folder?.is_default) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cannot delete the default Business Profile folder' }) };
      }

      if (deleteDocs) {
        // Delete all docs in the folder
        await supabase
          .from('knowledge_base')
          .delete()
          .eq('kb_folder_id', folderId)
          .eq('user_id', userId);
      } else {
        // Orphan docs (set kb_folder_id to null)
        await supabase
          .from('knowledge_base')
          .update({ kb_folder_id: null })
          .eq('kb_folder_id', folderId)
          .eq('user_id', userId);
      }

      // Delete folder (cascades to agent_kb_folders)
      const { error } = await supabase
        .from('kb_folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ─── MOVE_DOCS: Move docs between folders ─────────────────────
    if (action === 'move_docs') {
      const { userId, docIds, targetFolderId } = body;
      if (!userId || !docIds?.length) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId and docIds required' }) };
      }

      const { error } = await supabase
        .from('knowledge_base')
        .update({ kb_folder_id: targetFolderId || null })
        .eq('user_id', userId)
        .in('id', docIds);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, moved: docIds.length }) };
    }

    // ─── LINK_AGENT_FOLDER: Link an agent to a KB folder ──────────
    if (action === 'link_agent_folder') {
      const { agentId, kbFolderId } = body;
      if (!agentId || !kbFolderId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'agentId and kbFolderId required' }) };
      }
      const agentOwnershipError = await requireOwnedAgent(supabase, userId, agentId);
      if (agentOwnershipError) return agentOwnershipError;
      const folderOwnershipError = await requireOwnedFolder(supabase, userId, kbFolderId);
      if (folderOwnershipError) return folderOwnershipError;

      const { error } = await supabase
        .from('agent_kb_folders')
        .upsert({ agent_id: agentId, kb_folder_id: kbFolderId }, { onConflict: 'agent_id,kb_folder_id' });

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ─── UNLINK_AGENT_FOLDER: Unlink an agent from a KB folder ────
    if (action === 'unlink_agent_folder') {
      const { agentId, kbFolderId } = body;
      if (!agentId || !kbFolderId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'agentId and kbFolderId required' }) };
      }
      const agentOwnershipError = await requireOwnedAgent(supabase, userId, agentId);
      if (agentOwnershipError) return agentOwnershipError;
      const folderOwnershipError = await requireOwnedFolder(supabase, userId, kbFolderId);
      if (folderOwnershipError) return folderOwnershipError;

      const { error } = await supabase
        .from('agent_kb_folders')
        .delete()
        .eq('agent_id', agentId)
        .eq('kb_folder_id', kbFolderId);

      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    // ─── GET_AGENT_FOLDERS: Get KB folders linked to an agent ──────
    if (action === 'get_agent_folders') {
      const { agentId } = body;
      if (!agentId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'agentId required' }) };
      }
      const ownershipError = await requireOwnedAgent(supabase, userId, agentId);
      if (ownershipError) return ownershipError;

      const { data, error } = await supabase
        .from('agent_kb_folders')
        .select('kb_folder_id, kb_folders(id, name, description, icon, is_default)')
        .eq('agent_id', agentId);

      if (error) throw error;

      const folders = (data || []).map(d => d.kb_folders).filter(Boolean);
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, folders }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use: search, add, add_batch, get_prompt_kb, list, delete, update, list_folders, create_folder, update_folder, delete_folder, move_docs, link_agent_folder, unlink_agent_folder, get_agent_folders' }) };

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err));
    console.error('[kb-search] Error:', errMsg);
    await notifyError('kb-search: Failed', errMsg);
    return { statusCode: 500, headers, body: JSON.stringify({ error: errMsg }) };
  }
};
