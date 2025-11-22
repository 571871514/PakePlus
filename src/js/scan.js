/**
 * 扫码功能模块
 * 处理扫码入库和扫码出库相关功能
 */
class ScanManager {
    constructor(database) {
        this.db = database;
        this.scanMode = 'in'; // 默认入库模式，'in' 或 'out'
        this.scanResultCallback = null;
        this.stream = null;
        this.scannerActive = false;
        this.inventoryBatch = []; // 批量入库/出库的商品
        this.lastScanTime = 0;
        this.scanInterval = 2000; // 两次扫码间隔时间（毫秒）
    }
    
    /**
     * 初始化扫码功能
     * @param {HTMLElement} videoElement - 视频元素
     * @param {HTMLElement} canvasElement - 画布元素
     */
    async initScanner(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.canvasContext = canvasElement.getContext('2d');
    }
    
    /**
     * 启动扫码器
     * @param {Function} callback - 扫码结果回调函数
     * @param {string} mode - 扫码模式，'in' 或 'out'
     * @returns {Promise<boolean>} - 是否成功启动
     */
    async startScanner(callback, mode = 'in') {
        try {
            // 设置扫码模式和回调
            this.scanMode = mode;
            this.scanResultCallback = callback;
            
            // 请求摄像头权限
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // 优先使用后置摄像头
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            // 将摄像头流设置到视频元素
            this.video.srcObject = this.stream;
            
            // 等待视频就绪
            await new Promise(resolve => {
                this.video.onloadedmetadata = resolve;
            });
            
            // 开始扫码循环
            this.scannerActive = true;
            this.scanLoop();
            
            return true;
        } catch (error) {
            console.error('启动扫码器失败:', error);
            alert('无法访问摄像头，请确保已授予权限');
            return false;
        }
    }
    
    /**
     * 停止扫码器
     */
    stopScanner() {
        this.scannerActive = false;
        
        // 停止视频流
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        // 清空视频源
        if (this.video) {
            this.video.srcObject = null;
        }
    }
    
    /**
     * 扫码循环
     */
    scanLoop() {
        if (!this.scannerActive) return;
        
        // 绘制视频帧到画布
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.canvasContext.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // 获取图像数据
        const imageData = this.canvasContext.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // 使用条形码扫描库（这里假设有一个名为JsBarcode的库，如果没有则需要集成）
        this._decodeBarcode(imageData).then(result => {
            if (result) {
                // 检查扫码间隔，避免重复扫码
                const now = Date.now();
                if (now - this.lastScanTime > this.scanInterval) {
                    this.lastScanTime = now;
                    this._handleScanResult(result);
                }
            }
        });
        
        // 继续下一帧扫描
        requestAnimationFrame(() => this.scanLoop());
    }
    
    /**
     * 解码条形码/二维码
     * @param {ImageData} imageData - 图像数据
     * @returns {Promise<string|null>} - 解码结果或null
     * 
     * 注意：这里需要集成条形码扫描库，如QuaggaJS、JsQR等
     * 由于没有实际引用外部库，这里提供一个简单的模拟实现
     */
    async _decodeBarcode(imageData) {
        // 实际项目中，这里应该调用条形码扫描库进行解码
        // 例如使用QuaggaJS: return await Quagga.decodeSingle({ ... });
        // 或使用JsQR: const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        // 模拟实现：随机生成一个条形码（仅用于演示）
        // 实际应用中应该替换为真实的扫码库
        if (Math.random() > 0.8) { // 20%概率模拟成功扫码
            return 'PROD' + Math.floor(Math.random() * 10000).toString().padStart(6, '0');
        }
        return null;
    }
    
    /**
     * 处理扫码结果
     * @param {string} barcode - 扫描到的条形码/二维码
     */
    async _handleScanResult(barcode) {
        try {
            // 连接数据库
            await this.db.connect();
            
            // 查询商品信息
            const product = await this.db.getByIndex('products', 'barcode', barcode);
            
            // 根据扫码模式处理
            if (this.scanMode === 'in') {
                await this._handleInboundScan(product, barcode);
            } else {
                await this._handleOutboundScan(product, barcode);
            }
            
            // 调用回调函数
            if (this.scanResultCallback) {
                this.scanResultCallback(product, barcode);
            }
            
            // 播放扫码成功音效或振动
            this._playScanFeedback();
            
        } catch (error) {
            console.error('处理扫码结果失败:', error);
            alert('处理扫码结果时出错');
        }
    }
    
    /**
     * 处理入库扫码
     * @param {Object} product - 商品信息
     * @param {string} barcode - 条形码
     */
    async _handleInboundScan(product, barcode) {
        if (product) {
            // 商品已存在，增加库存
            product.stock += 1;
            await this.db.update('products', product);
            
            // 添加到批量操作列表
            this.inventoryBatch.push({
                productId: product.id,
                productName: product.name,
                barcode,
                quantity: 1,
                type: 'in',
                timestamp: new Date().toISOString()
            });
            
            // 创建入库记录
            const transaction = {
                productId: product.id,
                productName: product.name,
                barcode,
                quantity: 1,
                type: 'in',
                timestamp: new Date().toISOString(),
                operator: auth.getCurrentUser()?.username || 'system'
            };
            await this.db.add('transactions', transaction);
            
            showToast(`成功入库商品: ${product.name}`, 'success');
        } else {
            // 商品不存在，提示用户添加新商品
            if (confirm(`未找到条形码 ${barcode} 对应的商品，是否添加新商品？`)) {
                // 这里可以跳转到添加商品页面，并预填条形码
                // 由于我们没有实际的页面跳转功能，这里只是提示
                this.stopScanner();
                // 假设有一个全局函数用于导航
                if (window.navigateTo) {
                    window.navigateTo('add-product', { barcode });
                } else {
                    alert(`请在商品管理页面添加新商品，条形码为: ${barcode}`);
                }
            }
        }
    }
    
    /**
 * 处理出库扫码
     * @param {Object} product - 商品信息
     * @param {string} barcode - 条形码
     */
    async _handleOutboundScan(product, barcode) {
        if (product) {
            // 检查库存是否足够
            if (product.stock >= 1) {
                // 显示出库原因选择对话框
                const reason = await this._showReasonDialog(product.name);
                
                // 如果用户取消选择，不进行出库操作
                if (!reason) {
                    return;
                }
                
                // 减少库存
                product.stock -= 1;
                
                // 检查库存预警
                const isLowStock = await this._checkStockAlert(product);
                
                await this.db.update('products', product);
                
                // 添加到批量操作列表
                this.inventoryBatch.push({
                    productId: product.id,
                    productName: product.name,
                    barcode,
                    quantity: 1,
                    type: 'out',
                    timestamp: new Date().toISOString(),
                    reason: reason
                });
                
                // 创建出库记录
                const transaction = {
                    productId: product.id,
                    productName: product.name,
                    barcode,
                    quantity: 1,
                    type: 'out',
                    timestamp: new Date().toISOString(),
                    operator: auth.getCurrentUser()?.username || 'system',
                    reason: reason,
                    notes: isLowStock ? '已触发库存预警' : ''
                };
                await this.db.add('transactions', transaction);
                
                showToast(`成功出库商品: ${product.name}`, 'success');
                
                // 如果触发了库存预警，显示提醒
                if (isLowStock) {
                    setTimeout(() => {
                        showToast(`警告：商品 ${product.name} 库存不足`, 'warning');
                    }, 1000);
                }
            } else {
                // 库存不足
                showToast(`商品 ${product.name} 库存不足`, 'error');
            }
        } else {
            // 商品不存在
            showToast(`未找到条形码 ${barcode} 对应的商品`, 'error');
        }
    }
    
    /**
     * 显示出库原因选择对话框
     * @param {string} productName - 商品名称
     * @returns {Promise<string>} - 选择的出库原因
     */
    async _showReasonDialog(productName) {
        // 预定义的出库原因
        const predefinedReasons = [
            '销售出库',
            '客户退货',
            '内部领用',
            '库存调整',
            '样品出库',
            '其他原因'
        ];
        
        // 使用Promise包装用户交互
        return new Promise((resolve) => {
            // 创建临时对话框HTML
            const dialogHTML = `
                <div id="reason-dialog" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;">
                    <div style="background: white; border-radius: 8px; padding: 20px; width: 90%; max-width: 400px;">
                        <h3 style="margin-top: 0; text-align: center;">选择 ${productName} 的出库原因</h3>
                        <div style="margin: 15px 0;">
                            ${predefinedReasons.map(reason => `
                                <div style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; cursor: pointer; display: flex; align-items: center;">
                                    <input type="radio" name="reason" value="${reason}" style="margin-right: 10px;">
                                    <label>${reason}</label>
                                </div>
                            `).join('')}
                        </div>
                        <div style="display: flex; gap: 10px; justify-content: space-between;">
                            <button id="reason-cancel" style="padding: 8px 16px; background: #eee; border: none; border-radius: 4px; cursor: pointer;">取消</button>
                            <button id="reason-confirm" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">确定</button>
                        </div>
                    </div>
                </div>
            `;
            
            // 创建临时对话框
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = dialogHTML;
            const dialog = tempDiv.firstElementChild;
            document.body.appendChild(dialog);
            
            // 点击原因选项时选中对应单选按钮
            const reasonDivs = dialog.querySelectorAll('div[style*="cursor: pointer"]');
            reasonDivs.forEach(div => {
                div.addEventListener('click', () => {
                    const radio = div.querySelector('input[type="radio"]');
                    radio.checked = true;
                });
            });
            
            // 取消按钮事件
            dialog.querySelector('#reason-cancel').addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(null);
            });
            
            // 确定按钮事件
            dialog.querySelector('#reason-confirm').addEventListener('click', () => {
                const selectedReason = dialog.querySelector('input[name="reason"]:checked');
                const reason = selectedReason ? selectedReason.value : null;
                document.body.removeChild(dialog);
                resolve(reason);
            });
        });
    }
    
    /**
     * 检查库存预警
     * @param {Object} product - 商品信息
     * @returns {Promise<boolean>} - 是否触发库存预警
     */
    async _checkStockAlert(product) {
        try {
            // 获取库存预警阈值（默认值为10）
            const alertThreshold = product.stockAlertThreshold || 10;
            
            // 检查是否低于预警阈值
            return product.stock <= alertThreshold;
        } catch (error) {
            console.error('检查库存预警失败:', error);
            return false;
        }
    }
    
    /**
     * 播放扫码反馈
     */
    _playScanFeedback() {
        // 播放声音（如果浏览器支持）
        try {
            const audio = new Audio();
            audio.src = 'data:audio/wav;base64,UklGRtwAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='; // 空音频，实际应替换为扫码音效
            audio.play();
        } catch (error) {
            console.log('无法播放声音');
        }
        
        // 振动反馈（如果设备支持）
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }
    
    /**
     * 手动添加入库商品
     * @param {Object} productData - 商品数据
     * @returns {Promise<boolean>} - 是否成功
     */
    async addInboundProduct(productData) {
        try {
            await this.db.connect();
            
            // 检查商品是否已存在
            let product = await this.db.getByIndex('products', 'barcode', productData.barcode);
            
            if (product) {
                // 商品已存在，更新库存
                product.stock = (product.stock || 0) + (productData.quantity || 1);
                await this.db.update('products', product);
            } else {
                // 商品不存在，创建新商品
                product = {
                    name: productData.name,
                    barcode: productData.barcode,
                    price: parseFloat(productData.price) || 0,
                    stock: productData.quantity || 1,
                    category: productData.category || '',
                    supplier: productData.supplier || '',
                    description: productData.description || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                product.id = await this.db.add('products', product);
            }
            
            // 创建入库记录
            const transaction = {
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                quantity: productData.quantity || 1,
                type: 'in',
                timestamp: new Date().toISOString(),
                operator: auth.getCurrentUser()?.username || 'system',
                supplier: productData.supplier || '',
                notes: productData.notes || ''
            };
            await this.db.add('transactions', transaction);
            
            showToast(`成功入库商品: ${product.name}`, 'success');
            return true;
        } catch (error) {
            console.error('添加入库商品失败:', error);
            showToast('添加入库商品失败', 'error');
            return false;
        }
    }
    
    /**
     * 手动添加出库商品
     * @param {Object} productData - 商品数据
     * @returns {Promise<boolean>} - 是否成功
     */
    async addOutboundProduct(productData) {
        try {
            await this.db.connect();
            
            // 检查商品是否存在
            let product;
            if (productData.barcode) {
                product = await this.db.getByIndex('products', 'barcode', productData.barcode);
            } else if (productData.id) {
                product = await this.db.getById('products', productData.id);
            }
            
            if (!product) {
                showToast(`未找到指定的商品`, 'error');
                return false;
            }
            
            // 检查库存是否足够
            const quantity = parseInt(productData.quantity) || 1;
            if ((product.stock || 0) < quantity) {
                showToast(`商品 ${product.name} 库存不足，当前库存: ${product.stock}`, 'error');
                return false;
            }
            
            // 减少库存
            product.stock -= quantity;
            
            // 检查库存预警
            const isLowStock = await this._checkStockAlert(product);
            
            await this.db.update('products', product);
            
            // 创建出库记录
            const transaction = {
                productId: product.id,
                productName: product.name,
                barcode: product.barcode,
                quantity: quantity,
                type: 'out',
                timestamp: new Date().toISOString(),
                operator: auth.getCurrentUser()?.username || 'system',
                reason: productData.reason || '',
                notes: productData.notes || (isLowStock ? '已触发库存预警' : ''),
                customerName: productData.customerName || '', // 客户名称
                orderNumber: productData.orderNumber || '' // 订单号
            };
            await this.db.add('transactions', transaction);
            
            showToast(`成功出库商品: ${product.name}`, 'success');
            
            // 如果触发了库存预警，显示提醒
            if (isLowStock) {
                setTimeout(() => {
                    showToast(`警告：商品 ${product.name} 库存不足`, 'warning');
                }, 1000);
            }
            
            return true;
        } catch (error) {
            console.error('添加出库商品失败:', error);
            showToast('添加出库商品失败', 'error');
            return false;
        }
    }
    
    /**
     * 批量出库
     * @param {Array} productsList - 商品列表，每项包含productId/barcode和quantity
     * @returns {Promise<Object>} - 操作结果，包含成功和失败的商品信息
     */
    async batchOutbound(productsList) {
        try {
            await this.db.connect();
            
            const results = {
                success: [],
                failed: []
            };
            
            // 检查所有商品的库存是否足够
            const validationResults = await this._validateBatchOutbound(productsList);
            
            // 如果有验证失败的商品，直接返回
            if (validationResults.failed.length > 0) {
                return {
                    success: false,
                    message: '部分商品验证失败',
                    results: validationResults
                };
            }
            
            // 执行批量出库
            for (const item of productsList) {
                try {
                    let product;
                    if (item.barcode) {
                        product = await this.db.getByIndex('products', 'barcode', item.barcode);
                    } else if (item.productId) {
                        product = await this.db.getById('products', item.productId);
                    }
                    
                    // 减少库存
                    product.stock -= item.quantity;
                    
                    // 检查库存预警
                    await this._checkStockAlert(product);
                    
                    await this.db.update('products', product);
                    
                    // 创建出库记录
                    const transaction = {
                        productId: product.id,
                        productName: product.name,
                        barcode: product.barcode,
                        quantity: item.quantity,
                        type: 'out',
                        timestamp: new Date().toISOString(),
                        operator: auth.getCurrentUser()?.username || 'system',
                        reason: item.reason || '批量出库',
                        notes: item.notes || ''
                    };
                    await this.db.add('transactions', transaction);
                    
                    results.success.push({
                        productName: product.name,
                        quantity: item.quantity
                    });
                    
                } catch (error) {
                    console.error(`批量出库商品失败:`, error);
                    results.failed.push({
                        barcode: item.barcode,
                        productId: item.productId,
                        error: error.message
                    });
                }
            }
            
            showToast(`批量出库完成: 成功 ${results.success.length} 项，失败 ${results.failed.length} 项`, 
                results.failed.length > 0 ? 'warning' : 'success');
            
            return {
                success: true,
                results: results
            };
        } catch (error) {
            console.error('批量出库失败:', error);
            showToast('批量出库操作失败', 'error');
            return {
                success: false,
                message: error.message
            };
        }
    }
    
    /**
     * 验证批量出库的商品
     * @param {Array} productsList - 商品列表
     * @returns {Promise<Object>} - 验证结果
     */
    async _validateBatchOutbound(productsList) {
        const results = {
            success: [],
            failed: []
        };
        
        for (const item of productsList) {
            try {
                let product;
                if (item.barcode) {
                    product = await this.db.getByIndex('products', 'barcode', item.barcode);
                } else if (item.productId) {
                    product = await this.db.getById('products', item.productId);
                }
                
                if (!product) {
                    results.failed.push({
                        barcode: item.barcode,
                        productId: item.productId,
                        error: '商品不存在'
                    });
                    continue;
                }
                
                const quantity = parseInt(item.quantity) || 1;
                if (quantity <= 0) {
                    results.failed.push({
                        barcode: item.barcode,
                        productId: item.productId,
                        productName: product.name,
                        error: '出库数量必须大于0'
                    });
                    continue;
                }
                
                if ((product.stock || 0) < quantity) {
                    results.failed.push({
                        barcode: item.barcode,
                        productId: item.productId,
                        productName: product.name,
                        error: `库存不足，当前库存: ${product.stock}`
                    });
                    continue;
                }
                
                results.success.push({
                    product,
                    quantity
                });
                
            } catch (error) {
                results.failed.push({
                    barcode: item.barcode,
                    productId: item.productId,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * 查询交易记录
     * @param {Object} filters - 过滤条件
     * @param {number} limit - 限制返回数量
     * @param {number} offset - 偏移量
     * @returns {Promise<Array>} - 交易记录列表
     */
    async getTransactionHistory(filters = {}, limit = 50, offset = 0) {
        try {
            await this.db.connect();
            
            // 构建查询条件
            let query = {};
            if (filters.type) query.type = filters.type;
            if (filters.productId) query.productId = filters.productId;
            if (filters.startDate) query.timestamp = { $gte: filters.startDate };
            if (filters.endDate) query.timestamp = { ...query.timestamp, $lte: filters.endDate };
            
            // 获取交易记录
            const transactions = await this.db.query('transactions', query, {
                limit,
                offset,
                sortBy: 'timestamp',
                sortOrder: 'desc'
            });
            
            return transactions;
        } catch (error) {
            console.error('查询交易记录失败:', error);
            return [];
        }
    }
    
    /**
     * 获取批量操作列表
     * @returns {Array} - 批量操作列表
     */
    getBatchOperations() {
        return this.inventoryBatch;
    }
    
    /**
     * 清空批量操作列表
     */
    clearBatchOperations() {
        this.inventoryBatch = [];
    }
    
    /**
     * 导出交易记录
     * @param {Array} transactions - 要导出的交易记录
     * @returns {string} - CSV格式的交易记录
     */
    exportTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            return '';
        }
        
        // CSV头部 - 增加出库特有字段
        const headers = ['商品名称', '条形码', '数量', '类型', '操作时间', '操作员', '原因', '备注', '客户名称', '订单号', '供应商'];
        const csvContent = [headers.join(',')];
        
        // CSV数据行
        transactions.forEach(transaction => {
            const row = [
                `"${transaction.productName || ''}"`,
                transaction.barcode || '',
                transaction.quantity || 0,
                transaction.type === 'in' ? '入库' : '出库',
                transaction.timestamp || '',
                transaction.operator || '',
                `"${transaction.reason || ''}"`,
                `"${transaction.notes || ''}"`,
                `"${transaction.customerName || ''}"`,
                `"${transaction.orderNumber || ''}"`,
                `"${transaction.supplier || ''}"`
            ];
            csvContent.push(row.join(','));
        });
        
        return csvContent.join('\n');
    }
    
    /**
     * 获取出库统计信息
     * @param {Object} filters - 过滤条件，包含开始时间和结束时间
     * @returns {Promise<Object>} - 统计结果
     */
    async getOutboundStatistics(filters = {}) {
        try {
            await this.db.connect();
            
            // 构建查询条件
            let query = { type: 'out' };
            if (filters.startDate) query.timestamp = { $gte: filters.startDate };
            if (filters.endDate) query.timestamp = { ...query.timestamp, $lte: filters.endDate };
            
            // 获取出库记录
            const outbounds = await this.db.query('transactions', query);
            
            // 计算统计信息
            const totalQuantity = outbounds.reduce((sum, trans) => sum + (trans.quantity || 0), 0);
            const totalProducts = new Set(outbounds.map(trans => trans.productId)).size;
            
            // 按商品分组统计
            const productStats = {};
            outbounds.forEach(trans => {
                if (!productStats[trans.productId]) {
                    productStats[trans.productId] = {
                        productId: trans.productId,
                        productName: trans.productName,
                        barcode: trans.barcode,
                        quantity: 0,
                        count: 0
                    };
                }
                productStats[trans.productId].quantity += trans.quantity || 0;
                productStats[trans.productId].count += 1;
            });
            
            // 转换为数组并排序
            const productStatsArray = Object.values(productStats)
                .sort((a, b) => b.quantity - a.quantity);
            
            // 按出库原因统计
            const reasonStats = {};
            outbounds.forEach(trans => {
                const reason = trans.reason || '未指定';
                reasonStats[reason] = (reasonStats[reason] || 0) + (trans.quantity || 0);
            });
            
            return {
                totalTransactions: outbounds.length,
                totalQuantity,
                totalProducts,
                topProducts: productStatsArray.slice(0, 10), // 前10个出库最多的商品
                reasonDistribution: reasonStats,
                period: {
                    start: filters.startDate,
                    end: filters.endDate
                }
            };
        } catch (error) {
            console.error('获取出库统计失败:', error);
            return null;
        }
    
    
    /**
     * 为出库操作生成唯一的单号
     * @returns {string} - 出库单号
     */
    generateOutboundNumber() ;




        const date = new Date();
        const dateStr = date.getFullYear() + 
            String(date.getMonth() + 1).padStart(2, '0') + 
            String(date.getDate()).padStart(2, '0');
        const timeStr = String(date.getHours()).padStart(2, '0') + 
            String(date.getMinutes()).padStart(2, '0') + 
            String(date.getSeconds()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `OUT${dateStr}${timeStr}${random}`;
    };
}

// 已通过window对象在浏览器环境中导出ScanManager类

// 为浏览器环境创建全局变量
if (typeof window !== 'undefined') {



    window.ScanManager = ScanManager;
    
    // 创建全局扫描管理器实例
    window.scanManager = null;
    
    // 初始化扫描功能
    window.initScanManager = function(database) {
        window.scanManager = new ScanManager(database);
        return window.scanManager;
    };
}

// 辅助函数：显示提示消息
function showToast(message, type = 'info') {
    // 假设有一个全局的toast函数
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        // 如果没有全局toast函数，使用alert
        alert(message);
    }
}