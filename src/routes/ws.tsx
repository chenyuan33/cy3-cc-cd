import { Hono } from "hono";
import { type AppEnv } from "../types";
import { upgradeWebSocket } from "hono/cloudflare-workers";

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
app.get('/ide-judge', upgradeWebSocket(c => ({ // https://apidoc.oj.cqiming.com/
	async onMessage(evt, ws) {
		try {
			if (c.get('currentUser') && typeof evt.data === 'string') {
				const { code, input } = JSON.parse(evt.data);
				ws.send(JSON.stringify(((await (await fetch("https://judge.cqiming.com/api/v1/judgments/", {
					method: "POST",
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						language: "cpp",
						code,
						test_cases: [
							{
								input,
								output: ""
							}
						],
						time_limit_ms: 1000,
						memory_limit_mb: 512
					})
				})).json()) as any).results[0]));
			}
		} catch (e) {
			console.error('An error occurred with WebSocket (Judge): ', e instanceof Error ? e.message : e);
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