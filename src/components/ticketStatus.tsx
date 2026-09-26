import type { FC } from "hono/jsx";
import type { ContextType } from "../types";
import type { ticketStatusType } from "../routes/api/ticket";

export const TicketStatus: FC<{ c: ContextType, status: ticketStatusType }> = ({ c, status }) => <strong style={{ color: {
	'new': 'cyan',
	inProgress: 'orange',
	pending: 'gray',
	infoNeeded: '',
	resolved: 'green',
	closed: 'red'
}[status] }}>{c.get('translations').ticket.statusName[status]}</strong>;