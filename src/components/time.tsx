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
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    return <time datetime={date.toISOString()}>{formatted}</time>;
};