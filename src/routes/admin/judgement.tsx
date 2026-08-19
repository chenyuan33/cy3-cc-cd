// src/routes/admin/judgement.tsx
import { Hono } from 'hono';
import { raw } from 'hono/html';
import type { AppEnv } from '../../types';
import { Card } from '../../components/card';
import { accessDenied } from '../errorPages';
import { permissionAdmin, permissionVisit, permissionSpeak } from '../../settings';
import { User } from '../../components/user';
import { getText } from "../../translations";

const app = new Hono<AppEnv>();

const PERMISSIONS = [
    { bit: permissionVisit, labelKey: 'permission1' },
    { bit: permissionSpeak, labelKey: 'permission2' },
];

// 安全转义函数（防止 HTML 实体破坏 JavaScript）
const escapeJS = (str: string) => {
    return JSON.stringify(str).replace(/<\//g, '<\\/');
};

app.get('/', async (c) => {
    const currentUser = c.get('currentUser');
    if (!currentUser || !(currentUser.permission & permissionAdmin)) {
        return accessDenied(c);
    }

    const locale = c.get('locale');
    const env = c.env as any;

    const permLabels = PERMISSIONS.map(p => ({
        bit: p.bit,
        label: getText(locale, p.labelKey)
    }));

    const { results: users } = await env.db
        .prepare('SELECT id, name, permission, name_color_light, name_color_dark FROM users ORDER BY id')
        .all();

    // 翻译变量（先获取原始文本，再用 JSON.stringify 转义）
    const t = {
        promptReason: JSON.stringify(getText(locale, 'promptReason')),
        confirmGrant: JSON.stringify(getText(locale, 'confirmGrant')),
        confirmRevoke: JSON.stringify(getText(locale, 'confirmRevoke')),
        operationSuccess: JSON.stringify(getText(locale, 'operationSuccess')),
        operationFailed: JSON.stringify(getText(locale, 'operationFailed')),
        grant: JSON.stringify(getText(locale, 'grant')),
        revoke: JSON.stringify(getText(locale, 'revoke')),
    };

    return c.render(
        <Card style={{ padding: '20px' }}>
            <h1>{getText(locale, 'judgement')}</h1>
            <p>{raw(getText(locale, 'adminJudgementDescription'))}</p>

            <div style={{ marginBottom: '20px' }}>
                <input
                    id="searchInput"
                    type="text"
                    placeholder={getText(locale, 'searchPlaceholder')}
                    style={{ padding: '8px', width: '300px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>ID</th>
                        <th style={{ padding: '8px' }}>{getText(locale, 'username')}</th>
                        {permLabels.map(p => <th key={p.bit} style={{ padding: '8px' }}>{p.label}</th>)}
                    </tr>
                </thead>
                <tbody id="userTableBody">
                    {users.map((user: any) => (
                        <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{user.id}</td>
                            <td style={{ padding: '8px' }}>
                                <User user={user} c={c} />
                            </td>
                            {permLabels.map(p => {
                                const has = !!(user.permission & p.bit);
                                return (
                                    <td key={p.bit} style={{ padding: '8px', cursor: 'pointer' }}>
                                        <span
                                            className="perm-toggle"
                                            data-userid={user.id}
                                            data-bit={p.bit}
                                            data-enabled={has ? 'true' : 'false'}
                                            style={{
                                                display: 'inline-block',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                backgroundColor: has ? '#4CAF50' : '#f44336',
                                                color: 'white',
                                                fontSize: '14px',
                                            }}
                                        >
                                            <i class={`fa-solid ${has ? 'fa-check' : 'fa-xmark'}`}></i>
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* 注入全局翻译变量（使用 JSON.stringify 转义，安全可靠） */}
            <script dangerouslySetInnerHTML={{
                __html: `
                    window.__promptReason = ${t.promptReason};
                    window.__confirmGrant = ${t.confirmGrant};
                    window.__confirmRevoke = ${t.confirmRevoke};
                    window.__operationSuccess = ${t.operationSuccess};
                    window.__operationFailed = ${t.operationFailed};
                    window.__grant = ${t.grant};
                    window.__revoke = ${t.revoke};
                `
            }} />
            <script src="/js/admin-judgement.js"></script>
        </Card>,
        { title: getText(locale, 'judgement') }
    );
});

app.post('/toggle', async (c) => {
    const currentUser = c.get('currentUser');
    const locale = c.get('locale');
    if (!currentUser || !(currentUser.permission & permissionAdmin)) {
        return c.json({ success: false, error: getText(locale, 'apiPermissionDenied') }, 403);
    }
    const { userId, bit, enable, comment } = await c.req.json();
    if (!userId || bit === undefined) {
        return c.json({ success: false, error: getText(locale, 'apiMissingParams') }, 400);
    }
    const targetId = parseInt(userId);
    if (targetId === currentUser.id) {
        return c.json({ success: false, error: getText(locale, 'apiCannotModifySelf') }, 403);
    }
    const env = c.env as any;
    const { permission } = await env.db
        .prepare('SELECT permission FROM users WHERE id = ?')
        .bind(targetId)
        .first();
    let newPermission = permission;
    if (enable) {
        newPermission |= bit;
    } else {
        newPermission &= ~bit;
    }
    try {
        await env.db
            .prepare('UPDATE users SET permission = ? WHERE id = ?')
            .bind(newPermission, targetId)
            .run();

        const payload = JSON.stringify({
            comment: comment || getText(locale, 'noReason'),
            oldPermission: permission,
            newPermission: newPermission
        });
        await env.db
            .prepare('INSERT INTO judgement (uid, type, payload) VALUES (?, "permission-changed", ?)')
            .bind(targetId, payload)
            .run();
        await env.db
            .prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "permission-changed", ?)')
            .bind(targetId, payload)
            .run();

        return c.json({ success: true });
    } catch (e) {
        return c.json({ success: false, error: String(e) }, 500);
    }
});

export default app;