import type { FC } from "hono/jsx";
import type { ContextType } from "../types";

export const Time: FC<{ c: ContextType, time?: string | number | Date, short?: boolean }> = ({ c, time = new Date(), short = false }) => {
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
		return <time datetime={date.toISOString()}>{new Intl.DateTimeFormat(c.get('locale'), short ? {
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
		return <span>Unknown time {time}</span>
	}
};
/*

import type { FC } from 'hono/jsx';
import type { ContextType } from '../types';

export const Time: FC<{ c: ContextType; time: string | Date; short?: boolean }> = ({ c, time, short = false }) => {
    // 如果 time 是字符串且格式为 "YYYY-MM-DD HH:MM:SS"，则转换为 ISO 格式并补上 Z，表示 UTC
    const date = new Date(
        typeof time === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(time)
            ? time.replace(' ', 'T') + 'Z'
            : time
    );
    const now = new Date();
    const isToday = date.getFullYear() === now.getFullYear() &&
                    date.getMonth() === now.getMonth() &&
                    date.getDate() === now.getDate();
    const isThisYear = date.getFullYear() === now.getFullYear();

    let formatted: string;
    if (short) {
        if (isToday) {
            formatted = date.toLocaleTimeString(c.get('locale'), { hour: '2-digit', minute: '2-digit' });
        } else if (isThisYear) {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            formatted = month + '-' + day;
        } else {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            formatted = year + '-' + month + '-' + day;
        }
    } else {
        formatted = date.toLocaleString(c.get('locale'), {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return <time datetime={date.toISOString()}>{formatted}</time>;
};

*/