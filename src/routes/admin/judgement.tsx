// src/routes/admin/judgement.tsx
import { Hono } from 'hono';
import type { AppEnv } from '../../types';
import { Card } from '../../components/card';
import { accessDenied } from '../errorPages';
import { permissionAdmin, permissionVisit, permissionSpeak } from '../../settings';
import { User } from '../../components/user';
import { getText } from "../../translations";
import { html } from 'hono/html';

const app = new Hono<AppEnv>();

// 权限列表
const PERMISSIONS = [
  { bit: permissionVisit, labelKey: 'permission1' },
  { bit: permissionSpeak, labelKey: 'permission2' },
];

app.get('/', async (c) => {
  const currentUser = c.get('currentUser');
  if (!currentUser || !(currentUser.permission & permissionAdmin)) {
    return accessDenied(c);
  }

  const locale = c.get('locale');
  const env = c.env as any;

  // 构建带翻译的权限列
  const permLabels = PERMISSIONS.map(p => ({
    bit: p.bit,
    label: getText(locale, p.labelKey)
  }));

  const { results: users } = await env.db
    .prepare('SELECT id, name, permission, name_color_light, name_color_dark FROM users ORDER BY id')
    .all();

  // 翻译变量（注入到前端）
  const t = {
    promptReason: getText(locale, 'promptReason'),
    confirmGrant: getText(locale, 'confirmGrant'),
    confirmRevoke: getText(locale, 'confirmRevoke'),
    operationSuccess: getText(locale, 'operationSuccess'),
    operationFailed: getText(locale, 'operationFailed'),
    grant: getText(locale, 'grant'),
    revoke: getText(locale, 'revoke'),
  };

  return c.render(
    <Card style={{ padding: '20px' }}>
      <h1>{getText(locale, 'judgement')}</h1>
      <p>{getText(locale, 'adminJudgementDescription')}</p>

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
          {users.map((user: any) => (
            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{user.id}</td>
              <td style={{ padding: '8px' }}>
                <User user={user} c={c} />
              </td>
              {permLabels.map(p => {
                const has = !!(user.permission & p.bit);
                return (
                  <td key={p.bit} style={{ padding: '8px', cursor: 'pointer' }}>
                    <span
                      className="perm-toggle"
                      data-userid={user.id}
                      data-bit={p.bit}
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: has ? '#4CAF50' : '#f44336',
                        color: 'white',
                        fontSize: '14px',
                      }}
                    >
                      {has ? '✔' : '✘'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 注入全局翻译变量并加载外部脚本 */}
      {html`
        <script>
          window.__promptReason = ${JSON.stringify(t.promptReason)};
          window.__confirmGrant = ${JSON.stringify(t.confirmGrant)};
          window.__confirmRevoke = ${JSON.stringify(t.confirmRevoke)};
          window.__operationSuccess = ${JSON.stringify(t.operationSuccess)};
          window.__operationFailed = ${JSON.stringify(t.operationFailed)};
          window.__grant = ${JSON.stringify(t.grant)};
          window.__revoke = ${JSON.stringify(t.revoke)};
        </script>
        <script src="/js/admin-judgement.js"></script>
      `}
    </Card>,
    { title: getText(locale, 'judgement') }
  );
});

// API：切换权限位
app.post('/toggle', async (c) => {
  const currentUser = c.get('currentUser');
  if (!currentUser || !(currentUser.permission & permissionAdmin)) {
    return c.json({ success: false, error: '无权限' }, 403);
  }
  const { userId, bit, enable, comment } = await c.req.json();
  if (!userId || bit === undefined) {
    return c.json({ success: false, error: '参数缺失' }, 400);
  }
  const targetId = parseInt(userId);
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
      comment: comment || '无',
      oldPermission: permission,
      newPermission: newPermission
    });
    // 插入 judgement 表（公开记录）
    await env.db
      .prepare('INSERT INTO judgement (uid, type, payload) VALUES (?, "permission-changed", ?)')
      .bind(targetId, payload)
      .run();
    // 插入 notification 表（用户通知）
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