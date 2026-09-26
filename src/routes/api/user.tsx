import { Hono } from "hono";
import type { AppEnv, ContextType } from "../../types";
import { accessDenied, alreadyLoggedIn, emailRequired, emailUsed, errorHTML, invalidEmail, invalidPassword, loginRequired, noSuchUsername, notFound, passwordRequired, registerUsernameExists, registerUsernameLength, usernameRequired, verifyFailed } from "../errorPages";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import validator from "validator";
import { Card } from "../../components/card";
import { raw } from "hono/html";
import { getDisplayUsername, User } from "../../components/user";
import { createSubmitHandler } from "../../components/form";
import { permissionAdmin } from "../../settings";

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
		.sign(new TextEncoder().encode((c.env as any).JWT_SECRET))
	}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`);
	return c.redirect('/');
};
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
	if (await (c.env as any).db.prepare('SELECT name FROM users WHERE name = ?').bind(reqBody.name.trim()).first()) {
		return registerUsernameExists(c);
	}
	return await login((await (c.env as any).db.prepare('INSERT INTO users (name, password) VALUES (?, ?)').bind(reqBody.name.trim(), await bcrypt.hash(reqBody.password, 12)).run()).meta.last_row_id, c);
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
	const user = await (c.env as any).db.prepare('SELECT id, password FROM users WHERE name = ?').bind(reqBody.name).first();
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
	return c.redirect('/');
});
app.post('/general-settings', async c => {
	const currentUser = c.get('currentUser'), { nameColorLight, nameColorDark, tag } = c.get('reqBody'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
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
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), translations = c.get('translations'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'password') || typeof reqBody.password !== 'string' || !reqBody.password.trim()) {
		return passwordRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'name') || typeof reqBody.name !== 'string') {
		return usernameRequired(c);
	}
	const usernameError = validateUsername(reqBody.name, c);
	if (usernameError) {
		return usernameError;
	}
	if (!await bcrypt.compare(reqBody.password, (await env.db.prepare('SELECT password FROM users WHERE id = ?').bind(currentUser.id).first()).password)) {
		return invalidPassword(c);
	}
	const trimmedName = reqBody.name.trim();
	const existingUser = await env.db.prepare('SELECT id FROM users WHERE name = ?').bind(trimmedName).first();
	if (existingUser && existingUser.id !== currentUser.id) {
		return registerUsernameExists(c);
	}
	await env.db.prepare('UPDATE users SET name = ? WHERE id = ?').bind(trimmedName, currentUser.id).run();
	return c.render(<h1>{translations.user.settings.changeUsername.changedSuccessfully}</h1>, { title: translations.user.settings.changeUsername.name });
});
app.post('/change-password', async c => {
	const currentUser = c.get('currentUser'), reqBody = c.get('reqBody'), translations = c.get('translations'), env = c.env as any;
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'old') || !Object.hasOwn(reqBody, 'new') || typeof reqBody.old !== 'string' || typeof reqBody.new !== 'string' || !reqBody.old.trim() || !reqBody.new.trim()) {
		return passwordRequired(c);
	}
	if (!await bcrypt.compare(reqBody.old, (await env.db.prepare('SELECT password FROM users WHERE id = ?').bind(currentUser.id).first()).password)) {
		return invalidPassword(c);
	}
	await env.db.prepare('UPDATE users SET password = ? WHERE id = ?').bind(await bcrypt.hash(reqBody.new, 12), currentUser.id).run();
	return c.render(<h1>{translations.user.settings.changePassword.changedSuccessfully}</h1>, { title: translations.user.settings.changePassword.name });
});
app.post('/change-email', async c => {
	const reqBody = c.get('reqBody'), translations = c.get('translations'), currentUser = c.get('currentUser'), env = c.env as any;
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
	if (!await bcrypt.compare(reqBody.password, (await env.db.prepare('SELECT password FROM users WHERE id = ?').bind(currentUser.id).first()).password)) {
		return invalidPassword(c);
	}
	if (await env.db.prepare('SELECT id FROM users WHERE email = ?').bind(reqBody.email.toLowerCase()).first()) {
		return emailUsed(c);
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
			<h1>{translations.user.settings.changeEmail.name}</h1>
			<p>{raw(translations.user.settings.changeEmail.verify.replace('__EMAIL__', reqBody.email))}</p>
			<code style={{
				'font-size': 'xxx-large',
				cursor: 'pointer'
			}} onclick={`(() => {
				navigator.clipboard.writeText(String(${code}));
				createAlert('${translations.copiedSuccessfully}');
			})()`}>{code}</code>
			<input type='hidden' name='email' value={reqBody.email} />
			<button type='submit' style={{ 'font-size': 'large' }}>{translations.verify}</button>
		</Card>
	</form>, { title: translations.user.settings.changeEmail.name });
});
app.post('/change-email/verify', async c => {
	const currentUser = c.get('currentUser'), env = c.env as any, reqBody = c.get('reqBody'), translations = c.get('translations');
	if (!currentUser) {
		return loginRequired(c);
	}
	if (!Object.hasOwn(reqBody, 'email') || typeof reqBody.email !== 'string' || !reqBody.email.trim()) {
		return emailRequired(c);
	}
	if (!validator.isEmail(reqBody.email)) {
		return invalidEmail(c);
	}
	const { email_verify_code: code, email_verify_time: time } = await env.db.prepare('SELECT email_verify_code, email_verify_time FROM users WHERE id = ?').bind(currentUser.id).first();
	if (!time || new Date().getTime() - new Date(time + 'Z').getTime() > 10 * 60 * 1000) {
		return c.redirect('/');
	}
	const { status } = await (await fetch(`https://api.verify.mail.cqiming.com/verify?sender=${encodeURIComponent(reqBody.email)}&code=${code}&token=${env.EMAIL_VERIFY_TOKEN}&tokenuser=${env.EMAIL_VERIFY_TOKEN_USER}`)).json() as { status: string };
	if (status === 'PASS') {
		await env.db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(reqBody.email, currentUser.id).run();
		return c.render(<Card><h1>{translations.user.settings.changeEmail.verifySuccessfully}</h1></Card>, { title: translations.user.settings.changeEmail.name });
	} else {
		return verifyFailed(c);
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
	const { user } = c.get('reqBody');
	if (!user) {
		return notFound(c);
	}
	const result = await (c.env as any).db.prepare('SELECT id, name, created_at, username_violation FROM users WHERE id = ? OR name = ?').bind(user, user).first();
	if (result) {
		return c.json({ exists: true, user: { ...result, name: getDisplayUsername(result, c) } });
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