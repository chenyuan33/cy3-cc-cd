import type { FC } from "hono/jsx";
import type { ContextType } from "../types";
import { getText } from "../translations";

export const TicketStatus: FC<{ c: ContextType, status: string }> = ({ c, status }) => <strong style={{ color: {
	'new': 'cyan',
	inProgress: 'orange',
	pending: 'gray',
	infoNeeded: '',
	resolved: 'green',
	closed: 'red'
}[status] }}>{getText(c.get('locale'), 'ticketStatus_' + status)}</strong>;