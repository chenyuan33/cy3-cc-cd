import type { FC } from "hono/jsx";
import type { ticketStatusType } from "../../routes/api/ticket";
import { A } from "./a";
import { t } from "../i18n";

export const TicketStatus: FC<{ status: ticketStatusType }> = ({ status }) => <A href={'/ticket?status=' + status} style={{
	color: {
		'new': 'light-dark(#0068ad, #66d6ff)',
		inProgress: 'light-dark(#d99809, #ffb169)',
		pending: 'light-dark(#595959, #d9d9d9)',
		infoNeeded: 'light-dark(#531dab, #b37feb)',
		resolved: 'light-dark(#237804, #95de64)',
		closed: 'light-dark(#d92d20, #d92d20)'
	}[status]
}}>
	<i class={'fa-solid fa-' + {
		'new': 'clock',
		inProgress: 'arrows-rotate',
		pending: 'circle-pause',
		infoNeeded: 'comment-dots',
		resolved: 'circle-check',
		closed: 'circle-xmark'
	}[status]}></i>
	<strong>{t(`ticket.statusName.${status}`)}</strong>
</A>;