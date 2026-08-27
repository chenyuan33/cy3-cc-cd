import { Hono } from "hono";
import type { AppEnv, userInfo } from "../types";
import { getText } from "../translations";
import { Card } from "../components/card";
import { loginRequired } from "./errorPages";
import { User, getDisplayUsername } from "../components/user";
import { MdInit, MdRender } from "../components/mdeditor";
import { Time } from "../components/time";
import { Form } from "../components/form";

const app = new Hono<AppEnv>();

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

    const { results: recent }: { results: { sender: number, receiver: number, content: string, created_at: string, unread_count: number }[] } = await env.db.prepare(`
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
                }) => {
                    const targetUid = sender === currentUser.id ? receiver : sender;
                    return (
                        <div
							style={{
								borderTop: '1px solid light-dark(#e0e0e0, #444)',
								cursor: 'pointer',
								backgroundColor: 'transparent',
							}}
							onclick={`location.href = "?user=${targetUid}"`}
						>
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
								<span style={{ fontWeight: '500', fontSize: '15px' }}>
									{unread_count ? <><span style={{ color: 'white', backgroundColor: 'red', borderRadius: '5px', padding: '1px 5px', fontSize: '70%' }}>{unread_count}</span>&nbsp;</> : <></>}
									<User c={c} user={targetUid} />
								</span>
								<span style={{ fontSize: '11px', color: 'lightgray' }}>
									<Time c={c} time={created_at} short />
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
                        <Form action='/api/chat/send' method='post' inputs={[
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