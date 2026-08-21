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
        batchSelectUsersHint: JSON.stringify(getText(locale, 'batchSelectUsersHint')),
        batchSelectPerms: JSON.stringify(getText(locale, 'batchSelectPerms')),
        batchAction: JSON.stringify(getText(locale, 'batchAction')),
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
                <button id="batchToggleBtn" style={{ padding: '8px 16px', background: 'light-dark(#e0e0e0, #444)', border: '1px solid #aaa', borderRadius: '4px', cursor: 'pointer' }}>
                    {getText(locale, 'batchOperation')}
                </button>
            </div>

            <div id="batchPanel" style={{ display: 'none', marginBottom: '20px', border: '1px solid #ccc', borderRadius: '8px', background: 'light-dark(#ffffff, #2a2a2a)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee', background: 'light-dark(#f5f5f5, #3a3a3a)', borderRadius: '8px 8px 0 0' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{getText(locale, 'batchOperation')}</span>
                    <button id="batchCloseBtn" style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'light-dark(#666, #aaa)' }}>
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div style={{ padding: '16px' }}>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontWeight: '500', display: 'block', marginBottom: '4px' }}>{getText(locale, 'batchSelectUsers')}</label>
                        <span style={{ fontSize: '14px', color: '#888' }}>{getText(locale, 'batchSelectUsersHint')}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: '2', minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '2px' }}>{getText(locale, 'batchSelectPerms')}</label>
                            <select id="batchPermissionSelect" multiple style={{ width: '100%', minHeight: '80px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', background: 'light-dark(#fff, #333)' }}>
                                {permLabels.map(p => (
                                    <option key={p.bit} value={p.bit}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: '0 0 auto' }}>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '2px' }}>{getText(locale, 'batchAction')}</label>
                            <select id="batchActionSelect" style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: 'light-dark(#fff, #333)' }}>
                                <option value="grant">{getText(locale, 'grant')}</option>
                                <option value="revoke">{getText(locale, 'revoke')}</option>
                            </select>
                        </div>
                        <div style={{ flex: '1', minWidth: '150px' }}>
                            <label style={{ display: 'block', fontSize: '13px', marginBottom: '2px' }}>{getText(locale, 'reason')}</label>
                            <input id="batchComment" type="text" placeholder={getText(locale, 'batchCommentPlaceholder')} style={{ width: '100%', padding: '6px 10px', border: '1px solid #ccc', borderRadius: '4px', background: 'light-dark(#fff, #333)' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <button id="batchExecuteBtn" style={{ padding: '8px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{getText(locale, 'batchExecute')}</button>
                        <button id="batchCancelBtn" style={{ padding: '8px 20px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{getText(locale, 'cancel')}</button>
                    </div>
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
          window.__batchSelectUsersHint = ${t.batchSelectUsersHint};
          window.__batchSelectPerms = ${t.batchSelectPerms};
          window.__batchAction = ${t.batchAction};
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
    const { userIds, bits, enable, comment } = await c.req.json();
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !bits || !Array.isArray(bits) || bits.length === 0) {
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
        if (bits.includes(permissionAdmin) && currentUser.id !== 1) {
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
                for (const bit of bits) {
                    newPermission |= bit;
                }
            } else {
                for (const bit of bits) {
                    newPermission &= ~bit;
                }
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