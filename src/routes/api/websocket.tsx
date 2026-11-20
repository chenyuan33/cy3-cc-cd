import { Hono } from "hono";
import { type AppEnv, type ContextType } from "../../types";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import { memoryLimitMax, timeLimitMax } from "../../settings";
import { userInfoDatas } from "./user";
import { problemBasicInfoDatas } from "./problem";
import { getI18n } from "../../i18n";

const app = new Hono<AppEnv>();
app.get('/', upgradeWebSocket((c: ContextType) => {
	const currentUser = c.get('currentUser');
	return {
		async onMessage(evt, ws) {
			try {
				if (typeof evt.data === 'string') {
					const { recentNotificationsAfter } = JSON.parse(evt.data);
					ws.send(JSON.stringify(currentUser ? [
						...((await c.env.db.prepare('SELECT created_at FROM notification WHERE uid = ? AND read = 0 AND created_at > ? ORDER BY created_at LIMIT 10').bind(currentUser.id, recentNotificationsAfter).all<{ created_at: string }>()).results.map(({ created_at }) => ({ type: 'notification', created_at }))),
						...((await c.env.db.prepare(`
							SELECT
								c.content, c.created_at,
								json_object( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS sender
							FROM private_messages c
							JOIN users u ON u.id = c.sender
							WHERE c.receiver = ? AND c.read = 0 AND c.created_at > ?
							ORDER BY c.created_at
							LIMIT 10
						`).bind(currentUser.id, recentNotificationsAfter).all<{ content: string, created_at: string, sender: string }>()).results.map(({ content, created_at, sender }) => ({ type: 'privateMessage', content, created_at, sender: JSON.parse(sender) })))
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
app.get('/ide-judge', upgradeWebSocket((c: ContextType) => ({ // https://apidoc.oj.cqiming.com/
	async onMessage(evt, ws) {
		try {
			if (c.get('currentUser') && typeof evt.data === 'string') {
				const { lang, timeLimit, memoryLimit, code, stdin, expectedOutput } = JSON.parse(evt.data);
				ws.send(JSON.stringify(((await (await fetch("https://judge.cqiming.com/api/v1/judgments/", {
					method: "POST",
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						language: lang,
						code,
						test_cases: [
							{
								input: stdin,
								output: expectedOutput
							}
						],
						time_limit_ms: Math.max(0, Math.min(timeLimit, timeLimitMax)),
						memory_limit_mb: Math.max(0, Math.min(memoryLimit, memoryLimitMax))
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
app.get('/record/:id', upgradeWebSocket((c: ContextType) => ({
	async onMessage(evt, ws) {
		try {
			const currentUser = c.get('currentUser');
			if (currentUser && typeof evt.data === 'string') {
				const raw = await c.env.db.prepare(`
					SELECT
						r.id, r.created_at, r.status, r.score, r.time_ms, r.detail, r.lang, r.code,
						json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS user,
						json_object (
							${problemBasicInfoDatas.map(scheme => `'${scheme}', p.${scheme}`)},
							'user', json_object ( ${userInfoDatas.map(scheme => `'${scheme}', pu.${scheme}`)} )
						) AS problem
					FROM record r
					JOIN users u ON r.uid = u.id
					JOIN problem p ON r.pid = p.id
					JOIN users pu ON p.uid = pu.id
					WHERE r.id = ? AND (r.uid = ? OR ? = 1)
				`).bind(c.req.param('id'), currentUser.id, currentUser.id === 1 ? 1 : 0).first<{
					id: number,
					created_at: string,
					status: string,
					score: number | null,
					time_ms: number | null,
					detail: string | null,
					lang: string,
					code: string,
					user: string,
					problem: string
				}>();
				ws.send(JSON.stringify(raw ? (({ detail, user, problem, ...schemes }: {
					id: number,
					created_at: string,
					status: string,
					score: number | null,
					time_ms: number | null,
					detail: string | null,
					lang: string,
					code: string,
					user: string,
					problem: string
				}) => ({ success: true, record: {
					detail: detail ? JSON.parse(detail) : null,
					user: JSON.parse(user),
					problem: JSON.parse(problem),
					...schemes
				} }))(raw) : { success: false, message: getI18n(c)('error.notFound') }));
			}
		} catch (e) {
			console.error('An error occurred with WebSocket (Record): ', e instanceof Error ? e.message : e);
		}
	},
	onClose(evt, ws) {
		ws.close();
	},
	onError(evt, ws) {
		console.error('An error occurred with WebSocket (Record): ', evt);
		ws.close(1011);
	}
})));
export default app;