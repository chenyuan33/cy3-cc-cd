import type { CSSProperties, FC } from "hono/jsx";
import { t } from "../i18n";
import { permissionCount, type allPermissions } from "../../settings";

export const PermissionChangeList: FC<{ oldPermission: number, newPermission: number, style?: CSSProperties | string | undefined }> = ({ oldPermission, newPermission, style }) => <ul style={style}>{Array.from({ length: permissionCount }, (_, i) => 1 << i)
	.filter(i => (oldPermission ^ newPermission) & i)
	.map((i, idx) => <li key={idx}>
		<span style={{ color: newPermission & i ? '#52c41a' : '#e74c3c' }}>
			<i class={`fa-solid fa-user-${newPermission & i ? 'plus' : 'minus'}`}></i>
			&nbsp;
			{newPermission & i ? t('permission.granted') : t('permission.revoked')}
		</span>
		&nbsp;
		<code>{t(`permission.${i as allPermissions}`)}</code>
		&nbsp;
		{t('permission.name')}
	</li>)}</ul>;