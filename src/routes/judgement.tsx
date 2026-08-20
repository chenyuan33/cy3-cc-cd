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

// 从 permissionCount 动态生成权限位列表（可根据需要过滤）
function getPermissionBits(filter?: (bit: number) => boolean): number[] {
    const bits = Array.from({ length: permissionCount }, (_, i) => 1 << i);
    return filter ? bits.filter(filter) : bits;
}

function parsePermissionChange(payload: any, locale: string, permissionBits: number[]) {
    const { oldPermission, newPermission, comment } = payload;
    const changedBit = oldPermission ^ newPermission;
    if (changedBit === 0) return null;
    if (!permissionBits.includes(changedBit)) return null;
    const isGrant = !!(newPermission & changedBit);
    return {
        permName: getText(locale, 'permission' + changedBit),
        isGrant,
        comment: comment || '',
    };
}

app.get('/', async (c) => {
    const currentUser = c.get('currentUser');
    if (!currentUser) {
        return loginRequired(c);
    }

    const locale = c.get('locale');
    const env = c.env as any;

    // 决定显示哪些权限位
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
        permName: string;
        isGrant: boolean;
        comment: string;
        createdAt: string;
    }[] = [];

    for (const row of results) {
        try {
            const payload = JSON.parse(row.payload);
            const info = parsePermissionChange(payload, locale, permissionBits);
            if (!info) continue;
            records.push({
                id: row.id,
                user: row.uid,
                permName: info.permName,
                isGrant: info.isGrant,
                comment: info.comment,
                createdAt: row.created_at,
            });
        } catch (_) {
            // 跳过无效记录
        }
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
                <Card>
                    <p>{getText(locale, 'noRecords')}</p>
                </Card>
            ) : (
                records.map((record) => {
                    const actionText = record.isGrant
                        ? getText(locale, 'grantPermission')
                        : getText(locale, 'revokePermission');
                    const color = record.isGrant ? '#52c41a' : '#e74c3c';
                    return (
                        <Card key={record.id} style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <i class="fa-solid fa-user-plus" style={{ fontSize: '20px', color }}></i>
                                <span style={{ fontWeight: 'bold', color }}>{actionText}</span>
                            </div>

                            <div style={{ marginBottom: '8px' }}>
                                <User c={c} user={record.user} />
                            </div>

                            <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
                                <li>
                                    <span style={{ color }}>{record.isGrant ? getText(locale, 'grant') : getText(locale, 'revoke')}</span>
                                    &nbsp;
                                    <code>{record.permName}</code>
                                    &nbsp;
                                    {getText(locale, 'permissionLabel')}
                                </li>
                            </ul>

                            <div style={{ color: 'light-dark(black, #e0e0e0)', fontSize: '0.95em' }}>
                                {record.comment && record.comment !== getText(locale, 'noReason')
                                    ? record.comment
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