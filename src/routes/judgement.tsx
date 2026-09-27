import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { Card } from '../components/card';
import { User } from '../components/user';
import { Time } from '../components/time';
import { permissionCount, type allPermissions } from '../settings';
import { raw } from 'hono/html';

const app = new Hono<AppEnv>();
app.get('/', async (c) => {
    const translations = c.get('translations'), env = c.env as any;
    const { results } = await env.db.prepare(`SELECT id, uid, type, payload, created_at, batch_id, operator, comment FROM judgement ORDER BY created_at DESC LIMIT 100`).all();
    const batchMap = new Map<string, {
        batchId: string | null,
        records: {
			uid: number,
			type: string,
			payload: string,
		}[],
        createdAt: string,
		operator: number,
		comment: string
    }>();
    for (const row of results) {
        const key = row.batch_id || `single_${row.id}`;
        if (!batchMap.has(key)) {
            batchMap.set(key, {
                batchId: row.batch_id,
                records: [],
                createdAt: row.created_at,
				operator: row.operator,
				comment: row.comment
            });
        }
        batchMap.get(key)!.records.push(row);
    }
    return c.render(
        <>
            <Card>
                <h1>{translations.judgement.name}</h1>
                <p>{raw(translations.judgement.description)}</p>
            </Card>
            {batchMap.size ? Array.from(batchMap.values()).map(item => {
				const firstRecord = item.records[0]!;
				let icon: string, color: string, actionText: string, changes: { bit: allPermissions; isGrant: boolean }[] | null = null;
				const payload = JSON.parse(firstRecord.payload);
				switch (firstRecord.type) {
					case 'permission-changed':
						const { oldPermission, newPermission } = payload;
						const changedBits = oldPermission ^ newPermission;
						if (changedBits === 0) return null;
						changes = Array.from({ length: permissionCount }, (_, i) => 1 << i).filter(bit => changedBits & bit).map(bit => ({
							bit: bit as allPermissions,
							isGrant: !!(newPermission & bit)
						}));
						if (changes.every(({ isGrant }) => isGrant)) {
							icon = 'fa-user-plus';
							color = '#52c41a';
							actionText = translations.permission.granted;
						} else if (changes.every(({ isGrant }) => !isGrant)) {
							icon = 'fa-user-minus';
							color = '#e74c3c';
							actionText = translations.permission.revoked;
						} else {
							icon = 'fa-user';
							color = 'unset';
							actionText = translations.permission.changed;
						}
						break;
					case 'name-violation':
						const { oldViolation, newViolation } = payload;
						if (oldViolation === newViolation) return null;
						if (newViolation) {
							icon = 'fa-user-times';
							color = '#e74c3c';
							actionText = translations.usernameViolation.setted;
						} else {
							icon = 'fa-user-check';
							color = '#52c41a';
							actionText = translations.usernameViolation.unsetted;
						}
						break;
					case 'warn':
						icon = 'fa-triangle-exclamation';
						color = 'orange';
						actionText = translations.warn;
						break;
					default:
						return null;
				}
				return <Card style={{ marginBottom: '16px' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color }}>
						<i class={`fa-solid ${icon}`}></i>
						<strong>{actionText}</strong>
						<Time c={c} time={item.createdAt} style={{ fontSize: '0.8em', color: 'light-dark(#666, #aaa)' }} />
						<strong style={{ fontSize: '0.8em', color: 'light-dark(#666, #aaa)' }}>
							{translations.operator}
							<User c={c} user={item.operator} />
						</strong>
					</div>
					<div style={{ marginBottom: '8px' }}>{[...new Set(item.records.map(rec => rec.uid))].map(uid => <User c={c} user={uid} />)}</div>
					{firstRecord.type === 'permission-changed' ? <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
						{changes!.map(({ isGrant, bit }) => <li>
							<span style={{ color: isGrant ? '#52c41a' : '#e74c3c' }}>
								{isGrant ? translations.permission.grant : translations.permission.revoke}
							</span>
							&nbsp;
							<code>{translations.permission[bit]}</code>
							&nbsp;
							{translations.permission.name}
						</li>)}
					</ul> : null}
					<div style={{ color: 'light-dark(black, #e0e0e0)', fontSize: '0.95em' }}>
						{item.comment || <span style={{ color: 'light-dark(#999, #666)' }}>{translations.noReason}</span>}
					</div>
				</Card>;
			}
            ) : <Card><p>{translations.judgement.noRecords}</p></Card>}
        </>,
        { title: translations.judgement.name }
    );
});
export default app;