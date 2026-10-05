import { useState, useEffect } from 'hono/jsx';
let listeners: ((msg: string) => void)[] = [];
export const toast = (message: string) => listeners.forEach(fn => fn(message));
export const ToastContainer = () => {
	const [messages, setMessages] = useState<{ id: number; text: string }[]>([]);
	useEffect(() => {
		const handler = (msg: string) => {
			const id = Date.now();
			setMessages(prev => [...prev, { id, text: msg }]);
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
		{messages.map(({ id, text }) => (
			<div key={id} style={{
				padding: '12px 20px',
				backgroundColor: '#c00',
				color: 'white',
				borderRadius: '5px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
			}}>
				{text}
			</div>
		))}
	</div>;
}