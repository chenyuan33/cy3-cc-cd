import type { FC } from "hono/jsx";
import type { ContextType } from "../types";

export const Time: FC<{ c: ContextType, time?: string | number | Date }> = ({ c, time = new Date() }) => {
	try {
		let date: Date;
		switch (typeof time) {
			case 'string':
				date = new Date(time + 'Z');
				break;
			case 'number':
				date = new Date(time);
				break;
			default:
				date = time;
				break;
		}
		return <time datetime={date.toISOString()}>{new Intl.DateTimeFormat(c.get('locale'), {
			timeZone: (c.req.raw.cf?.timezone as string) ?? 'UTC',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}).format(date)}</time>;
	} catch (exc) {
		return <span>Unknown time {time}</span>
	}
};