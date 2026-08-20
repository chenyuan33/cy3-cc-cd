// src/routes/judgement.tsx
import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { getText } from '../translations';
import { Card } from '../components/card';
import { loginRequired } from './errorPages';
import { User } from '../components/user';
import { Time } from '../components/time';
import { permissionAdmin, permissionCount } from '../settings';

const app = new Hono<AppEnv>();

function getPermissionBits(filter?: (bit: number) => boolean): number[] {
    const bits = Array.from({ length: permissionCount }, (_, i) => 1 << i);
    return filter ? bits.filter(filter) : bits;
}

function parsePermissionChanges(payload: any, locale: string, permissionBits: number[]) {
    const { oldPermission, newPermission, comment } = payload;
    const changedBits = oldPermission ^ newPermission;
    if (changedBits === 0) return [];
    const changes: { permName: string; isGrant: boolean; comment: string }[] = [];
    for (const bit of permissionBits) {
        if (changedBits & bit) {
            const isGrant = !!(newPermission & bit);
            changes.push({
                permName: getText(locale, 'permission' + bit),
                isGrant,
                comment: comment || '',
            });
        }
    }
    return changes;
}

app.get('/', async (c) => {
    const currentUser = c.get('currentUser');
    if (!currentUser) return loginRequired(c);

    const locale = c.get('locale');
    const env = c.env as any;
    const permissionBits = getPermissionBits();

    const { results } = await env.db
        .prepare(`
      SELECT id, uid, payload, created_at
      FROM judgement
      WHERE type = 'permission-changed'
      ORDER BY created_at DESC
      LIMIT 100
    `)
        .all();

    const records: {
        id: number;
        user: number;
        changes: { permName: string; isGrant: boolean; comment: string }[];
        createdAt: string;
    }[] = [];

    for (const row of results) {
        try {
            const payload = JSON.parse(row.payload);
            const changes = parsePermissionChanges(payload, locale, permissionBits);
            if (changes.length === 0) continue;
            records.push({
                id: row.id,
                user: row.uid,
                changes,
                createdAt: row.created_at,
            });
        } catch (_) { }
    }

    return c.render(
        <>
            <Card>
                <h1>
                    <i class="fa-solid fa-user-plus" style={{ marginRight: '8px' }}></i>
                    {getText(locale, 'judgement')}
                </h1>
                <p>{getText(locale, 'judgementDescription')}</p>
            </Card>

            {records.length === 0 ? (
                <Card><p>{getText(locale, 'noRecords')}</p></Card>
            ) : (
                records.map((record) => {
                    // 安全检查：如果 changes 为空，跳过该记录
                    if (!record.changes || record.changes.length === 0) {
                        return null;
                    }
                    const firstChange = record.changes[0];
                    const isGrant = firstChange.isGrant;
                    const actionText = record.changes.length === 1
                        ? (isGrant ? getText(locale, 'grantPermission') : getText(locale, 'revokePermission'))
                        : getText(locale, 'multipleChanges');
                    const icon = isGrant ? 'fa-user-plus' : 'fa-user-minus';
                    const color = isGrant ? '#52c41a' : '#e74c3c';

                    return (
                        <Card key={record.id} style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <i class={`fa-solid ${icon}`} style={{ fontSize: '20px', color }}></i>
                                <span style={{ fontWeight: 'bold', color }}>{actionText}</span>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <User c={c} user={record.user} />
                            </div>

                            <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
                                {record.changes.map((change, idx) => (
                                    <li key={idx}>
                                        <span style={{ color: change.isGrant ? '#52c41a' : '#e74c3c' }}>
                                            {change.isGrant ? getText(locale, 'grant') : getText(locale, 'revoke')}
                                        </span>
                                        &nbsp;
                                        <code>{change.permName}</code>
                                        &nbsp;
                                        {getText(locale, 'permissionLabel')}
                                    </li>
                                ))}
                            </ul>

                            <div style={{ color: 'light-dark(black, #e0e0e0)', fontSize: '0.95em' }}>
                                {firstChange.comment && firstChange.comment !== getText(locale, 'noReason')
                                    ? firstChange.comment
                                    : <span style={{ color: 'light-dark(#999, #666)' }}>{getText(locale, 'unfilledReason')}</span>}
                            </div>

                            <div style={{ marginTop: '10px', fontSize: '0.8em', color: 'light-dark(#666, #aaa)' }}>
                                <Time c={c} time={record.createdAt} />
                            </div>
                        </Card>
                    );
                })
            )}
        </>,
        { title: getText(locale, 'judgement') }
    );
});

export default app;