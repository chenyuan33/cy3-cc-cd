// src/routes/admin/judgement.tsx
import { Hono } from 'hono';
import type { AppEnv } from '../../types';
import { Card } from '../../components/card';
import { accessDenied } from '../errorPages';
import { permissionAdmin, permissionVisit, permissionSpeak } from '../../settings';
import { User } from '../../components/user';
import { getText } from "../../translations";

const app = new Hono<AppEnv>();

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

  // 构建带翻译的权限列表
  const permLabels = PERMISSIONS.map(p => ({
    bit: p.bit,
    label: getText(locale, p.labelKey)
  }));

  const { results: users } = await env.db
    .prepare('SELECT id, name, permission, name_color_light, name_color_dark FROM users ORDER BY id')
    .all();

  // 准备前端翻译变量
  const promptReason = getText(locale, 'promptReason');
  const confirmGrant = getText(locale, 'confirmGrant');
  const confirmRevoke = getText(locale, 'confirmRevoke');
  const successMsg = getText(locale, 'operationSuccess');
  const failedMsg = getText(locale, 'operationFailed');
  const grant = getText(locale, 'grant');
  const revoke = getText(locale, 'revoke');

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

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById('searchInput').addEventListener('input', function() {
              const keyword = this.value.toLowerCase();
              const rows = document.querySelectorAll('#userTableBody tr');
              rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(keyword) ? '' : 'none';
              });
            });

            document.querySelectorAll('.perm-toggle').forEach(el => {
              el.addEventListener('click', async function() {
                const userId = this.dataset.userid;
                const bit = parseInt(this.dataset.bit);
                const currentHas = this.textContent.trim() === '✔';
                const action = currentHas ? '${revoke}' : '${grant}';
                const ths = document.querySelectorAll('thead th');
                const idx = Array.from(this.parentElement.parentElement.children).indexOf(this.parentElement);
                const permName = ths[idx]?.textContent || '';

                const reason = prompt('${promptReason}');
                if (reason === null) return;

                const confirmMsg = currentHas
                  ? '${confirmRevoke}'.replace('{userId}', userId).replace('{permName}', permName)
                  : '${confirmGrant}'.replace('{userId}', userId).replace('{permName}', permName);
                if (!confirm(confirmMsg)) return;

                const response = await fetch('/admin/judgement/toggle', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, bit, enable: !currentHas, comment: reason.trim() })
                });
                const result = await response.json();
                if (result.success) {
                  alert('${successMsg}');
                  location.reload();
                } else {
                  alert('${failedMsg}' + (result.error || ''));
                }
              });
            });
          `
        }}
      />
    </Card>,
    { title: getText(locale, 'judgement') }
  );
});

// API：切换某个权限位，并记录理由
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

    // 直接使用翻译键，不再依赖 PERMISSIONS 数组
    const payload = JSON.stringify({
      comment: comment || '无',
      oldPermission: permission,
      newPermission: newPermission
    });
    await env.db
      .prepare('INSERT INTO judgement (uid, type, payload) VALUES (?, "permission-changed", ?)')
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

export default app;