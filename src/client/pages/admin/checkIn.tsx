import { useEffect, useState } from "hono/jsx";
import { Card } from "../../components/card";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";
import { Form } from "../../components/form";

export const AdminCheckIn = () => {
	const [data, setData] = useState<{
		id: number,
		title_en: string,
		good_en: string | null,
		bad_en: string | null,
		title_zh: string,
		good_zh: string | null,
		bad_zh: string | null
	}[] | null>(null);
	const reload = async () => setData(await (await fetch('/api/admin/check-in/list')).json());
	useEffect(() => {
		reload();
	}, []);
	const Add = () => <details>
		<summary>{t('new')}</summary>
		<Form action='/api/admin/check-in/add' method='post'>
			<table>
				<thead>
					<tr>
						<th>{t('language')}</th>
						<th>{t('title')}</th>
						<th>{t('home.checkIn.good')}</th>
						<th>{t('home.checkIn.bad')}</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>English</td>
						<td><input type='text' name='title_en' /></td>
						<td><input type='text' name='good_en' /></td>
						<td><input type='text' name='bad_en' /></td>
					</tr>
					<tr>
						<td>简体中文</td>
						<td><input type='text' name='title_zh' /></td>
						<td><input type='text' name='good_zh' /></td>
						<td><input type='text' name='bad_zh' /></td>
					</tr>
				</tbody>
			</table>
			<input type='submit' />
		</Form>
	</details>;
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('home.checkIn.name') + ' - ' + tString('admin.name'));
		return <Card>
			<p>{t('loading')}</p>
			<Add />
		</Card>;
	}
	setTitle(tString('home.checkIn.name') + ' - ' + tString('admin.name'));
	return <Card>
		<table>
			<thead>
				<tr>
					<th rowspan={2}>{t('id')}</th>
					<th colspan={3}>English</th>
					<th colspan={3}>简体中文</th>
				</tr>
				<tr>
					<th>{t('title')}</th>
					<th>{t('home.checkIn.good')}</th>
					<th>{t('home.checkIn.bad')}</th>
					<th>{t('title')}</th>
					<th>{t('home.checkIn.good')}</th>
					<th>{t('home.checkIn.bad')}</th>
				</tr>
			</thead>
			<tbody>
				{data.map(({ id, title_en, good_en, bad_en, title_zh, good_zh, bad_zh }) => <tr key={'check-in-' + id}>
					{[id, title_en, good_en, bad_en, title_zh, good_zh, bad_zh].map((v, i) => <td key={'check-in-' + id + '-' + i}>
						{v ?? <span style={{ color: 'gray' }}>{t('none')}</span>}
					</td>)}
				</tr>)}
			</tbody>
		</table>
		<Add />
	</Card>;
};