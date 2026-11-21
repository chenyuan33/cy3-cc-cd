import type { ContextType } from "./types";

export const processAt = async (c: ContextType, markdown: string, link: string) => {
	const at = new Set();
	markdown.matchAll(/@@(\d+)/g).forEach(([_, uid]) => at.add(uid));
	await Promise.all(Array.from(at).map(uid => c.env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, \'at\', ?)').bind(uid, JSON.stringify({ uid: c.get('currentUser')?.id, link: link })).run()));
};