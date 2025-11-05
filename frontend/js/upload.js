/**
 * 文件上传和文件管理模块
 * 提供图片上传、文件管理、预览编辑等功能
 */

class FileUploadManager {
    constructor(config = {}) {
        this.config = {
            // 文件类型白名单
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
            // 文件大小限制 (5MB)
            maxFileSize: 5 * 1024 * 1024,
            // 批量上传数量限制
            maxFilesPerBatch: 10,
            // 图片压缩质量 (0.1 - 1.0)
            compressionQuality: 0.8,
            // 图片最大尺寸
            maxImageWidth: 1920,
            maxImageHeight: 1080,
            // API端点
            uploadUrl: config.uploadUrl || '/api/upload',
            deleteUrl: config.deleteUrl || '/api/delete',
            listUrl: config.listUrl || '/api/files',
            // CDN配置
            cdnUrl: config.cdnUrl || '',
            // 离线缓存
            enableCache: config.enableCache !== false,
            // 重试配置
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };

        // 状态管理
        this.uploadQueue = [];
        this.uploading = false;
        this.uploadedFiles = new Map();
        this.cache = new Map();
        this.uploadProgress = new Map();

        // DOM元素
        this.dropZone = null;
        this.fileInput = null;
        this.progressContainer = null;
        this.fileList = null;

        // 事件监听
        this.listeners = new Map();

        this.init();
    }

    /**
     * 初始化上传管理器
     */
    init() {
        this.createUI();
        this.bindEvents();
        this.loadCachedFiles();
    }

    /**
     * 创建用户界面
     */
    createUI() {
        // 创建拖放区域
        this.dropZone = document.createElement('div');
        this.dropZone.className = 'upload-drop-zone';
        this.dropZone.innerHTML = `
            <div class="upload-drop-content">
                <svg class="upload-icon" viewBox="0 0 24 24">
                    <path d="M19 15v4H5v-4H3v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4h-2z"/>
                    <path d="M11 16h2V8h3l-4-5-4 5h3z"/>
                </svg>
                <p class="upload-text">拖放文件到这里，或点击选择文件</p>
                <p class="upload-hint">支持 JPG, PNG, GIF, WebP 格式，最大5MB</p>
                <input type="file" id="file-input" multiple accept="image/*" style="display: none;">
                <button type="button" class="upload-button" onclick="document.getElementById('file-input').click()">
                    选择文件
                </button>
            </div>
        `;

        // 创建进度显示容器
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'upload-progress-container';
        this.progressContainer.style.display = 'none';

        // 创建文件列表容器
        this.fileList = document.createElement('div');
        this.fileList.className = 'upload-file-list';
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 拖放事件
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));

        // 文件选择事件
        this.fileInput = document.getElementById('file-input');
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 剪贴板粘贴事件
        document.addEventListener('paste', this.handlePaste.bind(this));

        // 页面卸载前保存缓存
        window.addEventListener('beforeunload', this.saveCache.bind(this));
    }

    /**
     * 处理拖拽悬停
     */
    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    /**
     * 处理拖拽离开
     */
    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }

    /**
     * 处理文件拖放
     */
    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    /**
     * 处理文件选择
     */
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        e.target.value = ''; // 清空输入
    }

    /**
     * 处理剪贴板粘贴
     */
    handlePaste(e) {
        const items = Array.from(e.clipboardData.items);
        const files = items
            .filter(item => item.kind === 'file')
            .map(item => item.getAsFile())
            .filter(file => file);

        if (files.length > 0) {
            this.processFiles(files);
            this.showMessage('检测到剪贴板图片，正在上传...', 'info');
        }
    }

    /**
     * 处理文件列表
     */
    processFiles(files) {
        // 验证文件数量
        if (files.length > this.config.maxFilesPerBatch) {
            this.showMessage(`一次最多只能上传${this.config.maxFilesPerBatch}个文件`, 'error');
            return;
        }

        // 验证和过滤文件
        const validFiles = files.filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            return;
        }

        // 添加到上传队列
        validFiles.forEach(file => {
            this.uploadQueue.push({
                file: file,
                id: this.generateFileId(),
                status: 'pending',
                progress: 0,
                retryCount: 0
            });
        });

        // 开始上传
        this.startUpload();
    }

    /**
     * 验证文件
     */
    validateFile(file) {
        // 检查文件类型
        if (!this.config.allowedTypes.includes(file.type)) {
            this.showMessage(`不支持的文件类型: ${file.type}`, 'error');
            return false;
        }

        // 检查文件大小
        if (file.size > this.config.maxFileSize) {
            this.showMessage(`文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB (最大5MB)`, 'error');
            return false;
        }

        return true;
    }

    /**
     * 生成文件唯一ID
     */
    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 开始上传队列
     */
    async startUpload() {
        if (this.uploading) return;
        
        this.uploading = true;
        this.updateProgressContainer();

        while (this.uploadQueue.length > 0) {
            const uploadItem = this.uploadQueue.shift();
            try {
                await this.uploadFile(uploadItem);
            } catch (error) {
                console.error('上传失败:', error);
                this.handleUploadError(uploadItem, error);
            }
        }

        this.uploading = false;
        this.updateProgressContainer();
        this.refreshFileList();
    }

    /**
     * 上传单个文件
     */
    async uploadFile(uploadItem) {
        const { file, id } = uploadItem;
        
        // 更新状态
        uploadItem.status = 'uploading';
        this.updateProgressDisplay(id);

        try {
            // 压缩图片
            const compressedFile = await this.compressImage(file);
            
            // 创建FormData
            const formData = new FormData();
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(2, 15);
            const fileName = `${timestamp}_${randomStr}.${this.getFileExtension(file.name)}`;
            
            formData.append('file', compressedFile, fileName);
            formData.append('timestamp', timestamp);

            // 执行上传
            const response = await this.fetchWithRetry(this.config.uploadUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-File-Name': fileName,
                    'X-File-Size': file.size,
                    'X-File-Type': file.type
                }
            }, uploadItem.retryCount);

            const result = await response.json();

            if (result.success) {
                // 上传成功
                uploadItem.status = 'completed';
                uploadItem.result = result;
                this.uploadedFiles.set(id, {
                    ...uploadItem,
                    url: result.url,
                    cdnUrl: result.cdnUrl || result.url,
                    fileName: fileName,
                    originalName: file.name,
                    size: file.size,
                    type: file.type,
                    uploadTime: new Date().toISOString()
                });

                this.showMessage('文件上传成功', 'success');
            } else {
                throw new Error(result.message || '上传失败');
            }

        } catch (error) {
            throw error;
        } finally {
            this.updateProgressDisplay(id);
        }
    }

    /**
     * 图片压缩
     */
    async compressImage(file) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // 计算压缩后尺寸
                let { width, height } = img;
                
                if (width > this.config.maxImageWidth || height > this.config.maxImageHeight) {
                    const ratio = Math.min(
                        this.config.maxImageWidth / width,
                        this.config.maxImageHeight / height
                    );
                    width *= ratio;
                    height *= ratio;
                }

                // 设置画布尺寸
                canvas.width = width;
                canvas.height = height;

                // 绘制压缩后图片
                ctx.drawImage(img, 0, 0, width, height);

                // 转换为Blob
                canvas.toBlob((blob) => {
                    resolve(blob || file);
                }, file.type, this.config.compressionQuality);
            };

            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * 带重试的网络请求
     */
    async fetchWithRetry(url, options, retryCount = 0) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response;
        } catch (error) {
            if (retryCount < this.config.retryAttempts) {
                await this.delay(this.config.retryDelay * Math.pow(2, retryCount));
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 处理上传错误
     */
    handleUploadError(uploadItem, error) {
        uploadItem.status = 'error';
        uploadItem.error = error.message;
        uploadItem.retryCount++;

        if (uploadItem.retryCount <= this.config.retryAttempts) {
            uploadItem.status = 'retry';
            this.uploadQueue.push(uploadItem);
            this.showMessage(`上传失败，${this.config.retryAttempts - uploadItem.retryCount + 1}秒后重试...`, 'warning');
            setTimeout(() => this.startUpload(), this.config.retryDelay);
        } else {
            this.showMessage(`上传失败: ${error.message}`, 'error');
        }

        this.updateProgressDisplay(uploadItem.id);
    }

    /**
     * 更新进度显示
     */
    updateProgressDisplay(fileId) {
        const uploadItem = this.uploadQueue.find(item => item.id === fileId) || 
                          Array.from(this.uploadedFiles.values()).find(item => item.id === fileId);

        if (!uploadItem) return;

        const progressElement = document.getElementById(`progress-${fileId}`);
        if (!progressElement) return;

        const { status, progress } = uploadItem;
        const progressBar = progressElement.querySelector('.progress-bar');
        const statusText = progressElement.querySelector('.progress-status');
        const actionButtons = progressElement.querySelector('.action-buttons');

        // 更新进度条
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.className = `progress-bar ${status}`;
        }

        // 更新状态文本
        if (statusText) {
            const statusMessages = {
                pending: '等待上传...',
                uploading: `上传中 ${progress}%`,
                completed: '上传完成',
                error: '上传失败',
                retry: '重试中...'
            };
            statusText.textContent = statusMessages[status] || status;
        }

        // 更新操作按钮
        if (actionButtons) {
            actionButtons.innerHTML = '';
            
            if (status === 'completed') {
                actionButtons.innerHTML = `
                    <button class="btn btn-sm btn-outline" onclick="fileUploadManager.previewFile('${fileId}')" title="预览">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="fileUploadManager.downloadFile('${fileId}')" title="下载">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="fileUploadManager.deleteFile('${fileId}')" title="删除">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                `;
            } else if (status === 'error') {
                actionButtons.innerHTML = `
                    <button class="btn btn-sm btn-warning" onclick="fileUploadManager.retryUpload('${fileId}')" title="重试">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5 0 1.02-.31 1.97-.84 2.75l1.46 1.46C18.42 16.19 19 14.66 19 13c0-3.87-3.13-7-7-7zm0 10c0 2.21-1.79 4-4 4v2c3.87 0 7-3.13 7-7 0-1.66-.58-3.19-1.46-4.38L14.46 8C15.69 9.03 16.5 10.43 16.5 12c0 3.87-3.13 7-7 7v2c2.21 0 4-1.79 4-4 0-1.02-.31-1.97-.84-2.75l1.46-1.46C19.42 13.81 20 15.34 20 17c0 3.87-3.13 7-7 7-2.76 0-5-2.24-5-5 0-1.02.31-1.97.84-2.75L8.38 7.79C7.17 8.82 6.36 10.22 6.36 11.79c0 3.87 3.13 7 7 7z"/>
                        </svg>
                    </button>
                `;
            }
        }
    }

    /**
     * 更新进度容器
     */
    updateProgressContainer() {
        const pendingItems = this.uploadQueue.filter(item => item.status !== 'completed');
        const uploadingItems = this.uploadQueue.filter(item => item.status === 'uploading');
        const completedItems = Array.from(this.uploadedFiles.values());

        // 显示/隐藏进度容器
        this.progressContainer.style.display = 
            (pendingItems.length > 0 || uploadingItems.length > 0) ? 'block' : 'none';

        // 更新进度列表
        if (this.progressContainer.children.length === 0 || pendingItems.length > 0) {
            this.renderProgressList([...pendingItems, ...uploadingItems]);
        }
    }

    /**
     * 渲染进度列表
     */
    renderProgressList(items) {
        this.progressContainer.innerHTML = `
            <div class="progress-header">
                <h3>上传进度</h3>
                <button class="btn btn-sm btn-outline" onclick="fileUploadManager.clearAll()">清空</button>
            </div>
            <div class="progress-list">
                ${items.map(item => this.renderProgressItem(item)).join('')}
            </div>
        `;
    }

    /**
     * 渲染单个进度项
     */
    renderProgressItem(item) {
        const { id, file, status, progress, retryCount } = item;
        
        return `
            <div class="progress-item" id="progress-${id}">
                <div class="progress-info">
                    <div class="progress-file-info">
                        <img src="${URL.createObjectURL(file)}" alt="预览" class="progress-thumbnail">
                        <div class="progress-details">
                            <div class="progress-filename">${file.name}</div>
                            <div class="progress-filesize">${this.formatFileSize(file.size)}</div>
                            ${retryCount > 0 ? `<div class="progress-retry">重试 ${retryCount} 次</div>` : ''}
                        </div>
                    </div>
                    <div class="progress-status">等待上传...</div>
                    <div class="progress-bar-container">
                        <div class="progress-bar ${status}" style="width: ${progress}%"></div>
                    </div>
                    <div class="action-buttons"></div>
                </div>
            </div>
        `;
    }

    /**
     * 刷新文件列表
     */
    async refreshFileList() {
        try {
            const response = await fetch(this.config.listUrl);
            const result = await response.json();
            
            if (result.success) {
                this.renderFileList(result.files || []);
            }
        } catch (error) {
            console.error('获取文件列表失败:', error);
        }
    }

    /**
     * 渲染文件列表
     */
    renderFileList(files) {
        this.fileList.innerHTML = `
            <div class="file-list-header">
                <h3>已上传文件 (${files.length})</h3>
                <div class="file-actions">
                    <button class="btn btn-sm btn-outline" onclick="fileUploadManager.selectAll()">全选</button>
                    <button class="btn btn-sm btn-danger" onclick="fileUploadManager.batchDelete()">批量删除</button>
                </div>
            </div>
            <div class="file-grid">
                ${files.map(file => this.renderFileItem(file)).join('')}
            </div>
        `;
    }

    /**
     * 渲染文件项
     */
    renderFileItem(file) {
        const cdnUrl = file.cdnUrl || file.url || '';
        const thumbnailUrl = cdnUrl ? `${cdnUrl}?thumb=1` : '';
        
        return `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-thumbnail">
                    <img src="${thumbnailUrl}" alt="${file.originalName}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDEyVjE5SDRWN0MxNC4wNCA3IDExLjAxIDcuOSA4IDhWNkwzIDZIMTJWOUwyMCAxMnoiIGZpbGw9IiM5Q0E0QUYiLz4KPHA+aW1hZ2U8L3A+Cjwvc3ZnPgo='">
                    <div class="file-overlay">
                        <button class="btn btn-sm btn-white" onclick="fileUploadManager.previewFile('${file.id}')">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.originalName}">${file.originalName}</div>
                    <div class="file-meta">
                        <span class="file-size">${this.formatFileSize(file.size)}</span>
                        <span class="file-date">${this.formatDate(file.uploadTime)}</span>
                    </div>
                    <div class="file-tags">
                        ${this.getFileTags(file.type)}
                    </div>
                </div>
                <div class="file-actions">
                    <input type="checkbox" class="file-select" onchange="fileUploadManager.toggleFileSelection('${file.id}')">
                    <button class="btn btn-sm btn-outline" onclick="fileUploadManager.downloadFile('${file.id}')" title="下载">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="fileUploadManager.deleteFile('${file.id}')" title="删除">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 预览文件
     */
    previewFile(fileId) {
        const file = this.uploadedFiles.get(fileId) || this.findFileById(fileId);
        if (!file) return;

        const modal = document.createElement('div');
        modal.className = 'file-preview-modal';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${file.originalName || file.fileName}</h3>
                    <button class="modal-close" onclick="this.closest('.file-preview-modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="preview-container">
                        <img src="${file.cdnUrl || file.url}" alt="${file.originalName}" class="preview-image">
                    </div>
                    <div class="preview-info">
                        <div class="info-item">
                            <label>文件名:</label>
                            <span>${file.originalName || file.fileName}</span>
                        </div>
                        <div class="info-item">
                            <label>文件大小:</label>
                            <span>${this.formatFileSize(file.size)}</span>
                        </div>
                        <div class="info-item">
                            <label>文件类型:</label>
                            <span>${file.type}</span>
                        </div>
                        <div class="info-item">
                            <label>上传时间:</label>
                            <span>${this.formatDate(file.uploadTime)}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="fileUploadManager.downloadFile('${fileId}')">下载</button>
                    <button class="btn btn-danger" onclick="fileUploadManager.deleteFile('${fileId}'); this.closest('.file-preview-modal').remove()">删除</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    /**
     * 下载文件
     */
    async downloadFile(fileId) {
        const file = this.uploadedFiles.get(fileId) || this.findFileById(fileId);
        if (!file) return;

        try {
            const url = file.cdnUrl || file.url;
            const response = await fetch(url);
            const blob = await response.blob();
            
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = file.originalName || file.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            this.showMessage('文件下载已开始', 'success');
        } catch (error) {
            console.error('下载失败:', error);
            this.showMessage('下载失败', 'error');
        }
    }

    /**
     * 删除文件
     */
    async deleteFile(fileId) {
        if (!confirm('确定要删除这个文件吗？')) return;

        try {
            const response = await fetch(`${this.config.deleteUrl}/${fileId}`, {
                method: 'DELETE'
            });
            const result = await response.json();

            if (result.success) {
                this.uploadedFiles.delete(fileId);
                this.refreshFileList();
                this.showMessage('文件已删除', 'success');
            } else {
                throw new Error(result.message || '删除失败');
            }
        } catch (error) {
            console.error('删除失败:', error);
            this.showMessage('删除失败', 'error');
        }
    }

    /**
     * 重试上传
     */
    retryUpload(fileId) {
        const uploadItem = this.uploadQueue.find(item => item.id === fileId);
        if (!uploadItem) return;

        uploadItem.retryCount = 0;
        uploadItem.status = 'pending';
        uploadItem.progress = 0;
        
        this.uploadQueue.push(uploadItem);
        this.startUpload();
    }

    /**
     * 清空所有
     */
    clearAll() {
        this.uploadQueue = [];
        this.uploading = false;
        this.progressContainer.style.display = 'none';
        this.showMessage('已清空上传队列', 'info');
    }

    /**
     * 批量操作
     */
    toggleFileSelection(fileId) {
        const checkbox = document.querySelector(`[data-file-id="${fileId}"] .file-select`);
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
        }
    }

    selectAll() {
        const checkboxes = document.querySelectorAll('.file-select');
        checkboxes.forEach(cb => cb.checked = true);
    }

    async batchDelete() {
        const selectedFiles = Array.from(document.querySelectorAll('.file-select:checked'))
            .map(cb => cb.closest('.file-item').dataset.fileId);

        if (selectedFiles.length === 0) {
            this.showMessage('请先选择要删除的文件', 'warning');
            return;
        }

        if (!confirm(`确定要删除选中的 ${selectedFiles.length} 个文件吗？`)) return;

        try {
            const response = await fetch(`${this.config.deleteUrl}/batch`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileIds: selectedFiles })
            });
            const result = await response.json();

            if (result.success) {
                selectedFiles.forEach(id => this.uploadedFiles.delete(id));
                this.refreshFileList();
                this.showMessage(`已删除 ${selectedFiles.length} 个文件`, 'success');
            } else {
                throw new Error(result.message || '批量删除失败');
            }
        } catch (error) {
            console.error('批量删除失败:', error);
            this.showMessage('批量删除失败', 'error');
        }
    }

    /**
     * 缓存管理
     */
    loadCachedFiles() {
        if (!this.config.enableCache) return;

        try {
            const cached = localStorage.getItem('uploadedFiles');
            if (cached) {
                const files = JSON.parse(cached);
                files.forEach(file => {
                    this.cache.set(file.id, file);
                });
            }
        } catch (error) {
            console.warn('加载缓存失败:', error);
        }
    }

    saveCache() {
        if (!this.config.enableCache) return;

        try {
            const files = Array.from(this.uploadedFiles.values());
            localStorage.setItem('uploadedFiles', JSON.stringify(files));
        } catch (error) {
            console.warn('保存缓存失败:', error);
        }
    }

    /**
     * 工具函数
     */
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN');
    }

    getFileTags(mimeType) {
        const tags = [];
        if (mimeType.startsWith('image/')) {
            tags.push('<span class="tag tag-image">图片</span>');
        }
        return tags.join('');
    }

    findFileById(fileId) {
        return this.uploadedFiles.get(fileId) || 
               Array.from(this.cache.values()).find(file => file.id === fileId);
    }

    /**
     * 消息提示
     */
    showMessage(message, type = 'info') {
        // 创建消息元素
        const messageEl = document.createElement('div');
        messageEl.className = `upload-message upload-message-${type}`;
        messageEl.innerHTML = `
            <div class="message-content">
                <svg class="message-icon" viewBox="0 0 24 24">
                    ${this.getMessageIcon(type)}
                </svg>
                <span class="message-text">${message}</span>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(messageEl);

        // 自动移除
        setTimeout(() => {
            messageEl.classList.add('message-fade-out');
            setTimeout(() => messageEl.remove(), 300);
        }, 3000);
    }

    getMessageIcon(type) {
        const icons = {
            success: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
            error: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
            warning: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>',
            info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>'
        };
        return icons[type] || icons.info;
    }

    /**
     * 事件监听器管理
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        const totalFiles = this.uploadedFiles.size;
        const totalSize = Array.from(this.uploadedFiles.values())
            .reduce((sum, file) => sum + file.size, 0);
        
        return {
            totalFiles,
            totalSize,
            averageSize: totalFiles > 0 ? totalSize / totalFiles : 0,
            uploadQueue: this.uploadQueue.length,
            uploading: this.uploading
        };
    }

    /**
     * 导出数据
     */
    exportData() {
        const data = {
            uploadedFiles: Array.from(this.uploadedFiles.values()),
            stats: this.getStats(),
            exportTime: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `files-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.saveCache();
        this.listeners.clear();
        this.uploadQueue = [];
        this.uploadedFiles.clear();
        this.cache.clear();
        
        if (this.dropZone) {
            this.dropZone.remove();
        }
        if (this.progressContainer) {
            this.progressContainer.remove();
        }
        if (this.fileList) {
            this.fileList.remove();
        }
    }
}

// 创建全局实例
let fileUploadManager;

// 初始化函数
function initFileUpload(config = {}) {
    fileUploadManager = new FileUploadManager(config);
    return fileUploadManager;
}

// 导出类和初始化函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FileUploadManager, initFileUpload };
} else {
    window.FileUploadManager = FileUploadManager;
    window.initFileUpload = initFileUpload;
}