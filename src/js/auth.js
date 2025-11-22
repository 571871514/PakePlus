// 用户认证模块
class Auth {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this._loadAuthState();
    }
    
    // 加载认证状态
    _loadAuthState() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
            } catch (error) {
                console.error('解析用户数据失败:', error);
                this._clearAuthState();
            }
        }
    }
    
    // 保存认证状态
    _saveAuthState(user) {
        this.currentUser = user;
        this.isAuthenticated = true;
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    // 清除认证状态
    _clearAuthState() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('currentUser');
    }
    
    // 简单的密码哈希函数（与database.js中的保持一致）
    _hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
    
    // 用户登录
    async login(username, password) {
        try {
            // 获取用户信息
            const user = await db.getByIndex('users', 'username', username);
            
            if (!user) {
                throw new Error('用户名或密码错误');
            }
            
            // 验证密码
            const passwordHash = this._hashPassword(password);
            if (user.password !== passwordHash) {
                throw new Error('用户名或密码错误');
            }
            
            // 保存登录状态
            this._saveAuthState(user);
            
            // 记录登录日志
            await this._logActivity('login', `用户 ${username} 登录成功`);
            
            return {
                success: true,
                user,
                mustChangePassword: user.mustChangePassword || false
            };
        } catch (error) {
            console.error('登录失败:', error);
            
            // 记录失败登录尝试
            await this._logActivity('login_failed', `用户 ${username} 登录失败: ${error.message}`);
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // 用户登出
    async logout() {
        try {
            // 记录登出日志
            if (this.currentUser) {
                await this._logActivity('logout', `用户 ${this.currentUser.username} 登出`);
            }
            
            // 清除认证状态
            this._clearAuthState();
            
            return { success: true };
        } catch (error) {
            console.error('登出失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 修改密码
    async changePassword(currentPassword, newPassword, confirmPassword) {
        try {
            // 验证用户是否已登录
            if (!this.currentUser) {
                throw new Error('用户未登录');
            }
            
            // 验证新密码与确认密码是否一致
            if (newPassword !== confirmPassword) {
                throw new Error('两次输入的密码不一致');
            }
            
            // 验证密码强度
            if (newPassword.length < 6) {
                throw new Error('新密码长度至少为6位');
            }
            
            // 验证当前密码是否正确
            const user = await db.getById('users', this.currentUser.id);
            const currentPasswordHash = this._hashPassword(currentPassword);
            
            if (user.password !== currentPasswordHash) {
                throw new Error('当前密码不正确');
            }
            
            // 更新密码
            user.password = this._hashPassword(newPassword);
            user.mustChangePassword = false;
            user.lastPasswordChange = new Date().toISOString();
            
            await db.update('users', user);
            
            // 更新当前用户信息
            this._saveAuthState(user);
            
            // 记录密码修改日志
            await this._logActivity('password_changed', `用户 ${this.currentUser.username} 修改密码成功`);
            
            return { success: true };
        } catch (error) {
            console.error('修改密码失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 重置密码（仅管理员）
    async resetPassword(username, newPassword) {
        try {
            // 验证当前用户是否为管理员
            if (!this.currentUser || this.currentUser.role !== 'admin') {
                throw new Error('权限不足，仅管理员可重置密码');
            }
            
            // 获取用户信息
            const user = await db.getByIndex('users', 'username', username);
            
            if (!user) {
                throw new Error('用户不存在');
            }
            
            // 更新密码
            user.password = this._hashPassword(newPassword);
            user.mustChangePassword = true; // 重置后强制用户修改密码
            
            await db.update('users', user);
            
            // 记录密码重置日志
            await this._logActivity('password_reset', `管理员 ${this.currentUser.username} 重置了用户 ${username} 的密码`);
            
            return { success: true };
        } catch (error) {
            console.error('重置密码失败:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 检查用户权限
    hasPermission(requiredPermission) {
        if (!this.isAuthenticated) {
            return false;
        }
        
        // 管理员拥有所有权限
        if (this.currentUser.role === 'admin') {
            return true;
        }
        
        // 这里可以根据实际需求实现更复杂的权限系统
        return this.currentUser.permissions && this.currentUser.permissions.includes(requiredPermission);
    }
    
    // 记录用户活动
    async _logActivity(action, description) {
        try {
            await db.add('activities', {
                action,
                description,
                userId: this.currentUser ? this.currentUser.id : null,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('记录活动日志失败:', error);
            // 不抛出异常，避免影响主流程
        }
    }
    
    // 获取当前用户信息
    getCurrentUser() {
        return this.currentUser;
    }
    
    // 检查是否已认证
    checkAuth() {
        return this.isAuthenticated;
    }
}

// 创建全局认证实例
const auth = new Auth();

// 登录表单提交处理
function setupLoginForm() {
    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    
    loginBtn.addEventListener('click', async () => {
        // 显示加载状态
        showLoading('正在登录...');
        
        // 清除之前的错误信息
        loginError.classList.add('hidden');
        
        // 获取输入值
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        // 简单的表单验证
        if (!username || !password) {
            hideLoading();
            loginError.textContent = '请输入用户名和密码';
            loginError.classList.remove('hidden');
            return;
        }
        
        try {
            // 调用登录方法
            const result = await auth.login(username, password);
            
            hideLoading();
            
            if (result.success) {
                // 检查是否需要修改密码
                if (result.mustChangePassword) {
                    // 显示修改密码页面
                    document.getElementById('login-page').classList.add('hidden');
                    document.getElementById('change-password-page').classList.remove('hidden');
                } else {
                    // 登录成功，跳转到主页面
                    document.getElementById('login-page').classList.add('hidden');
                    document.getElementById('main-page').classList.remove('hidden');
                    showToast('登录成功', 'success');
                }
            } else {
                // 显示错误信息
                loginError.textContent = result.error;
                loginError.classList.remove('hidden');
            }
        } catch (error) {
            hideLoading();
            loginError.textContent = '登录失败，请稍后重试';
            loginError.classList.remove('hidden');
        }
    });
    
    // 返回登录页面按钮
    document.getElementById('back-to-login').addEventListener('click', () => {
        document.getElementById('change-password-page').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
    });
}

// 修改密码表单提交处理
function setupChangePasswordForm() {
    const savePasswordBtn = document.getElementById('save-password-btn');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const passwordError = document.getElementById('password-error');
    
    savePasswordBtn.addEventListener('click', async () => {
        // 显示加载状态
        showLoading('正在保存...');
        
        // 清除之前的错误信息
        passwordError.classList.add('hidden');
        
        // 获取输入值
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // 简单的表单验证
        if (!currentPassword || !newPassword || !confirmPassword) {
            hideLoading();
            passwordError.textContent = '请填写所有密码字段';
            passwordError.classList.remove('hidden');
            return;
        }
        
        try {
            // 调用修改密码方法
            const result = await auth.changePassword(currentPassword, newPassword, confirmPassword);
            
            hideLoading();
            
            if (result.success) {
                // 清空表单
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
                
                // 显示成功消息并跳转到主页面
                showToast('密码修改成功', 'success');
                
                setTimeout(() => {
                    document.getElementById('change-password-page').classList.add('hidden');
                    document.getElementById('main-page').classList.remove('hidden');
                }, 1500);
            } else {
                // 显示错误信息
                passwordError.textContent = result.error;
                passwordError.classList.remove('hidden');
            }
        } catch (error) {
            hideLoading();
            passwordError.textContent = '修改密码失败，请稍后重试';
            passwordError.classList.remove('hidden');
        }
    });
}

// 设置登出功能
function setupLogout() {
    document.getElementById('logout-btn').addEventListener('click', async () => {
        // 显示确认对话框
        if (!confirm('确定要退出登录吗？')) {
            return;
        }
        
        // 显示加载状态
        showLoading('正在退出...');
        
        try {
            // 调用登出方法
            await auth.logout();
            
            hideLoading();
            
            // 清空页面内容
            document.getElementById('main-page').classList.add('hidden');
            document.getElementById('login-page').classList.remove('hidden');
            
            // 重置登录表单
            document.getElementById('password').value = '';
            
            showToast('已成功退出登录', 'success');
        } catch (error) {
            hideLoading();
            showToast('退出登录失败', 'error');
        }
    });
}

// 初始化认证模块
function initAuth() {
    setupLoginForm();
    setupChangePasswordForm();
    setupLogout();
    
    // 检查用户认证状态
    if (auth.checkAuth()) {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('main-page').classList.remove('hidden');
    } else {
        document.getElementById('main-page').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
    }
}

// 导出到全局window对象，使其在浏览器环境中可用
window.initAuth = initAuth;
window.auth = auth;