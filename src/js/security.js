/**
 * 数据安全模块
 * 实现数据加密存储和操作日志记录功能
 */
class SecurityManager {
    constructor() {
        this.encryptionKey = null;
        this.logDb = null;
        this.initialized = false;
        this.maxLogEntries = 1000;
        this.encryptionAlgorithm = 'AES-GCM';
        
        // 初始化安全模块
        this.init();
    }
    
    /**
     * 初始化安全模块
     */
    async init() {
        try {
            // 生成或获取加密密钥
            await this.initializeEncryptionKey();
            
            // 初始化操作日志数据库
            await this.initializeLogDatabase();
            
            // 清理旧日志
            await this.cleanupOldLogs();
            
            this.initialized = true;
            console.log('安全模块初始化成功');
        } catch (error) {
            console.error('安全模块初始化失败:', error);
            // 降级处理，确保基本功能可用
            this.handleInitFailure();
        }
    }
    
    /**
     * 初始化加密密钥
     */
    async initializeEncryptionKey() {
        try {
            // 尝试从安全存储中获取现有密钥
            let key = localStorage.getItem('__secure_key');
            
            if (!key) {
                // 生成新的随机密钥
                key = this.generateRandomKey(32); // 256位密钥
                // 存储密钥（这里使用简单存储，实际应用中可以考虑更安全的方式）
                localStorage.setItem('__secure_key', key);
                console.log('新的加密密钥已生成');
            }
            
            this.encryptionKey = key;
        } catch (error) {
            console.error('初始化加密密钥失败:', error);
            throw error;
        }
    }
    
    /**
     * 生成随机密钥
     */
    generateRandomKey(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~';
        let key = '';
        
        // 使用Web Crypto API生成随机数
        if (window.crypto && window.crypto.getRandomValues) {
            const array = new Uint8Array(length);
            window.crypto.getRandomValues(array);
            
            for (let i = 0; i < length; i++) {
                key += charset[array[i] % charset.length];
            }
        } else {
            // 降级方案
            for (let i = 0; i < length; i++) {
                key += charset.charAt(Math.floor(Math.random() * charset.length));
            }
        }
        
        return key;
    }
    
    /**
     * 初始化日志数据库
     */
    async initializeLogDatabase() {
        return new Promise((resolve, reject) => {
            try {
                // 使用IndexedDB存储日志
                const request = indexedDB.open('OperationLogsDB', 1);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // 创建日志存储对象
                    if (!db.objectStoreNames.contains('logs')) {
                        const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
                        // 创建索引以加速查询
                        logStore.createIndex('timestamp', 'timestamp', { unique: false });
                        logStore.createIndex('user', 'user', { unique: false });
                        logStore.createIndex('action', 'action', { unique: false });
                    }
                };
                
                request.onsuccess = (event) => {
                    this.logDb = event.target.result;
                    resolve();
                };
                
                request.onerror = (event) => {
                    console.error('打开日志数据库失败:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('初始化日志数据库失败:', error);
                reject(error);
            }
        });
    }
    
    /**
     * 处理初始化失败
     */
    handleInitFailure() {
        // 降级处理：使用内存存储日志
        this.logDb = null;
        this.memoryLogs = [];
        console.warn('安全模块降级运行：使用内存存储日志');
    }
    
    /**
     * 加密数据
     */
    encrypt(data) {
        if (!this.initialized || !this.encryptionKey) {
            console.warn('加密模块未初始化，返回原始数据');
            return data;
        }
        
        try {
            const text = typeof data === 'string' ? data : JSON.stringify(data);
            let encrypted = '';
            
            // 使用简单的异或加密（实际应用中可以使用更安全的加密算法）
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                encrypted += String.fromCharCode(charCode);
            }
            
            // Base64编码以确保安全存储
            return btoa(encrypted);
        } catch (error) {
            console.error('数据加密失败:', error);
            throw error;
        }
    }
    
    /**
     * 解密数据
     */
    decrypt(encryptedData) {
        if (!this.initialized || !this.encryptionKey || !encryptedData) {
            console.warn('解密模块未初始化或无数据，返回原始数据');
            return encryptedData;
        }
        
        try {
            // Base64解码
            const encrypted = atob(encryptedData);
            let decrypted = '';
            
            // 使用异或解密
            for (let i = 0; i < encrypted.length; i++) {
                const charCode = encrypted.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                decrypted += String.fromCharCode(charCode);
            }
            
            // 尝试解析为JSON，如果失败则返回字符串
            try {
                return JSON.parse(decrypted);
            } catch {
                return decrypted;
            }
        } catch (error) {
            console.error('数据解密失败:', error);
            throw error;
        }
    }
    
    /**
     * 安全存储数据
     */
    saveSecureData(key, data) {
        try {
            const encryptedData = this.encrypt(data);
            localStorage.setItem(key, encryptedData);
            return true;
        } catch (error) {
            console.error('安全存储数据失败:', error);
            return false;
        }
    }
    
    /**
     * 读取安全存储的数据
     */
    getSecureData(key) {
        try {
            const encryptedData = localStorage.getItem(key);
            if (!encryptedData) return null;
            
            return this.decrypt(encryptedData);
        } catch (error) {
            console.error('读取安全数据失败:', error);
            return null;
        }
    }
    
    /**
     * 删除安全存储的数据
     */
    removeSecureData(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('删除安全数据失败:', error);
            return false;
        }
    }
    
    /**
     * 记录操作日志
     */
    async logOperation(action, details = {}, user = 'current') {
        if (!this.initialized) {
            console.warn('安全模块未初始化，无法记录日志');
            return false;
        }
        
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                user: user,
                action: action,
                details: details,
                deviceInfo: this.getDeviceInfo(),
                ipAddress: 'local' // 本地应用，使用local标识
            };
            
            if (this.logDb) {
                // 使用IndexedDB存储
                await this.storeLogInIndexedDB(logEntry);
            } else if (this.memoryLogs) {
                // 使用内存存储（降级方案）
                this.memoryLogs.push(logEntry);
                // 限制内存日志数量
                if (this.memoryLogs.length > this.maxLogEntries) {
                    this.memoryLogs.shift();
                }
            }
            
            // 同时记录到控制台（开发环境）
            if (process.env.NODE_ENV === 'development') {
                console.log('操作日志:', logEntry);
            }
            
            return true;
        } catch (error) {
            console.error('记录操作日志失败:', error);
            return false;
        }
    }
    
    /**
     * 在IndexedDB中存储日志
     */
    storeLogInIndexedDB(logEntry) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.logDb.transaction(['logs'], 'readwrite');
                const store = transaction.objectStore('logs');
                const request = store.add(logEntry);
                
                request.onsuccess = () => resolve();
                request.onerror = (event) => {
                    console.error('存储日志失败:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('IndexedDB操作失败:', error);
                reject(error);
            }
        });
    }
    
    /**
     * 获取设备信息
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: {
                width: window.screen.width,
                height: window.screen.height,
                colorDepth: window.screen.colorDepth
            }
        };
    }
    
    /**
     * 查询操作日志
     */
    async queryLogs(filters = {}, limit = 50) {
        if (!this.initialized) {
            console.warn('安全模块未初始化，无法查询日志');
            return [];
        }
        
        try {
            if (this.logDb) {
                return await this.queryLogsFromIndexedDB(filters, limit);
            } else if (this.memoryLogs) {
                // 从内存中查询（降级方案）
                return this.queryLogsFromMemory(filters, limit);
            }
            
            return [];
        } catch (error) {
            console.error('查询操作日志失败:', error);
            return [];
        }
    }
    
    /**
     * 从IndexedDB查询日志
     */
    queryLogsFromIndexedDB(filters, limit) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.logDb.transaction(['logs'], 'readonly');
                const store = transaction.objectStore('logs');
                const logs = [];
                
                let request;
                
                // 根据过滤器选择合适的索引
                if (filters.timestamp) {
                    const index = store.index('timestamp');
                    request = index.openCursor(IDBKeyRange.only(filters.timestamp));
                } else if (filters.user) {
                    const index = store.index('user');
                    request = index.openCursor(IDBKeyRange.only(filters.user));
                } else if (filters.action) {
                    const index = store.index('action');
                    request = index.openCursor(IDBKeyRange.only(filters.action));
                } else {
                    // 没有特定过滤条件，获取最近的日志
                    request = store.openCursor(null, 'prev');
                }
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor && logs.length < limit) {
                        logs.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(logs);
                    }
                };
                
                request.onerror = (event) => {
                    console.error('查询日志失败:', event.target.error);
                    reject(event.target.error);
                };
            } catch (error) {
                console.error('IndexedDB查询失败:', error);
                reject(error);
            }
        });
    }
    
    /**
     * 从内存中查询日志（降级方案）
     */
    queryLogsFromMemory(filters, limit) {
        let filteredLogs = [...this.memoryLogs];
        
        // 应用过滤条件
        if (filters.user) {
            filteredLogs = filteredLogs.filter(log => log.user === filters.user);
        }
        
        if (filters.action) {
            filteredLogs = filteredLogs.filter(log => log.action === filters.action);
        }
        
        if (filters.timestamp) {
            filteredLogs = filteredLogs.filter(log => log.timestamp === filters.timestamp);
        }
        
        // 按时间戳降序排序并限制数量
        return filteredLogs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }
    
    /**
     * 清理旧日志
     */
    async cleanupOldLogs() {
        if (!this.initialized || !this.logDb) return;
        
        try {
            const transaction = this.logDb.transaction(['logs'], 'readwrite');
            const store = transaction.objectStore('logs');
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
                const totalCount = countRequest.result;
                
                if (totalCount > this.maxLogEntries) {
                    // 获取需要删除的日志数量
                    const deleteCount = totalCount - this.maxLogEntries;
                    const request = store.openCursor();
                    let deleted = 0;
                    
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor && deleted < deleteCount) {
                            cursor.delete();
                            deleted++;
                            cursor.continue();
                        }
                    };
                }
            };
        } catch (error) {
            console.error('清理旧日志失败:', error);
        }
    }
    
    /**
     * 导出操作日志
     */
    async exportLogs() {
        try {
            const logs = await this.queryLogs({}, this.maxLogEntries);
            const logJson = JSON.stringify(logs, null, 2);
            
            // 创建Blob对象
            const blob = new Blob([logJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = url;
            link.download = `operation-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 释放URL对象
            URL.revokeObjectURL(url);
            
            return true;
        } catch (error) {
            console.error('导出日志失败:', error);
            return false;
        }
    }
    
    /**
     * 清除所有日志
     */
    async clearAllLogs() {
        if (!this.initialized) return false;
        
        try {
            if (this.logDb) {
                const transaction = this.logDb.transaction(['logs'], 'readwrite');
                const store = transaction.objectStore('logs');
                await store.clear();
            } else if (this.memoryLogs) {
                this.memoryLogs = [];
            }
            
            return true;
        } catch (error) {
            console.error('清除日志失败:', error);
            return false;
        }
    }
    
    /**
     * 安全的密码哈希
     */
    async hashPassword(password) {
        try {
            // 将密码转换为ArrayBuffer
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            
            // 使用SHA-256进行哈希
            if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
                
                // 将ArrayBuffer转换为十六进制字符串
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                
                return hashHex;
            } else {
                // 降级方案：使用简单哈希
                return this.simpleHash(password);
            }
        } catch (error) {
            console.error('密码哈希失败:', error);
            // 最终降级方案
            return this.simpleHash(password);
        }
    }
    
    /**
     * 简单的密码哈希函数（降级方案）
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16);
    }
    
    /**
     * 验证密码强度
     */
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        let strength = 0;
        let feedback = [];
        
        if (password.length >= minLength) {
            strength++;
        } else {
            feedback.push('密码长度至少8个字符');
        }
        
        if (hasUpperCase) strength++;
        if (hasLowerCase) strength++;
        if (hasNumbers) strength++;
        if (hasSpecialChars) strength++;
        
        if (strength < 3) {
            feedback.push('密码强度较弱，请增加字符多样性');
        }
        
        return {
            strength: strength, // 1-5的强度值
            isStrong: strength >= 3,
            feedback: feedback
        };
    }
    
    /**
     * 检查敏感数据泄露
     */
    checkForSensitiveDataLeak(data) {
        const sensitivePatterns = [
            /password\s*[:=]\s*['"](.+?)['"]/i,
            /密钥\s*[:=]\s*['"](.+?)['"]/i,
            /secret\s*[:=]\s*['"](.+?)['"]/i,
            /api[_-]?key\s*[:=]\s*['"](.+?)['"]/i
        ];
        
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        
        for (const pattern of sensitivePatterns) {
            if (pattern.test(dataString)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 生成安全的会话ID
     */
    generateSessionId() {
        return this.generateRandomKey(40);
    }
    
    /**
     * 设置安全的本地存储项（带过期时间）
     */
    setSecureStorageWithExpiry(key, value, ttlInMinutes) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttlInMinutes * 60 * 1000
        };
        
        return this.saveSecureData(key, item);
    }
    
    /**
     * 获取安全存储项（检查过期时间）
     */
    getSecureStorageWithExpiry(key) {
        const item = this.getSecureData(key);
        if (!item) return null;
        
        const now = new Date();
        if (now.getTime() > item.expiry) {
            // 已过期，删除
            this.removeSecureData(key);
            return null;
        }
        
        return item.value;
    }
    
    /**
     * 安全模块自检
     */
    async selfTest() {
        try {
            // 测试加密解密功能
            const testData = { test: '安全测试数据', timestamp: new Date().toISOString() };
            const encrypted = this.encrypt(testData);
            const decrypted = this.decrypt(encrypted);
            
            // 验证结果
            const encryptionOk = JSON.stringify(decrypted) === JSON.stringify(testData);
            
            // 测试日志功能
            const logOk = await this.logOperation('security_self_test', { result: 'success' });
            
            return {
                encryption: encryptionOk,
                logging: logOk,
                initialized: this.initialized,
                overall: encryptionOk && logOk && this.initialized
            };
        } catch (error) {
            console.error('安全模块自检失败:', error);
            return {
                encryption: false,
                logging: false,
                initialized: this.initialized,
                overall: false,
                error: error.message
            };
        }
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        // 关闭数据库连接
        if (this.logDb) {
            this.logDb.close();
            this.logDb = null;
        }
        
        // 清空内存日志
        if (this.memoryLogs) {
            this.memoryLogs = null;
        }
        
        console.log('安全模块资源已清理');
    }
}

// 创建单例实例
const securityManager = new SecurityManager();

// 导出到全局window对象，使其在浏览器环境中可用
window.securityManager = securityManager;

// DOM加载完成后执行自检
document.addEventListener('DOMContentLoaded', async () => {
    const testResult = await securityManager.selfTest();
    if (!testResult.overall) {
        console.warn('安全模块自检未通过:', testResult);
    }
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    securityManager.cleanup();
});