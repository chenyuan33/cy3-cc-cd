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
        permissionAdminValue: permissionAdmin,
        batchSelectUsers: JSON.stringify(getText(locale, 'batchSelectUsers')),
        batchGrant: JSON.stringify(getText(locale, 'batchGrant')),
        batchRevoke: JSON.stringify(getText(locale, 'batchRevoke')),
        batchConfirm: JSON.stringify(getText(locale, 'batchConfirm')),
        batchSuccess: JSON.stringify(getText(locale, 'batchSuccess')),
        batchFailed: JSON.stringify(getText(locale, 'batchFailed')),
        batchCommentPlaceholder: JSON.stringify(getText(locale, 'batchCommentPlaceholder')),
        batchExecute: JSON.stringify(getText(locale, 'batchExecute')),
        batchOperation: JSON.stringify(getText(locale, 'batchOperation')),
    };

    return c.render(
        <Card style={{ padding: '20px' }}>
            <h1>{getText(locale, 'judgement')}</h1>
            <p>{raw(getText(locale, 'adminJudgementDescription'))}</p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input
                    id="searchInput"
                    type="text"
                    placeholder={getText(locale, 'searchPlaceholder')}
                    style={{ padding: '8px', width: '300px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
                <button id="batchToggleBtn" style={{ padding: '8px 16px' }}>
                    {getText(locale, 'batchOperation')}
                </button>
            </div>

            <div id="batchPanel" style={{ display: 'none', marginBottom: '20px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', background: 'light-dark(#f9f9f9, #2a2a2a)' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span>{getText(locale, 'batchSelectUsers')}</span>
                    <select id="batchPermissionSelect">
                        {permLabels.map(p => (
                            <option key={p.bit} value={p.bit}>{p.label}</option>
                        ))}
                    </select>
                    <select id="batchActionSelect">
                        <option value="grant">{getText(locale, 'grant')}</option>
                        <option value="revoke">{getText(locale, 'revoke')}</option>
                    </select>
                    <input id="batchComment" type="text" placeholder={getText(locale, 'batchCommentPlaceholder')} style={{ padding: '6px', flex: 1, minWidth: '150px' }} />
                    <button id="batchExecuteBtn" style={{ padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>{getText(locale, 'batchExecute')}</button>
                    <button id="batchCancelBtn" style={{ padding: '8px 16px' }}>{getText(locale, 'cancel')}</button>
                </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}><input type="checkbox" id="selectAll" style={{ display: 'none' }} /></th>
                        <th style={{ padding: '8px' }}>ID</th>
                        <th style={{ padding: '8px' }}>{getText(locale, 'username')}</th>
                        {permLabels.map(p => <th key={p.bit} style={{ padding: '8px' }}>{p.label}</th>)}
                    </tr>
                </thead>
                <tbody id="userTableBody">
                    {users.map((user: any) => {
                        const isSelf = user.id === currentUser.id;
                        return (
                            <tr key={user.id} style={{ borderBottom: '1px solid #eee', opacity: isSelf ? 0.6 : 1 }}>
                                <td style={{ padding: '8px' }}><input type="checkbox" class="user-checkbox" data-userid={user.id} style={{ display: 'none' }} /></td>
                                <td style={{ padding: '8px' }}>{user.id}</td>
                                <td style={{ padding: '8px' }}>
                                    <User user={user} c={c} />
                                </td>
                                {permLabels.map(p => {
                                    const has = !!(user.permission & p.bit);
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
          window.__cannotModify = ${t.cannotModify};
          window.__permissionAdmin = ${t.permissionAdminValue};
          window.__batchSelectUsers = ${t.batchSelectUsers};
          window.__batchGrant = ${t.batchGrant};
          window.__batchRevoke = ${t.batchRevoke};
          window.__batchConfirm = ${t.batchConfirm};
          window.__batchSuccess = ${t.batchSuccess};
          window.__batchFailed = ${t.batchFailed};
          window.__batchCommentPlaceholder = ${t.batchCommentPlaceholder};
          window.__batchExecute = ${t.batchExecute};
          window.__batchOperation = ${t.batchOperation};
        `
            }} />
            <script src="/js/admin-judgement.js"></script>
        </Card>,
        { title: getText(locale, 'judgement') }
    );
});

// 单个权限切换
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
        // 单个操作 batch_id 为 NULL
        await env.db
            .prepare('INSERT INTO judgement (uid, type, payload, batch_id) VALUES (?, "permission-changed", ?, NULL)')
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

// 批量权限切换
app.post('/batch-toggle', async (c) => {
    const currentUser = c.get('currentUser');
    const locale = c.get('locale');
    if (!currentUser || !(currentUser.permission & permissionAdmin)) {
        return c.json({ success: false, error: getText(locale, 'apiPermissionDenied') }, 403);
    }
    const { userIds, bit, enable, comment } = await c.req.json();
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || bit === undefined) {
        return c.json({ success: false, error: getText(locale, 'apiMissingParams') }, 400);
    }
    const env = c.env as any;
    let successCount = 0;
    let failCount = 0;
    const results: { userId: number; success: boolean; error?: string }[] = [];
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    for (const id of userIds) {
        const targetId = parseInt(id);
        if (targetId === currentUser.id) {
            results.push({ userId: targetId, success: false, error: getText(locale, 'apiCannotModifySelf') });
            failCount++;
            continue;
        }
        if (bit === permissionAdmin && currentUser.id !== 1) {
            results.push({ userId: targetId, success: false, error: getText(locale, 'apiCannotModifyAdmin') });
            failCount++;
            continue;
        }
        try {
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
                .prepare('INSERT INTO judgement (uid, type, payload, batch_id) VALUES (?, "permission-changed", ?, ?)')
                .bind(targetId, payload, batchId)
                .run();
            await env.db
                .prepare('INSERT INTO notification (uid, type, payload) VALUES (?, "permission-changed", ?)')
                .bind(targetId, payload)
                .run();

            results.push({ userId: targetId, success: true });
            successCount++;
        } catch (e) {
            results.push({ userId: targetId, success: false, error: String(e) });
            failCount++;
        }
    }

    return c.json({
        success: true,
        successCount,
        failCount,
        results
    });
});

export default app;