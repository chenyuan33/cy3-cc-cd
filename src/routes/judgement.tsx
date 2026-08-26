import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { getText } from '../translations';
import { Card } from '../components/card';
import { User } from '../components/user';
import { Time } from '../components/time';
import { permissionAdmin, permissionCount } from '../settings';

const app = new Hono<AppEnv>();

function getPermissionBits(filter?: (bit: number) => boolean): number[] {
    const bits = Array.from({ length: permissionCount }, (_, i) => 1 << i);
    return filter ? bits.filter(filter) : bits;
}

// 解析权限变更
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

// 解析违规用户名变更（返回专有结构，不混用权限模板）
function parseNameViolation(payload: any, locale: string) {
    const { oldViolation, newViolation, comment } = payload;
    if (oldViolation === newViolation) return null;
    const isSet = newViolation === 1;
    return {
        type: 'name-violation',
        icon: isSet ? 'fa-user-slash' : 'fa-user-check',
        color: isSet ? '#e74c3c' : '#52c41a',
        actionText: isSet ? getText(locale, 'setViolation') : getText(locale, 'unsetViolation'),
        comment: comment || '',
    };
}

app.get('/', async (c) => {
    const locale = c.get('locale');
    const env = c.env as any;
    const permissionBits = getPermissionBits();

    const { results } = await env.db
        .prepare(`
      SELECT 
        id, uid, type, payload, created_at, batch_id,
        COUNT(*) OVER (PARTITION BY batch_id) as batch_count
      FROM judgement
      WHERE type IN ('permission-changed', 'name-violation')
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
                    const rowType = firstRecord.type;
                    let parsed: any = null;
                    let isNameViolation = false;

                    if (rowType === 'permission-changed') {
                        const payload = JSON.parse(firstRecord.payload);
                        const changes = parsePermissionChanges(payload, locale, permissionBits);
                        if (changes.length === 0) return null;
                        const firstChange = changes[0];
                        if (!firstChange) return null;
                        parsed = {
                            icon: firstChange.isGrant ? 'fa-user-plus' : 'fa-user-minus',
                            color: firstChange.isGrant ? '#52c41a' : '#e74c3c',
                            actionText: firstChange.isGrant ? getText(locale, 'grantPermission') : getText(locale, 'revokePermission'),
                            changes,
                            comment: payload.comment || '',
                        };
                    } else if (rowType === 'name-violation') {
                        const payload = JSON.parse(firstRecord.payload);
                        parsed = parseNameViolation(payload, locale);
                        if (!parsed) return null;
                        isNameViolation = true;
                    } else {
                        return null;
                    }

                    const userList = item.records.map(rec => rec.uid);
                    const uniqueUsers = [...new Set(userList)];

                    return (
                        <Card key={idx} style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <i class={`fa-solid ${parsed.icon}`} style={{ fontSize: '20px', color: parsed.color }}></i>
                                <span style={{ fontWeight: 'bold', color: parsed.color }}>{parsed.actionText}</span>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                {uniqueUsers.map((uid, i) => (
                                    <span key={uid}>
                                        <User c={c} user={uid} />
                                        {i < uniqueUsers.length - 1 && '，'}
                                    </span>
                                ))}
                            </div>

                            {/* 对于权限变更，显示具体的权限列表；对于违规用户名，不显示权限列表 */}
                            {!isNameViolation && (
                                <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
                                    {parsed.changes.map((change: any, idx2: number) => (
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
                            )}

                            <div style={{ color: 'light-dark(black, #e0e0e0)', fontSize: '0.95em' }}>
                                {parsed.comment && parsed.comment !== getText(locale, 'noReason')
                                    ? parsed.comment
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