import type { FC } from "hono/jsx";
import type { userInfo } from "../../types";
import { t } from "../i18n";
import { A } from "./a";
import { Time } from "./time";
import { User } from "./user";
import { ProblemName } from "./problemName";

export const ProblemListTable: FC<{
	problems: { id: number, title: string, created_at: string, user: userInfo }[]
}> = ({ problems }) => <table>
	<thead>
		<tr>
			<th>{t('problem.name')}</th>
			<th>{t('createdAt')}</th>
			<th>{t('creator')}</th>
		</tr>
	</thead>
	<tbody>
		{problems.map(problem => <tr key={problem.id}>
			<td><ProblemName problem={problem} /></td>
			<td><Time time={problem.created_at} /></td>
			<td><User user={problem.user} /></td>
		</tr>)}
	</tbody>
</table>;