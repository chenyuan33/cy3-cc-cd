import { useEffect, useState } from "hono/jsx";
import { Card } from "../../components/card";
import { Form, FormInput } from "../../components/form";
import type { userInfo } from "../../../types";
import { setTitle } from "../../utils/setTitle";
import { t, tString } from "../../i18n";
import { User } from "../../components/user";
import { toast } from "../../components/toast";

export const AdminTicketQuickReply = () => {
	const [data, setData] = useState<{ id: number, title: string, content: string, creator: userInfo }[] | null>(null);
	const reload = async () => setData(await (await fetch('/api/admin/ticket-quick-reply/list')).json());
	useEffect(() => {
		reload();
	}, []);
	const Add = () => <details style={{ position: 'relative' }}>
		<summary>{t('new')}</summary>
		<Form action='/api/admin/ticket-quick-reply/new' method='post' onSuccess={() => {
			toast(t('createdSuccessful'), 'success');
			reload();
		}}>
			<FormInput type='text' id='title' name='title' label={t('title')} required />
			<FormInput type='text' id='content' name='content' label={t('content')} required />
			<button type='submit'>{t('new')}</button>
		</Form>
	</details>;
	if (!data) {
		setTitle(tString('loading') + ' - ' + tString('admin.ticketQuickReply') + ' - ' + tString('admin.name'));
		return <Card>
			<p>{t('loading')}</p>
			<Add />
		</Card>;
	}
	setTitle(tString('admin.ticketQuickReply') + ' - ' + tString('admin.name'));
	return <Card>
		<table>
			<thead>
				<tr>
					<th>{t('id')}</th>
					<th>{t('title')}</th>
					<th>{t('content')}</th>
					<th>{t('creator')}</th>
				</tr>
			</thead>
			<tbody>
				{data.map(({ id, title, content, creator }) => <tr>
					<td>{id}</td>
					<td>{title}</td>
					<td>{content}</td>
					<td><User user={creator} /></td>
				</tr>)}
			</tbody>
		</table>
		<Add />
	</Card>;
};