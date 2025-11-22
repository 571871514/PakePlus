// 主应用逻辑模块

// 侧边栏功能
function setupSidebar() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    // 打开侧边栏
    menuToggle.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });
    
    // 关闭侧边栏
    overlay.addEventListener('click', closeSidebar);
    
    // 侧边栏菜单项点击事件
    const sidebarLinks = sidebar.querySelectorAll('nav a');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // 根据菜单项文本跳转到相应页面
            const text = link.querySelector('span').textContent;
            
            switch (text) {
                case '首页':
                    showPage('home');
                    break;
                case '扫码入库':
                    showPage('scan-in');
                    break;
                case '扫码出库':
                    showPage('scan-out');
                    break;
                case '商品管理':
                    showPage('product-management');
                    break;
                case '二维码制作':
                    showPage('qr-code-generator');
                    break;
                case '数据备份':
                    showPage('backup');
                    break;
                case '数据报表':
                    showPage('reports');
                    break;
            }
            
            closeSidebar();
        });
    });
}

// 关闭侧边栏
function closeSidebar() {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('overlay').classList.add('hidden');
    document.body.style.overflow = '';
}

// 显示指定页面
function showPage(pageId) {
    const content = document.getElementById('content');
    
    // 清除内容区域
    while (content.firstChild) {
        content.removeChild(content.firstChild);
    }
    
    // 根据页面ID加载相应内容
    switch (pageId) {
        case 'home':
            loadHomePage();
            break;
        case 'scan-in':
            loadScanInPage();
            break;
        case 'scan-out':
            loadScanOutPage();
            break;
        case 'product-management':
            loadProductManagementPage();
            break;
        case 'qr-code-generator':
            loadQRCodeGeneratorPage();
            break;
        case 'backup':
            loadBackupPage();
            break;
        case 'reports':
            loadReportsPage();
            break;
    }
}

// 加载首页
async function loadHomePage() {
    const content = document.getElementById('content');
    
    // 先清空内容区域，避免重复渲染
    while (content.firstChild) {
        content.removeChild(content.firstChild);
    }
    
    // 创建首页内容
    const homeContent = document.createElement('div');
    homeContent.id = 'home-page';
    homeContent.className = 'space-y-4';
    
    // 功能按钮区域
    const functionButtons = document.createElement('div');
    functionButtons.className = 'grid grid-cols-2 gap-4';
    functionButtons.innerHTML = `
        <button id="scan-in-btn" class="flex flex-col items-center justify-center bg-white rounded-xl p-6 shadow-soft border-2 border-primary/10 hover:border-primary transition-all duration-300">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <i class="fa fa-qrcode text-primary text-2xl"></i>
            </div>
            <span class="font-medium">扫码入库</span>
        </button>
        
        <button id="scan-out-btn" class="flex flex-col items-center justify-center bg-white rounded-xl p-6 shadow-soft border-2 border-danger/10 hover:border-danger transition-all duration-300">
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <i class="fa fa-qrcode text-danger text-2xl"></i>
            </div>
            <span class="font-medium">扫码出库</span>
        </button>
        
        <button id="product-management-btn" class="flex flex-col items-center justify-center bg-white rounded-xl p-6 shadow-soft border-2 border-secondary/10 hover:border-secondary transition-all duration-300">
            <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <i class="fa fa-cubes text-secondary text-2xl"></i>
            </div>
            <span class="font-medium">商品管理</span>
        </button>
        
        <button id="qr-code-generator-btn" class="flex flex-col items-center justify-center bg-white rounded-xl p-6 shadow-soft border-2 border-info/10 hover:border-info transition-all duration-300">
            <div class="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-3">
                <i class="fa fa-barcode text-info text-2xl"></i>
            </div>
            <span class="font-medium">二维码制作</span>
        </button>
    `;
    
    // 出入库历史
    const historySection = document.createElement('div');
    historySection.className = 'bg-white rounded-xl p-4 shadow-soft';
    historySection.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold">出入库历史</h2>
            <button id="export-history-btn" class="text-primary text-sm">
                <i class="fa fa-download mr-1"></i>导出
            </button>
        </div>
        
        <div id="history-list" class="space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar">
            <!-- 历史记录将通过JavaScript动态生成 -->
        </div>
    `;
    
    // 添加到内容区域
    homeContent.appendChild(functionButtons);
    homeContent.appendChild(historySection);
    content.appendChild(homeContent);
    
    // 设置功能按钮点击事件
    document.getElementById('scan-in-btn').addEventListener('click', () => showPage('scan-in'));
    document.getElementById('scan-out-btn').addEventListener('click', () => showPage('scan-out'));
    document.getElementById('product-management-btn').addEventListener('click', () => showPage('product-management'));
    document.getElementById('qr-code-generator-btn').addEventListener('click', () => showPage('qr-code-generator'));
    
    // 导出历史按钮事件
    document.getElementById('export-history-btn').addEventListener('click', exportHistory);
    
    // 加载历史记录
    loadHistory();
}

// 加载历史记录
async function loadHistory() {
    const historyList = document.getElementById('history-list');
    
    try {
        // 显示加载状态
        historyList.innerHTML = '<div class="text-center py-6 text-gray-500">加载中...</div>';
        
        // 获取交易记录
        const transactions = await db.getAll('transactions');
        
        // 按时间倒序排序
        transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // 清空列表
        historyList.innerHTML = '';
        
        if (transactions.length === 0) {
            historyList.innerHTML = '<div class="text-center py-6 text-gray-500">暂无历史记录</div>';
            return;
        }
        
        // 添加历史记录项
        for (const transaction of transactions.slice(0, 10)) { // 只显示最近10条
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
            
            // 获取商品信息
            let productName = '未知商品';
            let productIcon = 'fa-question';
            
            try {
                const product = await db.getById('products', transaction.productId);
                if (product) {
                    productName = product.name;
                    // 根据商品类型设置图标
                    productIcon = product.category ? getCategoryIcon(product.category) : 'fa-tag';
                }
            } catch (error) {
                console.error('获取商品信息失败:', error);
            }
            
            // 格式化时间
            const formattedDate = new Date(transaction.timestamp).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            // 交易类型和数量
            const isIn = transaction.type === 'in';
            const quantityText = isIn ? `+${transaction.quantity}` : `-${transaction.quantity}`;
            const quantityClass = isIn ? 'text-green-600' : 'text-red-600';
            
            item.innerHTML = `
                <div class="flex items-center">
                    <div class="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                        <i class="fa ${productIcon} text-gray-600"></i>
                    </div>
                    <div>
                        <div class="font-medium">${productName}</div>
                        <div class="text-xs text-gray-500">${formattedDate}</div>
                    </div>
                </div>
                <div class="flex items-center">
                    <div class="${quantityClass} font-medium mr-3">${quantityText}</div>
                    <button class="text-gray-400 hover:text-gray-600" onclick="showTransactionDetail(${transaction.id})")>
                        <i class="fa fa-ellipsis-v"></i>
                    </button>
                </div>
            `;
            
            historyList.appendChild(item);
        }
    } catch (error) {
        console.error('加载历史记录失败:', error);
        historyList.innerHTML = '<div class="text-center py-6 text-red-500">加载失败，请稍后重试</div>';
    }
}

// 获取分类对应的图标
function getCategoryIcon(category) {
    const iconMap = {
        '食品': 'fa-cutlery',
        '饮料': 'fa-glass',
        '文具': 'fa-book',
        '电子产品': 'fa-mobile',
        '服装': 'fa-shopping-bag',
        '日用品': 'fa-shopping-basket',
        '其他': 'fa-tag'
    };
    
    return iconMap[category] || 'fa-tag';
}

// 导出历史记录
async function exportHistory() {
    try {
        showLoading('正在导出...');
        
        // 获取所有交易记录
        const transactions = await db.getAll('transactions');
        
        // 按时间排序
        transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // 准备CSV数据
        let csvContent = '商品名称,操作类型,数量,时间,备注\n';
        
        for (const transaction of transactions) {
            // 获取商品信息
            let productName = '未知商品';
            try {
                const product = await db.getById('products', transaction.productId);
                if (product) {
                    productName = product.name;
                }
            } catch (error) {
                console.error('获取商品信息失败:', error);
            }
            
            // 格式化数据
            const type = transaction.type === 'in' ? '入库' : '出库';
            const quantity = transaction.quantity;
            const timestamp = new Date(transaction.timestamp).toLocaleString('zh-CN');
            const remark = transaction.remark || '';
            
            // 添加到CSV
            csvContent += `"${productName}","${type}","${quantity}","${timestamp}","${remark}"\n`;
        }
        
        // 创建下载链接
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `出入库历史_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideLoading();
        showToast('导出成功', 'success');
    } catch (error) {
        hideLoading();
        console.error('导出历史记录失败:', error);
        showToast('导出失败，请稍后重试', 'error');
    }
}

// 显示交易详情
async function showTransactionDetail(transactionId) {
    try {
        // 获取交易记录
        const transaction = await db.getById('transactions', transactionId);
        
        if (!transaction) {
            showToast('未找到交易记录', 'error');
            return;
        }
        
        // 获取商品信息
        let productInfo = '未知商品';
        try {
            const product = await db.getById('products', transaction.productId);
            if (product) {
                productInfo = `${product.name} (${product.barcode})`;
            }
        } catch (error) {
            console.error('获取商品信息失败:', error);
        }
        
        // 格式化详情信息
        const type = transaction.type === 'in' ? '入库' : '出库';
        const timestamp = new Date(transaction.timestamp).toLocaleString('zh-CN');
        const remark = transaction.remark || '无';
        
        // 显示详情对话框
        alert(`交易详情：\n\n商品：${productInfo}\n操作：${type}\n数量：${transaction.quantity}\n时间：${timestamp}\n备注：${remark}`);
    } catch (error) {
        console.error('获取交易详情失败:', error);
        showToast('获取详情失败', 'error');
    }
}

// 加载扫码入库页面
function loadScanInPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-soft">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold">扫码入库</h2>
                <button id="back-to-home-btn" class="flex items-center text-primary">
                    <i class="fa fa-arrow-left mr-1"></i>返回主页
                </button>
            </div>
            <div id="scan-in-container" class="text-center">
                <div class="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center" id="scan-in-preview">
                    <p class="text-gray-500">点击开始扫描</p>
                </div>
                <button id="start-scan-in-btn" class="w-full bg-primary text-white py-3 rounded-lg mb-4">
                    <i class="fa fa-qrcode mr-2"></i>开始扫描
                </button>
                <button id="manual-input-in-btn" class="w-full border border-primary text-primary py-3 rounded-lg">
                    <i class="fa fa-keyboard-o mr-2"></i>手动输入
                </button>
            </div>
            
            <div id="product-info-in" class="hidden space-y-4 mt-6">
                <div class="border-b pb-3">
                    <h3 class="text-base font-medium" id="scan-in-product-name"></h3>
                    <p class="text-sm text-gray-500" id="scan-in-product-barcode"></p>
                </div>
                
                <div class="flex items-center justify-between">
                    <span class="text-gray-700">当前库存</span>
                    <span id="scan-in-current-stock" class="font-medium">0</span>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">入库数量</label>
                    <div class="flex items-center">
                        <button id="decrease-in-btn" class="w-10 h-10 border border-gray-300 rounded-l-lg flex items-center justify-center">
                            <i class="fa fa-minus"></i>
                        </button>
                        <input type="number" id="in-quantity" class="w-full h-10 border-t border-b border-gray-300 text-center" value="1" min="1">
                        <button id="increase-in-btn" class="w-10 h-10 border border-gray-300 rounded-r-lg flex items-center justify-center">
                            <i class="fa fa-plus"></i>
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <textarea id="in-remark" class="w-full border border-gray-300 rounded-lg p-2" rows="2" placeholder="请输入备注信息"></textarea>
                </div>
                
                <button id="confirm-in-btn" class="w-full bg-primary text-white py-3 rounded-lg">
                    确认入库
                </button>
                <button id="cancel-in-btn" class="w-full border border-gray-300 py-3 rounded-lg">
                    重新扫描
                </button>
            </div>
        </div>
    `;
    
    // 设置扫码功能
    setupScanInFunctionality();
    
    // 设置返回主页按钮点击事件
    document.getElementById('back-to-home-btn').addEventListener('click', () => {
        showPage('home');
    });
}

// 加载扫码出库页面
// 设置扫码入库功能
function setupScanInFunctionality() {
    // 确保scanManager已初始化
    if (!window.scanManager && window.db) {
        window.initScanManager(window.db);
    }
    
    // 创建视频和画布元素（如果不存在）
    const scanPreview = document.getElementById('scan-in-preview');
    if (!scanPreview.querySelector('video')) {
        const video = document.createElement('video');
        video.id = 'scan-in-video';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.display = 'none';
        
        const canvas = document.createElement('canvas');
        canvas.id = 'scan-in-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'none';
        
        scanPreview.appendChild(video);
        scanPreview.appendChild(canvas);
    }
    
    const video = document.getElementById('scan-in-video');
    const canvas = document.getElementById('scan-in-canvas');
    
    // 初始化扫码器
    if (window.scanManager) {
        window.scanManager.initScanner(video, canvas);
    }
    
    // 开始扫描按钮事件
    document.getElementById('start-scan-in-btn').addEventListener('click', async () => {
        if (!window.scanManager) {
            alert('扫码功能初始化失败');
            return;
        }
        
        // 显示视频元素
        video.style.display = 'block';
        canvas.style.display = 'block';
        scanPreview.querySelector('p').style.display = 'none';
        
        // 启动扫码器
        const success = await window.scanManager.startScanner((result) => {
            // 处理扫码结果
            handleScanInResult(result);
        }, 'in');
        
        if (!success) {
            // 恢复原始状态
            video.style.display = 'none';
            canvas.style.display = 'none';
            scanPreview.querySelector('p').style.display = 'block';
        }
    });
    
    // 手动输入按钮事件
    document.getElementById('manual-input-in-btn').addEventListener('click', () => {
        const barcode = prompt('请输入商品条形码：');
        if (barcode) {
            handleScanInResult(barcode);
        }
    });
    
    // 取消按钮事件
    document.getElementById('cancel-in-btn').addEventListener('click', () => {
        document.getElementById('product-info-in').classList.add('hidden');
        document.getElementById('scan-in-container').classList.remove('hidden');
        
        // 停止扫描
        if (window.scanManager) {
            window.scanManager.stopScanner();
        }
        
        // 恢复预览区域
        const video = document.getElementById('scan-in-video');
        const canvas = document.getElementById('scan-in-canvas');
        const scanPreview = document.getElementById('scan-in-preview');
        
        video.style.display = 'none';
        canvas.style.display = 'none';
        scanPreview.querySelector('p').style.display = 'block';
    });
    
    // 确认入库按钮事件
    document.getElementById('confirm-in-btn').addEventListener('click', async () => {
        const quantity = parseInt(document.getElementById('in-quantity').value);
        const remark = document.getElementById('in-remark').value;
        const barcode = document.getElementById('scan-in-product-barcode').textContent;
        
        if (window.scanManager) {
            try {
                await window.scanManager.addInboundProduct({
                    barcode,
                    quantity,
                    remark,
                    timestamp: new Date().toISOString()
                });
                
                showToast('入库成功', 'success');
                
                // 重置界面
                document.getElementById('product-info-in').classList.add('hidden');
                document.getElementById('scan-in-container').classList.remove('hidden');
                
                // 停止扫描
                window.scanManager.stopScanner();
                
                // 恢复预览区域
                const video = document.getElementById('scan-in-video');
                const canvas = document.getElementById('scan-in-canvas');
                const scanPreview = document.getElementById('scan-in-preview');
                
                video.style.display = 'none';
                canvas.style.display = 'none';
                scanPreview.querySelector('p').style.display = 'block';
                
            } catch (error) {
                console.error('入库失败:', error);
                showToast('入库失败: ' + error.message, 'error');
            }
        }
    });
    
    // 数量调整按钮事件
    document.getElementById('decrease-in-btn').addEventListener('click', () => {
        const input = document.getElementById('in-quantity');
        if (parseInt(input.value) > 1) {
            input.value = parseInt(input.value) - 1;
        }
    });
    
    document.getElementById('increase-in-btn').addEventListener('click', () => {
        const input = document.getElementById('in-quantity');
        input.value = parseInt(input.value) + 1;
    });
}

// 处理扫码入库结果
async function handleScanInResult(barcode) {
    if (!window.db) return;
    
    try {
        // 查询商品信息
        await window.db.connect();
        const product = await window.db.getByIndex('products', 'barcode', barcode);
        
        if (product) {
            // 显示商品信息
            document.getElementById('scan-in-product-name').textContent = product.name;
            document.getElementById('scan-in-product-barcode').textContent = product.barcode;
            document.getElementById('scan-in-current-stock').textContent = product.stock || 0;
            
            // 显示商品信息区域，隐藏扫描区域
            document.getElementById('scan-in-container').classList.add('hidden');
            document.getElementById('product-info-in').classList.remove('hidden');
            
            // 停止扫描
            if (window.scanManager) {
                window.scanManager.stopScanner();
            }
            
            // 隐藏视频元素
            document.getElementById('scan-in-video').style.display = 'none';
            document.getElementById('scan-in-canvas').style.display = 'none';
        } else {
            showToast('未找到该商品信息', 'error');
        }
    } catch (error) {
        console.error('查询商品失败:', error);
        showToast('查询商品失败: ' + error.message, 'error');
    }
}

function loadScanOutPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-soft">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold">扫码出库</h2>
                <button id="back-to-home-btn" class="flex items-center text-danger">
                    <i class="fa fa-arrow-left mr-1"></i>返回主页
                </button>
            </div>
            <div id="scan-out-container" class="text-center">
                <div class="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center" id="scan-out-preview">
                    <p class="text-gray-500">点击开始扫描</p>
                </div>
                <button id="start-scan-out-btn" class="w-full bg-danger text-white py-3 rounded-lg mb-4">
                    <i class="fa fa-qrcode mr-2"></i>开始扫描
                </button>
                <button id="manual-input-out-btn" class="w-full border border-danger text-danger py-3 rounded-lg">
                    <i class="fa fa-keyboard-o mr-2"></i>手动输入
                </button>
            </div>
            
            <div id="product-info-out" class="hidden space-y-4 mt-6">
                <div class="border-b pb-3">
                    <h3 class="text-base font-medium" id="scan-out-product-name"></h3>
                    <p class="text-sm text-gray-500" id="scan-out-product-barcode"></p>
                </div>
                
                <div class="flex items-center justify-between">
                    <span class="text-gray-700">当前库存</span>
                    <span id="scan-out-current-stock" class="font-medium">0</span>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">出库数量</label>
                    <div class="flex items-center">
                        <button id="decrease-out-btn" class="w-10 h-10 border border-gray-300 rounded-l-lg flex items-center justify-center">
                            <i class="fa fa-minus"></i>
                        </button>
                        <input type="number" id="out-quantity" class="w-full h-10 border-t border-b border-gray-300 text-center" value="1" min="1">
                        <button id="increase-out-btn" class="w-10 h-10 border border-gray-300 rounded-r-lg flex items-center justify-center">
                            <i class="fa fa-plus"></i>
                        </button>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">出库原因</label>
                    <select id="out-reason" class="w-full border border-gray-300 rounded-lg p-2">
                        <option value="销售">销售</option>
                        <option value="退货">退货</option>
                        <option value="损坏">损坏</option>
                        <option value="其他">其他</option>
                    </select>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <textarea id="out-remark" class="w-full border border-gray-300 rounded-lg p-2" rows="2" placeholder="请输入备注信息"></textarea>
                </div>
                
                <button id="confirm-out-btn" class="w-full bg-danger text-white py-3 rounded-lg">
                    确认出库
                </button>
                <button id="cancel-out-btn" class="w-full border border-gray-300 py-3 rounded-lg">
                    重新扫描
                </button>
            </div>
        </div>
    `;
    
    // 设置扫码功能
    setupScanOutFunctionality();
    
    // 设置返回主页按钮点击事件
    document.getElementById('back-to-home-btn').addEventListener('click', () => {
        showPage('home');
    });
}

// 加载商品管理页面
// 设置扫码出库功能
function setupScanOutFunctionality() {
    // 确保scanManager已初始化
    if (!window.scanManager && window.db) {
        window.initScanManager(window.db);
    }
    
    // 创建视频和画布元素（如果不存在）
    const scanPreview = document.getElementById('scan-out-preview');
    if (!scanPreview.querySelector('video')) {
        const video = document.createElement('video');
        video.id = 'scan-out-video';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.display = 'none';
        
        const canvas = document.createElement('canvas');
        canvas.id = 'scan-out-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'none';
        
        scanPreview.appendChild(video);
        scanPreview.appendChild(canvas);
    }
    
    const video = document.getElementById('scan-out-video');
    const canvas = document.getElementById('scan-out-canvas');
    
    // 初始化扫码器
    if (window.scanManager) {
        window.scanManager.initScanner(video, canvas);
    }
    
    // 开始扫描按钮事件
    document.getElementById('start-scan-out-btn').addEventListener('click', async () => {
        if (!window.scanManager) {
            alert('扫码功能初始化失败');
            return;
        }
        
        // 显示视频元素
        video.style.display = 'block';
        canvas.style.display = 'block';
        scanPreview.querySelector('p').style.display = 'none';
        
        // 启动扫码器
        const success = await window.scanManager.startScanner((result) => {
            // 处理扫码结果
            handleScanOutResult(result);
        }, 'out');
        
        if (!success) {
            // 恢复原始状态
            video.style.display = 'none';
            canvas.style.display = 'none';
            scanPreview.querySelector('p').style.display = 'block';
        }
    });
    
    // 手动输入按钮事件
    document.getElementById('manual-input-out-btn').addEventListener('click', () => {
        const barcode = prompt('请输入商品条形码：');
        if (barcode) {
            handleScanOutResult(barcode);
        }
    });
    
    // 取消按钮事件
    document.getElementById('cancel-out-btn').addEventListener('click', () => {
        document.getElementById('product-info-out').classList.add('hidden');
        document.getElementById('scan-out-container').classList.remove('hidden');
        
        // 停止扫描
        if (window.scanManager) {
            window.scanManager.stopScanner();
        }
        
        // 恢复预览区域
        const video = document.getElementById('scan-out-video');
        const canvas = document.getElementById('scan-out-canvas');
        const scanPreview = document.getElementById('scan-out-preview');
        
        video.style.display = 'none';
        canvas.style.display = 'none';
        scanPreview.querySelector('p').style.display = 'block';
    });
    
    // 确认出库按钮事件
    document.getElementById('confirm-out-btn').addEventListener('click', async () => {
        const quantity = parseInt(document.getElementById('out-quantity').value);
        const reason = document.getElementById('out-reason').value;
        const remark = document.getElementById('out-remark').value;
        const barcode = document.getElementById('scan-out-product-barcode').textContent;
        const currentStock = parseInt(document.getElementById('scan-out-current-stock').textContent);
        
        // 检查库存是否足够
        if (quantity > currentStock) {
            showToast('出库数量超过当前库存', 'error');
            return;
        }
        
        if (window.scanManager) {
            try {
                await window.scanManager.addOutboundProduct({
                    barcode,
                    quantity,
                    reason,
                    remark,
                    timestamp: new Date().toISOString()
                });
                
                showToast('出库成功', 'success');
                
                // 重置界面
                document.getElementById('product-info-out').classList.add('hidden');
                document.getElementById('scan-out-container').classList.remove('hidden');
                
                // 停止扫描
                window.scanManager.stopScanner();
                
                // 恢复预览区域
                const video = document.getElementById('scan-out-video');
                const canvas = document.getElementById('scan-out-canvas');
                const scanPreview = document.getElementById('scan-out-preview');
                
                video.style.display = 'none';
                canvas.style.display = 'none';
                scanPreview.querySelector('p').style.display = 'block';
                
            } catch (error) {
                console.error('出库失败:', error);
                showToast('出库失败: ' + error.message, 'error');
            }
        }
    });
    
    // 数量调整按钮事件
    document.getElementById('decrease-out-btn').addEventListener('click', () => {
        const input = document.getElementById('out-quantity');
        if (parseInt(input.value) > 1) {
            input.value = parseInt(input.value) - 1;
        }
    });
    
    document.getElementById('increase-out-btn').addEventListener('click', () => {
        const input = document.getElementById('out-quantity');
        input.value = parseInt(input.value) + 1;
    });
}

// 处理扫码出库结果
async function handleScanOutResult(barcode) {
    if (!window.db) return;
    
    try {
        // 查询商品信息
        await window.db.connect();
        const product = await window.db.getByIndex('products', 'barcode', barcode);
        
        if (product) {
            // 检查库存是否为0
            const currentStock = product.stock || 0;
            if (currentStock === 0) {
                showToast('该商品库存为0，无法出库', 'error');
                return;
            }
            
            // 显示商品信息
            document.getElementById('scan-out-product-name').textContent = product.name;
            document.getElementById('scan-out-product-barcode').textContent = product.barcode;
            document.getElementById('scan-out-current-stock').textContent = currentStock;
            
            // 设置最大出库数量
            document.getElementById('out-quantity').max = currentStock;
            
            // 显示商品信息区域，隐藏扫描区域
            document.getElementById('scan-out-container').classList.add('hidden');
            document.getElementById('product-info-out').classList.remove('hidden');
            
            // 停止扫描
            if (window.scanManager) {
                window.scanManager.stopScanner();
            }
            
            // 隐藏视频元素
            document.getElementById('scan-out-video').style.display = 'none';
            document.getElementById('scan-out-canvas').style.display = 'none';
        } else {
            showToast('未找到该商品信息', 'error');
        }
    } catch (error) {
        console.error('查询商品失败:', error);
        showToast('查询商品失败: ' + error.message, 'error');
    }
}

function loadProductManagementPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-soft">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold">商品管理</h2>
                <button id="add-product-btn" class="bg-primary text-white py-1 px-3 rounded-lg flex items-center">
                    <i class="fa fa-plus mr-1"></i>
                    <span>添加</span>
                </button>
            </div>
            
            <div class="relative mb-4">
                <input type="text" id="product-search" class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" placeholder="搜索商品名称或条码">
                <i class="fa fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>
            
            <div id="product-list" class="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
                <!-- 商品列表将通过JavaScript动态生成 -->
                <div class="text-center py-10 text-gray-500">
                    <i class="fa fa-database text-4xl mb-2"></i>
                    <p>当前物品列表为空</p>
                </div>
            </div>
        </div>
    `;
    
    // 加载商品列表
    loadProductList();
    
    // 添加商品按钮事件
    document.getElementById('add-product-btn').addEventListener('click', showAddProductForm);
    
    // 搜索功能
    document.getElementById('product-search').addEventListener('input', debounce(searchProducts, 300));
    
    // 导出函数到全局
    window.loadProductList = loadProductList;
    window.editProduct = editProduct;
    window.deleteProduct = deleteProduct;
    window.showAddProductForm = showAddProductForm;
    window.searchProducts = searchProducts;
}

/**
 * 加载商品列表
 */
async function loadProductList() {
    try {
        showLoading();
        
        const productListContainer = document.getElementById('product-list');
        if (!productListContainer) {
            hideLoading();
            return;
        }
        
        productListContainer.innerHTML = '<div class="text-center py-8">加载中...</div>';
        
        let products = [];
        
        // 尝试使用ProductManager获取商品列表
        if (window.getProductManager) {
            const productManager = window.getProductManager();
            products = await productManager.searchProducts('');
        } else if (window.db) {
            // 备选方案：直接使用数据库
            await window.db.connect();
            products = await window.db.getAll('products');
        } else {
            productListContainer.innerHTML = '<div class="text-center py-8 text-red-500">无法加载商品列表</div>';
            hideLoading();
            return;
        }
        
        // 渲染商品列表
        if (products.length === 0) {
            productListContainer.innerHTML = '<div class="text-center py-8 text-gray-500">暂无商品数据</div>';
        } else {
            // 创建表格HTML
            const tableHtml = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名称</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">条形码</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">售价</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">库存</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${products.map(product => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">${product.name}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${product.barcode}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${product.category || '-'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${product.unit || '个'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">¥${product.sellingPrice || 0}</td>
                                <td class="px-6 py-4 whitespace-nowrap ${product.stock <= (product.stockAlertThreshold || 10) ? 'text-red-500' : ''}">${product.stock || 0}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button class="text-indigo-600 hover:text-indigo-900 mr-4" onclick="editProduct('${product.id || product._id}')">编辑</button>
                                    <button class="text-red-600 hover:text-red-900" onclick="deleteProduct('${product.id || product._id}')">删除</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            productListContainer.innerHTML = tableHtml;
        }
        
    } catch (error) {
        console.error('加载商品列表失败:', error);
        const productListContainer = document.getElementById('product-list');
        if (productListContainer) {
            productListContainer.innerHTML = '<div class="text-center py-8 text-red-500">加载失败，请重试</div>';
        }
    } finally {
        hideLoading();
    }
}

/**
 * 编辑商品
 */
async function editProduct(productId) {
    try {
        showLoading();
        
        let product = null;
        
        // 尝试使用ProductManager获取商品详情
        if (window.getProductManager) {
            const productManager = window.getProductManager();
            product = await productManager.getProductById(productId);
        } else if (window.db) {
            // 备选方案：直接使用数据库
            await window.db.connect();
            product = await window.db.get('products', productId);
        } else {
            showToast('无法加载商品数据', 'error');
            hideLoading();
            return;
        }
        
        if (!product) {
            showToast('商品不存在', 'error');
            hideLoading();
            return;
        }
        
        // 获取分类列表
        const categories = [];
        let categoryOptions = '';
        
        try {
            if (window.getProductManager) {
                const productManager = window.getProductManager();
                const dbCategories = await productManager.getAllCategories();
                categories.push(...dbCategories);
            }
        } catch (error) {
            console.error('获取分类失败，使用默认分类:', error);
            categories.push(
                { name: '食品饮料' },
                { name: '日用百货' },
                { name: '电子产品' },
                { name: '服装鞋帽' },
                { name: '家居用品' },
                { name: '其他商品' }
            );
        }
        
        // 创建分类选项
        categoryOptions = categories.map(cat => 
            `<option value="${cat.name}" ${cat.name === product.category ? 'selected' : ''}>${cat.name}</option>`
        ).join('');
        
        // 创建编辑表单HTML
        const formHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="edit-product-modal">
                <div class="bg-white rounded-xl p-6 w-full max-w-md">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold">编辑商品</h3>
                        <button id="close-edit-modal-btn" class="text-gray-500 hover:text-gray-700">
                            <i class="fa fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <form id="edit-product-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label>
                            <input type="text" id="edit-product-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${product.name}" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">条形码 *</label>
                            <input type="text" id="edit-product-barcode" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${product.barcode}" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
                            <select id="edit-product-category" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                <option value="" ${!product.category ? 'selected' : ''}>无分类</option>
                                ${categoryOptions}
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">单位</label>
                            <input type="text" id="edit-product-unit" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${product.unit || '个'}">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">采购价</label>
                                <input type="number" id="edit-product-purchase-price" class="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" step="0.01" value="${product.purchasePrice || ''}">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">销售价</label>
                                <input type="number" id="edit-product-selling-price" class="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" step="0.01" value="${product.sellingPrice || ''}">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">库存</label>
                            <input type="number" id="edit-product-stock" class="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" value="${product.stock || 0}">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">库存预警值</label>
                            <input type="number" id="edit-product-stock-alert" class="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" value="${product.stockAlertThreshold || 10}">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                            <input type="text" id="edit-product-supplier" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${product.supplier || ''}">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                            <textarea id="edit-product-description" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="3">${product.description || ''}</textarea>
                        </div>
                        
                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button" id="cancel-edit-product" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                取消
                            </button>
                            <button type="submit" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                                确认更新
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', formHtml);
        
        // 关闭模态框
        const closeModal = () => {
            const modal = document.getElementById('edit-product-modal');
            if (modal) modal.remove();
        };
        
        document.getElementById('close-edit-modal-btn').addEventListener('click', closeModal);
        document.getElementById('cancel-edit-product').addEventListener('click', closeModal);
        
        // 提交表单
        document.getElementById('edit-product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // 收集表单数据
                const updatedData = {
                    ...product,
                    name: document.getElementById('edit-product-name').value.trim(),
                    barcode: document.getElementById('edit-product-barcode').value.trim(),
                    category: document.getElementById('edit-product-category').value,
                    unit: document.getElementById('edit-product-unit').value || '个',
                    purchasePrice: document.getElementById('edit-product-purchase-price').value,
                    sellingPrice: document.getElementById('edit-product-selling-price').value,
                    stock: parseInt(document.getElementById('edit-product-stock').value) || 0,
                    stockAlertThreshold: parseInt(document.getElementById('edit-product-stock-alert').value) || 10,
                    supplier: document.getElementById('edit-product-supplier').value,
                    description: document.getElementById('edit-product-description').value
                };
                
                // 尝试使用ProductManager更新商品
                if (window.getProductManager) {
                    const productManager = window.getProductManager();
                    await productManager.updateProduct(updatedData);
                } else if (window.db) {
                    // 备选方案：直接使用数据库
                    await window.db.connect();
                    await window.db.update('products', productId, updatedData);
                } else {
                    showToast('商品管理未初始化', 'error');
                    return;
                }
                
                // 关闭模态框
                closeModal();
                
                // 刷新商品列表
                if (typeof loadProductList === 'function') {
                    loadProductList();
                }
                
                showToast('更新商品成功', 'success');
                
            } catch (error) {
                console.error('更新商品失败:', error);
                showToast('更新商品失败: ' + error.message, 'error');
            } finally {
                hideLoading();
            }
        });
        
    } catch (error) {
        console.error('显示编辑商品表单失败:', error);
        showToast('加载表单失败', 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 删除商品
 */
async function deleteProduct(productId) {
    if (!confirm('确定要删除这个商品吗？')) {
        return;
    }
    
    try {
        showLoading();
        
        // 尝试使用ProductManager删除商品
        if (window.getProductManager) {
            const productManager = window.getProductManager();
            await productManager.deleteProduct(productId);
        } else if (window.db) {
            // 备选方案：直接使用数据库（软删除）
            await window.db.connect();
            await window.db.update('products', productId, { isDeleted: true });
        } else {
            showToast('商品管理未初始化', 'error');
            hideLoading();
            return;
        }
        
        // 刷新商品列表
        if (typeof loadProductList === 'function') {
            loadProductList();
        }
        
        showToast('删除商品成功', 'success');
        
    } catch (error) {
        console.error('删除商品失败:', error);
        showToast('删除商品失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 搜索商品
 */
async function searchProducts(event) {
    try {
        const searchTerm = event.target.value.trim();
        const productListContainer = document.getElementById('product-list');
        
        if (!productListContainer) {
            return;
        }
        
        productListContainer.innerHTML = '<div class="text-center py-8">搜索中...</div>';
        
        let products = [];
        
        // 尝试使用ProductManager搜索商品
        if (window.getProductManager) {
            const productManager = window.getProductManager();
            products = await productManager.searchProducts(searchTerm);
        } else if (window.db) {
            // 备选方案：直接使用数据库搜索
            await window.db.connect();
            const allProducts = await window.db.getAll('products');
            // 简单的前端过滤
            products = allProducts.filter(product => 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
            );
        } else {
            productListContainer.innerHTML = '<div class="text-center py-8 text-red-500">无法搜索商品</div>';
            return;
        }
        
        // 渲染搜索结果
        if (products.length === 0) {
            productListContainer.innerHTML = '<div class="text-center py-8 text-gray-500">未找到匹配的商品</div>';
        } else {
            // 创建表格HTML
            const tableHtml = `
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">商品名称</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">条形码</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单位</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">售价</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">库存</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${products.map(product => `
                            <tr>
                                <td class="px-6 py-4 whitespace-nowrap">${product.name}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${product.barcode}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${product.category || '-'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">${product.unit || '个'}</td>
                                <td class="px-6 py-4 whitespace-nowrap">¥${product.sellingPrice || 0}</td>
                                <td class="px-6 py-4 whitespace-nowrap ${product.stock <= (product.stockAlertThreshold || 10) ? 'text-red-500' : ''}">${product.stock || 0}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button class="text-indigo-600 hover:text-indigo-900 mr-4" onclick="editProduct('${product.id || product._id}')">编辑</button>
                                    <button class="text-red-600 hover:text-red-900" onclick="deleteProduct('${product.id || product._id}')">删除</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            
            productListContainer.innerHTML = tableHtml;
        }
        
    } catch (error) {
        console.error('搜索商品失败:', error);
        const productListContainer = document.getElementById('product-list');
        if (productListContainer) {
            productListContainer.innerHTML = '<div class="text-center py-8 text-red-500">搜索失败，请重试</div>';
        }
    }
}

/**
 * 显示添加商品表单
 */
async function showAddProductForm() {
    try {
        // 获取商品分类
        const categories = [];
        let categoryOptions = '';
        
        try {
            // 尝试使用ProductManager获取分类
            if (window.getProductManager) {
                const productManager = window.getProductManager();
                const dbCategories = await productManager.getAllCategories();
                categories.push(...dbCategories);
            }
        } catch (error) {
            console.error('获取分类失败，使用默认分类:', error);
            // 使用默认分类
            categories.push(
                { name: '食品饮料' },
                { name: '日用百货' },
                { name: '电子产品' },
                { name: '服装鞋帽' },
                { name: '家居用品' },
                { name: '其他商品' }
            );
        }
        
        // 创建分类选项
        categoryOptions = categories.map(cat => 
            `<option value="${cat.name}">${cat.name}</option>`
        ).join('');
        
        // 创建表单HTML
        const formHtml = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" id="add-product-modal">
                <div class="bg-white rounded-xl p-6 w-full max-w-md">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold">添加商品</h3>
                        <button id="close-modal-btn" class="text-gray-500 hover:text-gray-700">
                            <i class="fa fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <form id="add-product-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label>
                            <input type="text" id="product-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">条形码 *</label>
                            <input type="text" id="product-barcode" class="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
                            <select id="product-category" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                <option value="">无分类</option>
                                ${categoryOptions}
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">单位</label>
                            <input type="text" id="product-unit" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="个">
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">采购价</label>
                                <input type="number" id="product-purchase-price" class="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" step="0.01">
                            </div>
                            
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">销售价</label>
                                <input type="number" id="product-selling-price" class="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" step="0.01">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">初始库存</label>
                            <input type="number" id="product-stock" class="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" value="0">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">库存预警值</label>
                            <input type="number" id="product-stock-alert" class="w-full px-3 py-2 border border-gray-300 rounded-lg" min="0" value="10">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">供应商</label>
                            <input type="text" id="product-supplier" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">描述</label>
                            <textarea id="product-description" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="3"></textarea>
                        </div>
                        
                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button" id="cancel-add-product" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                                取消
                            </button>
                            <button type="submit" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
                                确认添加
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', formHtml);
        
        // 关闭模态框
        const closeModal = () => {
            const modal = document.getElementById('add-product-modal');
            if (modal) modal.remove();
        };
        
        document.getElementById('close-modal-btn').addEventListener('click', closeModal);
        document.getElementById('cancel-add-product').addEventListener('click', closeModal);
        
        // 提交表单
        document.getElementById('add-product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                showLoading();
                
                // 收集表单数据
                const productData = {
                    name: document.getElementById('product-name').value.trim(),
                    barcode: document.getElementById('product-barcode').value.trim(),
                    category: document.getElementById('product-category').value,
                    unit: document.getElementById('product-unit').value || '个',
                    purchasePrice: document.getElementById('product-purchase-price').value,
                    sellingPrice: document.getElementById('product-selling-price').value,
                    stock: parseInt(document.getElementById('product-stock').value) || 0,
                    stockAlertThreshold: parseInt(document.getElementById('product-stock-alert').value) || 10,
                    supplier: document.getElementById('product-supplier').value,
                    description: document.getElementById('product-description').value
                };
                
                // 尝试使用ProductManager添加商品
                try {
                    if (window.getProductManager) {
                        const productManager = window.getProductManager();
                        await productManager.addProduct(productData);
                    } else if (window.db) {
                        // 备选方案：直接使用数据库
                        await window.db.connect();
                        // 检查条形码是否已存在
                        const existing = await window.db.getByIndex('products', 'barcode', productData.barcode);
                        if (existing) {
                            showToast('该条形码已存在', 'error');
                            return;
                        }
                        
                        // 添加商品
                        await window.db.add('products', productData);
                        showToast('添加商品成功', 'success');
                    } else {
                        showToast('商品管理未初始化', 'error');
                        return;
                    }
                    
                    // 关闭模态框
                    closeModal();
                    
                    // 刷新商品列表
                    if (typeof loadProductList === 'function') {
                        loadProductList();
                    }
                    
                } catch (error) {
                    console.error('添加商品失败:', error);
                    showToast('添加商品失败: ' + error.message, 'error');
                }
                
            } catch (error) {
                console.error('添加商品处理失败:', error);
                showToast('操作失败', 'error');
            } finally {
                hideLoading();
            }
        });
        
    } catch (error) {
        console.error('显示添加商品表单失败:', error);
        showToast('加载表单失败', 'error');
    }
}

// 加载二维码制作页面
function loadQRCodeGeneratorPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-soft">
            <h2 class="text-lg font-bold mb-6">生成二维码</h2>
            
            <div class="flex flex-col items-center mb-6">
                <div id="qrcode-preview" class="border-2 border-dashed border-gray-300 p-2 rounded-lg mb-4 bg-white">
                    <!-- 二维码将在这里生成 -->
                </div>
            </div>
            
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">二维码类型</label>
                    <div class="flex space-x-4">
                        <label class="flex items-center">
                            <input type="radio" name="code-type" value="qr" checked class="mr-2">
                            <span>二维码</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" name="code-type" value="barcode" class="mr-2">
                            <span>条形码</span>
                        </label>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">二维码logo</label>
                    <div class="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <i class="fa fa-camera text-gray-400 text-2xl mb-2"></i>
                        <p class="text-sm text-gray-500">点击添加Logo</p>
                        <input type="file" id="logo-upload" accept="image/*" class="hidden">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">二维码内容</label>
                    <textarea id="qrcode-content" class="w-full border border-gray-300 rounded-lg p-3" rows="3" placeholder="请输入二维码内容"></textarea>
                </div>
                
                <button id="generate-qrcode-btn" class="w-full bg-primary text-white py-3 rounded-lg">
                    生成二维码
                </button>
                
                <div class="flex space-x-2">
                    <button id="download-qrcode-btn" class="flex-1 border border-primary text-primary py-2 rounded-lg">
                        <i class="fa fa-download mr-1"></i>下载
                    </button>
                    <button id="print-qrcode-btn" class="flex-1 border border-secondary text-secondary py-2 rounded-lg">
                        <i class="fa fa-print mr-1"></i>打印
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 设置二维码生成功能
    setupQRCodeGenerator();
}

// 加载数据备份页面
function loadBackupPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-soft">
            <h2 class="text-lg font-bold mb-4">数据备份</h2>
            
            <div class="space-y-4">
                <button id="backup-now-btn" class="w-full bg-primary text-white py-3 rounded-lg flex items-center justify-center">
                    <i class="fa fa-save mr-2"></i>
                    <span>立即备份</span>
                </button>
                
                <button id="restore-btn" class="w-full border border-secondary text-secondary py-3 rounded-lg flex items-center justify-center">
                    <i class="fa fa-upload mr-2"></i>
                    <span>恢复数据</span>
                </button>
                
                <div class="border-t pt-4">
                    <h3 class="text-base font-medium mb-3">备份设置</h3>
                    
                    <div class="flex items-center justify-between mb-3">
                        <label class="text-sm" for="auto-backup">自动备份</label>
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="auto-backup" class="sr-only peer">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                    
                    <div class="text-sm text-gray-500">
                        <p class="mb-2">上次备份时间：<span id="last-backup-time">从未备份</span></p>
                        <p>备份文件将保存在您的浏览器中，建议定期将备份文件下载到本地保存。</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 设置备份功能
    setupBackupFunctionality();
}

// 加载数据报表页面
function loadReportsPage() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-soft">
            <h2 class="text-lg font-bold mb-4">数据报表</h2>
            
            <div class="space-y-6">
                <div>
                    <h3 class="text-base font-medium mb-3">库存概览</h3>
                    <div class="h-48">
                        <canvas id="stock-chart"></canvas>
                    </div>
                </div>
                
                <div>
                    <h3 class="text-base font-medium mb-3">出入库统计</h3>
                    <div class="grid grid-cols-2 gap-4 mb-3">
                        <div class="bg-green-50 p-3 rounded-lg text-center">
                            <p class="text-sm text-gray-600">今日入库</p>
                            <p class="text-xl font-bold text-primary" id="today-in-count">0</p>
                        </div>
                        <div class="bg-red-50 p-3 rounded-lg text-center">
                            <p class="text-sm text-gray-600">今日出库</p>
                            <p class="text-xl font-bold text-danger" id="today-out-count">0</p>
                        </div>
                    </div>
                    <div class="h-48">
                        <canvas id="transaction-chart"></canvas>
                    </div>
                </div>
                
                <div>
                    <h3 class="text-base font-medium mb-2">低库存预警</h3>
                    <div id="low-stock-alert" class="text-center py-4 text-gray-500">
                        暂无低库存商品
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 加载报表数据
    loadReportsData();
}

// 显示加载状态
function showLoading(text = '加载中...') {
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');
    
    loadingText.textContent = text;
    loading.classList.remove('hidden');
}

// 隐藏加载状态
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// 显示消息提示
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');
    
    // 设置消息内容
    toastMessage.textContent = message;
    
    // 设置图标和颜色
    switch (type) {
        case 'success':
            toastIcon.className = 'fa fa-check-circle text-green-500 mr-2';
            toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg bg-green-50 text-green-800 transition-all duration-300';
            break;
        case 'error':
            toastIcon.className = 'fa fa-times-circle text-red-500 mr-2';
            toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg bg-red-50 text-red-800 transition-all duration-300';
            break;
        case 'warning':
            toastIcon.className = 'fa fa-exclamation-triangle text-yellow-500 mr-2';
            toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg bg-yellow-50 text-yellow-800 transition-all duration-300';
            break;
        default:
            toastIcon.className = 'fa fa-info-circle text-blue-500 mr-2';
            toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg bg-blue-50 text-blue-800 transition-all duration-300';
    }
    
    // 显示提示
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('opacity-100');
    }, 10);
    
    // 3秒后隐藏
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 初始化主应用
function initApp() {
    // 设置侧边栏
    setupSidebar();
    
    // 初始化认证相关功能
    if (window.initAuth) {
        window.initAuth();
    }
    
    // 默认显示首页
    loadHomePage();
}

// 将函数附加到window对象上，使其成为全局函数
window.initApp = initApp;
window.showPage = showPage;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showToast = showToast;
window.debounce = debounce;