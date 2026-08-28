import { Hono } from "hono";
import { type AppEnv } from "../types";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { timeLimitDefault, memoryLimitDefault } from "../settings";

const app = new Hono<AppEnv>();

app.get('/', upgradeWebSocket(c => {
    const currentUser = c.get('currentUser'), env = c.env as any;
    return {
        async onMessage(evt, ws) {
            try {
                if (typeof evt.data === 'string') {
                    const { recentNotificationsAfter } = JSON.parse(evt.data);
                    ws.send(JSON.stringify(currentUser ? [
                        ...((await env.db.prepare('SELECT created_at FROM notification WHERE uid = ? AND read = 0 AND created_at > ? ORDER BY created_at LIMIT 10').bind(currentUser.id, recentNotificationsAfter).all()).results.map(({ created_at }: { created_at: string }) => ({ type: 'notification', created_at }))),
                        ...((await env.db.prepare('SELECT created_at FROM private_messages WHERE receiver = ? AND read = 0 AND created_at > ? ORDER BY created_at LIMIT 10').bind(currentUser.id, recentNotificationsAfter).all()).results.map(({ created_at }: { created_at: string }) => ({ type: 'privateMessage', created_at })))
                    ].sort(({ created_at: lhs }: { created_at: string }, { created_at: rhs }: { created_at: string }) => lhs < rhs ? 1 : -1) : []));
                }
            } catch (e) {
                console.error('An error occurred with WebSocket: ', e instanceof Error ? e.message : e);
            }
        },
        onClose(evt, ws) {
            ws.close();
        },
        onError(evt, ws) {
            console.error('An error occurred with WebSocket: ', evt);
            ws.close(1011);
        }
    };
}));

app.get('/ide-judge', upgradeWebSocket(c => ({
    async onMessage(evt, ws) {
        try {
            if (c.get('currentUser') && typeof evt.data === 'string') {
                const payload = JSON.parse(evt.data);
                const requestBody = {
                    language: payload.language,
                    code: payload.code,
                    test_cases: payload.test_cases || [],
                    time_limit_ms: payload.time_limit_ms || timeLimitDefault,
                    memory_limit_mb: payload.memory_limit_mb || memoryLimitDefault
                };
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000); // 30秒超时
                const response = await fetch("https://judge.cqiming.com/api/v1/judgments/", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });
                clearTimeout(timeout);
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                }
                const data = await response.json();
                ws.send(JSON.stringify(data));
            } else {
                ws.send(JSON.stringify({ error: 'Unauthorized or invalid data' }));
            }
        } catch (e) {
            console.error('An error occurred with WebSocket (Judge): ', e instanceof Error ? e.message : e);
            // 向客户端发送错误信息
            const errorMsg = e instanceof Error ? e.message : String(e);
            try {
                ws.send(JSON.stringify({ error: errorMsg }));
            } catch (_) {
                // 如果 WebSocket 已关闭，忽略发送错误
            }
        }
    },
    onClose(evt, ws) {
        ws.close();
    },
    onError(evt, ws) {
        console.error('An error occurred with WebSocket (Judge): ', evt);
        ws.close(1011);
    }
})));

export default app;