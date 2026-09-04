import type { ContextType } from "./types";

export const processAt = async (c: ContextType, markdown: string, link: string) => {
    const at = new Set<number>();
    const env = c.env as any;
    const matches = markdown.matchAll(/@(\d+)/g);
    for (const match of matches) {
        if (match[1]) {
            const uid = parseInt(match[1], 10);
            if (!isNaN(uid)) at.add(uid);
        }
    }

    if (at.size === 0) return;

    const currentUid = c.get('currentUser')?.id;
    const payload = JSON.stringify({ uid: currentUid, link });
    const promises = Array.from(at).map(uid =>
        env.db.prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "at", ?)')
            .bind(uid, payload)
            .run()
    );
    await Promise.all(promises);
};