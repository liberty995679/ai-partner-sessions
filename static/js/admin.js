/**
 * AI智能伴侣 - 用户管理页面脚本
 * 纯原生JavaScript | 无框架依赖
 */
(function () {
    'use strict';

    // --- DOM 元素 ---
    var userTableBody = document.getElementById('userTableBody');
    var statsText    = document.getElementById('statsText');
    var messageBox   = document.getElementById('messageBox');
    var messageText  = document.getElementById('messageText');
    var refreshBtn   = document.getElementById('refreshBtn');

    // --- 工具函数 ---
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showMessage(text, type) {
        messageBox.className = 'message-box ' + type;
        messageBox.style.display = 'flex';
        messageText.textContent = text;
        clearTimeout(showMessage._timer);
        showMessage._timer = setTimeout(function () {
            messageBox.style.display = 'none';
        }, 3000);
    }

    // --- 加载用户列表 ---
    function loadUsers() {
        userTableBody.innerHTML = '<tr><td colspan="5" class="loading-cell">加载中...</td></tr>';

        fetch('/api/users')
            .then(function (resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            })
            .then(function (data) {
                var users = data.users;
                statsText.textContent = '共 ' + users.length + ' 个用户';

                if (users.length === 0) {
                    userTableBody.innerHTML = '<tr><td colspan="5" class="empty-cell">暂无用户数据</td></tr>';
                    return;
                }

                var html = '';
                users.forEach(function (u) {
                    html +=
                        '<tr>' +
                            '<td>' + u.id + '</td>' +
                            '<td>' + escapeHtml(u.username) + '</td>' +
                            '<td class="password-cell">' + escapeHtml(u.password || '***') + '</td>' +
                            '<td class="time-cell">' + (u.created_at || '-') + '</td>' +
                            '<td class="action-cell">' +
                                '<button class="btn btn-danger js-delete-btn" ' +
                                    'data-id="' + u.id + '" ' +
                                    'data-username="' + escapeHtml(u.username) + '">' +
                                    '删除' +
                                '</button>' +
                            '</td>' +
                        '</tr>';
                });
                userTableBody.innerHTML = html;

                // 绑定删除按钮事件
                var btns = userTableBody.querySelectorAll('.js-delete-btn');
                btns.forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var uid  = this.getAttribute('data-id');
                        var uname = this.getAttribute('data-username');
                        showDeleteConfirm(uid, uname);
                    });
                });
            })
            .catch(function (err) {
                console.error('加载用户列表失败:', err);
                statsText.textContent = '加载失败';
                userTableBody.innerHTML = '<tr><td colspan="5" class="empty-cell">加载失败，请检查服务器连接</td></tr>';
            });
    }

    // --- 删除确认弹窗 ---
    function showDeleteConfirm(userId, username) {
        // 移除已有弹窗
        var existing = document.querySelector('.modal-overlay');
        if (existing) existing.parentNode.removeChild(existing);

        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML =
            '<div class="modal-box">' +
                '<p>确定要删除用户<br><strong>' + escapeHtml(username) + '</strong> 吗？<br>此操作不可撤销。</p>' +
                '<div class="modal-actions">' +
                    '<button class="btn btn-outline js-cancel-btn">取消</button>' +
                    '<button class="btn btn-danger js-confirm-btn">确认删除</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        overlay.querySelector('.js-cancel-btn').onclick = function () {
            document.body.removeChild(overlay);
        };

        overlay.querySelector('.js-confirm-btn').onclick = function () {
            document.body.removeChild(overlay);
            doDelete(userId);
        };

        // 点击遮罩层关闭
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) document.body.removeChild(overlay);
        });
    }

    // --- 执行删除 ---
    function doDelete(userId) {
        fetch('/api/users/' + userId, { method: 'DELETE' })
            .then(function (resp) {
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                return resp.json();
            })
            .then(function () {
                showMessage('删除成功', 'success');
                loadUsers();
            })
            .catch(function (err) {
                console.error('删除失败:', err);
                showMessage('删除失败，请稍后重试', 'error');
            });
    }

    // --- 刷新按钮 ---
    refreshBtn.addEventListener('click', function () {
        loadUsers();
    });

    // --- 首次加载 ---
    loadUsers();
})();
