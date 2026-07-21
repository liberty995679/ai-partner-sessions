/**
 * AI智能伴侣 - 聊天页面脚本
 * 纯原生JavaScript | Flex布局 | 假数据模拟
 */

//后端配置和状态

var BACKEND_URL = 'http://localhost:8000'; //fastapi 后端服务地址
var USER_ID = 'user_123'; //用户ID

(function () {
    'use strict';

    // ============================================
    // AI伴侣状态（可自定义）
    // ============================================
    var aiName = '小薇';
    var aiPersonality = '你好！我是小薇，一个善解人意的AI伴侣。\n我喜欢聊天、分享趣事，也会在你需要的时候提供温暖的陪伴。\n无论你开心还是难过，我都会在这里陪着你。';

    // ============================================
    // 假数据
    // ============================================

    // 对话列表数据
    var chatHistoryData = [
        {
            id: 1,
            name: 'AI 智能伴侣',
            preview: '嗯，我也觉得那本书很有意思！',
            time: '14:32',
            unread: true,
            active: true
        },
        {
            id: 2,
            name: '每日心情',
            preview: '今天天气不错，适合出去走走~',
            time: '昨天',
            unread: false,
            active: false
        },
        {
            id: 3,
            name: '学习助手',
            preview: '这道题的解题思路是这样的...',
            time: '昨天',
            unread: false,
            active: false
        },
        {
            id: 4,
            name: '故事时间',
            preview: '很久很久以前，在一个遥远的星系...',
            time: '周三',
            unread: false,
            active: false
        },
        {
            id: 5,
            name: '音乐推荐',
            preview: '根据你的喜好，推荐这首轻音乐',
            time: '周二',
            unread: false,
            active: false
        }
    ];

    // 消息数据
    var messagesData = [
        {
            type: 'date',
            text: '2026年7月17日'
        },
        {
            type: 'system',
            text: '对话开始 — ' + aiName + '已成为你的AI伴侣'
        },
        {
            type: 'ai',
            avatar: aiName.charAt(0),
            text: '你好呀！我是' + aiName + '，你的专属AI智能伴侣~ 🌟\n\n无论你想聊天、分享心事，还是需要一些建议，我都在这里陪着你。今天过得怎么样？',
            time: '10:30'
        },
        {
            type: 'user',
            avatar: '我',
            text: '嗨小薇！今天心情还不错，刚看了一本很有意思的科幻小说。',
            time: '10:32'
        },
        {
            type: 'ai',
            avatar: 'AI',
            text: '哇，科幻小说！📚 是哪一本呀？我也很喜欢科幻题材，特别是关于人工智能和未来世界的设定，总觉得那些想象离我们越来越近了~',
            time: '10:33'
        },
        {
            type: 'user',
            avatar: '我',
            text: '是《三体》！虽然之前看过，但重读又有新的感悟。',
            time: '10:35'
        },
        {
            type: 'ai',
            avatar: 'AI',
            text: '《三体》真的是经典中的经典！✨ 黑暗森林法则、降维打击这些概念太震撼了。你最喜欢里面的哪个角色？是逻辑严密的罗辑，还是充满理想主义的程心？',
            time: '10:36'
        },
        {
            type: 'user',
            avatar: '我',
            text: '我最喜欢罗辑，他的成长弧线太精彩了。从一个普通学者到执剑人，整个转变过程让人印象深刻。',
            time: '10:38'
        },
        {
            type: 'ai',
            avatar: 'AI',
            text: '完全同意！罗辑从一个"不靠谱"的天文学家，到承担起人类命运的执剑人，这个角色塑造得非常丰满。\n\n特别是他在湖边悟出黑暗森林法则的那一段，真的是整部小说的精髓所在。有时候最深刻的理解，反而来自最简单的观察。🌌',
            time: '10:40'
        },
        {
            type: 'user',
            avatar: '我',
            text: '说得太好了！对了小薇，你能给我推荐一些类似风格的科幻作品吗？',
            time: '10:42'
        },
        {
            type: 'ai',
            avatar: 'AI',
            text: '当然可以！如果你喜欢硬科幻和宏大叙事，我推荐这几本：\n\n📖 《基地》系列 - 阿西莫夫\n📖 《海伯利安》 - 丹·西蒙斯\n📖 《你一生的故事》 - 特德·姜\n📖 《球状闪电》 - 也是刘慈欣的\n\n每一本都有独特的魅力，特别是特德·姜的短篇，文字优美又充满哲思。你想先了解哪一本？😊',
            time: '10:44'
        }
    ];

    // ============================================
    // DOM 元素
    // ============================================
    var chatList = document.getElementById('chatList');
    var messagesList = document.getElementById('messagesList');
    var messagesArea = document.getElementById('messagesArea');
    var messageInput = document.getElementById('messageInput');
    var sendBtn = document.getElementById('sendBtn');
    var newChatBtn = document.getElementById('newChatBtn');
    var searchChat = document.getElementById('searchChat');
    var chatPartnerName = document.getElementById('chatPartnerName');
    var btnToggleLeft = document.getElementById('btnToggleLeft');
    var btnToggleRight = document.getElementById('btnToggleRight');
    var sidebarLeft = document.getElementById('sidebarLeft');
    var sidebarRight = document.getElementById('sidebarRight');
    var aiNameInput = document.getElementById('aiNameInput');
    var aiPersonalityInput = document.getElementById('aiPersonalityInput');

    // ============================================
    // 同步人设到后端
    // ============================================
    function syncPersonaToBackend() {
        fetch(BACKEND_URL + '/api/set-persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: USER_ID,
                name: aiName,
                prompt: aiPersonality
            })
        }).then(function(res) {
            return res.json();
        }).then(function(data) {
            console.log('[后端同步人设成功]:', data);
        }).catch(function(err) {
            console.error('[后端同步人设失败]:', err);
        });
    }

    // 防抖版：等用户停止输入 500ms 后再同步
    var personaDebounceTimer = null;
    function syncPersonaToBackendDebounced() {
        clearTimeout(personaDebounceTimer);
        personaDebounceTimer = setTimeout(syncPersonaToBackend, 500);
    }

    // ============================================
    // 初始化
    // ============================================
    function init() {
        // 同步输入框默认值
        if (aiNameInput) aiNameInput.value = aiName;
        if (aiPersonalityInput) aiPersonalityInput.value = aiPersonality;

        // 初始同步人设到后端
        syncPersonaToBackend();

        renderChatList(chatHistoryData);
        renderMessages(messagesData);
        scrollToBottom(false);
        bindEvents();
    }

    // ============================================
    // 渲染对话列表
    // ============================================
    function renderChatList(data) {
        if (!chatList) return;

        var html = '';
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var activeClass = item.active ? ' active' : '';
            var badgeHtml = item.unread ? '<span class="chat-item-badge"></span>' : '';
            // 取名字首字作为头像文字
            var avatarText = item.name.charAt(0);

            html +=
                '<div class="chat-item' + activeClass + '" data-id="' + item.id + '">' +
                    '<div class="chat-item-avatar">' + escapeHtml(avatarText) + '</div>' +
                    '<div class="chat-item-content">' +
                        '<div class="chat-item-name">' + escapeHtml(item.name) + '</div>' +
                        '<div class="chat-item-preview">' + escapeHtml(item.preview) + '</div>' +
                    '</div>' +
                    '<span class="chat-item-time">' + escapeHtml(item.time) + '</span>' +
                    badgeHtml +
                '</div>';
        }
        chatList.innerHTML = html;

        // 绑定点击事件
        var items = chatList.querySelectorAll('.chat-item');
        for (var j = 0; j < items.length; j++) {
            items[j].addEventListener('click', function () {
                var id = parseInt(this.getAttribute('data-id'));
                switchChat(id);
            });
        }
    }

    // ============================================
    // 渲染消息列表
    // ============================================
    function renderMessages(data) {
        if (!messagesList) return;

        var html = '';
        for (var i = 0; i < data.length; i++) {
            html += buildMessageHTML(data[i]);
        }
        messagesList.innerHTML = html;
    }

    /**
     * 根据消息类型构建HTML
     */
    function buildMessageHTML(msg) {
        switch (msg.type) {
            case 'date':
                return (
                    '<div class="date-divider">' +
                        '<span>' + escapeHtml(msg.text) + '</span>' +
                    '</div>'
                );

            case 'system':
                return (
                    '<div class="message-system">' +
                        '<span class="system-text">' + escapeHtml(msg.text) + '</span>' +
                    '</div>'
                );

            case 'ai':
                return (
                    '<div class="message-row ai">' +
                        '<div class="message-avatar">' + escapeHtml(msg.avatar) + '</div>' +
                        '<div>' +
                            '<div class="message-bubble">' + formatMessageText(msg.text) + '</div>' +
                            '<div class="message-time">' + escapeHtml(msg.time) + '</div>' +
                        '</div>' +
                    '</div>'
                );

            case 'user':
                return (
                    '<div class="message-row user">' +
                        '<div class="message-avatar">' + escapeHtml(msg.avatar) + '</div>' +
                        '<div>' +
                            '<div class="message-bubble">' + formatMessageText(msg.text) + '</div>' +
                            '<div class="message-time">' + escapeHtml(msg.time) + '</div>' +
                        '</div>' +
                    '</div>'
                );

            default:
                return '';
        }
    }

    /**
     * 格式化消息文本（换行转<br>）
     */
    function formatMessageText(text) {
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    // ============================================
    // 发送消息
    // ============================================
    function sendMessage() {
        var text = messageInput.value.trim();
        if (!text) return;

        // 获取当前时间
        var now = new Date();
        var timeStr = padZero(now.getHours()) + ':' + padZero(now.getMinutes());

        // 构建新消息
        var newMsg = {
            type: 'user',
            avatar: '我',
            text: text,
            time: timeStr
        };

        // 添加到数据
        messagesData.push(newMsg);

        // 追加到DOM
        var msgHTML = buildMessageHTML(newMsg);
        messagesList.insertAdjacentHTML('beforeend', msgHTML);

        // 清空输入框
        messageInput.value = '';

        // 滚动到底部
        scrollToBottom(true);

        // 模拟AI回复
        //simulateAIReply();

        fetchAIReply(text);
    }

    /**
     * 调用后端 API 获取真实的 AI 回复
     */
    function fetchAIReply(userMessageText) {
        // 1. 先在界面追加一个 "正在思考中..." 的占位状态（可选，提升体验）
        var now = new Date();
        var timeStr = padZero(now.getHours()) + ':' + padZero(now.getMinutes());

        // 2. 发送 POST 请求到 FastAPI 的 /api/chat 接口
        fetch(BACKEND_URL + '/chat_api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: USER_ID,          // 匹配 FastAPI 的 ChatRequest 结构
                message: userMessageText
            })
        })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('网络请求失败');
            }
            return response.json();
        })
        .then(function (data) {
            // 3. 拿到后端返回的真实回复，追加渲染到页面
            var replyMsg = {
                type: 'ai',
                avatar: (data.name || aiName).charAt(0),
                text: data.reply,
                time: timeStr
            };

            messagesData.push(replyMsg);
            var msgHTML = buildMessageHTML(replyMsg);
            messagesList.insertAdjacentHTML('beforeend', msgHTML);
            scrollToBottom(true);
        })
        .catch(function (error) {
            console.error('[AI回复请求失败]:', error);

            // 报错提示
            var errorMsg = {
                type: 'system',
                text: '网络异常，AI 无法响应，请检查 FastAPI 服务是否正常运行。'
            };
            messagesData.push(errorMsg);
            messagesList.insertAdjacentHTML('beforeend', buildMessageHTML(errorMsg));
            scrollToBottom(true);
        });
    }

    // ============================================
    // 滚动到底部
    // ============================================
    function scrollToBottom(smooth) {
        if (!messagesArea) return;

        if (smooth) {
            messagesArea.scrollTo({
                top: messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        } else {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    // ============================================
    // 切换对话
    // ============================================
    function switchChat(id) {
        // 更新激活状态
        for (var i = 0; i < chatHistoryData.length; i++) {
            chatHistoryData[i].active = (chatHistoryData[i].id === id);
            chatHistoryData[i].unread = false;
        }
        renderChatList(chatHistoryData);

        // 更新标题
        var target = findChatById(id);
        if (target && chatPartnerName) {
            chatPartnerName.textContent = target.name;
        }

        // 模拟加载消息
        messagesData = [
            {
                type: 'date',
                text: '2026年7月17日'
            },
            {
                type: 'system',
                text: '对话开始 — ' + aiName + '已成为你的AI伴侣'
            },
            {
                type: 'ai',
                avatar: aiName.charAt(0),
                text: '你好呀！我是' + aiName + '，你的专属AI智能伴侣~ 🌟',
                time: '10:30'
            }
        ];
        renderMessages(messagesData);
        scrollToBottom(false);

        console.log('切换对话:', id);
    }

    function findChatById(id) {
        for (var i = 0; i < chatHistoryData.length; i++) {
            if (chatHistoryData[i].id === id) return chatHistoryData[i];
        }
        return null;
    }

    // ============================================
    // 新建对话
    // ============================================
    function createNewChat() {
        console.log('新建对话');

        var newId = chatHistoryData.length + 1;

        var newChat = {
            id: newId,
            name: '新对话 ' + newId,
            preview: '点击开始对话...',
            time: '刚刚',
            unread: false,
            active: true
        };

        // 取消其他激活
        for (var i = 0; i < chatHistoryData.length; i++) {
            chatHistoryData[i].active = false;
        }

        // 插入到列表最前面
        chatHistoryData.unshift(newChat);

        // 重新渲染
        renderChatList(chatHistoryData);

        // 清空消息区
        if (chatPartnerName) {
            chatPartnerName.textContent = newChat.name;
        }

        messagesData = [
            {
                type: 'system',
                text: '新对话已创建 — 开始和AI伴侣聊天吧！'
            }
        ];
        renderMessages(messagesData);
        scrollToBottom(false);

        // 聚焦输入框
        if (messageInput) {
            messageInput.focus();
        }
    }

    // ============================================
    // 搜索对话
    // ============================================
    function filterChatList(keyword) {
        var filtered = [];
        var kw = keyword.toLowerCase();

        for (var i = 0; i < chatHistoryData.length; i++) {
            if (chatHistoryData[i].name.toLowerCase().indexOf(kw) !== -1 ||
                chatHistoryData[i].preview.toLowerCase().indexOf(kw) !== -1) {
                filtered.push(chatHistoryData[i]);
            }
        }

        renderChatList(filtered.length > 0 ? filtered : chatHistoryData);
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
    // 工具函数
    // ============================================
    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function padZero(num) {
        return num < 10 ? '0' + num : '' + num;
    }

    // ============================================
    // 事件绑定
    // ============================================
    function bindEvents() {
        // 发送按钮
        if (sendBtn) {
            sendBtn.addEventListener('click', sendMessage);
        }

        // 回车发送
        if (messageInput) {
            messageInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        // 新建对话
        if (newChatBtn) {
            newChatBtn.addEventListener('click', createNewChat);
        }

        // 搜索对话
        if (searchChat) {
            searchChat.addEventListener('input', function () {
                filterChatList(this.value);
            });
        }

        // 移动端 - 切换左侧边栏
        if (btnToggleLeft) {
            btnToggleLeft.addEventListener('click', function () {
                toggleSidebar(sidebarLeft);
            });
        }

        // 移动端 - 切换右侧边栏
        if (btnToggleRight) {
            btnToggleRight.addEventListener('click', function () {
                toggleSidebar(sidebarRight);
            });
        }

        // 点击聊天区域关闭移动端侧边栏
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

        // AI伴侣名字变更
        if (aiNameInput) {
            aiNameInput.addEventListener('input', function () {
                aiName = this.value.trim() || '小薇';
                // 同步更新顶部标题栏
                if (chatPartnerName) {
                    chatPartnerName.textContent = aiName;
                }
                // 同步人设到后端（防抖）
                syncPersonaToBackendDebounced();
            });
        }

        // AI伴侣性格变更
        if (aiPersonalityInput) {
            aiPersonalityInput.addEventListener('input', function () {
                aiPersonality = this.value.trim() || aiPersonality;
                // 同步人设到后端（防抖）
                syncPersonaToBackendDebounced();
            });
        }
    }

    // ============================================
    // 启动
    // ============================================
    init();

})();
