import type { FC } from "hono/jsx";
import type { themeInfo } from "../../types";
import { t } from "../i18n";
import { useCurrentUser } from "../utils/currentUser";
import { ThemeLoader } from "./themeLoader";
import { User } from "./user";
import { Time } from "./time";
import { ThemeApplyLink } from "./themeApply";
import { A } from "./a";
import { DeleteLink } from "./button";

export const ThemeListTable: FC<{ themes: themeInfo[], reload: () => void }> = ({ themes, reload }) => {
	const currentUser = useCurrentUser();
	return <table>
		<thead>
			<tr>
				<th>{t('theme.themeColor')}</th>
				<th>{t('theme.themeName')}</th>
				<th>{t('creator')}</th>
				<th>{t('createdAt')}</th>
				<th>{t('updatedAt')}</th>
				<th>{t('theme.numberOfUsers')}</th>
				{currentUser ? <th>{t('operations')}</th> : null}
			</tr>
		</thead>
		<tbody>
			{themes.map(({ id, user, name, created_at, updated_at, number_of_users, ...theme }) => (
				<tr key={id}>
					<td style={{ position: 'relative' }}>
						<div id={'themeColor' + id} style={{ position: 'absolute', top: '10%', bottom: '10%', left: '10%', right: '10%', borderRadius: '5%' }}>
							<ThemeLoader theme={theme} root={'#themeColor' + id} />
							<ThemeLoader theme={theme} root={`body:has(#themeColor${id}:hover)`} />
						</div>
					</td>
					<td>{name}</td>
					<td><User user={user} /></td>
					<td><Time time={created_at}></Time></td>
					<td><Time time={updated_at}></Time></td>
					<td>{number_of_users}</td>
					{currentUser ? <td>
						<ThemeApplyLink themeId={id} />
						&nbsp;
						<A href={`/theme/${id}`}>{t('edit')}</A>
						{currentUser.id === 1 || currentUser.id === user.id ? <>&nbsp;<DeleteLink href={`/api/theme/delete/${id}`} redirect='' onSuccess={reload} /></> : null}
					</td> : null}
				</tr>
			))}
		</tbody>
	</table>;
};