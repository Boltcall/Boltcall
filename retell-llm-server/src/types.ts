export interface Utterance {
  role: 'agent' | 'user';
  content: string;
}

export interface CallDetails {
  call_id: string;
  agent_id: string;
  metadata?: Record<string, unknown>;
}

export interface RetellRequest {
  response_id?: number;
  transcript: Utterance[];
  interaction_type: 'call_details' | 'update_only' | 'response_required' | 'reminder_required' | 'ping_pong';
  call?: CallDetails;
}

export interface RetellResponse {
  response_type?: 'response';
  response_id?: number;
  content: string;
  content_complete: boolean;
  end_call: boolean;
}

export interface RetellPingPongResponse {
  response_type: 'ping_pong';
  timestamp?: number;
}
