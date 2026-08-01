import type { LeadFormData } from '../lib/validators';
import { supabase } from '../lib/supabase';

// Fallback voice data with verified working preview URLs from Retell
const fallbackVoices = [
  { id: '11labs-Grace', name: 'Grace', accent: 'American', gender: 'female', provider: 'elevenlabs', preview: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/grace.mp3' },
  { id: '11labs-Nico', name: 'Nico', accent: 'American', gender: 'male', provider: 'elevenlabs', preview: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/11labs-pdBC2RxjF7wu7aBAu86E.mp3' },
  { id: 'openai-Nova', name: 'Nova', accent: 'American', gender: 'female', provider: 'openai', preview: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/nova_.wav' },
  { id: 'openai-Echo', name: 'Echo', accent: 'American', gender: 'male', provider: 'openai', preview: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/echo_.wav' },
  { id: 'cartesia-Hailey', name: 'Hailey', accent: 'American', gender: 'female', provider: 'cartesia', preview: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/cartesia-284d1552-ff0c-4068-ad6f-1eab97bee041.mp3' },
  { id: 'retell-Leland', name: 'Leland', accent: 'American', gender: 'male', provider: 'platform', preview: 'https://retell-utils-public.s3.us-west-2.amazonaws.com/minimax-Leland.mp3' },
];

async function getClonedVoicesForCurrentUser(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('cloned_voices')
      .select('id, name, accent, gender, retell_voice_id, preview_audio_url, status')
      .eq('user_id', user.id)
      .eq('status', 'ready');

    if (error || !data) return [];

    return data.map(v => ({
      id: v.retell_voice_id,
      name: v.name,
      accent: v.accent || 'Custom',
      gender: v.gender || 'neutral',
      provider: 'cloned',
      preview: v.preview_audio_url || '',
    }));
  } catch {
    return [];
  }
}

export async function getVoices(): Promise<any[]> {
  const cloned = await getClonedVoicesForCurrentUser();

  try {
    // Try to fetch from Supabase voices table first
    try {
      const { data: voices, error } = await supabase
        .from('voices')
        .select('id, name, accent, gender, preview_audio_url, provider')
        .eq('is_active', true)
        .limit(20);

      if (!error && voices && voices.length > 0) {
        return [
          ...cloned,
          ...voices.map(voice => ({
            id: voice.id,
            name: voice.name,
            accent: voice.accent,
            gender: voice.gender,
            provider: voice.provider,
            preview: voice.preview_audio_url,
          })),
        ];
      }
    } catch (supabaseError) {
      console.warn('Could not fetch from Supabase:', supabaseError);
    }

    // Fallback: try to fetch from the static JSON file
    try {
      const response = await fetch('/retell-voices.json');
      if (response.ok) {
        const voices = await response.json();
        return [...cloned, ...voices];
      }
    } catch (jsonError) {
      console.warn('Could not fetch from JSON file:', jsonError);
    }

    // Final fallback: use hardcoded voice data with verified preview URLs
    return [...cloned, ...fallbackVoices];

  } catch (error) {
    console.error('Error fetching voices:', error);
    return [...cloned, ...fallbackVoices];
  }
}

export async function handleLeadSubmission(data: LeadFormData): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase
      .from('leads')
      .insert({
        name: data.name,
        email: data.email,
        company: data.company,
        website: data.website || null,
        phone: data.phone || null,
        message: data.message || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Lead submission error:', error);
      return {
        success: false,
        message: 'Something went wrong. Please try again.'
      };
    }

    return {
      success: true,
      message: 'Thank you! We\'ll be in touch within 24 hours.'
    };
  } catch (error) {
    console.error('Lead submission error:', error);
    return {
      success: false,
      message: 'Something went wrong. Please try again.'
    };
  }
}
