import { useEffect, useRef, useCallback, useState } from 'react';

interface WSMessage {
  tag: string;
  data: any;
  ts: number;
}

interface UseWebSocketOptions {
  url?: string;
  token?: string;
  onMessage?: (msg: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number; // ms, default 3000
  maxReconnects?: number;
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  reconnectInterval = 3000,
  maxReconnects = 10,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectCount = useRef(0);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (!token) return;

    const wsUrl = (url || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`) + `/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectCount.current = 0;
      onConnect?.();
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      onDisconnect?.();
      // 自动重连
      if (reconnectCount.current < maxReconnects) {
        reconnectCount.current++;
        timerRef.current = setTimeout(connect, reconnectInterval);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (evt) => {
      try {
        const msg: WSMessage = JSON.parse(evt.data);
        if (msg.tag === 'pong') return; // 心跳回复忽略
        onMessage?.(msg);
      } catch {}
    };

  }, [token, url, onMessage, onConnect, onDisconnect, reconnectInterval, maxReconnects]);

  useEffect(() => {
    connect();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
