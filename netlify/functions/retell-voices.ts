import { Handler } from '@netlify/functions';
import Retell from 'retell-sdk';
import { getRequestOrigin, getV2CorsHeaders } from './_shared/cors-v2';
import { requireUser } from './_shared/user-auth';

export const handler: Handler = async (event) => {
  const cors = getV2CorsHeaders(
    getRequestOrigin(event.headers as Record<string, string | undefined>),
    { methods: 'GET' },
  );
  const headers = cors.headers;

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  if (getRequestOrigin(event.headers as Record<string, string | undefined>) && !cors.allowed) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Origin not allowed' }),
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const auth = await requireUser(event, headers);
    if (!auth.ok) return auth.response;

    const apiKey = process.env.RETELL_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Retell API key not configured' }),
      };
    }

    // Create Retell client
    const client = new Retell({
      apiKey: apiKey,
    });

    // Get voices using SDK
    const voiceResponses = await client.voice.list();
    
    // Transform the response to match frontend expectations
    const voices = voiceResponses.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.voice_name,
      accent: voice.accent,
      gender: voice.gender,
      preview: voice.preview_audio_url,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(voices),
    };
  } catch (error) {
    console.error('Error fetching voices:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch voices',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
