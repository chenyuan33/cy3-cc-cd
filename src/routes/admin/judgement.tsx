// src/routes/admin/judgement.tsx
import { Hono } from 'hono';
import type { AppEnv } from '../../types';
import { Card } from '../../components/card';
import { accessDenied } from '../errorPages';
import { permissionAdmin, permissionVisit, permissionSpeak } from '../../settings';
import { User } from '../../components/user';
import { getText } from "../../translations";

const app = new Hono<AppEnv>();

// 权限列表
const PERMISSIONS = [
  { bit: permissionVisit, label: '进入主站' },
  { bit: permissionSpeak, label: '自由发言' },
//   { bit: permissionAdmin, label: '进入后台' },
];

app.get('/', async (c) => {
  const currentUser = c.get('currentUser');
  if (!currentUser || !(currentUser.permission & permissionAdmin)) {
    return accessDenied(c);
  }

  const env = c.env as any;
  // 查询所有用户
  const { results: users } = await env.db
    .prepare('SELECT id, name, permission, name_color_light, name_color_dark FROM users ORDER BY id')
    .all();

  return c.render(
    <Card style={{ padding: '20px' }}>
      <h1>{getText(c.get('locale'), 'judgement')}</h1>
      <p>点击权限状态（✔ / ✘），填写{getText(c.get('locale'), 'reason')}后即可授予或取消权限。</p>

      <div style={{ marginBottom: '20px' }}>
        <input
          id="searchInput"
          type="text"
          placeholder="搜索用户名或 ID..."
          style={{ padding: '8px', width: '300px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>ID</th>
            <th style={{ padding: '8px' }}>用户名</th>
            {PERMISSIONS.map(p => <th key={p.bit} style={{ padding: '8px' }}>{p.label}</th>)}
          </tr>
        </thead>
        <tbody id="userTableBody">
          {users.map((user: any) => (
            <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px' }}>{user.id}</td>
              <td style={{ padding: '8px' }}>
                <User user={user} c={c} />
              </td>
              {PERMISSIONS.map(p => {
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
                const action = currentHas ? '取消' : '授予';
                const ths = document.querySelectorAll('thead th');
                const idx = Array.from(this.parentElement.parentElement.children).indexOf(this.parentElement);
                const permName = ths[idx]?.textContent || '权限';

                const reason = prompt('请输入操作理由（可选）：');
                if (reason === null) return;

                if (!confirm('确定要' + action + '用户 ID ' + userId + ' 的 "' + permName + '" 权限吗？')) return;

                const response = await fetch('/admin/judgement/toggle', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, bit, enable: !currentHas, comment: reason.trim() })
                });
                const result = await response.json();
                if (result.success) {
                  alert('操作成功！');
                  location.reload();
                } else {
                  alert('操作失败：' + (result.error || '未知错误'));
                }
              });
            });
          `
        }}
      />
    </Card>,
    { title: getText(c.get('locale'), 'judgement') }
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

    const permName = PERMISSIONS.find(p => p.bit === bit)?.label || '未知权限';
    const payload = JSON.stringify({
        comment: comment || '无',
        oldPermission: permission,
        newPermission: newPermission
    });
    // 插入 judgement（公开记录）
    await env.db
        .prepare('INSERT INTO judgement (uid, type, payload) VALUES (?, "permission-changed", ?)')
        .bind(targetId, payload)
        .run();

    // 插入 notification（用户通知）
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