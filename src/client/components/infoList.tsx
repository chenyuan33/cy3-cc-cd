import type { FC } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";
import './infoList.css';

export const InfoList: FC<{
	items: { label: string | JSX.Element, value: string | JSX.Element }[]
}> = ({ items }) => <table class='info-list'>
	<tbody>
		{items.map(item => <tr key={item.label} class='info-list-item'>
			<td class='info-list-label'><strong>{item.label}</strong></td>
			<td class='info-list-value'>{item.value}</td>
		</tr>)}
	</tbody>
</table>;