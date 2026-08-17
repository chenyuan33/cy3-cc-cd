// src/routes/judgement.tsx
import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { getText } from '../translations';
import { Card } from '../components/card';
import { loginRequired } from './errorPages';
import { User } from '../components/user';
import { Time } from '../components/time';
import { permissionAdmin, permissionVisit, permissionSpeak } from '../settings';

const app = new Hono<AppEnv>();

// 权限位映射
const PERMISSION_MAP = [
  { bit: permissionVisit, key: 'permission1' },
  { bit: permissionSpeak, key: 'permission2' },
  { bit: permissionAdmin, key: 'permission4' },
];

function parsePermissionChange(payload: any, locale: string) {
  const { oldPermission, newPermission, comment } = payload;
  const changedBit = oldPermission ^ newPermission;
  if (changedBit === 0) return null;
  const perm = PERMISSION_MAP.find(p => p.bit === changedBit);
  if (!perm) return null;
  const isGrant = !!(newPermission & changedBit);
  return {
    permName: getText(locale, perm.key),
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
      const info = parsePermissionChange(payload, locale);
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
        <h1>{getText(locale, 'judgement')}</h1>
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
                <svg
                  class="svg-inline--fa fa-user-plus"
                  data-prefix="far"
                  data-icon="user-plus"
                  role="img"
                  viewBox="0 0 640 512"
                  aria-hidden="true"
                  style={{ width: '20px', height: '20px', color }}
                >
                  <path
                    fill="currentColor"
                    d="M304 304c97.2 0 176 78.8 176 176l0 8c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-8c0-70.7-57.3-128-128-128l-96 0c-70.7 0-128 57.3-128 128l0 8c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-8c0-97.2 78.8-176 176-176l96 0zM528 80c13.3 0 24 10.7 24 24l0 48 48 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-48 0 0 48c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-48-48 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l48 0 0-48c0-13.3 10.7-24 24-24zM256 256a128 128 0 1 1 0-256 128 128 0 1 1 0 256zm0-208a80 80 0 1 0 0 160 80 80 0 1 0 0-160z"
                  />
                </svg>
                <span style={{ fontWeight: 'bold', color }}>{actionText}</span>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <User c={c} user={record.user} />
              </div>

              <ul style={{ margin: '0 0 8px 0', paddingLeft: '20px' }}>
                <li>
                  <span style={{ color }}>{record.isGrant ? getText(locale, 'grant') : getText(locale, 'revoke')}</span>
                  {' '}
                  <code>{record.permName}</code>
                  {' '}
                  {getText(locale, 'permissionLabel')}
                </li>
              </ul>

              <div style={{ color: 'light-dark(black, #e0e0e0)', fontSize: '0.95em' }}>
                {record.comment && record.comment !== '无'
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