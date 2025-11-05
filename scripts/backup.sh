#!/bin/bash

# 部署备份脚本
# 用法: ./backup.sh [项目名称] [备份路径]
# 示例: ./backup.sh myapp /backup/

set -euo pipefail

# 配置参数
PROJECT_NAME=${1:-"deploy_project"}
BACKUP_DIR=${2:-"/tmp/backups"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}"
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# 创建备份目录
create_backup_dirs() {
    log_info "创建备份目录结构..."
    
    # 创建主备份目录
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
    
    # 创建子目录
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/code"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/database"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/config"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/logs"
    mkdir -p "$BACKUP_DIR/$BACKUP_NAME/media"
    
    log_success "备份目录结构创建完成: $BACKUP_DIR/$BACKUP_NAME"
}

# 备份代码文件
backup_code() {
    log_info "开始备份代码文件..."
    
    # 备份当前部署目录中的代码
    if [ -d "current" ]; then
        log_info "备份当前部署代码..."
        cp -r current/* "$BACKUP_DIR/$BACKUP_NAME/code/" 2>/dev/null || log_warning "当前部署目录不存在或为空"
    fi
    
    # 备份部署包（如果存在）
    if [ -d "../deploy_package" ]; then
        log_info "备份部署包..."
        cp -r ../deploy_package "$BACKUP_DIR/$BACKUP_NAME/code/deploy_package" 2>/dev/null || true
    fi
    
    # 备份配置文件
    if [ -f "config.json" ]; then
        log_info "备份配置文件..."
        cp config.json "$BACKUP_DIR/$BACKUP_NAME/config/" 2>/dev/null || true
    fi
    
    if [ -f ".env" ]; then
        log_info "备份环境变量文件..."
        cp .env "$BACKUP_DIR/$BACKUP_NAME/config/" 2>/dev/null || true
    fi
    
    log_success "代码文件备份完成"
}

# 备份数据库
backup_database() {
    log_info "开始备份数据库..."
    
    # MySQL/MariaDB 备份
    if command -v mysqldump >/dev/null 2>&1; then
        if [ -n "${DB_NAME:-}" ] && [ -n "${DB_USER:-}" ] && [ -n "${DB_PASSWORD:-}" ]; then
            log_info "备份 MySQL 数据库: $DB_NAME"
            mysqldump -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" > "$BACKUP_DIR/$BACKUP_NAME/database/${DB_NAME}_${TIMESTAMP}.sql"
            log_success "MySQL 数据库备份完成"
        else
            log_warning "数据库连接参数未设置，跳过数据库备份"
        fi
    # PostgreSQL 备份
    elif command -v pg_dump >/dev/null 2>&1; then
        if [ -n "${PG_DB_NAME:-}" ] && [ -n "${PG_USER:-}" ] && [ -n "${PG_PASSWORD:-}" ]; then
            log_info "备份 PostgreSQL 数据库: $PG_DB_NAME"
            PGPASSWORD="$PG_PASSWORD" pg_dump -U "$PG_USER" "$PG_DB_NAME" > "$BACKUP_DIR/$BACKUP_NAME/database/${PG_DB_NAME}_${TIMESTAMP}.sql"
            log_success "PostgreSQL 数据库备份完成"
        else
            log_warning "PostgreSQL 连接参数未设置，跳过数据库备份"
        fi
    else
        log_warning "未找到数据库备份工具，跳过数据库备份"
    fi
}

# 备份日志文件
backup_logs() {
    log_info "开始备份日志文件..."
    
    # 备份常见日志目录
    local log_dirs=("logs" "log" "var/log" "/var/log/nginx" "/var/log/apache2")
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            log_info "备份日志目录: $log_dir"
            cp -r "$log_dir"/* "$BACKUP_DIR/$BACKUP_NAME/logs/" 2>/dev/null || true
        fi
    done
    
    log_success "日志文件备份完成"
}

# 备份媒体文件
backup_media() {
    log_info "开始备份媒体文件..."
    
    # 备份上传目录
    local media_dirs=("uploads" "media" "public/uploads" "static/uploads")
    
    for media_dir in "${media_dirs[@]}"; do
        if [ -d "$media_dir" ]; then
            log_info "备份媒体目录: $media_dir"
            cp -r "$media_dir" "$BACKUP_DIR/$BACKUP_NAME/media/" 2>/dev/null || true
        fi
    done
    
    log_success "媒体文件备份完成"
}

# 创建备份信息文件
create_backup_info() {
    log_info "创建备份信息文件..."
    
    cat > "$BACKUP_DIR/$BACKUP_NAME/backup_info.txt" << EOF
备份项目: $PROJECT_NAME
备份时间: $TIMESTAMP
备份路径: $BACKUP_DIR/$BACKUP_NAME
系统信息:
  主机名: $(hostname)
  用户: $(whoami)
  操作系统: $(uname -a)
  磁盘使用: $(df -h | head -1)
$(df -h | grep -E '^/dev/')
备份内容:
  - 代码文件
  - 配置文件
  - 数据库
  - 日志文件
  - 媒体文件

备份说明:
  此备份包含完整的应用状态，可在需要时用于恢复。
  请妥善保管此备份文件，并定期验证其完整性。
EOF
    
    log_success "备份信息文件创建完成"
}

# 压缩备份
compress_backup() {
    log_info "压缩备份文件..."
    
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    
    log_success "备份压缩完成: ${BACKUP_NAME}.tar.gz"
}

# 清理旧备份
cleanup_old_backups() {
    log_info "清理旧备份文件（保留最近10个）..."
    
    local backup_count=$(ls -1 "${PROJECT_NAME}_backup_"*.tar.gz 2>/dev/null | wc -l)
    
    if [ "$backup_count" -gt 10 ]; then
        ls -1t "${PROJECT_NAME}_backup_"*.tar.gz | tail -n +11 | xargs rm -f
        log_info "已清理旧备份文件，保留最近10个"
    else
        log_info "备份文件数量未超过限制，无需清理"
    fi
}

# 验证备份
verify_backup() {
    log_info "验证备份文件完整性..."
    
    local backup_file="$BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    
    if [ -f "$backup_file" ]; then
        # 检查压缩文件完整性
        if tar -tzf "$backup_file" >/dev/null 2>&1; then
            local backup_size=$(du -h "$backup_file" | cut -f1)
            log_success "备份文件验证成功，大小: $backup_size"
            
            # 获取备份内容统计
            log_info "备份内容统计:"
            tar -tzf "$backup_file" | wc -l | xargs echo "  总文件数:"
        else
            log_error "备份文件损坏或格式错误"
            exit 1
        fi
    else
        log_error "备份文件不存在: $backup_file"
        exit 1
    fi
}

# 显示备份摘要
show_backup_summary() {
    log_info "备份摘要:"
    echo "  项目名称: $PROJECT_NAME"
    echo "  备份时间: $TIMESTAMP"
    echo "  备份路径: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
    echo "  备份大小: $(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)"
    echo "  日志文件: $LOG_FILE"
    
    log_success "备份操作完成"
}

# 主函数
main() {
    log_info "开始部署备份操作..."
    log_info "项目名称: $PROJECT_NAME"
    log_info "备份目录: $BACKUP_DIR"
    
    # 检查权限
    if [ ! -w "$BACKUP_DIR" ]; then
        log_error "没有写入权限: $BACKUP_DIR"
        exit 1
    fi
    
    # 执行备份步骤
    create_backup_dirs
    backup_code
    backup_database
    backup_logs
    backup_media
    create_backup_info
    compress_backup
    cleanup_old_backups
    verify_backup
    show_backup_summary
    
    log_success "备份脚本执行完成"
}

# 错误处理
trap 'log_error "备份过程中发生错误，行号: $LINENO"' ERR

# 执行主函数
main "$@"