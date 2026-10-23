import { navigate } from "@w3cj/ruta";
import { enableEmailVerify, permissionSpeak } from "../../../settings";
import { Card } from "../../components/card";
import { Form, FormInput, FormMdEditor, FormSelect } from "../../components/form";
import { useCurrentUser, useCurrentUserEmail } from "../../utils/currentUser";
import { t, tString } from "../../i18n";
import { setTitle } from "../../utils/setTitle";
import { EmailVerifyRequired, LoginRequired, Muted } from "../error";
import { ticketCategories, type ticketCategoriesType, type ticketStatusType } from "../../../routes/api/ticket";
import { useRef } from "hono/jsx";
import { render } from "hono/jsx/dom";
import { A } from "../../components/a";
import { TicketStatus } from "../../components/ticketStatus";

export const TicketPost = () => {
	const currentUser = useCurrentUser();
	if (!currentUser) {
		return <LoginRequired />;
	}
	if (!(currentUser.permission & permissionSpeak)) {
		return <Muted />;
	}
	if (enableEmailVerify && !useCurrentUserEmail()) {
		return <EmailVerifyRequired />;
	}
	const category = new URLSearchParams(location.search).get('category'), similarRef = useRef<HTMLDivElement>(null);
	let simliarRefresherTimeout: ReturnType<typeof setTimeout> | null = null;
	const refreshSimilarTicket = () => {
		if (!similarRef.current) {
			return;
		}
		const title = (document.getElementById('title')! as HTMLInputElement).value;
		if (!title) {
			similarRef.current.innerHTML = '';
			return;
		}
		if (simliarRefresherTimeout) {
			clearTimeout(simliarRefresherTimeout);
		}
		simliarRefresherTimeout = setTimeout(async () => {
			if (similarRef.current) {
				render(<div>
					<p><strong>{t('ticket.post.similar')}</strong></p>
					<ul>{(await (await fetch(`/api/ticket/similar?title=${encodeURIComponent(title)}&category=${encodeURIComponent((document.getElementById('category')! as HTMLInputElement).value)}`)).json()).map(({ id, status, title }: { id: number, status: ticketStatusType, title: string }) => <li>
						<A href={'/ticket/' + id}><TicketStatus status={status} />&nbsp;{title}</A>
					</li>)}</ul>
				</div>, similarRef.current);
			}
		}, 300);
	};
	setTitle(tString('ticket.post.name'));
	return <Card>
		<h1>{t('ticket.post.name')}</h1>
		<Form action='/api/ticket/post' method='post' onSuccess={data => navigate('/ticket/' + data.id)}>
			<FormSelect id='category' name='category' label={t('category')} options={
				ticketCategories.map(key => ({ value: key, label: t(`ticket.categoryName.${key as ticketCategoriesType}`), selected: category === key }))
			} onChange={refreshSimilarTicket} />
			<FormInput id='title' name='title' label={t('title')} required type='text' onInput={refreshSimilarTicket} />
			<div ref={similarRef}></div>
			<FormMdEditor id='content' name='content' label={t('content')} required />
			<button type='submit'>{t('ticket.post.name')}</button>
		</Form>
	</Card>;
};