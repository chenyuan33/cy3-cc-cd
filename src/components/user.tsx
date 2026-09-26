// src/components/user.tsx
import type { FC } from "hono/jsx";
import type { ContextType, userInfo } from "../types";
import { permissionAdmin, permissionVisit } from "../settings";

export const userQuery = async (uid: number, c: ContextType): Promise<userInfo | null> =>
	await (c.env as any).db
		.prepare('SELECT id, name, created_at, permission, username_violation, name_color_light, name_color_dark, tag FROM users WHERE id = ?')
		.bind(uid)
		.first();

export const getDisplayUsername = (user: userInfo, c: ContextType): string => {
	const translations = c.get('translations');
	if (!user.id) {
		return translations.user.unknown;
	}
	if (user.username_violation === 1) {
		return translations.user.usernameViolation.replace('__UID__', String(user.id));
	}
	return user.name ?? '';
};

export const User: FC<{ user: userInfo | number | null; c: ContextType; linkable?: boolean }> = async ({ user, c, linkable = true }) => {
	const env = c.env as any, translations = c.get('translations');
	if (!user) {
		return <span>{translations.user.unknown}</span>;
	}
	if (typeof user === 'number') {
		const resolvedUser = await userQuery(user, c);
		return resolvedUser ? <User user={resolvedUser} c={c} linkable={linkable} /> : <span>{translations.user.unknown}</span>;
	}
	const tag = user.tag || (user.permission & permissionAdmin ? translations.user.tagAdmin : null);
	const content = <span style={user.permission & permissionVisit ? {} : {
		'text-decoration-line': 'line-through',
		opacity: '60%',
		'text-decoration-color': 'red'
	}}>
		{env.ENABLE_AVATAR === '1' ? <img src={`/file/user/${user.id}/avatar.png`} style={{ display: 'inline-block', height: '1.3em', width: '1.3em', borderRadius: '100%' }} onerror={`this.outerHTML='<div style="display:inline-flex;color:white;background-color:light-dark(#${user.name_color_light},#${user.name_color_dark});height:1.3em;width:1.3em;justify-content:center;border-radius:100%"><span style="font-size:80%">${user.name[0]}</span></div>'`} /> : <></>}
		&nbsp;
		{user.permission & permissionVisit ? <></> : <i class='fa-solid fa-ban' style={{ color: 'red' }}></i>}
		{user.permission & permissionAdmin ? <i class='fa-solid fa-shield' style={{ color: 'gold' }}></i> : <></>}
		<strong style={{ color: `light-dark(#${user.name_color_light}, #${user.name_color_dark})` }}>
			{getDisplayUsername(user, c)}
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