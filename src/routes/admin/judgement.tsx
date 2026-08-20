// src/routes/admin/judgement.tsx
import { Hono } from 'hono';
import { raw } from 'hono/html';
import type { AppEnv } from '../../types';
import { Card } from '../../components/card';
import { accessDenied } from '../errorPages';
import { permissionAdmin, permissionCount } from '../../settings';
import { User } from '../../components/user';
import { getText } from "../../translations";
import { Pages } from '../../components/pages';

const app = new Hono<AppEnv>();

// 返回所有权限位（不过滤），让所有管理员都能看到全部三列
function getPermissionBits(): number[] {
    return Array.from({ length: permissionCount }, (_, i) => 1 << i);
}

app.get('/', async (c) => {
    const currentUser = c.get('currentUser');
    if (!currentUser || !(currentUser.permission & permissionAdmin)) {
        return accessDenied(c);
    }

    const locale = c.get('locale');
    const env = c.env as any;
    const permissionBits = getPermissionBits();

    const permLabels = permissionBits.map(bit => ({
        bit,
        label: getText(locale, 'permission' + bit)
    }));

    // 分页参数
    const perPage = 20;
    const page = Math.max(1, parseInt(c.get('reqBody').page || '1') || 1);
    const offset = (page - 1) * perPage;
    const { total } = await env.db.prepare('SELECT COUNT(*) as total FROM users').first();
    const totalPage = Math.ceil(total / perPage);

    const { results: users } = await env.db
        .prepare('SELECT id, name, permission, name_color_light, name_color_dark FROM users ORDER BY id LIMIT ? OFFSET ?')
        .bind(perPage, offset)
        .all();

    const t = {
        promptReason: JSON.stringify(getText(locale, 'promptReason')),
        confirmGrant: JSON.stringify(getText(locale, 'confirmGrant')),
        confirmRevoke: JSON.stringify(getText(locale, 'confirmRevoke')),
        operationSuccess: JSON.stringify(getText(locale, 'operationSuccess')),
        operationFailed: JSON.stringify(getText(locale, 'operationFailed')),
        grant: JSON.stringify(getText(locale, 'grant')),
        revoke: JSON.stringify(getText(locale, 'revoke')),
        currentUserId: currentUser.id,
        onlySuperAdmin: JSON.stringify(getText(locale, 'onlySuperAdmin')),
        cannotModify: JSON.stringify(getText(locale, 'cannotModify')),
        permissionAdminValue: permissionAdmin, // 新增
    };
    <script dangerouslySetInnerHTML={{
        __html: `
    window.__promptReason = ${t.promptReason};
    window.__confirmGrant = ${t.confirmGrant};
    window.__confirmRevoke = ${t.confirmRevoke};
    window.__operationSuccess = ${t.operationSuccess};
    window.__operationFailed = ${t.operationFailed};
    window.__grant = ${t.grant};
    window.__revoke = ${t.revoke};
    window.__currentUserId = ${t.currentUserId};
    window.__onlySuperAdmin = ${t.onlySuperAdmin};
    window.__cannotModify = ${t.cannotModify};
    window.__permissionAdmin = ${t.permissionAdminValue};
  `
    }} />

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
                    {users.map((user: any) => {
                        // 如果是当前用户自己，整行变灰但数据仍显示
                        const isSelf = user.id === currentUser.id;
                        return (
                            <tr key={user.id} style={{ borderBottom: '1px solid #eee', opacity: isSelf ? 0.6 : 1 }}>
                                <td style={{ padding: '8px' }}>{user.id}</td>
                                <td style={{ padding: '8px' }}>
                                    <User user={user} c={c} />
                                </td>
                                {permLabels.map(p => {
                                    const has = !!(user.permission & p.bit);
                                    // 判断是否可修改：
                                    // - 如果是自己，不可修改（UI上显示但不可点击）
                                    // - 如果是管理员权限位 (permissionAdmin) 且当前用户不是 uid=1，不可修改
                                    const isAdminBit = (p.bit === permissionAdmin);
                                    const canModify = !isSelf && (!isAdminBit || currentUser.id === 1);
                                    return (
                                        <td key={p.bit} style={{ padding: '8px', cursor: canModify ? 'pointer' : 'default' }}>
                                            <span
                                                className="perm-toggle"
                                                data-userid={user.id}
                                                data-bit={p.bit}
                                                data-enabled={has ? 'true' : 'false'}
                                                data-canmodify={canModify ? 'true' : 'false'}
                                                style={{
                                                    display: 'inline-block',
                                                    padding: '4px 10px',
                                                    borderRadius: '4px',
                                                    backgroundColor: has ? '#4CAF50' : '#f44336',
                                                    color: 'white',
                                                    fontSize: '14px',
                                                    opacity: canModify ? 1 : 0.5,
                                                    cursor: canModify ? 'pointer' : 'default',
                                                }}
                                            >
                                                <i class={`fa-solid ${has ? 'fa-check' : 'fa-xmark'}`}></i>
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <Pages c={c} currentPage={page} totalPage={totalPage} />

            <script dangerouslySetInnerHTML={{
                __html: `
          window.__promptReason = ${t.promptReason};
          window.__confirmGrant = ${t.confirmGrant};
          window.__confirmRevoke = ${t.confirmRevoke};
          window.__operationSuccess = ${t.operationSuccess};
          window.__operationFailed = ${t.operationFailed};
          window.__grant = ${t.grant};
          window.__revoke = ${t.revoke};
          window.__currentUserId = ${t.currentUserId};
          window.__onlySuperAdmin = ${t.onlySuperAdmin};
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
    // 只有超级管理员 (uid=1) 才能修改管理员权限位
    if (bit === permissionAdmin && currentUser.id !== 1) {
        return c.json({ success: false, error: getText(locale, 'apiCannotModifyAdmin') }, 403);
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