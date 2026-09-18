import { Hono } from "hono";
import type { AppEnv, ContextType } from "../../types";
import { accessDenied, errorHTML, loginRequired, notFound } from "../errorPages";
import { getText, normalizeLocale, translations } from "../../translations";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import validator from "validator";
import { Card } from "../../components/card";
import { raw } from "hono/html";
import { getDisplayUsername, User } from "../../components/user";
import { createSubmitHandler } from "../../components/form";
import { permissionAdmin } from "../../settings";

const app = new Hono<AppEnv>();
const getClientIp = (c: ContextType) => {
	const forwarded = c.req.header('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0]?.trim() || 'unknown';
	}
	return c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
};
const validateUsername = (name: string, locale: string) => {
	if (!name.trim()) {
		return getText(locale, 'usernameRequired');
	}
	if (name.trim().length < 3 || name.trim().length > 30) {
		return getText(locale, 'registerUsernameLength');
	}
	// if (!/^[A-Za-z0-9._-]*$/.test(name.trim())) {
	// 	return getText(locale, 'registerUsernameFormat');
	// }
	// if (/^[0-9]/.test(name.trim())) {
	// 	return getText(locale, 'registerUsernameStartWithNumber');
	// }
	return null;
};
const login = async (uid: number, c: ContextType) => {
	c.header('Set-Cookie', `session=${await new SignJWT({ uid })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('30d')
		.sign(new TextEncoder().encode((c.env as any).JWT_SECRET))
	}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
	return c.redirect('/');
};
app.post('/register', async c => {
	const locale = c.get('locale'), reqBody = c.get('reqBody'), env = c.env as any;
	if (c.get('currentUser')) {
		return errorHTML(c, getText(locale, 'alreadyLoggedIn'));
	}
	const ip = getClientIp(c);
	const { recentCount } = await env.db.prepare('SELECT COUNT(*) AS recentCount FROM registration_attempts WHERE ip = ? AND created_at >= datetime("now", "-3 hours")').bind(ip).first();
	if (recentCount >= 1) {
		return errorHTML(c, 'Too many accounts created from this IP. Please wait 3 hours before creating another account.');
	}
	if (!Object.hasOwn(reqBody, 'name') || typeof reqBody.name !== 'string') {
		return errorHTML(c, getText(locale, 'usernameRequired'));
	}
	if (!Object.hasOwn(reqBody, 'password') || typeof reqBody.password !== 'string' || !reqBody.password.trim()) {
		return errorHTML(c, getText(locale, 'passwordRequired'));
	}
	const usernameError = validateUsername(reqBody.name, locale);
	if (usernameError) {
		return errorHTML(c, usernameError);
	}
	if (await env.db.prepare('SELECT name FROM users WHERE name = ?').bind(reqBody.name.trim()).first()) {
		return errorHTML(c, getText(locale, 'registerUsernameExists'));
	}
	const userId = (await env.db.prepare('INSERT INTO users (name, password) VALUES (?, ?)').bind(reqBody.name.trim(), await bcrypt.hash(reqBody.password, 12)).run()).meta.last_row_id;
	await env.db.prepare('INSERT INTO registration_attempts (ip) VALUES (?)').bind(ip).run();
	return await login(userId, c);
});
app.post('/login', async c => {
	const locale = c.get('locale'), reqBody = c.get('reqBody');
	if (c.get('currentUser')) {
		return errorHTML(c, getText(locale, 'alreadyLoggedIn'));
	}
	if (!Object.hasOwn(reqBody, 'name') || typeof reqBody.name !== 'string' || !reqBody.name.trim()) {
		return errorHTML(c, getText(locale, 'usernameRequired'));
	}
	if (!Object.hasOwn(reqBody, 'password') || typeof reqBody.password !== 'string' || !reqBody.password.trim()) {
		return errorHTML(c, getText(locale, 'passwordRequired'));
	}
	const user = await (c.env as any).db.prepare('SELECT id, password FROM users WHERE name = ?').bind(reqBody.name).first();
	if (!user) {
		return errorHTML(c, getText(locale, 'noSuchUsername'));
	}
	if (await bcrypt.compare(reqBody.password, user.password)) {
		return login(user.id, c);
	} else {
		return errorHTML(c, getText(locale, 'invalidPassword'));
	}
});
app.get('/logout', c => {
	c.header('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=strict; Path=/; Max-Age=0');
	return c.redirect('/');
});
app.post('/set-locale', c => {
	const reqBody = c.get('reqBody');
	const locale = normalizeLocale(typeof reqBody.locale === 'string' ? reqBody.locale : '');
	if (!locale || !Object.hasOwn(translations, locale)) {
		return notFound(c);
	}
	c.header('Set-Cookie', `locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`);
	c.set('locale', locale);
	return c.redirect('/user/settings');
});
app.post('/relationship', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	const targetUid = parseInt(String(reqBody.uid || ''));
	const type = String(reqBody.type || 'subscribe');
	const action = String(reqBody.action || 'set');
	if (!targetUid || targetUid === currentUser.id || !['subscribe', 'friend'].includes(type)) {
		return notFound(c);
	}
	if (action === 'remove') {
		await env.db.prepare('DELETE FROM user_relations WHERE uid = ? AND target_uid = ? AND type = ?').bind(currentUser.id, targetUid, type).run();
	} else {
		await env.db.prepare('INSERT OR REPLACE INTO user_relations (uid, target_uid, type, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').bind(currentUser.id, targetUid, type).run();
	}
	return c.redirect(`/user/${targetUid}`);
});
app.post('/general-settings', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	const locale = normalizeLocale(typeof reqBody.locale === 'string' ? reqBody.locale : '');
	if (locale && Object.hasOwn(translations, locale)) {
		c.header('Set-Cookie', `locale=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`);
		c.set('locale', locale);
	}
	const { nameColorLight, nameColorDark, tag } = reqBody;
	console.log(nameColorLight, nameColorDark);
	if (!nameColorLight || !nameColorDark || !/^#[0-9a-f]{6}$/.test(nameColorLight) || !/^#[0-9a-f]{6}$/.test(nameColorDark)) {
		return notFound(c);
	}
	if (!(currentUser.permission & permissionAdmin) && tag) {
		return accessDenied(c);
	}
	await env.db.prepare('UPDATE users SET name_color_light = ?, name_color_dark = ? WHERE id = ?').bind(nameColorLight.substring(1), nameColorDark.substring(1), currentUser.id).run();
	if (currentUser.permission & permissionAdmin) {
		await env.db.prepare('UPDATE users SET tag = ? WHERE id = ?').bind(tag, currentUser.id).run();
	}
	return c.redirect('/user/settings');
});
app.post('/change-username', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), locale = c.get('locale'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'password') || typeof reqBody.password !== 'string' || !reqBody.password.trim()) {
		return errorHTML(c, getText(locale, 'passwordRequired'));
	}
	if (!Object.hasOwn(reqBody, 'name') || typeof reqBody.name !== 'string') {
		return errorHTML(c, getText(locale, 'usernameRequired'));
	}
	const usernameError = validateUsername(reqBody.name, locale);
	if (usernameError) {
		return errorHTML(c, usernameError);
	}
	if (!await bcrypt.compare(reqBody.password, (await env.db.prepare('SELECT password FROM users WHERE id = ?').bind(currentUser.id).first()).password)) {
		return errorHTML(c, getText(locale, 'invalidPassword'), 401);
	}
	const trimmedName = reqBody.name.trim();
	const existingUser = await env.db.prepare('SELECT id FROM users WHERE name = ?').bind(trimmedName).first();
	if (existingUser && existingUser.id !== currentUser.id) {
		return errorHTML(c, getText(locale, 'registerUsernameExists'));
	}
	await env.db.prepare('UPDATE users SET name = ? WHERE id = ?').bind(trimmedName, currentUser.id).run();
	return c.render(<h1>{getText(locale, 'userSettingsChangeUsernameChangedSuccessfully')}</h1>, { title: getText(locale, 'userSettingsChangeUsername') });
});
app.post('/change-password', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), locale = c.get('locale'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'old') || !Object.hasOwn(reqBody, 'new') || typeof reqBody.old !== 'string' || typeof reqBody.new !== 'string' || !reqBody.old.trim() || !reqBody.new.trim()) {
		return errorHTML(c, getText(locale, 'passwordRequired'));
	}
	if (!await bcrypt.compare(reqBody.old, (await env.db.prepare('SELECT password FROM users WHERE id = ?').bind(currentUser.id).first()).password)) {
		return errorHTML(c, getText(locale, 'invalidPassword'), 401);
	}
	await env.db.prepare('UPDATE users SET password = ? WHERE id = ?').bind(await bcrypt.hash(reqBody.new, 12), currentUser.id).run();
	return c.render(<h1>{getText(locale, 'passwordChangedSuccessfully')}</h1>, { title: getText(locale, 'passwordChangedSuccessfully') });
});
app.post('/change-email', async c => {
	const reqBody = c.get('reqBody'), locale = c.get('locale'), currentUser = c.get('currentUser'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'password') || typeof reqBody.password !== 'string' || !reqBody.password.trim()) {
		return errorHTML(c, getText(locale, 'passwordRequired'));
	}
	if (!Object.hasOwn(reqBody, 'email') || typeof reqBody.email !== 'string' || !reqBody.email.trim()) {
		return errorHTML(c, getText(locale, 'emailRequired'));
	}
	if (!validator.isEmail(reqBody.email)) {
		return errorHTML(c, getText(locale, 'invalidEmail'));
	}
	if (!await bcrypt.compare(reqBody.password, (await env.db.prepare('SELECT password FROM users WHERE id = ?').bind(currentUser.id).first()).password)) {
		return errorHTML(c, getText(locale, 'invalidPassword'), 401);
	}
	if (await env.db.prepare('SELECT id FROM users WHERE email = ?').bind(reqBody.email.toLowerCase()).first()) {
		return errorHTML(c, getText(locale, 'emailUsed'));
	}
	const code = crypto.getRandomValues(new Uint32Array(1))[0]! % Math.pow(2, 31);
	await env.db.prepare('UPDATE users SET email_verify_code = ?, email_verify_time = CURRENT_TIMESTAMP WHERE id = ?').bind(code, currentUser.id).run();
	return c.render(<form method='post' action='/api/user/change-email/verify' onsubmit={createSubmitHandler()}>
		<Card style={{
			display: 'flex',
			'flex-direction': 'column',
			'align-items': 'center',
			gap: '10px'
		}}>
			<h1>{getText(locale, 'userSettingsChangeEmail')}</h1>
			<p>{raw(getText(locale, 'userSettingsChangeEmailVerify').replace('__EMAIL__', reqBody.email))}</p>
			<code style={{
				'font-size': 'xxx-large',
				cursor: 'pointer'
			}} onclick={`(() => {
				navigator.clipboard.writeText(String(${code}));
				await createAlert('${getText(locale, 'copiedSuccessfully')}');
			})()`}>{code}</code>
			<input type='hidden' name='email' value={reqBody.email} />
			<button type='submit' style={{ 'font-size': 'large' }}>{getText(locale, 'verify')}</button>
		</Card>
	</form>, { title: getText(locale, 'userSettingsChangeEmail') });
});
app.post('/change-email/verify', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, reqBody = c.get('reqBody'), locale = c.get('locale');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'email') || typeof reqBody.email !== 'string' || !reqBody.email.trim()) {
		return errorHTML(c, getText(locale, 'emailRequired'));
	}
	if (!validator.isEmail(reqBody.email)) {
		return errorHTML(c, getText(locale, 'invalidEmail'));
	}
	const { email_verify_code: code, email_verify_time: time } = await env.db.prepare('SELECT email_verify_code, email_verify_time FROM users WHERE id = ?').bind(currentUser.id).first();
	if (!time || new Date().getTime() - new Date(time + 'Z').getTime() > 10 * 60 * 1000) {
		return c.redirect('/');
	}
	const { status } = await (await fetch(`https://api.verify.mail.cqiming.com/verify?sender=${encodeURIComponent(reqBody.email)}&code=${code}&token=${env.EMAIL_VERIFY_TOKEN}&tokenuser=${env.EMAIL_VERIFY_TOKEN_USER}`)).json() as { status: string };
	if (status === 'PASS') {
		await env.db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(reqBody.email, currentUser.id).run();
		return c.render(<Card><h1>{getText(locale, 'userSettingsChangeEmailVerifySuccessfully')}</h1></Card>, { title: getText(locale, 'userSettingsChangeEmailVerifySuccessfully') });
	} else {
		return errorHTML(c, getText(locale, 'verifyFailed'));
	}
});
app.post('/notification/read-status', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), env = c.env as any;
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
	const notification = await env.db.prepare('SELECT uid FROM notification WHERE id = ?').bind(id).first();
	if (!notification || notification.uid !== currentUser.id) {
		return accessDenied(c);
	}
	await env.db.prepare('UPDATE notification SET read = ? WHERE id = ?').bind(readValue, id).run();
	return c.redirect('/user/notification', 303);
});
app.post('/notification/read-all', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	await env.db.prepare('UPDATE notification SET read = 1 WHERE read = 0').bind().run();
	return c.redirect('/user/notification', 303);
});
app.get('/search', async c => {
	const locale = c.get('locale'), { user } = c.get('reqBody');
	if (!user) {
		return notFound(c);
	}
	const result = await (c.env as any).db.prepare('SELECT id, name, created_at, username_violation FROM users WHERE id = ? OR name = ?').bind(user, user).first();
	if (result) {
		return c.json({ exists: true, user: { ...result, name: getDisplayUsername(result, locale) } });
	}
	return c.json({ exists: false });
});
app.get('/uidToHtml', async c => {
	const { id } = c.get('reqBody');
	if (!id) {
		return notFound(c);
	}
	return c.html(<User c={c} user={parseInt(id)} />);
});
export default app;