import { Hono } from "hono";
import type { AppEnv, ContextType } from "../../types";
import { accessDenied, errorHTML, loginRequired, notFound } from "../errorPages";
import { getText } from "../../translations";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import validator from "validator";
import { Card } from "../../components/card";
import { raw } from "hono/html";
import { getDisplayUsername, User } from "../../components/user";
import { createSubmitHandler } from "../../components/form";

const app = new Hono<AppEnv>();
const validateUsername = (name: string, locale: string) => {
	if (!name.trim()) {
		return getText(locale, 'usernameRequired');
	}
	if (name.trim().length < 3 || name.trim().length > 30) {
		return getText(locale, 'registerUsernameLength');
	}
	if (!/^[A-Za-z0-9._-]*$/.test(name.trim())) {
		return getText(locale, 'registerUsernameFormat');
	}
	if (/^[0-9]/.test(name.trim())) {
		return getText(locale, 'registerUsernameStartWithNumber');
	}
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
// app.get('/test', async c => c.render(await new SignJWT({ uid: 54 })
// 		.setProtectedHeader({ alg: 'HS256' })
// 		.setIssuedAt()
// 		.setExpirationTime('30d')
// 		.sign(new TextEncoder().encode((c.env as any).JWT_SECRET))
// 	, { title: '1' }));
app.post('/register', async c => {
	const locale = c.get('locale'), reqBody = c.get('reqBody');
	if (c.get('currentUser')) {
		return errorHTML(c, getText(locale, 'alreadyLoggedIn'));
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
	if (await (c.env as any).db.prepare('SELECT name FROM users WHERE name = ?').bind(reqBody.name.trim()).first()) {
		return errorHTML(c, getText(locale, 'registerUsernameExists'));
	}
	return await login((await (c.env as any).db.prepare('INSERT INTO users (name, password) VALUES (?, ?)').bind(reqBody.name.trim(), await bcrypt.hash(reqBody.password, 12)).run()).meta.last_row_id, c);
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
app.post('/change-name-color', async c => {
	const currentUser = c.get('currentUser'), { light, dark } = c.get('reqBody'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	console.log(light, dark);
	if (!light || !dark || !/^#[0-9a-f]{6}$/.test(light) || !/^#[0-9a-f]{6}$/.test(dark)) {
		return notFound(c);
	}
	await env.db.prepare('UPDATE users SET name_color_light = ?, name_color_dark = ? WHERE id = ?').bind(light.substring(1), dark.substring(1), currentUser.id).run();
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
				alert('${getText(locale, 'copiedSuccessfully')}');
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
	const { status } = await (await fetch(`https://api.verify.mail.cqiming.com/verify?sender=${encodeURIComponent(reqBody.email)}&code=${code}&token=cv3sitetovy&tokenuser=cy3`)).json() as { status: string };
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
	const result = await (c.env as any).db.prepare('SELECT id, name, created_at, username_violation FROM users WHERE id = ?').bind(id).first();
	console.log(c.get('reqBody'), id, result);
	if (result) {
		return c.html(<User c={c} user={result} />);
	}
	return notFound(c);
});
export default app;