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
    const changes: { permName: string; isGrant: boolean }[] = [];
    for (const bit of permissionBits) {
        if (changedBits & bit) {
            const isGrant = !!(newPermission & bit);
            changes.push({
                permName: getText(locale, 'permission' + bit),
                isGrant,
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
      SELECT 
        id, uid, payload, created_at, batch_id,
        COUNT(*) OVER (PARTITION BY batch_id) as batch_count
      FROM judgement
      WHERE type = 'permission-changed'
      ORDER BY created_at DESC
      LIMIT 100
    `)
        .all();

    const batchMap: Map<string, {
        batchId: string | null;
        records: any[];
        createdAt: string;
        totalCount: number;
    }> = new Map();

    for (const row of results) {
        const key = row.batch_id || `single_${row.id}`;
        if (!batchMap.has(key)) {
            batchMap.set(key, {
                batchId: row.batch_id,
                records: [],
                createdAt: row.created_at,
                totalCount: row.batch_count || 1,
            });
        }
        batchMap.get(key)!.records.push(row);
    }

    const displayItems: {
        type: 'single' | 'batch';
        records: any[];
        createdAt: string;
        batchId: string | null;
        totalCount: number;
    }[] = [];

    for (const [key, group] of batchMap) {
        const isBatch = group.batchId !== null && group.records.length > 1;
        displayItems.push({
            type: isBatch ? 'batch' : 'single',
            records: group.records,
            createdAt: group.createdAt,
            batchId: group.batchId,
            totalCount: group.totalCount,
        });
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

            {displayItems.length === 0 ? (
                <Card><p>{getText(locale, 'noRecords')}</p></Card>
            ) : (
                displayItems.map((item, idx) => {
                    const firstRecord = item.records[0];
                    const payload = JSON.parse(firstRecord.payload);
                    const changes = parsePermissionChanges(payload, locale, permissionBits);
                    if (changes.length === 0) return null;

                    const firstChange = changes[0];
                    const isGrant = firstChange.isGrant;
                    const icon = isGrant ? 'fa-user-plus' : 'fa-user-minus';
                    const color = isGrant ? '#52c41a' : '#e74c3c';

                    const actionText = isGrant ? getText(locale, 'grantPermission') : getText(locale, 'revokePermission');

                    const userList = item.records.map(rec => rec.uid);
                    const uniqueUsers = [...new Set(userList)];

                    return (
                        <Card key={idx} style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <i class={`fa-solid ${icon}`} style={{ fontSize: '20px', color }}></i>
                                <span style={{ fontWeight: 'bold', color }}>{actionText}</span>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                {uniqueUsers.map((uid, i) => (
                                    <span key={uid}>
                                        <User c={c} user={uid} />
                                        {i < uniqueUsers.length - 1 && '，'}
                                    </span>
                                ))}
                            </div>

                            <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
                                {changes.map((change, idx2) => (
                                    <li key={idx2}>
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
                                {payload.comment && payload.comment !== getText(locale, 'noReason')
                                    ? payload.comment
                                    : <span style={{ color: 'light-dark(#999, #666)' }}>{getText(locale, 'unfilledReason')}</span>}
                            </div>

                            <div style={{ marginTop: '10px', fontSize: '0.8em', color: 'light-dark(#666, #aaa)' }}>
                                <Time c={c} time={item.createdAt} />
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