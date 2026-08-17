// /assets/js/admin-judgement.js

(function() {
  // 搜索过滤
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const keyword = this.value.toLowerCase();
      const rows = document.querySelectorAll('#userTableBody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(keyword) ? '' : 'none';
      });
    });
  }

  // 权限切换点击事件
  document.querySelectorAll('.perm-toggle').forEach(el => {
    el.addEventListener('click', async function() {
      const userId = this.dataset.userid;
      const bit = parseInt(this.dataset.bit);
      const currentHas = this.textContent.trim() === '✔';
      const action = currentHas ? window.__revoke : window.__grant;
      const ths = document.querySelectorAll('thead th');
      const idx = Array.from(this.parentElement.parentElement.children).indexOf(this.parentElement);
      const permName = ths[idx]?.textContent || '';

      const reason = prompt(window.__promptReason);
      if (reason === null) return;

      const confirmMsg = currentHas
        ? window.__confirmRevoke.replace(/\{userId\}/g, userId).replace(/\{permName\}/g, permName)
        : window.__confirmGrant.replace(/\{userId\}/g, userId).replace(/\{permName\}/g, permName);
      if (!confirm(confirmMsg)) return;

      try {
        const response = await fetch('/admin/judgement/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, bit, enable: !currentHas, comment: reason.trim() })
        });
        const result = await response.json();
        if (result.success) {
          alert(window.__operationSuccess);
          location.reload();
        } else {
          alert(window.__operationFailed + (result.error || ''));
        }
      } catch (e) {
        alert(window.__operationFailed + e.message);
      }
    });
  });
})();