import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'smartsolar_jwt_secret_2024';

// 在线客户端: token → WebSocket
const clients = new Map<string, WebSocket>();

// 广播给所有客户端
export function broadcast(data: object, tag?: string) {
  const payload = JSON.stringify({ tag: tag || 'notification', data, ts: Date.now() });
  for (const ws of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// 发送消息给指定用户
export function sendTo(token: string, data: object, tag?: string) {
  const ws = clients.get(token);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ tag: tag || 'notification', data, ts: Date.now() }));
  }
}

export function setupWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // 从 URL query 拿 token: /ws?token=xxx
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'token required');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userKey = `${decoded.id}-${decoded.username}`;
      clients.set(token, ws);
      console.log(`[WS] Client connected: ${userKey} (${clients.size} total)`);

      ws.send(JSON.stringify({ tag: 'connected', data: { user: decoded.username }, ts: Date.now() }));

      ws.on('close', () => {
        clients.delete(token);
        console.log(`[WS] Client disconnected: ${userKey} (${clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error(`[WS] Error for ${userKey}:`, err.message);
        clients.delete(token);
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          // 支持 ping/pong 心跳
          if (msg.type === 'ping') {
            ws.send(JSON.stringify({ tag: 'pong', ts: Date.now() }));
          }
        } catch {}
      });

    } catch {
      ws.close(4001, 'invalid token');
    }
  });

  console.log('[WS] WebSocket server ready at /ws');
  return wss;
}
