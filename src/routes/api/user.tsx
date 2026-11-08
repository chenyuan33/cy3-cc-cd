import { Hono } from "hono";
import type { AppEnv, ContextType, judgementType, userInfo } from "../../types";
import { accessDenied, alreadyLoggedIn, emailRequired, emailUsed, invalidEmail, invalidPassword, loginRequired, missingParams, noSuchUsername, notFound, passwordRequired, registerUsernameExists, registerUsernameLength, usernameRequired, verifyFailed } from "../errorPages";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import validator from "validator";
import { permissionAdmin } from "../../settings";
import { rateLimit } from "@elithrar/workers-hono-rate-limit";
import { feedQuery } from "./feed";
import type { ticketStatusType } from "./ticket";

const app = new Hono<AppEnv>();
const validateUsername = (name: string, c: ContextType) => {
	if (!name.trim()) {
		return usernameRequired(c);
	}
	if (name.trim().length < 3 || name.trim().length > 30) {
		return registerUsernameLength(c);
	}
	return null;
};
const login = async (uid: number, c: ContextType) => {
	c.header('Set-Cookie', `session=${await new SignJWT({ uid })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('30d')
		.sign(new TextEncoder().encode(c.env.JWT_SECRET))
	}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
	return c.json({ success: true });
};
app.on('post', ['/register', '/login', '/change-username', '/change-password', '/change-email', '/change-email/verify'], (c, next) => rateLimit(c.env.rateLimiter, c => c.req.header('cf-connecting-ip') ?? '')(c, next));
export const userInfoDatas = ['id', 'name', 'created_at', 'permission', 'username_violation', 'name_color_light', 'name_color_dark', 'tag'];
export const userQuery = async (user: number, c: ContextType) => await c.env.db
		.prepare(`SELECT ${userInfoDatas.join()} FROM users WHERE id = ?`)
		.bind(user)
		.first<userInfo>();
app.get('/query/:uid{\\d+}', async c => c.json(await userQuery(parseInt(c.req.param('uid')), c)));
app.post('/register', async c => {
	const reqBody = c.get('reqBody');
	if (c.get('currentUser')) {
		return alreadyLoggedIn(c);
	}
	if (!Object.hasOwn(reqBody, 'name') || typeof reqBody.name !== 'string') {
		return usernameRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'password') || typeof reqBody.password !== 'string' || !reqBody.password.trim()) {
		return passwordRequired(c);
	}
	const usernameError = validateUsername(reqBody.name, c);
	if (usernameError) {
		return usernameError;
	}
	if (await c.env.db.prepare('SELECT name FROM users WHERE name = ?').bind(reqBody.name.trim()).first()) {
		return registerUsernameExists(c);
	}
	return await login((await c.env.db.prepare('INSERT INTO users (name, password) VALUES (?, ?)').bind(reqBody.name.trim(), await bcrypt.hash(reqBody.password, 12)).run()).meta.last_row_id, c);
});
app.post('/login', async c => {
	const reqBody = c.get('reqBody');
	if (c.get('currentUser')) {
		return alreadyLoggedIn(c);
	}
	if (!Object.hasOwn(reqBody, 'name') || typeof reqBody.name !== 'string' || !reqBody.name.trim()) {
		return usernameRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'password') || typeof reqBody.password !== 'string' || !reqBody.password.trim()) {
		return passwordRequired(c);
	}
	const user = await c.env.db.prepare('SELECT id, password FROM users WHERE name = ?').bind(reqBody.name).first<{ id: number, password: string }>();
	if (!user) {
		return noSuchUsername(c);
	}
	if (await bcrypt.compare(reqBody.password, user.password)) {
		return login(user.id, c);
	} else {
		return invalidPassword(c);
	}
});
app.get('/logout', c => {
	c.header('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=strict; Path=/; Max-Age=0');
	return c.json({ success: true });
});
app.get('/detail/:id', async c => {
	const id = parseInt(c.req.param('id') ?? '');
	if (!id) {
		return c.json({ result: null });
	}
	return c.json({ result: await c.env.db.prepare(`SELECT ${userInfoDatas} FROM users WHERE id = ?`).bind(id).first<userInfo>() });
});
app.get('/detail/:id/feed', async c => {
	const id = parseInt(c.req.param('id') ?? '');
	if (!id) {
		return c.json({ result: null });
	}
	const perPage = Math.min(Math.max(parseInt(c.get('reqBody').perpage || '10') || 10, 1), 10);
	const page = Math.max(parseInt(c.get('reqBody').page || '1') || 1, 1);
	return c.json({
		results: await feedQuery(c, [...((await c.env.db.prepare('SELECT id FROM feed WHERE uid = ? AND deleted = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?')
			.bind(id, perPage, (page - 1) * perPage).all<{ id: number }>())
			.results).map(({ id }) => id)], true, true),
		total: (await c.env.db.prepare('SELECT COUNT(*) AS total FROM feed WHERE uid = ? AND deleted = 0').bind(id).first())?.total
	});
});
app.get('/detail/:id/discussion', async c => {
	const id = parseInt(c.req.param('id') ?? '');
	if (!id) {
		return c.json({ result: null });
	}
	const perPage = Math.min(Math.max(parseInt(c.get('reqBody').perpage || '20') || 20, 1), 20);
	const page = Math.max(parseInt(c.get('reqBody').page || '1') || 1, 1);
	return c.json({
		results: ((await c.env.db.prepare(`
			SELECT
				d.id, d.category, d.title, d.created_at, d.pin,
				json_object (
					${userInfoDatas.map(schema => `'${schema}', u.${schema}`)}
				) AS user
			FROM discussion d
			JOIN users u ON d.uid = u.id
			WHERE d.uid = ?
			ORDER BY d.pin DESC, d.created_at DESC
			LIMIT ?
			OFFSET ?
		`).bind(id, perPage, (page - 1) * perPage).all<{ user: string, [attr: string]: unknown }>()).results).map(({ user, ...attr }) => ({ user: JSON.parse(user), ...attr })),
		total: (await c.env.db.prepare('SELECT COUNT(*) AS total FROM discussion WHERE uid = ?').bind(id).first())?.total
	});
});
app.get('/detail/:id/theme', async c => {
	const id = parseInt(c.req.param('id') ?? '');
	if (!id) {
		return c.json({ result: null });
	}
	const perPage = Math.min(Math.max(parseInt(c.get('reqBody').perpage || '20') || 20, 1), 20);
	const page = Math.max(parseInt(c.get('reqBody').page || '1') || 1, 1);
	return c.json({
		results: ((await c.env.db.prepare(`
			SELECT
				t.id, t.name, t.created_at, t.updated_at,
				json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS user,
				(SELECT COUNT(*) FROM users uu WHERE uu.using_theme = t.id) AS number_of_users,
				t.usebgimage, t.useFrostedGlass, t.editor,
				t.bgImageRepeatX, t.bgImageRepeatY,
				t.bgImageSizeX, t.bgImageSizeXCustom, t.bgImageSizeXCustomUnit,
				t.bgImageSizeY, t.bgImageSizeYCustom, t.bgImageSizeYCustomUnit,
				t.light_fgcolor, t.light_bgcolor, t.light_bgimage,
				t.dark_fgcolor, t.dark_bgcolor, t.dark_bgimage
			FROM theme t
			JOIN users u ON t.uid = u.id
			WHERE t.uid = ?
			LIMIT ?
			OFFSET ?
		`).bind(id, perPage, (page - 1) * perPage).all<{ user: string, [attr: string]: unknown }>()).results).map(({ user, ...attr }) => ({ user: JSON.parse(user), ...attr })),
		total: (await c.env.db.prepare('SELECT COUNT(*) AS total FROM theme WHERE uid = ?').bind(id).first())?.total
	});
});
app.get('/detail/:id/judgement', async c => {
	const id = parseInt(c.req.param('id') ?? '');
	if (!id) {
		return c.json({ result: null });
	}
	const perPage = Math.min(Math.max(parseInt(c.get('reqBody').perpage || '100') || 100, 1), 100);
	const page = Math.max(parseInt(c.get('reqBody').page || '1') || 1, 1);
	return c.json({
		results: ((await c.env.db.prepare(`
			SELECT
				j.id,
				j.type,
				j.payload,
				j.created_at,
				j.batch_id,
				j.comment,
				json_object ( ${userInfoDatas.map(scheme => `'${scheme}', u.${scheme}`)} ) AS user,
				json_object ( ${userInfoDatas.map(scheme => `'${scheme}', ou.${scheme}`)} ) AS operator
			FROM judgement j
			JOIN users u ON j.uid = u.id
			JOIN users ou ON j.operator = ou.id
			WHERE j.uid = ?
			ORDER BY j.created_at DESC
			LIMIT ?
			OFFSET ?
		`).bind(id, perPage, (page - 1) * perPage).all<{
			id: number,
			type: judgementType,
			payload: string,
			created_at: string,
			batch_id: string,
			comment: string,
			user: string,
			operator: string
		}>()).results).map(({ payload, user, operator, ...data }) => ({ payload: JSON.parse(payload), user: JSON.parse(user), operator: JSON.parse(operator), ...data })),
		total: (await c.env.db.prepare('SELECT COUNT(*) AS total FROM judgement WHERE uid = ?').bind(id).first())?.total
	});
});
app.post('/settings/username', async c => {
	const currentUser = c.get('currentUser'), { username, nameColorLight, nameColorDark, tag } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!username || !nameColorLight || !nameColorDark || !/^#[0-9a-f]{6}$/.test(nameColorLight) || !/^#[0-9a-f]{6}$/.test(nameColorDark)) {
		return missingParams(c);
	}
	const usernameError = validateUsername(username, c);
	if (usernameError) {
		return usernameError;
	}
	const trimmedName = username.trim();
	const existingUser = await c.env.db.prepare('SELECT id FROM users WHERE name = ?').bind(trimmedName).first();
	if (existingUser && existingUser.id !== currentUser.id) {
		return registerUsernameExists(c);
	}
	if (!(currentUser.permission & permissionAdmin) && tag) {
		return accessDenied(c);
	}
	await c.env.db.prepare('UPDATE users SET name = ?, name_color_light = ?, name_color_dark = ? WHERE id = ?').bind(trimmedName, nameColorLight.substring(1), nameColorDark.substring(1), currentUser.id).run();
	if (currentUser.permission & permissionAdmin) {
		await c.env.db.prepare('UPDATE users SET tag = ? WHERE id = ?').bind(tag, currentUser.id).run();
	}
	return c.json({ success: true });
});
app.post('/settings/change-password', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'old') || !Object.hasOwn(reqBody, 'new') || typeof reqBody.old !== 'string' || typeof reqBody.new !== 'string' || !reqBody.old.trim() || !reqBody.new.trim()) {
		return passwordRequired(c);
	}
	const password = (await c.env.db.prepare('SELECT password FROM users WHERE id = ?').bind(currentUser.id).first<{ password: string }>())?.password;
	if (password && !await bcrypt.compare(reqBody.old, password)) {
		return invalidPassword(c);
	}
	await c.env.db.prepare('UPDATE users SET password = ? WHERE id = ?').bind(await bcrypt.hash(reqBody.new, 12), currentUser.id).run();
	return c.json({ success: true });
});
app.post('/settings/change-email', async c => {
	const reqBody = c.get('reqBody'), currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'password') || typeof reqBody.password !== 'string' || !reqBody.password.trim()) {
		return passwordRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'email') || typeof reqBody.email !== 'string' || !reqBody.email.trim()) {
		return emailRequired(c);
	}
	if (!validator.isEmail(reqBody.email)) {
		return invalidEmail(c);
	}
	const password = (await c.env.db.prepare('SELECT password FROM users WHERE id = ?').bind(currentUser.id).first<{ password: string }>())?.password;
	if (password && !await bcrypt.compare(reqBody.password, password)) {
		return invalidPassword(c);
	}
	if (await c.env.db.prepare('SELECT id FROM users WHERE email = ?').bind(reqBody.email.toLowerCase()).first()) {
		return emailUsed(c);
	}
	const code = crypto.getRandomValues(new Uint32Array(1))[0]! % Math.pow(2, 31);
	await c.env.db.prepare('UPDATE users SET email_verify_code = ?, email_verify_time = CURRENT_TIMESTAMP WHERE id = ?').bind(code, currentUser.id).run();
	return c.json({ success: true, email: reqBody.email, code });
});
app.post('/settings/change-email/verify', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'email') || typeof reqBody.email !== 'string' || !reqBody.email.trim()) {
		return emailRequired(c);
	}
	if (!validator.isEmail(reqBody.email)) {
		return invalidEmail(c);
	}
	const { email_verify_code: code, email_verify_time: time } = await c.env.db.prepare('SELECT email_verify_code, email_verify_time FROM users WHERE id = ?').bind(currentUser.id).first<{ email_verify_code: number, email_verify_time: string }>() ?? { email_verify_code: null, email_verify_time: null };
	if (!time || new Date().getTime() - new Date(time + 'Z').getTime() > 10 * 60 * 1000) {
		return c.redirect('/');
	}
	const { status } = await (await fetch(`https://api.verify.mail.cqiming.com/verify?sender=${encodeURIComponent(reqBody.email)}&code=${code}&token=${c.env.EMAIL_VERIFY_TOKEN}&tokenuser=${c.env.EMAIL_VERIFY_TOKEN_USER}`)).json() as { status: string };
	if (status === 'PASS') {
		await c.env.db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(reqBody.email, currentUser.id).run();
		return c.json({ success: true });
	} else {
		return verifyFailed(c);
	}
});
export type NotificationPayloadTypeMap = {
	'feed-reply': { user: userInfo, id: number, parent_id: number },
	'discussion-reply-replied': { user: userInfo, discussion_id: number, discussion_name: string, parent_id: number, id: number },
	'ticket-reply-replied': { user: userInfo, ticket_id: number, ticket_name: string, parent_id: number, id: number },
	'ticket-status-changed': { ticket_id: number, ticket_name: string, status: ticketStatusType },
	'permission-changed': { comment: string, operator: userInfo, oldPermission: number, newPermission: number },
	'name-violation': { comment: string, operator: userInfo, newViolation: number },
	'warn': { comment: string, operator: userInfo },
	'at': { user: userInfo, link: string },
	'unknown': {}
};
type _NotifPayload<type extends keyof NotificationPayloadTypeMap> = type extends unknown ? { type: type, payload: NotificationPayloadTypeMap[type] } : never;
export type NotificationItem = { id: number, read: number, created_at: string } & _NotifPayload<keyof NotificationPayloadTypeMap>;
app.get('/notification', async c => {
	const currentUser = c.get('currentUser'), { page: page_, perpage } = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	const page = Math.max(parseInt(page_ || '1') || 1, 1);
	const perPage = Math.max(1, Math.min(parseInt(perpage || '20') || 20, 20));
	return c.json({
		results: await Promise.all(((await c.env.db.prepare('SELECT id, type, read, payload, created_at FROM notification WHERE uid = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
        	.bind(currentUser.id, perPage, (page - 1) * perPage).all<{ id: number, type: string, read: number, payload: string, created_at: string }>()).results).map(async ({ id, type, read, payload, created_at }) => ({
				id, type, read, payload: await (async (payload: any) => {
					switch (type) {
						case 'feed-reply':
							return {
								user: await userQuery(payload.uid, c),
								id: payload.id,
								parent_id: payload.parent_id
							};
						case 'discussion-reply-replied':
							return {
								user: await userQuery(payload.uid, c),
								discussion_id: payload.discussion_id,
								discussion_name: (await c.env.db.prepare('SELECT title FROM discussion WHERE id = ?').bind(payload.discussion_id).first<{ title: string }>())?.title,
								parent_id: payload.parent_id,
								id: payload.id
							};
						case 'ticket-reply-replied':
							return {
								user: await userQuery(payload.uid, c),
								ticket_id: payload.ticket_id,
								ticket_name: (await c.env.db.prepare('SELECT title FROM ticket WHERE id = ?').bind(payload.ticket_id).first<{ title: string }>())?.title,
								parent_id: payload.parent_id,
								id: payload.id
							};
						case 'ticket-status-changed':
							return {
								ticket_id: payload.ticket_id,
								ticket_name: (await c.env.db.prepare('SELECT title FROM ticket WHERE id = ?').bind(payload.ticket_id).first<{ title: string }>())?.title,
								status: payload.status
							};
						case 'permission-changed':
							return {
								comment: payload.comment,
								operator: await userQuery(payload.operator, c),
								oldPermission: payload.oldPermission,
								newPermission: payload.newPermission
							};
						case 'name-violation':
							return {
								comment: payload.comment,
								operator: await userQuery(payload.operator, c),
								newViolation: payload.newViolation
							};
						case 'warn':
							return {
								comment: payload.comment,
								operator: await userQuery(payload.operator, c)
							};
						case 'at':
							return {
								user: await userQuery(payload.uid, c),
								link: payload.link
							};
						default:
							return {};
					}
				})(JSON.parse(payload)), created_at
			}))),
		total: (await c.env.db.prepare('SELECT COUNT(*) as total FROM notification WHERE uid = ?').bind(currentUser.id).first())!.total
	});
});
app.post('/notification/read-status', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'id')) {
		return notFound(c);
	}
	const id = parseInt(reqBody.id || '');
	if (Number.isNaN(id)) {
		return notFound(c);
	}
	const readValue = Object.hasOwn(reqBody, 'read') ? (parseInt(reqBody.read || '0') ? 1 : 0) : 1;
	const notification = await c.env.db.prepare('SELECT uid FROM notification WHERE id = ?').bind(id).first();
	if (!notification || notification.uid !== currentUser.id) {
		return accessDenied(c);
	}
	await c.env.db.prepare('UPDATE notification SET read = ? WHERE id = ?').bind(readValue, id).run();
	return c.json({ success: true });
});
app.post('/notification/read-all', async c => {
	const currentUser = c.get('currentUser');
	if (!currentUser) {
		return loginRequired(c);
	}
	await c.env.db.prepare('UPDATE notification SET read = 1 WHERE uid = ? AND read = 0').bind(currentUser.id).run();
	return c.json({ success: true });
});
app.get('/search', async c => {
	const { user } = c.get('reqBody');
	if (!user) {
		return notFound(c);
	}
	return c.json((await c.env.db.prepare(`SELECT ${userInfoDatas} FROM users WHERE id = ? OR name = ?`).bind(user, user).all()).results);
});
export default app;