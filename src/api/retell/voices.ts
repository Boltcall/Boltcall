// Retell voices — fetched via Netlify function (API key stays server-side)

import { authedFetch } from '../../lib/authedFetch';

export async function getVoices() {
  try {
    const response = await authedFetch('/.netlify/functions/retell-voices');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching voices from Retell API:', error);
    throw new Error('Failed to fetch voices');
  }
}

