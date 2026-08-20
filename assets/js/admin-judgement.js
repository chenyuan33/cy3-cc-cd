(function () {
    let batchMode = false;

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const keyword = this.value.toLowerCase();
            const rows = document.querySelectorAll('#userTableBody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(keyword) ? '' : 'none';
            });
        });
    }

    // 单个权限切换
    document.querySelectorAll('.perm-toggle').forEach(el => {
        el.addEventListener('click', async function () {
            if (batchMode) return;
            if (this.dataset.canmodify !== 'true') {
                const bit = parseInt(this.dataset.bit);
                const isAdminBit = (bit === window.__permissionAdmin);
                if (isAdminBit && window.__currentUserId !== 1) {
                    alert(window.__onlySuperAdmin);
                } else {
                    alert(window.__cannotModify);
                }
                return;
            }
            const userId = this.dataset.userid;
            const bit = parseInt(this.dataset.bit);
            const currentHas = this.dataset.enabled === 'true';
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

    // 批量操作
    const batchToggleBtn = document.getElementById('batchToggleBtn');
    const batchPanel = document.getElementById('batchPanel');
    const selectAll = document.getElementById('selectAll');
    const userCheckboxes = document.querySelectorAll('.user-checkbox');

    batchToggleBtn.addEventListener('click', function () {
        batchMode = !batchMode;
        batchPanel.style.display = batchMode ? 'block' : 'none';
        userCheckboxes.forEach(cb => cb.style.display = batchMode ? 'inline-block' : 'none');
        selectAll.style.display = batchMode ? 'inline-block' : 'none';
        if (!batchMode) {
            selectAll.checked = false;
            userCheckboxes.forEach(cb => cb.checked = false);
        }
    });

    selectAll.addEventListener('change', function () {
        userCheckboxes.forEach(cb => cb.checked = this.checked);
    });

    document.getElementById('batchCancelBtn').addEventListener('click', function () {
        batchToggleBtn.click();
    });

    document.getElementById('batchExecuteBtn').addEventListener('click', async function () {
        const selected = document.querySelectorAll('.user-checkbox:checked');
        if (selected.length === 0) {
            alert(window.__batchSelectUsers);
            return;
        }
        const userIds = Array.from(selected).map(cb => cb.dataset.userid);
        const bit = parseInt(document.getElementById('batchPermissionSelect').value);
        const action = document.getElementById('batchActionSelect').value;
        const enable = action === 'grant';
        const comment = document.getElementById('batchComment').value.trim();

        const actionText = enable ? window.__batchGrant : window.__batchRevoke;
        const permName = document.getElementById('batchPermissionSelect').selectedOptions[0].text;
        if (!confirm(window.__batchConfirm.replace(/\{count\}/g, selected.length).replace(/\{action\}/g, actionText).replace(/\{perm\}/g, permName))) {
            return;
        }

        try {
            const response = await fetch('/admin/judgement/batch-toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userIds, bit, enable, comment })
            });
            const result = await response.json();
            if (result.success) {
                alert(window.__batchSuccess.replace(/\{success\}/g, result.successCount).replace(/\{fail\}/g, result.failCount));
                location.reload();
            } else {
                alert(window.__batchFailed + (result.error || ''));
            }
        } catch (e) {
            alert(window.__batchFailed + e.message);
        }
    });
})();