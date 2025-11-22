/**
 * 二维码制作模块
 * 提供商品二维码/条形码生成、导出和打印功能
 */
class QRCodeManager {
    constructor() {
        this.supportedFormats = ['QRCode', 'Code128', 'EAN13', 'EAN8', 'UPC-A', 'UPC-E'];
        this.qrCodeSettings = {
            errorCorrectionLevel: 'H', // L, M, Q, H
            margin: 4,
            width: 300,
            height: 300,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        };
        this.barcodeSettings = {
            width: 300,
            height: 100,
            fontSize: 16,
            textPosition: 'bottom', // top, bottom, none
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        };
    }

    /**
     * 生成二维码
     * @param {string} content - 要编码的内容
     * @param {Object} options - 二维码选项
     * @returns {Promise<string>} - 二维码图像的Data URL
     */
    async generateQRCode(content, options = {}) {
        try {
            // 合并默认选项和用户选项
            const settings = { ...this.qrCodeSettings, ...options };
            
            // 简化版二维码生成实现（实际应用中应使用成熟的二维码库）
            // 这里使用Canvas API创建一个简单的二维码模拟
            // 在实际项目中，建议引入qrcode.js或其他成熟的库
            return this._createQRCodeImage(content, settings);
        } catch (error) {
            console.error('生成二维码失败:', error);
            throw new Error('生成二维码失败');
        }
    }

    /**
     * 生成条形码
     * @param {string} content - 要编码的内容
     * @param {string} format - 条形码格式 (Code128, EAN13等)
     * @param {Object} options - 条形码选项
     * @returns {Promise<string>} - 条形码图像的Data URL
     */
    async generateBarcode(content, format = 'Code128', options = {}) {
        try {
            // 验证格式
            if (!this.supportedFormats.includes(format)) {
                throw new Error(`不支持的条形码格式: ${format}`);
            }
            
            // 合并默认选项和用户选项
            const settings = { ...this.barcodeSettings, ...options };
            
            // 验证内容
            if (!this._validateBarcodeContent(content, format)) {
                throw new Error(`无效的条形码内容格式: ${format}`);
            }
            
            // 简化版条形码生成实现（实际应用中应使用成熟的条形码库）
            // 在实际项目中，建议引入JsBarcode或其他成熟的库
            return this._createBarcodeImage(content, format, settings);
        } catch (error) {
            console.error('生成条形码失败:', error);
            throw new Error(`生成条形码失败: ${error.message}`);
        }
    }

    /**
     * 为商品生成唯一的二维码
     * @param {Object} product - 商品对象
     * @param {Object} options - 二维码选项
     * @returns {Promise<Object>} - 包含二维码图像和元数据的对象
     */
    async generateProductQRCode(product, options = {}) {
        try {
            if (!product || !product.id || !product.barcode) {
                throw new Error('无效的商品数据');
            }
            
            // 构建商品信息对象
            const productInfo = {
                id: product.id,
                barcode: product.barcode,
                name: product.name,
                price: product.sellingPrice || 0,
                category: product.category || '',
                timestamp: new Date().toISOString()
            };
            
            // 转换为JSON字符串
            const content = JSON.stringify(productInfo);
            
            // 生成二维码
            const qrCodeUrl = await this.generateQRCode(content, options);
            
            return {
                qrCodeUrl,
                productInfo,
                content,
                format: 'QRCode'
            };
        } catch (error) {
            console.error('生成商品二维码失败:', error);
            throw new Error(`生成商品二维码失败: ${error.message}`);
        }
    }

    /**
     * 为商品生成条形码
     * @param {Object} product - 商品对象
     * @param {string} format - 条形码格式
     * @param {Object} options - 条形码选项
     * @returns {Promise<Object>} - 包含条形码图像和元数据的对象
     */
    async generateProductBarcode(product, format = 'Code128', options = {}) {
        try {
            if (!product || !product.barcode) {
                throw new Error('商品缺少条形码信息');
            }
            
            // 根据不同格式调整条形码内容
            let barcodeContent = product.barcode;
            
            // 对于EAN13等格式，可能需要添加校验位
            if (format === 'EAN13' && barcodeContent.length === 12) {
                barcodeContent = this._calculateEAN13CheckDigit(barcodeContent);
            }
            
            // 生成条形码
            const barcodeUrl = await this.generateBarcode(barcodeContent, format, options);
            
            return {
                barcodeUrl,
                productId: product.id,
                productName: product.name,
                barcodeContent,
                format
            };
        } catch (error) {
            console.error('生成商品条形码失败:', error);
            throw new Error(`生成商品条形码失败: ${error.message}`);
        }
    }

    /**
     * 批量生成商品二维码/条形码
     * @param {Array<Object>} products - 商品对象数组
     * @param {string} type - 生成类型 ('QRCode' 或 'Barcode')
     * @param {Object} options - 生成选项
     * @returns {Promise<Array<Object>>} - 生成结果数组
     */
    async batchGenerate(productList, type = 'QRCode', options = {}) {
        try {
            if (!Array.isArray(productList) || productList.length === 0) {
                throw new Error('商品列表不能为空');
            }
            
            const results = {
                success: [],
                failed: []
            };
            
            for (const product of productList) {
                try {
                    let result;
                    if (type === 'QRCode') {
                        result = await this.generateProductQRCode(product, options);
                    } else {
                        const format = options.format || 'Code128';
                        result = await this.generateProductBarcode(product, format, options);
                    }
                    
                    results.success.push({
                        productId: product.id,
                        productName: product.name,
                        imageUrl: type === 'QRCode' ? result.qrCodeUrl : result.barcodeUrl,
                        ...result
                    });
                } catch (error) {
                    results.failed.push({
                        productId: product.id,
                        productName: product.name,
                        error: error.message
                    });
                }
            }
            
            return results;
        } catch (error) {
            console.error('批量生成失败:', error);
            throw new Error(`批量生成失败: ${error.message}`);
        }
    }

    /**
     * 导出二维码/条形码为图片文件
     * @param {string} imageUrl - 图像的Data URL
     * @param {string} filename - 文件名
     * @param {string} format - 文件格式 ('png', 'jpeg')
     */
    exportImage(imageUrl, filename = 'barcode', format = 'png') {
        try {
            // 创建下载链接
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = `${filename}.${format}`;
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (error) {
            console.error('导出图像失败:', error);
            showToast('导出图像失败', 'error');
            return false;
        }
    }

    /**
     * 准备打印模板
     * @param {Array<Object>} codes - 二维码/条形码对象数组
     * @param {Object} templateOptions - 模板选项
     * @returns {Promise<string>} - 打印页面的HTML
     */
    async preparePrintTemplate(codes, templateOptions = {}) {
        try {
            const defaultOptions = {
                layout: 'grid', // grid, list
                itemsPerRow: 2,
                margin: 10,
                showNames: true,
                showBarcodes: true
            };
            
            const options = { ...defaultOptions, ...templateOptions };
            
            // 创建打印页面HTML
            let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>打印二维码/条形码</title>
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        body {
                            font-family: Arial, sans-serif;
                            padding: ${options.margin}px;
                        }
                        .container {
                            display: grid;
                            grid-template-columns: repeat(${options.itemsPerRow}, 1fr);
                            gap: ${options.margin}px;
                        }
                        .code-item {
                            text-align: center;
                            padding: 10px;
                            border: 1px solid #eee;
                            page-break-inside: avoid;
                        }
                        .code-image {
                            max-width: 100%;
                            height: auto;
                            margin-bottom: 10px;
                        }
                        .product-name {
                            font-size: 12px;
                            word-break: break-word;
                            margin-bottom: 5px;
                        }
                        .barcode-text {
                            font-family: monospace;
                            font-size: 12px;
                        }
                        @media print {
                            body {
                                padding: 0;
                            }
                            .code-item {
                                border: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
            `;
            
            // 添加每个二维码/条形码项
            codes.forEach(code => {
                html += `
                    <div class="code-item">
                        <img class="code-image" src="${code.imageUrl}" alt="${code.productName}">
                `;
                
                if (options.showNames && code.productName) {
                    html += `
                        <div class="product-name">${code.productName}</div>
                    `;
                }
                
                if (options.showBarcodes && code.barcodeContent) {
                    html += `
                        <div class="barcode-text">${code.barcodeContent}</div>
                    `;
                }
                
                html += `
                    </div>
                `;
            });
            
            html += `
                    </div>
                </body>
                </html>
            `;
            
            return html;
        } catch (error) {
            console.error('准备打印模板失败:', error);
            throw new Error('准备打印模板失败');
        }
    }

    /**
     * 打印二维码/条形码
     * @param {Array<Object>} codes - 二维码/条形码对象数组
     * @param {Object} templateOptions - 模板选项
     */
    async printCodes(codes, templateOptions = {}) {
        try {
            // 准备打印内容
            const printHtml = await this.preparePrintTemplate(codes, templateOptions);
            
            // 创建新窗口
            const printWindow = window.open('', '_blank');
            
            // 写入打印内容
            printWindow.document.write(printHtml);
            printWindow.document.close();
            
            // 等待内容加载完成后打印
            printWindow.onload = function() {
                printWindow.print();
                
                // 打印完成后关闭窗口
                printWindow.onafterprint = function() {
                    printWindow.close();
                };
            };
            
            return true;
        } catch (error) {
            console.error('打印失败:', error);
            showToast('打印失败', 'error');
            return false;
        }
    }

    /**
     * 解析二维码/条形码内容
     * @param {string} content - 二维码/条形码内容
     * @returns {Object} - 解析后的对象
     */
    parseCodeContent(content) {
        try {
            // 尝试解析为JSON
            const parsed = JSON.parse(content);
            
            // 检查是否为商品信息
            if (parsed.id && parsed.barcode) {
                return {
                    type: 'product',
                    data: parsed
                };
            }
            
            return {
                type: 'text',
                data: content
            };
        } catch (error) {
            // 非JSON格式，返回文本类型
            return {
                type: 'text',
                data: content
            };
        }
    }

    /**
     * 生成自定义内容的二维码
     * @param {Object} customData - 自定义数据对象
     * @param {Object} options - 二维码选项
     * @returns {Promise<string>} - 二维码图像的Data URL
     */
    async generateCustomQRCode(customData, options = {}) {
        try {
            // 将自定义数据转换为字符串
            const content = JSON.stringify(customData);
            
            // 生成二维码
            return await this.generateQRCode(content, options);
        } catch (error) {
            console.error('生成自定义二维码失败:', error);
            throw new Error('生成自定义二维码失败');
        }
    }

    /**
     * 验证条形码内容
     * @param {string} content - 条形码内容
     * @param {string} format - 条形码格式
     * @returns {boolean} - 是否有效
     */
    _validateBarcodeContent(content, format) {
        if (!content || typeof content !== 'string') {
            return false;
        }
        
        // 根据不同格式验证内容
        switch (format) {
            case 'EAN13':
                return /^\d{13}$/.test(content);
            case 'EAN8':
                return /^\d{8}$/.test(content);
            case 'UPC-A':
                return /^\d{12}$/.test(content);
            case 'UPC-E':
                return /^\d{6,8}$/.test(content);
            case 'Code128':
                // Code128 可以编码 ASCII 字符
                return content.length > 0 && content.length <= 80;
            default:
                return content.length > 0;
        }
    }

    /**
     * 计算EAN-13校验位
     * @param {string} code - 12位EAN-13码
     * @returns {string} - 13位完整EAN-13码
     */
    _calculateEAN13CheckDigit(code) {
        if (!/^\d{12}$/.test(code)) {
            return code;
        }
        
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            const digit = parseInt(code[i]);
            sum += (i % 2 === 0) ? digit * 1 : digit * 3;
        }
        
        const checkDigit = (10 - (sum % 10)) % 10;
        return code + checkDigit;
    }

    /**
     * 创建二维码图像（模拟实现）
     * 注意：这是一个简化的实现，实际项目中应使用专业库
     * @param {string} content - 二维码内容
     * @param {Object} settings - 二维码设置
     * @returns {string} - 图像Data URL
     */
    _createQRCodeImage(content, settings) {
        // 创建Canvas元素
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置Canvas尺寸
        canvas.width = settings.width;
        canvas.height = settings.height;
        
        // 填充背景
        ctx.fillStyle = settings.color.light;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 简化的二维码模拟 - 实际应该使用二维码库生成
        // 这里仅作为演示，创建一个带有文本的矩形
        const margin = settings.margin;
        const innerWidth = canvas.width - margin * 2;
        const innerHeight = canvas.height - margin * 2;
        
        // 绘制模拟的二维码方块
        ctx.fillStyle = settings.color.dark;
        
        // 绘制角落的定位图案
        this._drawPositionPattern(ctx, margin, margin, innerWidth / 7, settings.color.dark);
        this._drawPositionPattern(ctx, canvas.width - margin - innerWidth / 7, margin, innerWidth / 7, settings.color.dark);
        this._drawPositionPattern(ctx, margin, canvas.height - margin - innerWidth / 7, innerWidth / 7, settings.color.dark);
        
        // 绘制内容的简化表示
        ctx.font = '12px Arial';
        ctx.fillStyle = settings.color.dark;
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', canvas.width / 2, canvas.height / 2);
        ctx.font = '10px Arial';
        ctx.fillText('(Simulated)', canvas.width / 2, canvas.height / 2 + 15);
        
        // 转换为Data URL
        return canvas.toDataURL('image/png');
    }

    /**
     * 创建条形码图像（模拟实现）
     * 注意：这是一个简化的实现，实际项目中应使用专业库
     * @param {string} content - 条形码内容
     * @param {string} format - 条形码格式
     * @param {Object} settings - 条形码设置
     * @returns {string} - 图像Data URL
     */
    _createBarcodeImage(content, format, settings) {
        // 创建Canvas元素
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置Canvas尺寸
        canvas.width = settings.width;
        canvas.height = settings.height;
        
        // 填充背景
        ctx.fillStyle = settings.color.light;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制简化的条形码
        ctx.fillStyle = settings.color.dark;
        
        // 模拟条形码线条 - 实际应该根据不同格式的编码规则生成
        const margin = 20;
        const barHeight = canvas.height - margin * 2 - (settings.textPosition !== 'none' ? settings.fontSize + 5 : 0);
        const barWidth = (canvas.width - margin * 2) / (content.length * 2);
        
        // 随机生成一些线条模拟条形码
        for (let i = 0; i < content.length * 2; i++) {
            const barLength = Math.random() > 0.3 ? 1 : 0.6; // 随机生成不同长度的线条
            ctx.fillRect(
                margin + i * barWidth,
                margin,
                barWidth * 0.8,
                barHeight * barLength
            );
        }
        
        // 绘制条形码文本
        if (settings.textPosition !== 'none') {
            ctx.font = `${settings.fontSize}px Arial`;
            ctx.fillStyle = settings.color.dark;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            const y = settings.textPosition === 'top' ? margin : margin + barHeight + 5;
            ctx.fillText(content, canvas.width / 2, y);
        }
        
        // 转换为Data URL
        return canvas.toDataURL('image/png');
    }

    /**
     * 绘制二维码定位图案
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} size - 图案大小
     * @param {string} color - 颜色
     */
    _drawPositionPattern(ctx, x, y, size, color) {
        const innerSize = size * 0.6;
        const innerX = x + size * 0.2;
        const innerY = y + size * 0.2;
        
        ctx.fillStyle = color;
        ctx.fillRect(x, y, size, size);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(innerX, innerY, innerSize, innerSize);
        
        ctx.fillStyle = color;
        ctx.fillRect(innerX + innerSize * 0.2, innerY + innerSize * 0.2, innerSize * 0.6, innerSize * 0.6);
    }

    /**
     * 获取支持的条形码格式列表
     * @returns {Array<string>} - 支持的格式列表
     */
    getSupportedFormats() {
        return this.supportedFormats;
    }

    /**
     * 设置默认二维码选项
     * @param {Object} options - 二维码选项
     */
    setDefaultQRCodeOptions(options) {
        this.qrCodeSettings = { ...this.qrCodeSettings, ...options };
    }

    /**
     * 设置默认条形码选项
     * @param {Object} options - 条形码选项
     */
    setDefaultBarcodeOptions(options) {
        this.barcodeSettings = { ...this.barcodeSettings, ...options };
    }
}

// 全局QRCodeManager实例
let qrCodeManager;

/**
 * 初始化二维码管理器
 * @returns {QRCodeManager} - 二维码管理器实例
 */
function initQRCodeManager() {
    if (!qrCodeManager) {
        qrCodeManager = new QRCodeManager();
    }
    return qrCodeManager;
}

/**
 * 获取二维码管理器实例
 * @returns {QRCodeManager} - 二维码管理器实例
 */
function getQRCodeManager() {
    if (!qrCodeManager) {
        throw new Error('二维码管理器尚未初始化');
    }
    return qrCodeManager;
}

// 导出函数
window.initQRCodeManager = initQRCodeManager;
window.getQRCodeManager = getQRCodeManager;