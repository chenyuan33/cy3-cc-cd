import { useState, useEffect } from 'hono/jsx';
import type { JSX } from 'hono/jsx/jsx-runtime';
let listeners: ((msg: string | JSX.Element, type: 'success' | 'error') => void)[] = [];
export const toast = (message: string | JSX.Element, type: 'success' | 'error') => listeners.forEach(fn => fn(message, type));
export const ToastContainer = () => {
	const [messages, setMessages] = useState<{ id: number; text: string | JSX.Element; type: 'success' | 'error' }[]>([]);
	useEffect(() => {
		const handler = (msg: string | JSX.Element, type: 'success' | 'error') => {
			const id = Date.now();
			setMessages(prev => [...prev, { id, text: msg, type }]);
			setTimeout(() => {
				setMessages(prev => prev.filter(m => m.id !== id));
			}, 3000);
		};
		listeners.push(handler);
		return () => {
			listeners = listeners.filter(fn => fn !== handler);
		};
	}, []);
	return <div style={{
		position: 'fixed',
		top: '60px',
		right: '20px',
		zIndex: 9999,
		display: 'flex',
		flexDirection: 'column',
		gap: '10px',
	}}>
		{messages.map(({ id, text, type }) => (
			<div key={id} style={{
				padding: '12px 20px',
				backgroundColor: {
					success: '#0c0',
					error: '#c00',
				}[type],
				color: 'white',
				borderRadius: '5px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
			}}>
				{text}
			</div>
		))}
	</div>;
}