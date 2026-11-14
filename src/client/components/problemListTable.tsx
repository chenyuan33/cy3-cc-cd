import type { FC } from "hono/jsx";
import type { userInfo } from "../../types";
import { t } from "../i18n";
import { A } from "./a";
import { Time } from "./time";
import { User } from "./user";

export const ProblemListTable: FC<{
	problems: { id: number, title: string, created_at: string, user: userInfo }[]
}> = ({ problems }) => <table>
	<thead>
		<tr>
			<th>{t('problem.id')}</th>
			<th>{t('problem.title')}</th>
			<th>{t('createdAt')}</th>
			<th>{t('creator')}</th>
		</tr>
	</thead>
	<tbody>
		{problems.map(problem => <tr key={problem.id}>
			<td>{problem.id}</td>
			<td><A href={`/problem/${problem.id}`}>{problem.title}</A></td>
			<td><Time time={problem.created_at} /></td>
			<td><User user={problem.user} /></td>
		</tr>)}
	</tbody>
</table>;