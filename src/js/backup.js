/**
 * 数据备份与恢复模块
 * 提供数据库备份、恢复和管理功能
 */
class BackupManager {
    constructor() {
        this.backupFolder = 'backup';
        this.maxBackups = 10; // 最大备份文件数量
        this.autoBackupInterval = 24 * 60 * 60 * 1000; // 默认24小时自动备份
        this.lastBackupTime = null;
        this.backupTimer = null;
        this.backupHistory = [];
    }

    /**
     * 初始化备份管理器
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // 确保备份文件夹存在
            await this._ensureBackupFolder();
            
            // 加载备份历史
            await this.loadBackupHistory();
            
            // 恢复上次备份时间
            this._loadLastBackupTime();
            
            // 启动自动备份
            this.startAutoBackup();
            
            console.log('备份管理器初始化完成');
        } catch (error) {
            console.error('备份管理器初始化失败:', error);
            throw new Error('备份管理器初始化失败');
        }
    }

    /**
     * 确保备份文件夹存在
     * @private
     * @returns {Promise<void>}
     */
    async _ensureBackupFolder() {
        try {
            // 在浏览器环境中，我们使用IndexedDB存储备份信息
            // 检查是否支持IndexedDB
            if (!('indexedDB' in window)) {
                throw new Error('浏览器不支持IndexedDB');
            }
            
            // 创建或打开备份数据库
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('BackupStorage', 1);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // 创建备份对象存储
                    if (!db.objectStoreNames.contains('backups')) {
                        const backupStore = db.createObjectStore('backups', { keyPath: 'id' });
                        backupStore.createIndex('timestamp', 'timestamp', { unique: false });
                        backupStore.createIndex('name', 'name', { unique: false });
                    }
                    
                    // 创建备份历史对象存储
                    if (!db.objectStoreNames.contains('backupHistory')) {
                        const historyStore = db.createObjectStore('backupHistory', { keyPath: 'id', autoIncrement: true });
                        historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                };
                
                request.onsuccess = () => {
                    resolve(request.result);
                };
                
                request.onerror = () => {
                    reject(new Error('创建备份数据库失败'));
                };
            });
        } catch (error) {
            console.error('确保备份文件夹存在失败:', error);
            throw error;
        }
    }

    /**
     * 创建数据库备份
     * @param {string} backupName - 备份名称
     * @returns {Promise<Object>} - 备份信息对象
     */
    async createBackup(backupName = '') {
        try {
            showLoading('正在创建备份...');
            
            const timestamp = new Date();
            const name = backupName || `备份_${this._formatDate(timestamp)}`;
            
            // 收集所有数据库数据
            const allData = await this._collectAllData();
            
            // 创建备份对象
            const backup = {
                id: this._generateBackupId(),
                name,
                timestamp: timestamp.toISOString(),
                size: this._calculateDataSize(allData),
                data: allData
            };
            
            // 保存备份
            await this._saveBackup(backup);
            
            // 更新备份历史
            await this._addToBackupHistory(backup);
            
            // 更新最后备份时间
            this.lastBackupTime = timestamp;
            this._saveLastBackupTime();
            
            // 清理旧备份
            await this._cleanupOldBackups();
            
            // 重新加载备份历史
            await this.loadBackupHistory();
            
            hideLoading();
            showToast(`备份 "${name}" 创建成功`, 'success');
            
            return backup;
        } catch (error) {
            console.error('创建备份失败:', error);
            hideLoading();
            showToast('创建备份失败', 'error');
            throw error;
        }
    }

    /**
     * 从备份恢复数据
     * @param {string} backupId - 备份ID
     * @returns {Promise<boolean>} - 是否恢复成功
     */
    async restoreFromBackup(backupId) {
        try {
            if (!backupId) {
                throw new Error('备份ID不能为空');
            }
            
            // 确认恢复操作
            if (!confirm('确定要从备份恢复数据吗？这将覆盖当前所有数据！')) {
                return false;
            }
            
            showLoading('正在恢复备份...');
            
            // 获取备份数据
            const backup = await this._getBackupById(backupId);
            
            if (!backup) {
                throw new Error('找不到指定的备份');
            }
            
            // 清空当前数据
            await this._clearCurrentData();
            
            // 恢复数据到各个表
            await this._restoreDataToTables(backup.data);
            
            // 记录恢复操作
            await this._logRestoreOperation(backup);
            
            hideLoading();
            showToast(`从备份 "${backup.name}" 恢复成功`, 'success');
            
            // 提示刷新页面
            setTimeout(() => {
                if (confirm('数据已成功恢复，请刷新页面以应用更改。')) {
                    window.location.reload();
                }
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('恢复备份失败:', error);
            hideLoading();
            showToast(`恢复备份失败: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 删除备份
     * @param {string} backupId - 备份ID
     * @returns {Promise<boolean>} - 是否删除成功
     */
    async deleteBackup(backupId) {
        try {
            if (!confirm('确定要删除这个备份吗？删除后无法恢复。')) {
                return false;
            }
            
            // 从存储中删除备份
            await this._deleteBackupFromStorage(backupId);
            
            // 从备份历史中移除
            this.backupHistory = this.backupHistory.filter(item => item.id !== backupId);
            
            showToast('备份已成功删除', 'success');
            return true;
        } catch (error) {
            console.error('删除备份失败:', error);
            showToast('删除备份失败', 'error');
            return false;
        }
    }

    /**
     * 导出备份文件
     * @param {string} backupId - 备份ID
     * @returns {Promise<boolean>} - 是否导出成功
     */
    async exportBackup(backupId) {
        try {
            // 获取备份数据
            const backup = await this._getBackupById(backupId);
            
            if (!backup) {
                throw new Error('找不到指定的备份');
            }
            
            // 转换为JSON字符串
            const backupData = JSON.stringify(backup, null, 2);
            
            // 创建Blob对象
            const blob = new Blob([backupData], { type: 'application/json' });
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shop_backup_${backup.timestamp.replace(/[:.]/g, '-')}.json`;
            
            // 触发下载
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 释放URL对象
            URL.revokeObjectURL(url);
            
            showToast('备份导出成功', 'success');
            return true;
        } catch (error) {
            console.error('导出备份失败:', error);
            showToast('导出备份失败', 'error');
            return false;
        }
    }

    /**
     * 从文件导入备份
     * @param {File} file - 备份文件
     * @returns {Promise<boolean>} - 是否导入成功
     */
    async importBackup(file) {
        try {
            showLoading('正在导入备份...');
            
            // 验证文件类型
            if (!file.name.endsWith('.json')) {
                throw new Error('请选择正确的备份文件(.json)');
            }
            
            // 读取文件内容
            const fileContent = await this._readFile(file);
            
            // 解析备份数据
            const backupData = JSON.parse(fileContent);
            
            // 验证备份数据格式
            if (!backupData.id || !backupData.timestamp || !backupData.data) {
                throw new Error('无效的备份文件格式');
            }
            
            // 生成新的备份ID
            backupData.id = this._generateBackupId();
            backupData.name = `${backupData.name}_导入_${this._formatDate(new Date())}`;
            
            // 保存备份
            await this._saveBackup(backupData);
            
            // 更新备份历史
            await this._addToBackupHistory(backupData);
            
            // 重新加载备份历史
            await this.loadBackupHistory();
            
            hideLoading();
            showToast('备份导入成功', 'success');
            return true;
        } catch (error) {
            console.error('导入备份失败:', error);
            hideLoading();
            showToast(`导入备份失败: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 加载备份历史
     * @returns {Promise<Array>} - 备份历史列表
     */
    async loadBackupHistory() {
        try {
            this.backupHistory = await this._getAllBackups();
            
            // 按时间戳降序排序
            this.backupHistory.sort((a, b) => {
                return new Date(b.timestamp) - new Date(a.timestamp);
            });
            
            return this.backupHistory;
        } catch (error) {
            console.error('加载备份历史失败:', error);
            this.backupHistory = [];
            return [];
        }
    }

    /**
     * 获取备份历史列表
     * @returns {Array} - 备份历史列表
     */
    getBackupHistory() {
        return this.backupHistory;
    }

    /**
     * 开始自动备份
     * @param {number} interval - 备份间隔(毫秒)
     */
    startAutoBackup(interval = null) {
        // 停止之前的定时器
        this.stopAutoBackup();
        
        // 设置新的间隔
        const backupInterval = interval || this.autoBackupInterval;
        
        // 启动定时器
        this.backupTimer = setInterval(() => {
            this._performAutoBackup();
        }, backupInterval);
        
        console.log('自动备份已启动，间隔:', backupInterval);
    }

    /**
     * 停止自动备份
     */
    stopAutoBackup() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
            console.log('自动备份已停止');
        }
    }

    /**
     * 设置自动备份间隔
     * @param {number} hours - 间隔小时数
     */
    setAutoBackupInterval(hours) {
        if (hours > 0) {
            this.autoBackupInterval = hours * 60 * 60 * 1000;
            this.startAutoBackup();
            this._saveBackupSettings();
            showToast(`自动备份间隔已设置为 ${hours} 小时`, 'success');
        }
    }

    /**
     * 检查是否需要提醒备份
     * @returns {boolean} - 是否需要提醒
     */
    shouldRemindBackup() {
        if (!this.lastBackupTime) {
            return true; // 从未备份过
        }
        
        const now = new Date();
        const lastBackup = new Date(this.lastBackupTime);
        const daysSinceLastBackup = (now - lastBackup) / (1000 * 60 * 60 * 24);
        
        // 超过3天未备份则提醒
        return daysSinceLastBackup >= 3;
    }

    /**
     * 显示备份提醒
     */
    showBackupReminder() {
        if (this.shouldRemindBackup()) {
            const reminder = document.createElement('div');
            reminder.className = 'backup-reminder';
            reminder.innerHTML = `
                <div class="reminder-content">
                    <h4>数据备份提醒</h4>
                    <p>您已经很久没有备份数据了，建议立即进行备份以防止数据丢失。</p>
                    <div class="reminder-actions">
                        <button id="backup-now-btn">立即备份</button>
                        <button id="remind-later-btn">稍后提醒</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(reminder);
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = `
                .backup-reminder {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                    padding: 0;
                    width: 320px;
                    z-index: 1000;
                    animation: slideIn 0.3s ease;
                }
                .reminder-content {
                    padding: 16px;
                }
                .backup-reminder h4 {
                    margin: 0 0 8px 0;
                    color: #333;
                    font-size: 16px;
                }
                .backup-reminder p {
                    margin: 0 0 16px 0;
                    color: #666;
                    font-size: 14px;
                    line-height: 1.5;
                }
                .reminder-actions {
                    display: flex;
                    gap: 8px;
                }
                .reminder-actions button {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }
                #backup-now-btn {
                    background: #4CAF50;
                    color: white;
                }
                #backup-now-btn:hover {
                    background: #45a049;
                }
                #remind-later-btn {
                    background: #f1f1f1;
                    color: #333;
                }
                #remind-later-btn:hover {
                    background: #e1e1e1;
                }
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
            
            // 添加事件监听
            document.getElementById('backup-now-btn').addEventListener('click', async () => {
                await this.createBackup('定时提醒备份');
                document.body.removeChild(reminder);
                document.head.removeChild(style);
            });
            
            document.getElementById('remind-later-btn').addEventListener('click', () => {
                document.body.removeChild(reminder);
                document.head.removeChild(style);
                // 记录稍后提醒时间
                localStorage.setItem('backup_reminder_dismissed', new Date().toISOString());
            });
        }
    }

    /**
     * 收集所有数据库数据
     * @private
     * @returns {Promise<Object>} - 所有数据对象
     */
    async _collectAllData() {
        try {
            const allData = {};
            
            // 收集用户数据
            const users = await dbManager.getAllUsers();
            allData.users = users;
            
            // 收集商品数据
            const products = await dbManager.getAllProducts();
            allData.products = products;
            
            // 收集商品分类
            const categories = await dbManager.getAllCategories();
            allData.categories = categories;
            
            // 收集入库记录
            const stockIns = await dbManager.getAllStockInRecords();
            allData.stockIns = stockIns;
            
            // 收集出库记录
            const stockOuts = await dbManager.getAllStockOutRecords();
            allData.stockOuts = stockOuts;
            
            // 收集供应商数据
            const suppliers = await dbManager.getAllSuppliers();
            allData.suppliers = suppliers;
            
            // 添加备份元数据
            allData.meta = {
                appVersion: '1.0.0',
                backupTime: new Date().toISOString(),
                recordCounts: {
                    users: users.length,
                    products: products.length,
                    categories: categories.length,
                    stockIns: stockIns.length,
                    stockOuts: stockOuts.length,
                    suppliers: suppliers.length
                }
            };
            
            return allData;
        } catch (error) {
            console.error('收集数据失败:', error);
            throw new Error('收集数据失败');
        }
    }

    /**
     * 清空当前数据
     * @private
     * @returns {Promise<void>}
     */
    async _clearCurrentData() {
        try {
            // 清空各类数据
            await dbManager.clearStockOutRecords();
            await dbManager.clearStockInRecords();
            await dbManager.clearProducts();
            await dbManager.clearCategories();
            await dbManager.clearSuppliers();
            
            // 保留用户数据，但重置密码（除了当前用户）
            const currentUser = await authManager.getCurrentUser();
            const users = await dbManager.getAllUsers();
            
            for (const user of users) {
                if (user.id !== currentUser.id) {
                    user.password = authManager.hashPassword('admin123'); // 重置为默认密码
                    await dbManager.updateUser(user);
                }
            }
        } catch (error) {
            console.error('清空当前数据失败:', error);
            throw new Error('清空当前数据失败');
        }
    }

    /**
     * 恢复数据到各个表
     * @private
     * @param {Object} data - 备份数据
     * @returns {Promise<void>}
     */
    async _restoreDataToTables(data) {
        try {
            // 恢复供应商
            if (data.suppliers && Array.isArray(data.suppliers)) {
                for (const supplier of data.suppliers) {
                    await dbManager.addSupplier(supplier);
                }
            }
            
            // 恢复分类
            if (data.categories && Array.isArray(data.categories)) {
                for (const category of data.categories) {
                    await dbManager.addCategory(category);
                }
            }
            
            // 恢复商品
            if (data.products && Array.isArray(data.products)) {
                for (const product of data.products) {
                    await dbManager.addProduct(product);
                }
            }
            
            // 恢复入库记录
            if (data.stockIns && Array.isArray(data.stockIns)) {
                for (const stockIn of data.stockIns) {
                    await dbManager.addStockInRecord(stockIn);
                }
            }
            
            // 恢复出库记录
            if (data.stockOuts && Array.isArray(data.stockOuts)) {
                for (const stockOut of data.stockOuts) {
                    await dbManager.addStockOutRecord(stockOut);
                }
            }
            
            console.log('数据恢复完成');
        } catch (error) {
            console.error('恢复数据到表失败:', error);
            throw new Error('恢复数据失败');
        }
    }

    /**
     * 保存备份
     * @private
     * @param {Object} backup - 备份对象
     * @returns {Promise<void>}
     */
    async _saveBackup(backup) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BackupStorage', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('backups', 'readwrite');
                const store = transaction.objectStore('backups');
                const addRequest = store.add(backup);
                
                addRequest.onsuccess = () => {
                    resolve();
                };
                
                addRequest.onerror = () => {
                    reject(new Error('保存备份失败'));
                };
            };
            
            request.onerror = () => {
                reject(new Error('打开备份数据库失败'));
            };
        });
    }

    /**
     * 获取所有备份
     * @private
     * @returns {Promise<Array>} - 备份列表
     */
    async _getAllBackups() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BackupStorage', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('backups', 'readonly');
                const store = transaction.objectStore('backups');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                    resolve(getAllRequest.result || []);
                };
                
                getAllRequest.onerror = () => {
                    reject(new Error('获取备份列表失败'));
                };
            };
            
            request.onerror = () => {
                reject(new Error('打开备份数据库失败'));
            };
        });
    }

    /**
     * 根据ID获取备份
     * @private
     * @param {string} backupId - 备份ID
     * @returns {Promise<Object|null>} - 备份对象
     */
    async _getBackupById(backupId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BackupStorage', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('backups', 'readonly');
                const store = transaction.objectStore('backups');
                const getRequest = store.get(backupId);
                
                getRequest.onsuccess = () => {
                    resolve(getRequest.result);
                };
                
                getRequest.onerror = () => {
                    reject(new Error('获取备份失败'));
                };
            };
            
            request.onerror = () => {
                reject(new Error('打开备份数据库失败'));
            };
        });
    }

    /**
     * 从存储中删除备份
     * @private
     * @param {string} backupId - 备份ID
     * @returns {Promise<void>}
     */
    async _deleteBackupFromStorage(backupId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BackupStorage', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('backups', 'readwrite');
                const store = transaction.objectStore('backups');
                const deleteRequest = store.delete(backupId);
                
                deleteRequest.onsuccess = () => {
                    resolve();
                };
                
                deleteRequest.onerror = () => {
                    reject(new Error('删除备份失败'));
                };
            };
            
            request.onerror = () => {
                reject(new Error('打开备份数据库失败'));
            };
        });
    }

    /**
     * 添加到备份历史
     * @private
     * @param {Object} backup - 备份对象
     * @returns {Promise<void>}
     */
    async _addToBackupHistory(backup) {
        const historyItem = {
            id: backup.id,
            name: backup.name,
            timestamp: backup.timestamp,
            size: backup.size,
            type: 'manual', // 手动备份
            success: true
        };
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BackupStorage', 1);
            
            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction('backupHistory', 'readwrite');
                const store = transaction.objectStore('backupHistory');
                const addRequest = store.add(historyItem);
                
                addRequest.onsuccess = () => {
                    resolve();
                };
                
                addRequest.onerror = () => {
                    reject(new Error('添加备份历史失败'));
                };
            };
        });
    }

    /**
     * 清理旧备份
     * @private
     * @returns {Promise<void>}
     */
    async _cleanupOldBackups() {
        if (this.backupHistory.length <= this.maxBackups) {
            return;
        }
        
        // 获取需要删除的备份（按时间排序后的最旧的备份）
        const backupsToDelete = this.backupHistory.slice(this.maxBackups);
        
        for (const backup of backupsToDelete) {
            await this._deleteBackupFromStorage(backup.id);
        }
    }

    /**
     * 执行自动备份
     * @private
     */
    async _performAutoBackup() {
        try {
            await this.createBackup(`自动备份_${this._formatDate(new Date())}`);
        } catch (error) {
            console.error('自动备份失败:', error);
        }
    }

    /**
     * 记录恢复操作
     * @private
     * @param {Object} backup - 备份对象
     */
    async _logRestoreOperation(backup) {
        // 这里可以记录恢复操作到日志中
        console.log(`从备份 ${backup.name} 恢复数据，时间: ${new Date().toISOString()}`);
    }

    /**
     * 保存最后备份时间
     * @private
     */
    _saveLastBackupTime() {
        if (this.lastBackupTime) {
            localStorage.setItem('last_backup_time', this.lastBackupTime.toISOString());
        }
    }

    /**
     * 加载最后备份时间
     * @private
     */
    _loadLastBackupTime() {
        const lastBackupStr = localStorage.getItem('last_backup_time');
        if (lastBackupStr) {
            this.lastBackupTime = new Date(lastBackupStr);
        }
    }

    /**
     * 保存备份设置
     * @private
     */
    _saveBackupSettings() {
        const settings = {
            autoBackupInterval: this.autoBackupInterval,
            maxBackups: this.maxBackups
        };
        localStorage.setItem('backup_settings', JSON.stringify(settings));
    }

    /**
     * 读取文件
     * @private
     * @param {File} file - 文件对象
     * @returns {Promise<string>} - 文件内容
     */
    _readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                resolve(event.target.result);
            };
            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };
            reader.readAsText(file);
        });
    }

    /**
     * 生成备份ID
     * @private
     * @returns {string} - 备份ID
     */
    _generateBackupId() {
        return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 格式化日期
     * @private
     * @param {Date} date - 日期对象
     * @returns {string} - 格式化后的日期字符串
     */
    _formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}${month}${day}_${hours}${minutes}`;
    }

    /**
     * 计算数据大小
     * @private
     * @param {Object} data - 数据对象
     * @returns {number} - 数据大小（字节）
     */
    _calculateDataSize(data) {
        const jsonStr = JSON.stringify(data);
        // 估算字符串的字节大小
        return new Blob([jsonStr]).size;
    }

    /**
     * 获取存储空间使用情况
     * @returns {Promise<Object>} - 存储使用情况
     */
    async getStorageUsage() {
        try {
            const backups = await this._getAllBackups();
            
            let totalSize = 0;
            backups.forEach(backup => {
                if (backup.size) {
                    totalSize += backup.size;
                }
            });
            
            return {
                backupCount: backups.length,
                totalSize: totalSize,
                totalSizeFormatted: this._formatFileSize(totalSize)
            };
        } catch (error) {
            console.error('获取存储使用情况失败:', error);
            return {
                backupCount: 0,
                totalSize: 0,
                totalSizeFormatted: '0 B'
            };
        }
    }

    /**
     * 格式化文件大小
     * @private
     * @param {number} bytes - 字节数
     * @returns {string} - 格式化后的大小
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 检查备份健康状态
     * @returns {Object} - 健康状态信息
     */
    checkBackupHealth() {
        const now = new Date();
        const status = {
            isHealthy: true,
            issues: [],
            lastBackupDays: null
        };
        
        // 检查是否有备份
        if (this.backupHistory.length === 0) {
            status.isHealthy = false;
            status.issues.push('从未创建过备份');
        } else {
            // 检查最后备份时间
            const lastBackup = new Date(this.backupHistory[0].timestamp);
            const daysSinceLastBackup = (now - lastBackup) / (1000 * 60 * 60 * 24);
            status.lastBackupDays = daysSinceLastBackup;
            
            if (daysSinceLastBackup > 7) {
                status.isHealthy = false;
                status.issues.push(`最后一次备份已超过${Math.floor(daysSinceLastBackup)}天`);
            }
        }
        
        return status;
    }
}

// 全局BackupManager实例
let backupManager;

/**
 * 初始化备份管理器
 * @returns {Promise<BackupManager>} - 备份管理器实例
 */
async function initBackupManager() {
    if (!backupManager) {
        backupManager = new BackupManager();
        await backupManager.init();
    }
    return backupManager;
}

/**
 * 获取备份管理器实例
 * @returns {BackupManager} - 备份管理器实例
 */
function getBackupManager() {
    if (!backupManager) {
        throw new Error('备份管理器尚未初始化');
    }
    return backupManager;
}

// 导出函数
window.initBackupManager = initBackupManager;
window.getBackupManager = getBackupManager;