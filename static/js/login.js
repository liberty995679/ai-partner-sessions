/**
 * AI智能伴侣 - 登录页面脚本
 * 纯原生JavaScript | 无框架依赖
 */

(function () {
    'use strict';

    // --- DOM 元素 ---
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const loginBtn = document.getElementById('loginBtn');

    // 密码可见性状态
    let isPasswordVisible = false;

    // --- 显示/隐藏密码 ---
    togglePasswordBtn.addEventListener('click', function () {
        isPasswordVisible = !isPasswordVisible;

        if (isPasswordVisible) {
            passwordInput.type = 'text';
            togglePasswordBtn.querySelector('.eye-open').style.display = 'none';
            togglePasswordBtn.querySelector('.eye-closed').style.display = 'block';
            togglePasswordBtn.setAttribute('aria-label', '隐藏密码');
        } else {
            passwordInput.type = 'password';
            togglePasswordBtn.querySelector('.eye-open').style.display = 'block';
            togglePasswordBtn.querySelector('.eye-closed').style.display = 'none';
            togglePasswordBtn.setAttribute('aria-label', '显示密码');
        }
    });

    // --- 隐藏错误提示 ---
    function hideError() {
        errorMessage.style.display = 'none';
        errorText.textContent = '';
    }

    // --- 显示错误提示 ---
    function showError(message) {
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
    }

    // --- 表单提交 ---
    loginForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // 基本验证
        if (!username) {
            showError('请输入用户名');
            usernameInput.focus();
            return;
        }

        if (!password) {
            showError('请输入密码');
            passwordInput.focus();
            return;
        }

        if (password.length < 6) {
            showError('密码长度不能少于6位');
            passwordInput.focus();
            return;
        }

        // 隐藏之前的错误
        hideError();

        //真正请求API登录
        //登录按钮进入加载状态
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });
            const data = await response.json();

            if (response.ok) {
                // 登录成功
                localStorage.setItem('token', data.token);
                alert('登录成功！即将跳转到主页...')
                window.location.href = '/chat';

            } else {
                showError(data.detail || '登录失败');
            }
        } catch (error) {
            console.error(error);
            showError('服务器连接失败');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';
        }



        // 模拟登录请求（后续可接入FastAPI后端）
        // 此处仅打印日志，不连接后端
    });

    // --- 输入时自动隐藏错误 ---
    usernameInput.addEventListener('input', hideError);
    passwordInput.addEventListener('input', hideError);

})();
