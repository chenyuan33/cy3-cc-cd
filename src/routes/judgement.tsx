import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { Card } from '../components/card';
import { User } from '../components/user';
import { Time } from '../components/time';
import { permissionCount, type allPermissions } from '../settings';
import { raw } from 'hono/html';

const app = new Hono<AppEnv>();
app.get('/', async (c) => {
    const translations = c.get('translations');
    const env = c.env as any;
    const permissionBits = Array.from({ length: permissionCount }, (_, i) => 1 << i);

    const { results } = await env.db.prepare(`
		SELECT
			id, uid, type, payload, created_at, batch_id,
			COUNT(*) OVER (PARTITION BY batch_id) as batch_count
		FROM judgement
		WHERE type IN ('permission-changed', 'name-violation')
		ORDER BY created_at DESC
		LIMIT 100
    `).all();

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
                <h1>{translations.judgement.name}</h1>
                <p>{raw(translations.judgement.description)}</p>
            </Card>

            {displayItems.length === 0 ? (
                <Card><p>{translations.judgement.noRecords}</p></Card>
            ) : (
                displayItems.map((item, idx) => {
                    const firstRecord = item.records[0];
                    const rowType = firstRecord.type;
                    let parsed: any = null;
                    let isNameViolation = false;

                    if (rowType === 'permission-changed') {
                        const payload = JSON.parse(firstRecord.payload);
						const { oldPermission, newPermission } = payload;
						const changedBits = oldPermission ^ newPermission;
						if (changedBits === 0) return [];
						const changes: { permName: string; isGrant: boolean }[] = [];
						for (const bit of permissionBits) {
							if (changedBits & bit) {
								const isGrant = !!(newPermission & bit);
								changes.push({
									permName: translations.permission[bit as allPermissions],
									isGrant,
								});
							}
						}
                        if (changes.length === 0) return null;
                        const firstChange = changes[0];
                        if (!firstChange) return null;
                        parsed = {
                            icon: firstChange.isGrant ? 'fa-user-plus' : 'fa-user-minus',
                            color: firstChange.isGrant ? '#52c41a' : '#e74c3c',
                            actionText: firstChange.isGrant ? translations.permission.grantPermission : translations.permission.revokePermission,
                            changes,
                            comment: payload.comment || '',
                        };
                    } else if (rowType === 'name-violation') {
                        const payload = JSON.parse(firstRecord.payload);
						const { oldViolation, newViolation, comment } = payload;
						if (oldViolation === newViolation) return null;
						const isSet = newViolation === 1;
											parsed = {
							type: 'name-violation',
							icon: isSet ? 'fa-user-slash' : 'fa-user-check',
							color: isSet ? '#e74c3c' : '#52c41a',
							actionText: isSet ? translations.usernameViolation.setted : translations.usernameViolation.unsetted,
							comment: comment || '',
						};
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
                                                {change.isGrant ? translations.permission.grant : translations.permission.revoke}
                                            </span>
                                            &nbsp;
                                            <code>{change.permName}</code>
                                            &nbsp;
                                            {translations.permission.name}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div style={{ color: 'light-dark(black, #e0e0e0)', fontSize: '0.95em' }}>
                                {parsed.comment || <span style={{ color: 'light-dark(#999, #666)' }}>{translations.noReason}</span>}
                            </div>

                            <div style={{ marginTop: '10px', fontSize: '0.8em', color: 'light-dark(#666, #aaa)' }}>
                                <Time c={c} time={item.createdAt} />
                            </div>
                        </Card>
                    );
                })
            )}
        </>,
        { title: translations.judgement.name }
    );
});

export default app;