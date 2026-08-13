import type { FC } from "hono/jsx";
import type { ContextType, userInfo } from "../types";
import { getText } from "../translations";
import { permissionAdmin, permissionVisit } from "../settings";
export const userQuery = async (uid: number, c: ContextType): Promise<userInfo | null> => await (c.env as any).db.prepare('SELECT id, name, created_at, permission, username_violation, name_color_light, name_color_dark FROM users WHERE id = ?').bind(uid).first();
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
export const User: FC<{ user: userInfo | number | null, c: ContextType }> = async ({ user, c }) => {
	const locale = c.get('locale');
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
		return resolvedUser ? <User user={resolvedUser} c={c} /> : <span>{getText(locale, 'userUnknown')}</span>;
	}
	const tag = !(user.permission & permissionVisit) ? getText(locale, 'userTagBanned') : user.permission & permissionAdmin ? getText(locale, 'userTagAdmin') : null;
	return <a href={'/user/' + user.id}>
		<strong style={{ color: `light-dark(#${user.name_color_light}, #${user.name_color_dark})` }}>{getDisplayUsername(user, locale)}</strong>
		&nbsp;
		{tag ? <span style={{
			color: 'white',
			padding: '0.3em',
			'font-size': '60%',
			'border-radius': '10%',
			'background-color': `light-dark(#${user.name_color_light}, #${user.name_color_dark})`
		}}>{tag}</span> : <></>}
	</a>;
};