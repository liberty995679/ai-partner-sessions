/**
 * AI智能伴侣 - 注册页面脚本
 * 纯原生JavaScript | 无框架依赖
 */

(function () {
    'use strict';

    // --- DOM 元素 ---
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const successMessage = document.getElementById('successMessage');
    const successText = document.getElementById('successText');
    const registerBtn = document.getElementById('registerBtn');

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

    // --- 隐藏提示 ---
    function hideMessages() {
        errorMessage.style.display = 'none';
        errorText.textContent = '';
        successMessage.style.display = 'none';
        successText.textContent = '';
    }

    function showError(message) {
        successMessage.style.display = 'none';
        errorText.textContent = message;
        errorMessage.style.display = 'flex';
    }

    function showSuccess(message) {
        errorMessage.style.display = 'none';
        successText.textContent = message;
        successMessage.style.display = 'flex';
    }

    // --- 表单提交 ---
    registerForm.addEventListener('submit', async function (event) {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        hideMessages();

        // 验证
        if (!username) {
            showError('请输入用户名');
            usernameInput.focus();
            return;
        }

        if (username.length < 2) {
            showError('用户名至少需要2个字符');
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

        if (!confirmPassword) {
            showError('请确认密码');
            confirmPasswordInput.focus();
            return;
        }

        if (password !== confirmPassword) {
            showError('两次输入的密码不一致');
            confirmPasswordInput.focus();
            return;
        }

        // 发送注册请求到后端
        registerBtn.disabled = true;
        registerBtn.querySelector('.btn-text').textContent = '注册中...';

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });
            const data = await response.json();

            if (response.ok) {
                showSuccess('注册成功！即将跳转到登录页面...');
                setTimeout(function () {
                    window.location.href = '/login';
                }, 1500);
            } else {
                showError(data.detail || '注册失败，请稍后重试');
            }
        } catch (error) {
            console.error('注册请求失败:', error);
            showError('服务器连接失败，请检查网络');
        } finally {
            registerBtn.disabled = false;
            registerBtn.querySelector('.btn-text').textContent = '注 册';
        }
    });

    // --- 输入时自动隐藏提示 ---
    usernameInput.addEventListener('input', hideMessages);
    passwordInput.addEventListener('input', hideMessages);
    confirmPasswordInput.addEventListener('input', hideMessages);

})();
