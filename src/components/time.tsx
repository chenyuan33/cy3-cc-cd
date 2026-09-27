import type { CSSProperties, FC } from "hono/jsx";
import type { ContextType } from "../types";

export const Time: FC<{ c: ContextType, time?: string | number | Date, short?: boolean, style?: CSSProperties | string | undefined }> = ({ c, time = new Date(), short = false, style }) => {
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
		const today = new Date();
		return <time datetime={date.toISOString()} style={style}>{new Intl.DateTimeFormat(c.get('shortLocale'), short ? {
			timeZone: (c.req.raw.cf?.timezone as string) ?? 'UTC',
			...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
			...(date.getFullYear() === today.getFullYear() &&
				date.getMonth() === today.getMonth() &&
				date.getDate() === today.getDate() ? { hour: '2-digit', minute: '2-digit' } : { month: '2-digit', day: '2-digit' }),
		} : {
			timeZone: (c.req.raw.cf?.timezone as string) ?? 'UTC',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}).format(date)}</time>;
	} catch (exc) {
		return <span style={style}>Unknown time {time}</span>
	}
};