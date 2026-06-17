import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const navigateMock = vi.hoisted(() => vi.fn());
const showToastMock = vi.hoisted(() => vi.fn());
const authedFetchMock = vi.hoisted(() => vi.fn());

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ agentId: 'agent-1' }),
  };
});

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@test.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('../../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

vi.mock('../../../hooks/useRetellVoices', () => ({
  useRetellVoices: () => ({ voices: [] }),
}));

vi.mock('../../../lib/authedFetch', () => ({
  authedFetch: authedFetchMock,
}));

vi.mock('../../../lib/retell', () => ({
  updateRetellAgent: vi.fn(),
}));

vi.mock('../../../components/ui/voice-picker', () => ({
  VoicePicker: () => <div data-testid="voice-picker" />,
}));

vi.mock('../../../components/ui/pop-button', () => ({
  PopButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../../../components/TalkToAgentModal', () => ({
  default: () => null,
}));

vi.mock('../../../components/ui/AgentAvatar', () => ({
  AgentAvatar: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock('../../../components/ui/InlineRename', () => ({
  InlineRename: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock('../../../components/ui/EmojiColorPicker', () => ({
  EmojiColorPicker: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'agents') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: {
                    id: 'agent-1',
                    name: 'Plumbing Agent',
                    status: 'active',
                    begin_message: 'Hi, thanks for calling Rapid Rooter QA',
                    voice_id: 'voice-1',
                    transfer_phone_number: '',
                    system_prompt: 'Prompt',
                    retell_agent_id: 'retell-1',
                    direction: 'inbound',
                    language: 'en',
                    total_calls: 0,
                    created_at: '2026-06-17T10:00:00.000Z',
                    updated_at: '2026-06-17T10:00:00.000Z',
                    avatar: null,
                    color: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'call_logs') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

import AgentDetailPage from '../AgentDetailPage';

describe('AgentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ folders: [] }),
    });
  });

  it('does not show unsaved changes immediately after loading persisted agent data', async () => {
    render(<AgentDetailPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Plumbing Agent')).toBeInTheDocument();
    });

    expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
  });
});
