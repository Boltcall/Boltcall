import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { RetellPingPongResponse, RetellRequest, RetellResponse } from './types.js';
import { streamChatCompletion } from './llm-client.js';
import { loadSession, getSession, clearSession } from './retell-session.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

function getLlmPathCallId(url = ''): string | null {
  const pathname = new URL(url || '/', 'http://localhost').pathname;
  if (pathname === '/llm-websocket') return null;
  const match = pathname.match(/^\/llm-websocket\/([^/]+)$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

server.on('upgrade', (req, socket, head) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname !== '/llm-websocket' && !pathname.startsWith('/llm-websocket/')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', (ws: WebSocket, req) => {
  let callId: string | null = getLlmPathCallId(req.url || '');

  ws.on('message', async (raw) => {
    let req: RetellRequest;
    try {
      req = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // ── call_details: first message Retell sends — load prompt, send greeting ──
    if (req.interaction_type === 'call_details') {
      if (!req.call) return;
      callId = req.call.call_id;
      const agentId = req.call.agent_id;

      const session = await loadSession(callId, agentId);

      const greet: RetellResponse = {
        response_type: 'response',
        response_id: 0,
        content: session.beginMessage,
        content_complete: true,
        end_call: false,
      };
      ws.send(JSON.stringify(greet));
      return;
    }

    // ── update_only: transcript update with no response expected ──
    if (req.interaction_type === 'ping_pong') {
      const pong: RetellPingPongResponse = {
        response_type: 'ping_pong',
        timestamp: Date.now(),
      };
      ws.send(JSON.stringify(pong));
      return;
    }

    if (req.interaction_type === 'update_only') return;

    // ── response_required / reminder_required: generate and stream response ──
    if (!callId) return;
    const session = getSession(callId);
    if (!session) return;

    try {
      let chunkSent = false;

      for await (const chunk of streamChatCompletion(session.systemPrompt, req.transcript)) {
        chunkSent = true;
        const partial: RetellResponse = {
          response_type: 'response',
          response_id: req.response_id,
          content: chunk,
          content_complete: false,
          end_call: false,
        };
        ws.send(JSON.stringify(partial));
      }

      const final: RetellResponse = {
        response_type: 'response',
        response_id: req.response_id,
        content: chunkSent ? '' : 'One moment, how can I help you?',
        content_complete: true,
        end_call: false,
      };
      ws.send(JSON.stringify(final));
    } catch (err) {
      console.error('[retell-llm-server] stream error:', err);
      const fallback: RetellResponse = {
        response_type: 'response',
        response_id: req.response_id,
        content: 'I apologize, please give me just a moment.',
        content_complete: true,
        end_call: false,
      };
      ws.send(JSON.stringify(fallback));
    }
  });

  ws.on('close', () => {
    if (callId) clearSession(callId);
  });

  ws.on('error', (err) => {
    console.error('[retell-llm-server] ws error:', err);
    if (callId) clearSession(callId);
  });
});

const PORT = parseInt(process.env.PORT ?? '8080', 10);
server.listen(PORT, () => {
  console.log(`[retell-llm-server] Listening on :${PORT}`);
});
