// 数据库管理模块
class Database {
    constructor() {
        this.dbName = 'StoreManagementSystem';
        this.dbVersion = 2;
        this.db = null;
        this.isConnected = false;
    }
    
    // 连接数据库
    async connect() {
        return new Promise((resolve, reject) => {
            // 如果已经连接，则直接返回
            if (this.isConnected && this.db) {
                resolve(this.db);
                return;
            }
            
            // 打开数据库
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            // 数据库升级或首次创建
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 创建用户表
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                }
                
                // 创建商品表
                if (!db.objectStoreNames.contains('products')) {
                    const productStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
                    productStore.createIndex('barcode', 'barcode', { unique: true });
                    productStore.createIndex('name', 'name', { unique: false });
                }
                
                // 创建出入库记录表
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    transactionStore.createIndex('productId', 'productId', { unique: false });
                    transactionStore.createIndex('type', 'type', { unique: false });
                    transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // 创建分类表
                if (!db.objectStoreNames.contains('categories')) {
                    const categoryStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
                    categoryStore.createIndex('name', 'name', { unique: true });
                }
                
                // 创建系统设置表
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                // 创建活动日志表
                if (!db.objectStoreNames.contains('activities')) {
                    const activityStore = db.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
                    activityStore.createIndex('userId', 'userId', { unique: false });
                    activityStore.createIndex('action', 'action', { unique: false });
                    activityStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            // 成功打开数据库
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isConnected = true;
                
                // 检查是否有管理员用户，如果没有则创建
                this._checkAndCreateAdmin().then(() => {
                    resolve(this.db);
                }).catch(reject);
            };
            
            // 打开数据库失败
            request.onerror = (event) => {
                console.error('数据库连接失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 检查并创建管理员用户
    async _checkAndCreateAdmin() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('users', 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('username');
            const request = index.get('admin');
            
            request.onsuccess = (event) => {
                // 如果没有管理员用户，则创建一个
                if (!event.target.result) {
                    this._createAdminUser().then(resolve).catch(reject);
                } else {
                    resolve();
                }
            };
            
            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }
    
    // 创建管理员用户
    async _createAdminUser() {
        // 简单的密码哈希，实际应用中应使用更安全的加密方式
        const passwordHash = this._hashPassword('admin123');
        
        return this.add('users', {
            username: 'admin',
            password: passwordHash,
            role: 'admin',
            mustChangePassword: true,
            createdAt: new Date().toISOString()
        });
    }
    
    // 简单的密码哈希函数
    _hashPassword(password) {
        // 这里只是一个简单示例，实际应用应该使用专业的密码加密库
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString(36);
    }
    
    // 添加数据
    async add(storeName, data) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('添加数据失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 更新数据
    async update(storeName, data) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('更新数据失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 删除数据
    async delete(storeName, id) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('删除数据失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 根据ID获取数据
    async getById(storeName, id) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('获取数据失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 根据索引获取数据
    async getByIndex(storeName, indexName, value) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.get(value);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('根据索引获取数据失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 获取所有数据
    async getAll(storeName) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('获取所有数据失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 根据索引获取多个数据
    async getAllByIndex(storeName, indexName, value) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = (event) => {
                resolve(event.target.result);
            };
            
            request.onerror = (event) => {
                console.error('根据索引获取多个数据失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 执行自定义查询
    async query(storeName, queryFunction) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.openCursor();
            
            const results = [];
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    // 应用查询函数判断是否包含此记录
                    if (queryFunction(cursor.value)) {
                        results.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = (event) => {
                console.error('执行查询失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 清空表
    async clear(storeName) {
        await this.connect();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('清空表失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 关闭数据库连接
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isConnected = false;
        }
    }
}

// 创建全局数据库实例
const db = new Database();
window.db = db; // 将数据库实例添加到window对象，以便其他模块访问

// 初始化数据库
window.addEventListener('DOMContentLoaded', () => {
    db.connect().then(() => {
        console.log('数据库连接成功');
    }).catch(error => {
        console.error('数据库初始化失败:', error);
        showToast('数据库初始化失败，请刷新页面重试', 'error');
    });
});