/**
 * 商品管理模块
 * 提供商品的增删改查、分类管理、库存预警等功能
 */
class ProductManager {
    constructor(db) {
        this.db = db;
        this.categories = [];
        this.loadCategories();
    }

    /**
     * 加载商品分类数据
     */
    async loadCategories() {
        try {
            await this.db.connect();
            const categories = await this.db.query('categories', {});
            
            // 如果没有分类数据，创建默认分类
            if (!categories || categories.length === 0) {
                const defaultCategories = [
                    { name: '食品饮料', color: '#FF6B6B' },
                    { name: '日用百货', color: '#4ECDC4' },
                    { name: '电子产品', color: '#45B7D1' },
                    { name: '服装鞋帽', color: '#F7DC6F' },
                    { name: '家居用品', color: '#BB8FCE' },
                    { name: '其他商品', color: '#85C1E9' }
                ];
                
                for (const category of defaultCategories) {
                    await this.db.add('categories', category);
                }
                this.categories = defaultCategories;
            } else {
                this.categories = categories;
            }
        } catch (error) {
            console.error('加载商品分类失败:', error);
            this.categories = [];
        }
    }

    /**
     * 添加新商品
     * @param {Object} productData - 商品数据
     * @returns {Promise<Object>} - 新增的商品对象
     */
    async addProduct(productData) {
        try {
            await this.db.connect();
            
            // 验证必填字段
            if (!productData.name || !productData.barcode) {
                throw new Error('商品名称和条形码不能为空');
            }
            
            // 检查条形码是否已存在
            const existingProduct = await this.db.getByIndex('products', 'barcode', productData.barcode);
            if (existingProduct) {
                throw new Error('该条形码已存在');
            }
            
            // 构建商品对象
            const product = {
                name: productData.name,
                barcode: productData.barcode,
                category: productData.category || '',
                unit: productData.unit || '个',
                purchasePrice: parseFloat(productData.purchasePrice) || 0,
                sellingPrice: parseFloat(productData.sellingPrice) || 0,
                stock: parseInt(productData.stock) || 0,
                stockAlertThreshold: parseInt(productData.stockAlertThreshold) || 10,
                supplier: productData.supplier || '',
                description: productData.description || '',
                image: productData.image || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active' // active, inactive, deleted
            };
            
            // 添加到数据库
            const newProduct = await this.db.add('products', product);
            
            showToast('商品添加成功', 'success');
            return newProduct;
        } catch (error) {
            console.error('添加商品失败:', error);
            showToast(`添加商品失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 更新商品信息
     * @param {string} productId - 商品ID
     * @param {Object} productData - 更新的商品数据
     * @returns {Promise<Object>} - 更新后的商品对象
     */
    async updateProduct(productId, productData) {
        try {
            await this.db.connect();
            
            // 获取现有商品
            const product = await this.db.getById('products', productId);
            if (!product) {
                throw new Error('商品不存在');
            }
            
            // 如果更新条形码，检查新条形码是否已被其他商品使用
            if (productData.barcode && productData.barcode !== product.barcode) {
                const existingProduct = await this.db.getByIndex('products', 'barcode', productData.barcode);
                if (existingProduct && existingProduct.id !== productId) {
                    throw new Error('该条形码已被其他商品使用');
                }
            }
            
            // 更新商品信息
            const updatedProduct = {
                ...product,
                ...productData,
                updatedAt: new Date().toISOString()
            };
            
            // 转换数值类型
            if (productData.purchasePrice !== undefined) {
                updatedProduct.purchasePrice = parseFloat(productData.purchasePrice) || 0;
            }
            if (productData.sellingPrice !== undefined) {
                updatedProduct.sellingPrice = parseFloat(productData.sellingPrice) || 0;
            }
            if (productData.stock !== undefined) {
                updatedProduct.stock = parseInt(productData.stock) || 0;
            }
            if (productData.stockAlertThreshold !== undefined) {
                updatedProduct.stockAlertThreshold = parseInt(productData.stockAlertThreshold) || 10;
            }
            
            // 保存更新
            await this.db.update('products', updatedProduct);
            
            // 检查是否需要触发库存预警
            if (updatedProduct.stock <= updatedProduct.stockAlertThreshold && product.stock > product.stockAlertThreshold) {
                setTimeout(() => {
                    showToast(`警告：商品 ${updatedProduct.name} 库存不足`, 'warning');
                }, 500);
            }
            
            showToast('商品更新成功', 'success');
            return updatedProduct;
        } catch (error) {
            console.error('更新商品失败:', error);
            showToast(`更新商品失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 删除商品
     * @param {string} productId - 商品ID
     * @returns {Promise<boolean>} - 是否删除成功
     */
    async deleteProduct(productId) {
        try {
            await this.db.connect();
            
            // 获取商品
            const product = await this.db.getById('products', productId);
            if (!product) {
                throw new Error('商品不存在');
            }
            
            // 检查是否有库存
            if (product.stock > 0) {
                throw new Error('商品还有库存，无法删除');
            }
            
            // 执行软删除
            product.status = 'deleted';
            product.deletedAt = new Date().toISOString();
            await this.db.update('products', product);
            
            showToast('商品删除成功', 'success');
            return true;
        } catch (error) {
            console.error('删除商品失败:', error);
            showToast(`删除商品失败: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 批量删除商品
     * @param {Array<string>} productIds - 商品ID数组
     * @returns {Promise<Object>} - 删除结果
     */
    async batchDeleteProducts(productIds) {
        try {
            await this.db.connect();
            
            const results = {
                success: 0,
                failed: 0,
                failedIds: []
            };
            
            for (const productId of productIds) {
                try {
                    const product = await this.db.getById('products', productId);
                    
                    if (!product || product.status === 'deleted') {
                        results.failed++;
                        results.failedIds.push({ id: productId, reason: '商品不存在或已删除' });
                        continue;
                    }
                    
                    if (product.stock > 0) {
                        results.failed++;
                        results.failedIds.push({ id: productId, reason: '商品还有库存，无法删除' });
                        continue;
                    }
                    
                    // 执行软删除
                    product.status = 'deleted';
                    product.deletedAt = new Date().toISOString();
                    await this.db.update('products', product);
                    
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.failedIds.push({ id: productId, reason: error.message });
                }
            }
            
            showToast(`批量删除完成：成功 ${results.success} 项，失败 ${results.failed} 项`, 
                results.failed > 0 ? 'warning' : 'success');
            
            return results;
        } catch (error) {
            console.error('批量删除商品失败:', error);
            showToast('批量删除操作失败', 'error');
            throw error;
        }
    }

    /**
     * 根据ID获取商品
     * @param {string} productId - 商品ID
     * @returns {Promise<Object|null>} - 商品对象或null
     */
    async getProductById(productId) {
        try {
            await this.db.connect();
            return await this.db.getById('products', productId);
        } catch (error) {
            console.error('获取商品失败:', error);
            return null;
        }
    }

    /**
     * 根据条形码获取商品
     * @param {string} barcode - 条形码
     * @returns {Promise<Object|null>} - 商品对象或null
     */
    async getProductByBarcode(barcode) {
        try {
            await this.db.connect();
            return await this.db.getByIndex('products', 'barcode', barcode);
        } catch (error) {
            console.error('获取商品失败:', error);
            return null;
        }
    }

    /**
     * 搜索商品
     * @param {Object} filters - 搜索条件
     * @param {number} page - 页码
     * @param {number} pageSize - 每页数量
     * @returns {Promise<Object>} - 搜索结果和分页信息
     */
    async searchProducts(filters = {}, page = 1, pageSize = 20) {
        try {
            await this.db.connect();
            
            // 构建查询条件
            const query = {
                status: { $ne: 'deleted' }
            };
            
            // 添加搜索条件
            if (filters.keyword) {
                query.$or = [
                    { name: { $like: `%${filters.keyword}%` } },
                    { barcode: { $like: `%${filters.keyword}%` } },
                    { description: { $like: `%${filters.keyword}%` } }
                ];
            }
            
            if (filters.category) {
                query.category = filters.category;
            }
            
            if (filters.minStock !== undefined) {
                query.stock = { $gte: parseInt(filters.minStock) };
            }
            
            if (filters.maxStock !== undefined) {
                if (!query.stock) query.stock = {};
                query.stock.$lte = parseInt(filters.maxStock);
            }
            
            if (filters.status) {
                query.status = filters.status;
            }
            
            // 排序条件
            const sort = filters.sortBy || 'createdAt';
            const order = filters.order || 'desc';
            
            // 执行查询
            const result = await this.db.paginate('products', query, page, pageSize, sort, order);
            
            return result;
        } catch (error) {
            console.error('搜索商品失败:', error);
            return {
                items: [],
                total: 0,
                page: page,
                pageSize: pageSize,
                totalPages: 0
            };
        }
    }

    /**
     * 获取库存预警商品
     * @returns {Promise<Array>} - 库存预警商品列表
     */
    async getLowStockProducts() {
        try {
            await this.db.connect();
            
            // 获取所有活跃商品
            const products = await this.db.query('products', { status: 'active' });
            
            // 过滤出库存不足的商品
            const lowStockProducts = products.filter(product => 
                product.stock <= product.stockAlertThreshold
            );
            
            // 按库存比例排序（最紧急的排在前面）
            lowStockProducts.sort((a, b) => {
                const ratioA = a.stock / a.stockAlertThreshold;
                const ratioB = b.stock / b.stockAlertThreshold;
                return ratioA - ratioB;
            });
            
            return lowStockProducts;
        } catch (error) {
            console.error('获取库存预警商品失败:', error);
            return [];
        }
    }

    /**
     * 获取商品统计信息
     * @param {Object} filters - 过滤条件
     * @returns {Promise<Object>} - 统计结果
     */
    async getProductStatistics(filters = {}) {
        try {
            await this.db.connect();
            
            // 查询条件
            const query = { status: 'active' };
            if (filters.category) {
                query.category = filters.category;
            }
            
            // 获取商品列表
            const products = await this.db.query('products', query);
            
            // 计算统计数据
            const totalProducts = products.length;
            const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
            const totalValue = products.reduce((sum, p) => sum + (p.stock || 0) * (p.sellingPrice || 0), 0);
            const lowStockCount = products.filter(p => p.stock <= p.stockAlertThreshold).length;
            
            // 按分类统计
            const categoryStats = {};
            products.forEach(product => {
                const category = product.category || '未分类';
                if (!categoryStats[category]) {
                    categoryStats[category] = {
                        productCount: 0,
                        stockCount: 0,
                        value: 0
                    };
                }
                categoryStats[category].productCount++;
                categoryStats[category].stockCount += product.stock || 0;
                categoryStats[category].value += (product.stock || 0) * (product.sellingPrice || 0);
            });
            
            // 按价格区间统计
            const priceRanges = {
                '0-50': 0,
                '50-200': 0,
                '200-500': 0,
                '500-1000': 0,
                '1000+': 0
            };
            
            products.forEach(product => {
                const price = product.sellingPrice || 0;
                if (price < 50) priceRanges['0-50']++;
                else if (price < 200) priceRanges['50-200']++;
                else if (price < 500) priceRanges['200-500']++;
                else if (price < 1000) priceRanges['500-1000']++;
                else priceRanges['1000+']++;
            });
            
            return {
                totalProducts,
                totalStock,
                totalValue,
                lowStockCount,
                categoryDistribution: categoryStats,
                priceDistribution: priceRanges,
                averagePrice: totalProducts > 0 ? totalValue / totalStock : 0
            };
        } catch (error) {
            console.error('获取商品统计失败:', error);
            return null;
        }
    }

    /**
     * 导出商品数据
     * @param {Array<Object>} products - 要导出的商品列表
     * @returns {string} - CSV格式的商品数据
     */
    exportProducts(products) {
        if (!products || products.length === 0) {
            return '';
        }
        
        // CSV头部
        const headers = [
            '商品名称', '条形码', '分类', '单位', '采购价', '销售价', 
            '库存', '库存预警值', '供应商', '创建时间', '更新时间', '状态'
        ];
        
        const csvContent = [headers.join(',')];
        
        // CSV数据行
        products.forEach(product => {
            const row = [
                `"${product.name || ''}"`,
                product.barcode || '',
                product.category || '',
                product.unit || '',
                product.purchasePrice || 0,
                product.sellingPrice || 0,
                product.stock || 0,
                product.stockAlertThreshold || 0,
                `"${product.supplier || ''}"`,
                product.createdAt || '',
                product.updatedAt || '',
                product.status === 'active' ? '活跃' : '停用'
            ];
            csvContent.push(row.join(','));
        });
        
        return csvContent.join('\n');
    }

    /**
     * 获取所有分类
     * @returns {Promise<Array>} - 分类列表
     */
    async getAllCategories() {
        if (this.categories.length === 0) {
            await this.loadCategories();
        }
        return this.categories;
    }

    /**
     * 添加新分类
     * @param {Object} categoryData - 分类数据
     * @returns {Promise<Object>} - 新增的分类
     */
    async addCategory(categoryData) {
        try {
            await this.db.connect();
            
            // 检查分类名是否已存在
            const existingCategory = await this.db.query('categories', {
                name: categoryData.name
            });
            
            if (existingCategory && existingCategory.length > 0) {
                throw new Error('该分类名已存在');
            }
            
            // 创建分类
            const category = {
                name: categoryData.name,
                color: categoryData.color || this._generateCategoryColor(),
                createdAt: new Date().toISOString()
            };
            
            const newCategory = await this.db.add('categories', category);
            this.categories.push(newCategory);
            
            showToast('分类添加成功', 'success');
            return newCategory;
        } catch (error) {
            console.error('添加分类失败:', error);
            showToast(`添加分类失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 更新分类
     * @param {string} categoryId - 分类ID
     * @param {Object} categoryData - 更新数据
     * @returns {Promise<Object>} - 更新后的分类
     */
    async updateCategory(categoryId, categoryData) {
        try {
            await this.db.connect();
            
            // 获取分类
            const category = await this.db.getById('categories', categoryId);
            if (!category) {
                throw new Error('分类不存在');
            }
            
            // 检查新名称是否已被其他分类使用
            if (categoryData.name && categoryData.name !== category.name) {
                const existingCategory = await this.db.query('categories', {
                    name: categoryData.name
                });
                
                if (existingCategory && existingCategory.length > 0) {
                    throw new Error('该分类名已存在');
                }
            }
            
            // 更新分类
            const updatedCategory = {
                ...category,
                ...categoryData,
                updatedAt: new Date().toISOString()
            };
            
            await this.db.update('categories', updatedCategory);
            
            // 更新本地缓存
            const index = this.categories.findIndex(c => c.id === categoryId);
            if (index !== -1) {
                this.categories[index] = updatedCategory;
            }
            
            // 如果更新了分类名称，同步更新相关商品的分类名
            if (categoryData.name && categoryData.name !== category.name) {
                const products = await this.db.query('products', {
                    category: category.name
                });
                
                for (const product of products) {
                    product.category = categoryData.name;
                    await this.db.update('products', product);
                }
            }
            
            showToast('分类更新成功', 'success');
            return updatedCategory;
        } catch (error) {
            console.error('更新分类失败:', error);
            showToast(`更新分类失败: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * 删除分类
     * @param {string} categoryId - 分类ID
     * @returns {Promise<boolean>} - 是否删除成功
     */
    async deleteCategory(categoryId) {
        try {
            await this.db.connect();
            
            // 获取分类
            const category = await this.db.getById('categories', categoryId);
            if (!category) {
                throw new Error('分类不存在');
            }
            
            // 检查是否有商品使用该分类
            const products = await this.db.query('products', {
                category: category.name,
                status: 'active'
            });
            
            if (products && products.length > 0) {
                throw new Error(`该分类下还有 ${products.length} 个商品，无法删除`);
            }
            
            // 删除分类
            await this.db.delete('categories', categoryId);
            
            // 更新本地缓存
            this.categories = this.categories.filter(c => c.id !== categoryId);
            
            showToast('分类删除成功', 'success');
            return true;
        } catch (error) {
            console.error('删除分类失败:', error);
            showToast(`删除分类失败: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * 生成分类颜色
     * @returns {string} - 十六进制颜色值
     */
    _generateCategoryColor() {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', 
            '#BB8FCE', '#85C1E9', '#82E0AA', '#F8C471'
        ];
        
        // 计算已使用的颜色
        const usedColors = this.categories.map(c => c.color);
        const unusedColors = colors.filter(color => !usedColors.includes(color));
        
        // 如果有未使用的颜色，使用第一个未使用的
        if (unusedColors.length > 0) {
            return unusedColors[0];
        }
        
        // 否则随机生成一个颜色
        return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    }

    /**
     * 批量导入商品
     * @param {Array<Object>} productsData - 商品数据数组
     * @returns {Promise<Object>} - 导入结果
     */
    async importProducts(productsData) {
        try {
            await this.db.connect();
            
            const results = {
                success: 0,
                failed: 0,
                failedItems: []
            };
            
            for (const data of productsData) {
                try {
                    // 验证必填字段
                    if (!data.name || !data.barcode) {
                        throw new Error('商品名称和条形码不能为空');
                    }
                    
                    // 检查是否已存在
                    const existingProduct = await this.db.getByIndex('products', 'barcode', data.barcode);
                    
                    if (existingProduct) {
                        // 更新现有商品
                        const updatedProduct = {
                            ...existingProduct,
                            name: data.name,
                            category: data.category || '',
                            unit: data.unit || '个',
                            purchasePrice: parseFloat(data.purchasePrice) || 0,
                            sellingPrice: parseFloat(data.sellingPrice) || 0,
                            stock: parseInt(data.stock) || 0,
                            stockAlertThreshold: parseInt(data.stockAlertThreshold) || 10,
                            supplier: data.supplier || '',
                            description: data.description || '',
                            updatedAt: new Date().toISOString()
                        };
                        
                        await this.db.update('products', updatedProduct);
                    } else {
                        // 添加新商品
                        await this.addProduct(data);
                    }
                    
                    results.success++;
                } catch (error) {
                    results.failed++;
                    results.failedItems.push({
                        data,
                        error: error.message
                    });
                }
            }
            
            showToast(`商品导入完成：成功 ${results.success} 项，失败 ${results.failed} 项`, 
                results.failed > 0 ? 'warning' : 'success');
            
            return results;
        } catch (error) {
            console.error('导入商品失败:', error);
            showToast('导入操作失败', 'error');
            throw error;
        }
    }
}

// 全局ProductManager实例
let productManager;

/**
 * 初始化商品管理器
 * @param {Object} db - 数据库实例
 * @returns {ProductManager} - 商品管理器实例
 */
function initProductManager(db) {
    if (!productManager) {
        productManager = new ProductManager(db);
    }
    return productManager;
}

/**
 * 获取商品管理器实例
 * @returns {ProductManager} - 商品管理器实例
 */
function getProductManager() {
    if (!productManager) {
        throw new Error('商品管理器尚未初始化');
    }
    return productManager;
}

// 导出函数
window.initProductManager = initProductManager;
window.getProductManager = getProductManager;