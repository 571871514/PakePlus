/**
 * 移动端交互优化模块
 * 处理触摸事件、手势操作、性能优化等
 */
class MobileOptimizer {
    constructor() {
        this.swipeThreshold = 50; // 滑动阈值
        this.tapThreshold = 200; // 点击阈值（毫秒）
        this.currentTouch = null;
        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.isScrolling = false;
        this.swipeCallbacks = new Map();
        this.tapCallbacks = new Map();
        this.longPressCallbacks = new Map();
        this.longPressTimer = null;
        this.longPressThreshold = 500; // 长按阈值
        
        // 性能优化相关
        this.rafIds = [];
        this.isOnline = navigator.onLine;
        this.isLowEndDevice = this.detectLowEndDevice();
        
        this.init();
    }
    
    /**
     * 初始化移动端优化
     */
    init() {
        this.setupTouchEvents();
        this.setupOfflineDetection();
        this.setupPerformanceOptimizations();
        this.setupScrollOptimizations();
        this.setupInputOptimizations();
    }
    
    /**
     * 设置触摸事件处理
     */
    setupTouchEvents() {
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: true });
    }
    
    /**
     * 触摸开始处理
     */
    handleTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        this.currentTouch = touch;
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();
        this.isScrolling = false;
        
        // 清除之前的长按定时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
        
        // 设置长按定时器
        this.longPressTimer = setTimeout(() => {
            this.triggerLongPress(touch.target);
        }, this.longPressThreshold);
    }
    
    /**
     * 触摸移动处理
     */
    handleTouchMove(e) {
        if (!this.currentTouch || e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const diffX = Math.abs(touch.clientX - this.startX);
        const diffY = Math.abs(touch.clientY - this.startY);
        
        // 确定是否为滚动操作
        if (!this.isScrolling && (diffY > 10 || diffX > 10)) {
            this.isScrolling = true;
            // 清除长按定时器
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        }
        
        // 检查是否需要阻止默认行为（例如实现自定义滑动组件时）
        const target = this.getEventTarget(e);
        if (this.swipeCallbacks.has(target) && diffX > diffY * 2) {
            // 水平滑动占主导，可能需要阻止垂直滚动
            // e.preventDefault(); // 根据具体场景启用
        }
    }
    
    /**
     * 触摸结束处理
     */
    handleTouchEnd(e) {
        if (!this.currentTouch) return;
        
        // 清除长按定时器
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        const touch = e.changedTouches[0];
        const diffX = touch.clientX - this.startX;
        const diffY = touch.clientY - this.startY;
        const timeDiff = Date.now() - this.startTime;
        
        const target = this.getEventTarget(e);
        
        // 检测点击事件
        if (!this.isScrolling && Math.abs(diffX) < 10 && Math.abs(diffY) < 10 && timeDiff < this.tapThreshold) {
            this.triggerTap(target);
        }
        
        // 检测滑动事件
        else if (Math.abs(diffX) > this.swipeThreshold && Math.abs(diffX) > Math.abs(diffY) * 2) {
            if (diffX > 0) {
                this.triggerSwipe(target, 'right');
            } else {
                this.triggerSwipe(target, 'left');
            }
        }
        
        this.resetTouchState();
    }
    
    /**
     * 触摸取消处理
     */
    handleTouchCancel() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.resetTouchState();
    }
    
    /**
     * 重置触摸状态
     */
    resetTouchState() {
        this.currentTouch = null;
        this.startX = 0;
        this.startY = 0;
        this.startTime = 0;
        this.isScrolling = false;
    }
    
    /**
     * 获取事件目标
     */
    getEventTarget(e) {
        return e.target.closest('[data-touch-target]') || e.target;
    }
    
    /**
     * 触发点击事件
     */
    triggerTap(target) {
        if (this.tapCallbacks.has(target)) {
            const callbacks = this.tapCallbacks.get(target);
            callbacks.forEach(callback => callback());
        }
    }
    
    /**
     * 触发滑动事件
     */
    triggerSwipe(target, direction) {
        if (this.swipeCallbacks.has(target)) {
            const callbacks = this.swipeCallbacks.get(target);
            callbacks.forEach(callback => callback(direction));
        }
    }
    
    /**
     * 触发长按事件
     */
    triggerLongPress(target) {
        if (this.longPressCallbacks.has(target)) {
            const callbacks = this.longPressCallbacks.get(target);
            callbacks.forEach(callback => callback());
        }
    }
    
    /**
     * 添加点击监听器
     */
    onTap(element, callback) {
        if (!this.tapCallbacks.has(element)) {
            this.tapCallbacks.set(element, []);
        }
        this.tapCallbacks.get(element).push(callback);
    }
    
    /**
     * 添加滑动监听器
     */
    onSwipe(element, callback) {
        if (!this.swipeCallbacks.has(element)) {
            this.swipeCallbacks.set(element, []);
        }
        this.swipeCallbacks.get(element).push(callback);
    }
    
    /**
     * 添加长按监听器
     */
    onLongPress(element, callback) {
        if (!this.longPressCallbacks.has(element)) {
            this.longPressCallbacks.set(element, []);
        }
        this.longPressCallbacks.get(element).push(callback);
    }
    
    /**
     * 设置离线检测
     */
    setupOfflineDetection() {
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // 初始检查
        this.updateOfflineIndicator();
    }
    
    /**
     * 处理在线状态
     */
    handleOnline() {
        this.isOnline = true;
        this.updateOfflineIndicator();
        this.showToast('网络已连接', 'success');
    }
    
    /**
     * 处理离线状态
     */
    handleOffline() {
        this.isOnline = false;
        this.updateOfflineIndicator();
        this.showToast('当前处于离线状态', 'warning');
    }
    
    /**
     * 更新离线指示器
     */
    updateOfflineIndicator() {
        let indicator = document.querySelector('.offline-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'offline-indicator';
            indicator.textContent = '离线模式';
            document.body.appendChild(indicator);
        }
        
        if (!this.isOnline) {
            indicator.classList.add('offline');
        } else {
            indicator.classList.remove('offline');
        }
    }
    
    /**
     * 设置性能优化
     */
    setupPerformanceOptimizations() {
        // 减少布局抖动
        this.debounceResize();
        
        // 图片懒加载
        this.setupImageLazyLoading();
        
        // 低性能设备检测与优化
        if (this.isLowEndDevice) {
            this.applyLowEndDeviceOptimizations();
        }
    }
    
    /**
     * 检测是否为低端设备
     */
    detectLowEndDevice() {
        const memory = navigator.deviceMemory || 0;
        const cores = navigator.hardwareConcurrency || 0;
        const screen = window.screen;
        const dpr = window.devicePixelRatio || 1;
        const totalPixels = screen.width * screen.height * dpr * dpr;
        
        // 简单的低端设备检测逻辑
        return memory < 2 || cores < 2 || totalPixels > 4e6;
    }
    
    /**
     * 应用低端设备优化
     */
    applyLowEndDeviceOptimizations() {
        // 禁用动画
        document.documentElement.classList.add('reduce-motion');
        
        // 降低事件监听器复杂度
        this.tapThreshold = 250;
        this.swipeThreshold = 80;
        
        // 优化渲染性能
        this.disableExpensiveEffects();
    }
    
    /**
     * 禁用昂贵的视觉效果
     */
    disableExpensiveEffects() {
        const styles = document.createElement('style');
        styles.textContent = `
            * {
                box-shadow: none !important;
                text-shadow: none !important;
            }
            
            .gradient-bg {
                background: #4CAF50 !important;
            }
            
            .animate,
            .scan-line {
                animation: none !important;
            }
        `;
        document.head.appendChild(styles);
    }
    
    /**
     * 设置滚动优化
     */
    setupScrollOptimizations() {
        // 滚动节流
        this.throttleScroll();
        
        // 滚动事件性能优化
        this.optimizeScrollEvents();
    }
    
    /**
     * 节流滚动事件
     */
    throttleScroll() {
        let lastScrollTime = 0;
        const throttleTime = 16; // ~60fps
        
        const originalScroll = window.onscroll;
        window.onscroll = (e) => {
            const now = Date.now();
            if (now - lastScrollTime >= throttleTime) {
                lastScrollTime = now;
                if (originalScroll) originalScroll(e);
                this.handleOptimizedScroll(e);
            }
        };
    }
    
    /**
     * 优化滚动事件处理
     */
    handleOptimizedScroll(e) {
        // 这里可以添加滚动相关的优化逻辑
        this.updateHeaderStyleOnScroll();
        this.checkElementVisibilityOnScroll();
    }
    
    /**
     * 根据滚动更新头部样式
     */
    updateHeaderStyleOnScroll() {
        const header = document.querySelector('.header');
        if (header) {
            if (window.scrollY > 50) {
                header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                header.style.background = 'rgba(76, 175, 80, 0.95)';
            } else {
                header.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                header.style.background = '#4CAF50';
            }
        }
    }
    
    /**
     * 滚动时检查元素可见性
     */
    checkElementVisibilityOnScroll() {
        // 可以在这里实现懒加载、无限滚动等功能
    }
    
    /**
     * 设置输入优化
     */
    setupInputOptimizations() {
        // 防止输入框自动大写
        this.preventAutoCapitalize();
        
        // 优化键盘交互
        this.optimizeKeyboardInteraction();
    }
    
    /**
     * 防止自动大写
     */
    preventAutoCapitalize() {
        document.querySelectorAll('input[type="text"], textarea').forEach(input => {
            input.setAttribute('autocapitalize', 'none');
            input.setAttribute('autocorrect', 'off');
        });
    }
    
    /**
     * 优化键盘交互
     */
    optimizeKeyboardInteraction() {
        // 处理键盘弹出时的布局调整
        window.addEventListener('resize', () => {
            if (window.innerHeight < window.outerHeight * 0.8) {
                // 键盘可能弹出
                this.handleKeyboardVisible();
            } else {
                // 键盘可能收起
                this.handleKeyboardHidden();
            }
        });
    }
    
    /**
     * 处理键盘可见
     */
    handleKeyboardVisible() {
        // 可以在这里调整布局，确保输入框可见
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            setTimeout(() => {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
    
    /**
     * 处理键盘隐藏
     */
    handleKeyboardHidden() {
        // 键盘隐藏时的处理
    }
    
    /**
     * 设置图片懒加载
     */
    setupImageLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                            
                            // 添加图片加载完成的处理
                            img.onload = () => {
                                img.classList.add('loaded');
                            };
                        }
                    }
                });
            }, {
                rootMargin: '50px',
                threshold: 0.01
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // 降级处理
            this.lazyLoadImagesFallback();
        }
    }
    
    /**
     * 图片懒加载降级方案
     */
    lazyLoadImagesFallback() {
        setTimeout(() => {
            document.querySelectorAll('img[data-src]').forEach(img => {
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                }
            });
        }, 200);
    }
    
    /**
     * 防抖窗口大小改变事件
     */
    debounceResize() {
        let resizeTimer;
        const originalResize = window.onresize;
        
        window.onresize = (e) => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (originalResize) originalResize(e);
                this.handleDebouncedResize();
            }, 250);
        };
    }
    
    /**
     * 处理防抖后的窗口大小改变
     */
    handleDebouncedResize() {
        // 这里可以添加响应式布局调整逻辑
        this.updateResponsiveLayout();
    }
    
    /**
     * 更新响应式布局
     */
    updateResponsiveLayout() {
        // 根据屏幕尺寸调整布局
        const screenWidth = window.innerWidth;
        const isSmallScreen = screenWidth < 375;
        
        // 可以在这里动态调整字体大小、间距等
        if (isSmallScreen) {
            document.documentElement.style.fontSize = '14px';
        } else {
            document.documentElement.style.fontSize = '16px';
        }
    }
    
    /**
     * 显示提示消息
     */
    showToast(message, type = 'info') {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        
        toast.textContent = message;
        toast.className = `toast ${type}`;
        
        // 使用requestAnimationFrame确保平滑动画
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // 3秒后隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    /**
     * 使用requestAnimationFrame优化动画
     */
    animate(callback) {
        const id = requestAnimationFrame(() => {
            callback();
        });
        this.rafIds.push(id);
        return id;
    }
    
    /**
     * 取消动画
     */
    cancelAnimation(id) {
        if (id) {
            cancelAnimationFrame(id);
            const index = this.rafIds.indexOf(id);
            if (index > -1) {
                this.rafIds.splice(index, 1);
            }
        }
    }
    
    /**
     * 取消所有动画
     */
    cancelAllAnimations() {
        this.rafIds.forEach(id => cancelAnimationFrame(id));
        this.rafIds = [];
    }
    
    /**
     * 注册滑动删除功能
     */
    registerSwipeActions(element, options = {}) {
        const { onEdit, onDelete } = options;
        
        this.onSwipe(element, (direction) => {
            if (direction === 'left') {
                // 显示删除按钮
                element.querySelector('.swipe-action-content').style.transform = 'translateX(-120px)';
            } else if (direction === 'right') {
                // 隐藏删除按钮
                element.querySelector('.swipe-action-content').style.transform = 'translateX(0)';
            }
        });
        
        // 绑定编辑和删除按钮事件
        const editBtn = element.querySelector('.swipe-action-edit');
        const deleteBtn = element.querySelector('.swipe-action-delete');
        
        if (editBtn && onEdit) {
            editBtn.addEventListener('click', () => {
                onEdit();
                element.querySelector('.swipe-action-content').style.transform = 'translateX(0)';
            });
        }
        
        if (deleteBtn && onDelete) {
            deleteBtn.addEventListener('click', () => {
                onDelete();
                element.querySelector('.swipe-action-content').style.transform = 'translateX(0)';
            });
        }
    }
    
    /**
     * 优化触摸反馈
     */
    optimizeTouchFeedback() {
        document.querySelectorAll('button, [role="button"], .btn, .card, .grid-item, .list-item').forEach(element => {
            element.classList.add('touch-feedback');
            
            // 添加快速点击类
            element.classList.add('fast-tap');
            
            // 禁用长按菜单
            element.classList.add('no-context-menu');
        });
    }
    
    /**
     * 应用字体优化
     */
    applyFontOptimizations() {
        // 预加载关键字体
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = '/fonts/system-ui-regular.woff2'; // 假设有系统字体文件
        link.as = 'font';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        
        // 优化字体显示
        document.documentElement.style.fontSynthesis = 'none';
        document.documentElement.style.textRendering = 'optimizeLegibility';
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        this.cancelAllAnimations();
        this.swipeCallbacks.clear();
        this.tapCallbacks.clear();
        this.longPressCallbacks.clear();
        
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
    }
}

// 导出单例
const mobileOptimizer = new MobileOptimizer();
window.mobileOptimizer = mobileOptimizer;

// 当DOM加载完成后应用优化
document.addEventListener('DOMContentLoaded', () => {
    // 应用触摸反馈优化
    mobileOptimizer.optimizeTouchFeedback();
    
    // 应用字体优化
    mobileOptimizer.applyFontOptimizations();
    
    // 初始化响应式布局
    mobileOptimizer.updateResponsiveLayout();
    
    // 提示信息
    console.log('移动端优化模块已初始化');
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    mobileOptimizer.cleanup();
});

// 已通过window对象在浏览器环境中导出mobileOptimizer实例