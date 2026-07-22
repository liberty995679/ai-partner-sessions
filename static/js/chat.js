/**
 * AI智能伴侣 - 聊天页面脚本
 * 纯原生JavaScript | Flex布局 | 数据库持久化
 */
(function () {
    'use strict';

    // ============================================
    // 后端配置和状态
    // ============================================
    var BACKEND_URL = 'http://localhost:8000';
    var USER_ID = 'user_123';   // 后续登录后可替换为真实用户ID
    var AUTH_TOKEN = localStorage.getItem('token') || '';  // 从登录页获取 JWT token
    var aiName = '小薇';
    var aiPersonality = '你好！我是小薇，一个善解人意的AI伴侣。\n我喜欢聊天、分享趣事，也会在你需要的时候提供温暖的陪伴。\n无论你开心还是难过，我都会在这里陪着你。';

    // ============================================
    // 运行时状态（不再有假数据）
    // ============================================
    var conversations = [];           // 对话列表 [{id, name, preview, time, unread, active}]
    var currentConversationId = null; // 当前激活的对话ID
    var messagesCache = {};           // { convId: [messageObjects] }
    var isLoadingMessages = false;    // 防止重复加载
    var personasCache = {};           // { convId: { name, prompt } }  每个对话的人设

    // 人设 localStorage 持久化
    function savePersonaToStorage(convId, name, prompt) {
        try {
            var all = JSON.parse(localStorage.getItem('personas_storage') || '{}');
            all[convId] = { name: name, prompt: prompt };
            localStorage.setItem('personas_storage', JSON.stringify(all));
        } catch (e) {}
    }
    function loadPersonaFromStorage(convId) {
        try {
            var all = JSON.parse(localStorage.getItem('personas_storage') || '{}');
            return all[convId] || null;
        } catch (e) { return null; }
    }
    function removePersonaFromStorage(convId) {
        try {
            var all = JSON.parse(localStorage.getItem('personas_storage') || '{}');
            delete all[convId];
            localStorage.setItem('personas_storage', JSON.stringify(all));
        } catch (e) {}
    }

    // ============================================
    // API 封装（留着等后端实现）
    // ============================================

    /** 获取对话列表 */
    function apiGetConversations() {
        return fetch(BACKEND_URL + '/api/conversations', {
            headers: { 'x-token': AUTH_TOKEN }
        })
            .then(function (r) { if (!r.ok) throw new Error('加载对话列表失败'); return r.json(); });
    }

    /** 创建新对话 → 返回 {id, name, created_at} */
    function apiCreateConversation(name) {
        return fetch(BACKEND_URL + '/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-token': AUTH_TOKEN },
            body: JSON.stringify({ name: name })
        }).then(function (r) { if (!r.ok) throw new Error('创建对话失败'); return r.json(); });
    }

    /** 获取某个对话的所有消息 */
    function apiGetMessages(convId) {
        return fetch(BACKEND_URL + '/api/conversations/' + convId + '/messages', {
            headers: { 'x-token': AUTH_TOKEN }
        })
            .then(function (r) { if (!r.ok) throw new Error('加载消息失败'); return r.json(); });
    }

    /** 新增一条消息 */
    function apiAddMessage(convId, role, content) {
        return fetch(BACKEND_URL + '/api/conversations/' + convId + '/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-token': AUTH_TOKEN },
            body: JSON.stringify({ role: role, content: content })
        }).then(function (r) { if (!r.ok) throw new Error('保存消息失败'); return r.json(); });
    }

    /** 删除对话 */
    function apiDeleteConversation(convId) {
        return fetch(BACKEND_URL + '/api/conversations/' + convId, {
            method: 'DELETE',
            headers: { 'x-token': AUTH_TOKEN }
        }).then(function (r) { if (!r.ok) throw new Error('删除失败'); return r.json(); });
    }

    // ============================================
    // 同步人设到后端
    // ============================================
    function syncPersonaToBackend() {
        fetch(BACKEND_URL + '/api/set-persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: USER_ID, name: aiName, prompt: aiPersonality })
        }).then(function (res) { return res.json(); })
          .then(function (data) { console.log('[后端同步人设成功]:', data); })
          .catch(function (err) { console.error('[后端同步人设失败]:', err); });
    }

    var personaDebounceTimer = null;
    function syncPersonaToBackendDebounced() {
        clearTimeout(personaDebounceTimer);
        personaDebounceTimer = setTimeout(syncPersonaToBackend, 500);
    }

    // ============================================
    // DOM 元素
    // ============================================
    var chatList       = document.getElementById('chatList');
    var messagesList   = document.getElementById('messagesList');
    var messagesArea   = document.getElementById('messagesArea');
    var messageInput   = document.getElementById('messageInput');
    var sendBtn        = document.getElementById('sendBtn');
    var newChatBtn     = document.getElementById('newChatBtn');
    var searchChat     = document.getElementById('searchChat');
    var chatPartnerName = document.getElementById('chatPartnerName');
    var btnToggleLeft  = document.getElementById('btnToggleLeft');
    var btnToggleRight = document.getElementById('btnToggleRight');
    var sidebarLeft    = document.getElementById('sidebarLeft');
    var sidebarRight   = document.getElementById('sidebarRight');
    var aiNameInput    = document.getElementById('aiNameInput');
    var aiPersonalityInput = document.getElementById('aiPersonalityInput');

    // ============================================
    // 时间格式化工具
    // ============================================
    function formatChatTime(isoStr) {
        if (!isoStr) return '';
        var d = new Date(isoStr);
        var now = new Date();
        var h = padZero(d.getHours());
        var m = padZero(d.getMinutes());

        if (isSameDay(d, now)) return h + ':' + m;

        var yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (isSameDay(d, yesterday)) return '昨天';

        var weekdays = ['周日','周一','周二','周三','周四','周五','周六'];
        var diffDays = Math.floor((now - d) / 86400000);
        if (diffDays < 7 && d.getDay() !== now.getDay()) return weekdays[d.getDay()];

        return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function isSameDay(a, b) {
        return a.getFullYear() === b.getFullYear() &&
               a.getMonth() === b.getMonth() &&
               a.getDate() === b.getDate();
    }

    function formatDateDivider(isoStr) {
        if (!isoStr) return '';
        var d = new Date(isoStr);
        return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
    }

    function padZero(num) {
        return num < 10 ? '0' + num : '' + num;
    }

    function getNowISO() {
        return new Date().toISOString();
    }

    function getNowTimeStr() {
        var d = new Date();
        return padZero(d.getHours()) + ':' + padZero(d.getMinutes());
    }

    // ============================================
    // 初始化
    // ============================================
    function init() {
        if (aiNameInput) aiNameInput.value = aiName;
        if (aiPersonalityInput) aiPersonalityInput.value = aiPersonality;
        syncPersonaToBackend();
        bindEvents();

        // 尝试从后端加载对话列表
        loadConversationsFromServer();
    }

    /** 从后端加载对话列表 */
    function loadConversationsFromServer() {
        apiGetConversations()
            .then(function (data) {
                if (data.conversations && data.conversations.length > 0) {
                    conversations = data.conversations.map(function (c) {
                        c.time = formatChatTime(c.updated_at || c.created_at);
                        c.active = false;
                        c.unread = false;
                        return c;
                    });
                    renderChatList(conversations);
                    // 自动打开第一个对话
                    switchConversation(conversations[0].id);
                } else {
                    // 没有任何对话 → 自动创建一个
                    createNewChat();
                }
            })
            .catch(function (err) {
                console.warn('[加载对话列表失败，使用本地模式]:', err);
                // 降级：本地模式，直接创建第一个对话
                createNewChatLocal();
            });
    }

    // ============================================
    // 渲染对话列表
    // ============================================
    function renderChatList(data) {
        if (!chatList) return;

        if (data.length === 0) {
            chatList.innerHTML = '<div style="text-align:center;color:var(--color-text-dim);padding:40px 12px;font-size:0.85rem;">暂无对话<br>点击下方按钮开始</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var activeClass = item.active ? ' active' : '';
            var badgeHtml = item.unread ? '<span class="chat-item-badge"></span>' : '';
            var avatarText = (item.name || '对话').charAt(0);

            html +=
                '<div class="chat-item' + activeClass + '" data-id="' + item.id + '">' +
                    '<div class="chat-item-avatar">' + escapeHtml(avatarText) + '</div>' +
                    '<div class="chat-item-content">' +
                        '<div class="chat-item-name">' + escapeHtml(item.name) + '</div>' +
                        '<div class="chat-item-preview">' + escapeHtml(item.preview || '') + '</div>' +
                    '</div>' +
                    '<span class="chat-item-time">' + escapeHtml(item.time || '') + '</span>' +
                    badgeHtml +
                    '<button class="chat-item-delete" data-delete-id="' + item.id + '" title="删除对话">×</button>' +
                '</div>';
        }
        chatList.innerHTML = html;

        var items = chatList.querySelectorAll('.chat-item');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                if (id) switchConversation(id);
            });
        }

        var deleteBtns = chatList.querySelectorAll('.chat-item-delete');
        for (var k = 0; k < deleteBtns.length; k++) {
            deleteBtns[k].addEventListener('click', function (e) {
                e.stopPropagation();
                var convId = this.getAttribute('data-delete-id');
                if (convId && confirm('确定要删除这个对话吗？')) {
                    deleteConversation(convId);
                }
            });
        }
    }

    // ============================================
    // 渲染消息列表
    // ============================================
    function renderMessages(data) {
        if (!messagesList) return;
        var html = '';
        var lastDate = '';
        for (var i = 0; i < data.length; i++) {
            var msg = data[i];
            var msgDate = msg.created_at ? formatDateDivider(msg.created_at) : '';
            if (msgDate && msgDate !== lastDate) {
                html += '<div class="date-divider"><span>' + escapeHtml(msgDate) + '</span></div>';
                lastDate = msgDate;
            }
            html += buildMessageHTML(msg);
        }
        messagesList.innerHTML = html;
    }

    /**
     * 根据消息对象构建HTML
     * msg: { type, avatar, text, time }
     */
    function buildMessageHTML(msg) {
        switch (msg.type) {
            case 'system':
                return (
                    '<div class="message-system">' +
                        '<span class="system-text">' + escapeHtml(msg.text) + '</span>' +
                    '</div>'
                );

            case 'ai':
                return (
                    '<div class="message-row ai">' +
                        '<div class="message-avatar">' + escapeHtml(msg.avatar || aiName.charAt(0)) + '</div>' +
                        '<div>' +
                            '<div class="message-bubble">' + formatMessageText(msg.text) + '</div>' +
                            '<div class="message-time">' + escapeHtml(msg.time || '') + '</div>' +
                        '</div>' +
                    '</div>'
                );

            case 'user':
                return (
                    '<div class="message-row user">' +
                        '<div class="message-avatar">' + escapeHtml(msg.avatar || '我') + '</div>' +
                        '<div>' +
                            '<div class="message-bubble">' + formatMessageText(msg.text) + '</div>' +
                            '<div class="message-time">' + escapeHtml(msg.time || '') + '</div>' +
                        '</div>' +
                    '</div>'
                );

            default:
                return '';
        }
    }

    function formatMessageText(text) {
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    // ============================================
    // 切换对话
    // ============================================
    function switchConversation(convId) {
        if (isLoadingMessages) return;

        // 已经是当前对话
        if (currentConversationId === convId) return;

        currentConversationId = convId;

        // 恢复该对话的人设（优先级：内存缓存 > localStorage > 对话名）
        var savedPersona = personasCache[convId] || loadPersonaFromStorage(convId);
        if (savedPersona) {
            aiName = savedPersona.name;
            aiPersonality = savedPersona.prompt;
            personasCache[convId] = savedPersona;
        } else {
            // 无缓存时用对话名作为 AI 名字（新对话保持默认）
            var target = findConversationById(convId);
            if (target && target.name && target.name.indexOf('新对话') === -1) {
                aiName = target.name;
            } else {
                aiName = '小薇';
                aiPersonality = '你好！我是小薇，一个善解人意的AI伴侣。\n我喜欢聊天、分享趣事，也会在你需要的时候提供温暖的陪伴。\n无论你开心还是难过，我都会在这里陪着你。';
            }
        }
        if (aiNameInput) aiNameInput.value = aiName;
        if (aiPersonalityInput) aiPersonalityInput.value = aiPersonality;

        // 更新激活状态
        for (var i = 0; i < conversations.length; i++) {
            conversations[i].active = (String(conversations[i].id) === String(convId));
            conversations[i].unread = false;
        }
        renderChatList(conversations);

        // 更新顶部标题
        var target = findConversationById(convId);
        if (target && chatPartnerName) {
            chatPartnerName.textContent = target.name;
        }

        // 若已有缓存则直接渲染
        if (messagesCache[convId]) {
            renderMessages(messagesCache[convId]);
            scrollToBottom(false);
            return;
        }

        // 从后端加载消息
        isLoadingMessages = true;
        messagesList.innerHTML = '<div class="message-system"><span class="system-text">加载消息中...</span></div>';

        apiGetMessages(convId)
            .then(function (data) {
                var msgs = data.messages || [];
                // 转换后端格式 → 前端格式
                msgs = msgs.map(function (m) {
                    return {
                        type: m.role === 'user' ? 'user' : 'ai',
                        avatar: m.role === 'user' ? '我' : (aiName.charAt(0)),
                        text: m.content,
                        time: formatChatTime(m.created_at),
                        created_at: m.created_at
                    };
                });
                messagesCache[convId] = msgs;
                renderMessages(msgs);
                scrollToBottom(false);
                isLoadingMessages = false;
            })
            .catch(function (err) {
                console.error('[加载消息失败]:', err);
                messagesCache[convId] = [{
                    type: 'system',
                    text: '对话开始 — ' + aiName + '已成为你的AI伴侣'
                }];
                renderMessages(messagesCache[convId]);
                isLoadingMessages = false;
            });
    }

    function findConversationById(id) {
        for (var i = 0; i < conversations.length; i++) {
            if (String(conversations[i].id) === String(id)) return conversations[i];
        }
        return null;
    }

    // ============================================
    // 新建对话 — 编号规则：对话001, 对话002...
    // ============================================
    function createNewChat() {
        // 计算下一个编号，避免冒名顶替其他对话
        var maxNum = 0;
        for (var i = 0; i < conversations.length; i++) {
            var match = conversations[i].name && conversations[i].name.match(/^新对话(\d*)$/);
            if (match) {
                var num = match[1] ? parseInt(match[1], 10) : 1;
                if (num > maxNum) maxNum = num;
            }
        }
        var newNum = maxNum + 1;
        var newName = '新对话' + (newNum > 1 ? newNum : '');

        apiCreateConversation(newName)
            .then(function (data) {
                var conv = {
                    id: data.id,
                    name: newName,
                    preview: '',
                    time: '刚刚',
                    unread: false,
                    active: true,
                    created_at: data.created_at || getNowISO()
                };
                // 取消其他激活
                for (var k = 0; k < conversations.length; k++) {
                    conversations[k].active = false;
                }
                // 插入头部
                conversations.unshift(conv);
                renderChatList(conversations);
                activateConversation(conv);
            })
            .catch(function (err) {
                console.warn('[创建对话失败，使用本地模式]:', err);
                createNewChatLocal(newName);
            });
    }

    /** 降级：本地模式创建对话 */
    function createNewChatLocal(optName) {
        var maxNum = 0;
        for (var i = 0; i < conversations.length; i++) {
            var match = conversations[i].name && conversations[i].name.match(/^新对话(\d*)$/);
            if (match) {
                var num = match[1] ? parseInt(match[1], 10) : 1;
                if (num > maxNum) maxNum = num;
            }
        }
        var newNum = maxNum + 1;
        var name = optName || ('新对话' + (newNum > 1 ? newNum : ''));
        var conv = {
            id: 'local_' + Date.now(),
            name: name,
            preview: '',
            time: '刚刚',
            unread: false,
            active: true,
            created_at: getNowISO()
        };
        for (var k = 0; k < conversations.length; k++) {
            conversations[k].active = false;
        }
        conversations.unshift(conv);
        renderChatList(conversations);
        activateConversation(conv);
    }

    function padNumber(num, width) {
        var s = String(num);
        while (s.length < width) s = '0' + s;
        return s;
    }

    /** 激活一个对话（设置消息区） */
    function activateConversation(conv) {
        currentConversationId = conv.id;
        if (chatPartnerName) chatPartnerName.textContent = conv.name;

        // 初始化该对话的人设缓存 + localStorage（新建对话用对话名 + 默认性格）
        if (!personasCache[conv.id]) {
            var initName = (conv.name && conv.name.indexOf('新对话') === -1) ? conv.name : aiName;
            personasCache[conv.id] = { name: initName, prompt: aiPersonality };
            savePersonaToStorage(conv.id, initName, aiPersonality);
        }

        messagesCache[conv.id] = [{
            type: 'system',
            text: '新对话已创建 — 开始和她聊天吧！',
            created_at: conv.created_at
        }];
        renderMessages(messagesCache[conv.id]);
        scrollToBottom(false);
        if (messageInput) messageInput.focus();
    }

    // ============================================
    // 发送消息
    // ============================================
    function sendMessage() {
        var text = messageInput.value.trim();
        if (!text) return;
        if (!currentConversationId) {
            // 还没对话 → 先创建一个
            createNewChat();
            return;
        }

        var timeStr = getNowTimeStr();
        var nowISO = getNowISO();

        var newMsg = {
            type: 'user',
            avatar: '我',
            text: text,
            time: timeStr,
            created_at: nowISO
        };

        // 缓存
        if (!messagesCache[currentConversationId]) {
            messagesCache[currentConversationId] = [];
        }
        messagesCache[currentConversationId].push(newMsg);

        // 追加到DOM
        messagesList.insertAdjacentHTML('beforeend', buildMessageHTML(newMsg));
        scrollToBottom(true);

        // 更新对话列表预览
        updateConversationPreview(currentConversationId, text);

        // 清空输入
        messageInput.value = '';

        // 请求AI回复（后端会统一保存消息，前端不再重复调用 apiAddMessage）
        fetchAIReply(text);
    }

    /** 更新对话列表中的预览文字和时间 */
    function updateConversationPreview(convId, previewText) {
        for (var i = 0; i < conversations.length; i++) {
            if (String(conversations[i].id) === String(convId)) {
                conversations[i].preview = previewText.length > 30 ? previewText.slice(0, 30) + '...' : previewText;
                conversations[i].time = '刚刚';
                break;
            }
        }
        renderChatList(conversations);
    }

    // ============================================
    // 调用后端获取AI回复
    // ============================================
    function fetchAIReply(userMessageText) {
        var timeStr = getNowTimeStr();
        var nowISO = getNowISO();
        var convIdToSend = (String(currentConversationId).indexOf('local_') === 0) ? 0 : currentConversationId;

        fetch(BACKEND_URL + '/chat_api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-token': AUTH_TOKEN
            },
            body: JSON.stringify({
                user_id: USER_ID,
                message: userMessageText,
                name: aiName,
                prompt: aiPersonality,
                conv_id: convIdToSend
            })
        })
        .then(function (response) {
            if (!response.ok) throw new Error('网络请求失败');
            return response.json();
        })
        .then(function (data) {
            var replyText = data.reply || '';
            var replyName = data.name || aiName;

            var replyMsg = {
                type: 'ai',
                avatar: replyName.charAt(0),
                text: replyText,
                time: timeStr,
                created_at: nowISO
            };

            if (!messagesCache[currentConversationId]) {
                messagesCache[currentConversationId] = [];
            }
            messagesCache[currentConversationId].push(replyMsg);

            messagesList.insertAdjacentHTML('beforeend', buildMessageHTML(replyMsg));
            scrollToBottom(true);

            // 更新预览
            updateConversationPreview(currentConversationId, replyText);
        })
        .catch(function (error) {
            console.error('[AI回复请求失败]:', error);
            var errMsg = {
                type: 'system',
                text: '网络异常，AI无法响应，请检查服务是否正常运行。'
            };
            if (!messagesCache[currentConversationId]) {
                messagesCache[currentConversationId] = [];
            }
            messagesCache[currentConversationId].push(errMsg);
            messagesList.insertAdjacentHTML('beforeend', buildMessageHTML(errMsg));
            scrollToBottom(true);
        });
    }

    // ============================================
    // 滚动到底部
    // ============================================
    function scrollToBottom(smooth) {
        if (!messagesArea) return;
        if (smooth) {
            messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: 'smooth' });
        } else {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    // ============================================
    // 删除对话
    // ============================================
    function deleteConversation(convId) {
        apiDeleteConversation(convId)
            .then(function () {
                conversations = conversations.filter(function (c) {
                    return String(c.id) !== String(convId);
                });
                delete messagesCache[convId];
                delete personasCache[convId];
                removePersonaFromStorage(convId);

                if (String(currentConversationId) === String(convId)) {
                    currentConversationId = null;
                    messagesList.innerHTML = '';
                    if (chatPartnerName) chatPartnerName.textContent = 'AI 智能伴侣';
                    if (conversations.length > 0) {
                        switchConversation(conversations[0].id);
                    }
                }
                renderChatList(conversations);
            })
            .catch(function (err) {
                console.error('[删除对话失败]:', err);
            });
    }

    // ============================================
    // 搜索对话
    // ============================================
    function filterChatList(keyword) {
        var kw = keyword.toLowerCase();
        var filtered = [];
        for (var i = 0; i < conversations.length; i++) {
            if (conversations[i].name.toLowerCase().indexOf(kw) !== -1 ||
                (conversations[i].preview && conversations[i].preview.toLowerCase().indexOf(kw) !== -1)) {
                filtered.push(conversations[i]);
            }
        }
        renderChatList(filtered.length > 0 ? filtered : conversations);
    }

    // ============================================
    // 移动端侧边栏切换
    // ============================================
    function toggleSidebar(sidebar) {
        if (!sidebar) return;
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        } else {
            sidebar.classList.add('open');
        }
    }

    // ============================================
    // 更新AI名字（全局同步）
    // ============================================
    function updateAiName(newName) {
        aiName = newName;
        // 保存到当前对话的人设缓存 + localStorage
        if (currentConversationId) {
            personasCache[currentConversationId] = { name: newName, prompt: aiPersonality };
            savePersonaToStorage(currentConversationId, newName, aiPersonality);
        }
        // 1. 更新顶部标题栏
        if (chatPartnerName) {
            chatPartnerName.textContent = newName;
        }
        // 2. 更新当前激活对话的名称
        if (currentConversationId) {
            var conv = findConversationById(currentConversationId);
            if (conv) {
                conv.name = newName;
                renderChatList(conversations);
            }
        }
        // 3. 更新头像显示（刷新当前消息列表中的AI头像）
        if (currentConversationId && messagesCache[currentConversationId]) {
            var msgs = messagesCache[currentConversationId];
            var firstChar = newName.charAt(0);
            for (var i = 0; i < msgs.length; i++) {
                if (msgs[i].type === 'ai') {
                    msgs[i].avatar = firstChar;
                }
            }
            renderMessages(msgs);
            scrollToBottom(false);
        }
        // 4. 同步到后端
        syncPersonaToBackendDebounced();
    }

    // ============================================
    // 工具函数
    // ============================================
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    // ============================================
    // 事件绑定
    // ============================================
    function bindEvents() {
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }

        if (messageInput) {
            messageInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        if (newChatBtn) {
            newChatBtn.addEventListener('click', createNewChat);
        }

        if (searchChat) {
            searchChat.addEventListener('input', function () {
                filterChatList(this.value);
            });
        }

        if (btnToggleLeft) {
            btnToggleLeft.addEventListener('click', function () {
                toggleSidebar(sidebarLeft);
            });
        }

        if (btnToggleRight) {
            btnToggleRight.addEventListener('click', function () {
                toggleSidebar(sidebarRight);
            });
        }

        if (messagesArea) {
            messagesArea.addEventListener('click', function () {
                if (sidebarLeft && sidebarLeft.classList.contains('open')) {
                    sidebarLeft.classList.remove('open');
                }
                if (sidebarRight && sidebarRight.classList.contains('open')) {
                    sidebarRight.classList.remove('open');
                }
            });
        }

        // AI名字变更 → 全局同步
        if (aiNameInput) {
            aiNameInput.addEventListener('input', function () {
                var newName = this.value.trim() || '小薇';
                updateAiName(newName);
            });
        }

        // AI性格变更 → 仅同步后端
        if (aiPersonalityInput) {
            aiPersonalityInput.addEventListener('input', function () {
                aiPersonality = this.value.trim() || aiPersonality;
                if (currentConversationId) {
                    personasCache[currentConversationId] = { name: aiName, prompt: aiPersonality };
                    savePersonaToStorage(currentConversationId, aiName, aiPersonality);
                }
                syncPersonaToBackendDebounced();
            });
        }
    }

    // ============================================
    // 启动
    // ============================================
    init();

})();
