import { Hono } from "hono";
import type { AppEnv } from "../types";
import { getText } from "../translations";
import { Card } from "../components/card";
import { loginRequired } from "./errorPages";
import { User, getDisplayUsername } from "../components/user";
import { MdInit, MdRender } from "../components/mdeditor";
import { Time } from "../components/time";
import { Form } from "../components/form";

const app = new Hono<AppEnv>();

// 辅助函数：格式化私信列表的时间
function formatMessageTime(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const isToday = now.getFullYear() === date.getFullYear() &&
        now.getMonth() === date.getMonth() &&
        now.getDate() === date.getDate();
    if (isToday) {
        return date.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
    } else {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return month + '-' + day;
    }
}

app.get('/', async c => {
    const currentUser = c.get('currentUser');
    if (!currentUser) {
        return loginRequired(c);
    }
    const env = c.env as any;
    const locale = c.get('locale');
    const { user: rawUser } = c.get('reqBody');

    let validUser: string | null = null;
    let searchError: string | null = null;

    // 处理 user 参数
    if (rawUser) {
        if (/^\d+$/.test(rawUser)) {
            validUser = rawUser;
        } else {
            const userRecord = await env.db
                .prepare('SELECT id FROM users WHERE name = ?')
                .bind(rawUser)
                .first();
            if (userRecord) {
                return c.redirect('/chat?user=' + userRecord.id);
            } else {
                searchError = getText(locale, 'userNotFound').replace('{username}', rawUser);
            }
        }
    }

    if (validUser) {
        await env.db.prepare('UPDATE private_messages SET read = 1 WHERE sender = ? AND receiver = ?').bind(validUser, currentUser.id).run();
    }

    const { results: recent } = await env.db.prepare(`
		SELECT
			p1.sender,
			p1.receiver,
			p1.content,
			p1.created_at,
			p2.unread_count
		FROM
			private_messages p1
		INNER JOIN (
			SELECT
				MAX(id) as latest_id,
				COUNT(
					CASE
						WHEN receiver = ? AND read = 0 THEN 1
						ELSE NULL
					END
				) as unread_count
			FROM
				private_messages
			WHERE
				sender = ? OR receiver = ?
			GROUP BY
				MIN(sender, receiver),
				MAX(sender, receiver)
		) p2 ON p1.id = p2.latest_id
		ORDER BY
			p1.created_at DESC
		LIMIT
			50
	`).bind(currentUser.id, currentUser.id, currentUser.id).all();

    const targetUids = recent.map(r => r.sender === currentUser.id ? r.receiver : r.sender);
    const uniqueUids = [...new Set(targetUids)];
    let userMap: Map<number, any> = new Map();
    if (uniqueUids.length > 0) {
        const placeholders = uniqueUids.map(() => '?').join(',');
        const { results: users } = await env.db
            .prepare(`SELECT id, name, name_color_light, name_color_dark, username_violation FROM users WHERE id IN (${placeholders})`)
            .bind(...uniqueUids)
            .all();
        userMap = new Map(users.map(u => [u.id, u]));
    }

    return c.render(<Card style={{ position: 'fixed', top: '50px', bottom: '10px', left: '70px', right: '10px' }}>
        <MdInit />
        <h1>{getText(locale, 'chat')}</h1>
        <div style={{ border: 'solid', 'border-radius': '10px', display: 'flex', position: 'absolute', top: '100px', bottom: '10px', left: '10px', right: '10px' }}>
            <div style={{ padding: '10px', 'border-right': 'solid 1px lightgray', position: 'relative', overflow: 'auto', width: '280px', flexShrink: 0 }}>
                <h2>{getText(locale, 'chatRecent')}</h2>
                <Form action='' method='get' inputs={[{
                    id: 'findUser',
                    name: 'user',
                    main: {
                        type: 'input',
                        inputType: 'text',
                        placeHolder: getText(locale, 'searchUsernameOrUid')
                    }
                }]} submit={{ content: getText(locale, 'go') }} />
                {recent.map(({
                    sender,
                    receiver,
                    content,
                    created_at,
                    unread_count
                }: {
                    sender: number,
                    receiver: number,
                    content: string,
                    created_at: string,
                    unread_count: number
                }) => {
                    const targetUid = sender === currentUser.id ? receiver : sender;
                    const userInfo = userMap.get(targetUid);
                    const displayName = userInfo ? getDisplayUsername(userInfo, locale) : '未知用户';
                    const colorStyle = userInfo ? { color: `light-dark(#${userInfo.name_color_light}, #${userInfo.name_color_dark})` } : {};
                    return (
                        <a
                            key={created_at}
                            href={'?user=' + targetUid}
                            style={{ textDecoration: 'none', display: 'block' }}
                        >
                            <div
                                style={{
                                    padding: '8px 12px',
                                    borderBottom: '1px solid light-dark(#e0e0e0, #444)',
                                    cursor: 'pointer',
                                    backgroundColor: 'transparent',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '500', fontSize: '15px', ...colorStyle }}>
                                        {displayName}
                                        {unread_count ? <span style={{
                                            backgroundColor: 'red',
                                            color: 'white',
                                            borderRadius: '50%',
                                            padding: '0 6px',
                                            fontSize: '11px',
                                            marginLeft: '6px',
                                            display: 'inline-block',
                                            lineHeight: '18px',
                                            minWidth: '18px',
                                            textAlign: 'center'
                                        }}>{unread_count}</span> : <></>}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'lightgray' }}>
                                        {formatMessageTime(created_at)}
                                    </span>
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'light-dark(#555, #bbb)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    marginTop: '2px'
                                }}>
                                    <MdRender markdown={content} />
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>

            <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                {validUser ? (
                    <>
                        <div style={{ borderBottom: 'solid 1px lightgray', display: 'flex', justifyContent: 'center', padding: '8px 0', backgroundColor: 'light-dark(#f9f9f9, #2a2a2a)' }}>
                            <User c={c} user={parseInt(validUser)} />
                        </div>
                        <div id="messageContainer" style={{ flex: 1, overflow: 'auto', padding: '12px 16px', backgroundColor: 'light-dark(#eaeaea, #1a1a1a)' }}>
                            {(await env
                                .db
                                .prepare('SELECT sender, content, read, created_at FROM private_messages WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?) ORDER BY created_at DESC LIMIT 100')
                                .bind(currentUser.id, validUser, validUser, currentUser.id)
                                .all())
                                .results
                                .reverse()
                                .map(({
                                    sender,
                                    content,
                                    read,
                                    created_at
                                }: {
                                    sender: number,
                                    content: string,
                                    read: number,
                                    created_at: string
                                }) => {
                                    const isSelf = sender === currentUser.id;
                                    return (
                                        <div key={created_at} style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start' }}>
                                            <div style={{ marginBottom: '1px', alignSelf: isSelf ? 'flex-end' : 'flex-start', fontSize: '13px' }}>
                                                <User c={c} user={sender} />
                                            </div>
                                            <div style={{
                                                maxWidth: '70%',
                                                backgroundColor: isSelf ? '#95ec69' : 'light-dark(#ffffff, #2d2d2d)',
                                                color: isSelf ? '#000' : 'light-dark(#000, #e0e0e0)',
                                                borderRadius: '8px',
                                                padding: '5px 12px',
                                                wordBreak: 'break-word',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                                border: isSelf ? 'none' : '1px solid light-dark(#e0e0e0, #444)',
                                            }}>
                                                <MdRender markdown={content} />
                                                <div style={{
                                                    fontSize: '10px',
                                                    color: isSelf ? '#555' : '#999',
                                                    textAlign: isSelf ? 'right' : 'left',
                                                    marginTop: '2px',
                                                    display: 'flex',
                                                    justifyContent: isSelf ? 'flex-end' : 'flex-start',
                                                    gap: '4px'
                                                }}>
                                                    <Time c={c} time={created_at} />
                                                    {read ? <span>{getText(locale, 'read')}</span> : <span>{getText(locale, 'unread')}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                        <Form action='/api/private-message/send' method='post' inputs={[
                            { id: 'receiver', name: 'uid', main: { type: 'input', inputType: 'hidden', value: validUser } },
                            { id: 'content', name: 'content', main: { type: 'mdeditor', mdeditorHeight: '80px' }, required: true }
                        ]} submit={{ content: getText(locale, 'send') }} style={{ padding: '8px 16px', backgroundColor: 'light-dark(#f9f9f9, #2a2a2a)', borderTop: '1px solid light-dark(#e0e0e0, #444)' }} />
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#999', padding: '20px' }}>
                        {searchError ? (
                            <>
                                <i class="fa-solid fa-circle-exclamation" style={{ fontSize: '40px', color: '#e74c3c', marginBottom: '16px' }}></i>
                                <p style={{ fontSize: '18px', color: '#e74c3c' }}>{searchError}</p>
                            </>
                        ) : (
                            <>
                                <i class="fa-solid fa-comment-dots" style={{ fontSize: '40px', marginBottom: '16px' }}></i>
                                <p style={{ fontSize: '18px' }}>{getText(locale, 'selectConversation')}</p>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>

        {validUser && (
            <script
                dangerouslySetInnerHTML={{
                    __html: `
						document.addEventListener('DOMContentLoaded', function() {
							const container = document.getElementById('messageContainer');
							if (container) {
								container.scrollTop = container.scrollHeight;
							}
						});
					`
                }}
            />
        )}
    </Card>, { title: getText(locale, 'chat') });
});
export default app;