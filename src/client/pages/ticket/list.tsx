import { useEffect, useRef, useState } from "hono/jsx";
import { PostButton } from "../../components/button";
import { Card } from "../../components/card";
import { Form, FormSelect } from "../../components/form";
import { SidebarLayout } from "../../components/layout/sidebar";
import { t, tString } from "../../i18n";
import { inTicketCategory, inTicketStatus, ticketCategories, ticketStatus, type ticketBasicInfo, type ticketCategoriesType, type ticketStatusType } from "../../../routes/api/ticket";
import { CategoryNotFound, StatusNotFound } from "../error";
import { setTitle } from "../../utils/setTitle";
import { Pages } from "../../components/pages";
import { subscribeUrlChange } from "../../utils/urlSearch";
import { A } from "../../components/a";
import { User } from "../../components/user";
import { Time } from "../../components/time";
import { TicketStatus } from "../../components/ticketStatus";

export const TicketList = () => {
	const [search, setSearch] = useState(location.search);
	useEffect(subscribeUrlChange(setSearch), []);
	const searchParams = new URLSearchParams(search);
	const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1);
	const category = searchParams.get('category');
	const status = searchParams.get('status');
	const [data, setData] = useState<{
		ticket: ticketBasicInfo[],
		total: number
	} | null>(null);
	const perPage = 20;
	let cancelled = false;
	const reload = async () => {
		const data = await (await fetch(`/api/ticket/list?perpage=${perPage}&page=${page}` + (category ? '&category=' + category : '') + (status ? '&status=' + status : ''))).json();
		if (!cancelled) {
			setData(data);
		}
	};
	useEffect(() => { reload(); return () => cancelled = true; }, [category, status, page]);
	if (category && !inTicketCategory(category)) {
		return <CategoryNotFound />;
	}
	if (status && !inTicketStatus(status)) {
		return <StatusNotFound />;
	}
	const filterFormRef = useRef<HTMLFormElement>(null);
	const sidebar = <Card>
		<h1>{t('ticket.name')}</h1>
		<PostButton href={'/ticket/post' + (category ? '?category=' + category : '')} />
		<Form action='/ticket' method='get' alignInput='100px' ref={filterFormRef}>
			<FormSelect key={'category-' + category} id='category' name='category' label={t('category')} options={[
				{ value: '', label: t('allCategories'), selected: !category },
				...(ticketCategories.map(key => ({ value: key, label: t(`ticket.categoryName.${key}`), selected: category === key })))
			]} onChange={() => filterFormRef.current?.requestSubmit()} />
			<FormSelect key={'status-' + status} id='status' name='status' label={t('status')} options={[
				{ value: '', label: t('allStatuses'), selected: !status },
				...(ticketStatus.map(key => ({ value: key, label: <TicketStatus status={key} />, selected: status === key })))
			]} onChange={() => filterFormRef.current?.requestSubmit()} />
			<button type='submit'>{t('filter')}</button>
		</Form>
	</Card>;
	setTitle((status ? tString(`ticket.statusName.${status as ticketStatusType}`) + ' - ' : '') + (category ? tString(`ticket.categoryName.${category as ticketCategoriesType}`) + ' - ' : '') + tString('ticket.name'));
	if (!data) {
		return <SidebarLayout sidebar={sidebar}>
			<Card>{t('loading')}</Card>
		</SidebarLayout>;
	}
	return <SidebarLayout sidebar={sidebar}>
		{data.ticket.length ? data.ticket.map(({ id, user, category, status, title, created_at, assignee }) => <Card key={'ticket-item-' + id}>
			<A href={'/ticket/' + id}>{title}</A><br />
			{t('ticket.itemDescription', {
				user: <User user={user} />,
				category: <A href={`/ticket?category=${category}`}>{t(`ticket.categoryName.${category}`)}</A>,
				status: <TicketStatus status={status} />,
				createdAt: <Time time={created_at} />,
				assignee: assignee ? <User user={assignee} /> : t('none')
			})}
		</Card>) : <Card style={{ display: 'flex', 'justify-content': 'center' }}><h2>{t('nothing')}</h2></Card>}
		<Pages currentPage={page} totalPage={Math.ceil(data.total / perPage)} />
	</SidebarLayout>;
};