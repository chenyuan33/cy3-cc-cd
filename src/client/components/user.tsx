import { useEffect, useState, type CSSProperties, type FC } from "hono/jsx";
import type { userInfo } from "../../types";
import { permissionAdmin, permissionVisit } from "../../settings";
import { t } from "../i18n";
import { A } from "./a";

export const getDisplayUsername = (user: userInfo) => {
	if (!user.id) {
		return t('user.unknown');
	}
	if (user.username_violation === 1) {
		return t('user.usernameViolation', { uid: String(user.id) });
	}
	return user.name ?? '';
};
const UserFromObject: FC<{ user: userInfo, linkable?: boolean, style?: CSSProperties | undefined }> = ({ user, linkable = true, style }) => {
	const tag = user.tag || (user.permission & permissionAdmin ? t('user.tagAdmin') : null);
	const content = <span style={user.permission & permissionVisit ? style : {
		...style,
		'text-decoration-line': 'line-through',
		opacity: '60%',
		'text-decoration-color': 'red'
	}}>
		{typeof window !== 'undefined' && !!window.data.enableAvatar ? <img src={`/file/user/${user.id}/avatar.png`} style={{ display: 'inline-block', height: '1.3em', width: '1.3em', borderRadius: '100%' }} onError={(e: Event) => (e.currentTarget as HTMLElement).outerHTML = `<div style="display:inline-flex;color:white;background-color:light-dark(#${user.name_color_light},#${user.name_color_dark});height:1.3em;width:1.3em;justify-content:center;border-radius:100%"><span style="font-size:80%">${user.name[0]}</span></div>`} /> : <></>}
		&nbsp;
		{user.permission & permissionVisit ? <></> : <i class='fa-solid fa-ban' style={{ color: 'red' }}></i>}
		{user.permission & permissionAdmin ? <i class='fa-solid fa-shield' style={{ color: 'gold' }}></i> : <></>}
		<strong style={{ color: `light-dark(#${user.name_color_light}, #${user.name_color_dark})` }}>{getDisplayUsername(user)}</strong>
		{tag ? <>&nbsp;<span style={{
			color: 'white',
			padding: '0.4em',
			'font-size': '60%',
			'border-radius': '5px',
			'background-color': `light-dark(#${user.name_color_light}, #${user.name_color_dark})`
		}}>{tag}</span></> : <></>}
	</span>;
	if (linkable) {
		return <A href={'/user/' + user.id}>{content}</A>;
	} else {
		return content;
	}
};
export const User: FC<{ user: userInfo | number | null, linkable?: boolean, style?: CSSProperties | undefined }> = ({ user, linkable = true, style }) => {
	const [resolvedUser, setResolvedUser] = useState<userInfo | undefined>(undefined);
	useEffect(() => {
		if (typeof user === 'number') {
			(async () => setResolvedUser(await (await fetch('/api/user/query/' + user)).json()))();
		}
	}, [user]);
	if (!user) {
		return <span style={style}>{t('user.unknown')}</span>;
	}
	if (typeof user === 'number') {
		if (resolvedUser === undefined) {
			return <span style={style}>{t('loading')}</span>
		}
		if (resolvedUser === null) {
			return <span style={style}>{t('user.unknown')}</span>
		}
		return <UserFromObject user={resolvedUser} linkable={linkable} style={style} />;
	}
	return <UserFromObject user={user} linkable={linkable} style={style} />;
};