import type { ContextType } from "./types";

export const processAt = (c: ContextType, markdown: string, link: string) => {
    const currentUser = c.get('currentUser');
    if (!currentUser) return;
    const uids = (markdown.match(/@@(\d+)/g) || []).map(m => m.slice(2));
    if (!uids.length) return;

    const env = c.env as any;
    const task = async () => {
        await Promise.all(uids.map(uid =>
            env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "at", ?)')
                .bind(uid, JSON.stringify({ uid: currentUser.id, link }))
                .run()
        ));
    };
    const ctx = (c as any).executionCtx;
    if (ctx?.waitUntil) ctx.waitUntil(task().catch(() => { }));
    else task().catch(() => { });
};