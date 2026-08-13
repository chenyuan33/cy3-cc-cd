import type { ContextType } from "./types";

export const processAt = async (c: ContextType, markdown: string, link: string) => {
	const at = new Set(), env = c.env as any;
	markdown.matchAll(/@@(\d+)/g).forEach(([_, uid]) => at.add(uid));
	at.forEach(async uid => await env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "at", ?)').bind(uid, JSON.stringify({ uid: c.get('currentUser')?.id, link: link })).run());
};