import type { Handler } from '@netlify/functions';
import { deductTokens, TOKEN_COSTS } from './_shared/token-utils';
import { chatCompletion } from './_shared/azure-ai';
import { requireInternalOrMatchingUser } from './_shared/user-auth';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Internal-Secret, X-Cron-Secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { content, businessName, category, userId } = JSON.parse(event.body || '{}');

    if (!content) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Content is required' }) };
    }

    const auth = await requireInternalOrMatchingUser(event, userId, headers);
    if (!auth.ok) return auth.response;

    // Token gate: deduct before calling Claude
    if (userId) {
      const deductResult = await deductTokens(userId, TOKEN_COSTS.ai_kb_extract, 'ai_kb_extract', `KB extraction for ${businessName || 'unknown'}`);
      if (!deductResult.success) {
        return { statusCode: 402, headers, body: JSON.stringify({ error: 'Insufficient tokens for KB extraction', details: deductResult.error }) };
      }
    }

    // Truncate content to avoid token limits
    const truncatedContent = content.substring(0, 15000);

    const systemPrompt = `You extract structured business information from website content for an AI phone receptionist knowledge base. Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "services": [{ "name": "Service Name", "duration": 30, "price": 0 }],
  "faqs": [{ "question": "Common question?", "answer": "Answer based on website content" }],
  "policies": { "cancellation": "...", "reschedule": "...", "deposit": "..." }
}
Rules: Extract REAL services; estimate duration 15-60 min; price 0 if not listed. Generate 3-5 caller FAQs. Only include policies if mentioned; use "" if not found. Return ONLY the JSON.`;

    const userPrompt = `Business: ${businessName || 'Unknown'}\nCategory: ${category || 'Unknown'}\n\nWebsite content:\n${truncatedContent}`;

    let text: string;
    try {
      text = await chatCompletion(systemPrompt, userPrompt, { maxTokens: 2000 });
    } catch (aiErr: any) {
      console.error('[ai-extract-kb] AI error:', aiErr.message);
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI extraction failed' }) };
    }

    // Parse the JSON from Claude's response
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { statusCode: 200, headers, body: JSON.stringify({ services: [], faqs: [], policies: null }) };
      }

      const extracted = JSON.parse(jsonMatch[0]);

      // Validate and sanitize the response
      const services = Array.isArray(extracted.services)
        ? extracted.services.filter((s: any) => s.name).map((s: any) => ({
            name: String(s.name).substring(0, 100),
            duration: Math.min(Math.max(Number(s.duration) || 30, 5), 480),
            price: Math.max(Number(s.price) || 0, 0),
          }))
        : [];

      const faqs = Array.isArray(extracted.faqs)
        ? extracted.faqs.filter((f: any) => f.question && f.answer).map((f: any) => ({
            question: String(f.question).substring(0, 300),
            answer: String(f.answer).substring(0, 1000),
          }))
        : [];

      const policies = extracted.policies
        ? {
            cancellation: String(extracted.policies.cancellation || '').substring(0, 500),
            reschedule: String(extracted.policies.reschedule || '').substring(0, 500),
            deposit: String(extracted.policies.deposit || '').substring(0, 500),
          }
        : null;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ services, faqs, policies }),
      };
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Raw text:', text.substring(0, 200));
      return { statusCode: 200, headers, body: JSON.stringify({ services: [], faqs: [], policies: null }) };
    }
  } catch (error) {
    console.error('AI extract error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

export { handler };
