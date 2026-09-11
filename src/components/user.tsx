// src/components/user.tsx
import type { FC } from "hono/jsx";
import type { ContextType, userInfo } from "../types";
import { getText } from "../translations";
import { permissionAdmin, permissionVisit } from "../settings";

export const userQuery = async (uid: number, c: ContextType): Promise<userInfo | null> =>
	await (c.env as any).db
		.prepare('SELECT id, name, created_at, permission, username_violation, name_color_light, name_color_dark, tag FROM users WHERE id = ?')
		.bind(uid)
		.first();

export const getDisplayUsername = (user: Partial<userInfo> | null | undefined, locale: string): string => {
	const normalizedLocale = locale?.toLowerCase() === 'zh' ? 'zh' : 'en';
	if (!user?.id) {
		return getText(normalizedLocale, 'userUnknown');
	}
	if (user.username_violation === 1) {
		return getText(normalizedLocale, 'usernameViolation').replace('__UID__', String(user.id));
	}
	return user.name ?? '';
};

export const User: FC<{ user: userInfo | number | null; c: ContextType; linkable?: boolean }> = async ({ user, c, linkable = true }) => {
	const env = c.env as any, locale = c.get('locale');
	if (user === null) {
		return <span>{getText(locale, 'notLoggedIn')}</span>;
	}
	if (user === undefined) {
		return <span>{getText(locale, 'userUnknown')}</span>;
	}
	if (typeof user === 'number') {
		if (!user) {
			return <span>{getText(locale, 'userUnknown')}</span>;
		}
		const resolvedUser = await userQuery(user, c);
		return resolvedUser ? <User user={resolvedUser} c={c} linkable={linkable} /> : <span>{getText(locale, 'userUnknown')}</span>;
	}
	const tag = user.tag || (user.permission & permissionAdmin ? getText(locale, 'userTagAdmin') : null);
	const content = <span style={user.permission & permissionVisit ? {} : {
		'text-decoration-line': 'line-through',
		opacity: '60%',
		'text-decoration-color': 'red'
	}}>
		{env.ENABLE_AVATAR === '1' ? <img src={`/file/user/${user.id}/avatar.png`} style={{ display: 'inline-block', height: '1.3em', width: '1.3em', borderRadius: '100%' }} onerror={`this.outerHTML='<div style="display:inline-flex;color:white;background-color:light-dark(#${user.name_color_light},#${user.name_color_dark});height:1.3em;width:1.3em;justify-content:center;border-radius:100%"><span style="font-size:80%">${user.name[0]}</span></div>'`} /> : <></>}
		{user.permission & permissionVisit ? <></> : <i class='fa-solid fa-ban' style={{ color: 'red' }}></i>}
		{user.permission & permissionAdmin ? <i class='fa-solid fa-shield' style={{ color: 'gold' }}></i> : <></>}
		<strong style={{ color: `light-dark(#${user.name_color_light}, #${user.name_color_dark})` }}>
			{getDisplayUsername(user, locale)}
		</strong>
		{tag ? <>&nbsp;<span style={{
			color: 'white',
			padding: '0.3em',
			'font-size': '60%',
			'border-radius': '10%',
			'background-color': `light-dark(#${user.name_color_light}, #${user.name_color_dark})`
		}}>{tag}</span></> : <></>}
	</span>;
	if (linkable) {
		return <a href={'/user/' + user.id}>{content}</a>;
	} else {
		return content;
	}
};