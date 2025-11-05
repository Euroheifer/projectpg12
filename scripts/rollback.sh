#!/bin/bash

# 回滚脚本
# 用法: ./rollback.sh [项目名称] [部署目录] [回滚版本]
# 回滚版本: latest|previous|指定版本号
# 示例: ./rollback.sh myapp /var/www/deploy previous

set -euo pipefail

# 配置参数
PROJECT_NAME=${1:-"deploy_project"}
DEPLOY_DIR=${2:-"/var/www/deploy"}
ROLLBACK_VERSION=${3:-"previous"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$DEPLOY_DIR/logs/rollback_${TIMESTAMP}.log"
BACKUP_BEFORE_ROLLBACK="$DEPLOY_DIR/backups/pre_rollback_${TIMESTAMP}.tar.gz"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1" | tee -a "$LOG_FILE"
}

# 检查必要条件
check_prerequisites() {
    log_step "检查回滚前提条件..."
    
    # 检查部署目录
    if [ ! -d "$DEPLOY_DIR" ]; then
        log_error "部署目录不存在: $DEPLOY_DIR"
        exit 1
    fi
    
    # 检查当前版本链接
    if [ ! -L "$DEPLOY_DIR/current" ]; then
        log_error "当前版本链接不存在"
        exit 1
    fi
    
    # 检查Releases目录
    if [ ! -d "$DEPLOY_DIR/releases" ]; then
        log_error "版本目录不存在: $DEPLOY_DIR/releases"
        exit 1
    fi
    
    # 检查是否有可用的版本
    local release_count=$(ls -1d "$DEPLOY_DIR/releases"/release_* 2>/dev/null | wc -l)
    if [ "$release_count" -eq 0 ]; then
        log_error "没有可用的版本进行回滚"
        exit 1
    fi
    
    log_success "前提条件检查完成"
}

# 显示可用版本
show_available_releases() {
    log_step "显示可用版本..."
    
    local current_version=$(readlink "$DEPLOY_DIR/current")
    
    echo -e "${BLUE}当前版本:${NC}"
    if [ -n "$current_version" ] && [ -d "$current_version" ]; then
        echo "  $(basename "$current_version")"
    else
        echo "  链接错误或目标不存在"
    fi
    
    echo
    echo -e "${BLUE}可用版本:${NC}"
    
    # 按时间倒序显示版本
    ls -1t "$DEPLOY_DIR/releases"/release_* | while read -r release_dir; do
        if [ -d "$release_dir" ]; then
            local version_name=$(basename "$release_dir")
            local version_time=$(stat -c %Y "$release_dir" 2>/dev/null || echo "0")
            local version_date=$(date -d "@$version_time" '+%Y-%m-%d %H:%M:%S')
            
            if [ "$release_dir" = "$current_version" ]; then
                echo -e "  ${GREEN}$version_name${NC} (当前版本) - $version_date"
            else
                echo -e "  $version_name - $version_date"
            fi
        fi
    done
    
    echo
}

# 选择回滚版本
select_rollback_version() {
    log_step "选择回滚版本..."
    
    case "$ROLLBACK_VERSION" in
        "latest")
            # 找到最新的版本（除了当前版本）
            ROLLBACK_TARGET=$(ls -1t "$DEPLOY_DIR/releases"/release_* | grep -v "$(readlink "$DEPLOY_DIR/current")" | head -1)
            if [ -z "$ROLLBACK_TARGET" ]; then
                log_error "没有找到其他版本进行回滚"
                exit 1
            fi
            log_info "回滚到最新版本: $(basename "$ROLLBACK_TARGET")"
            ;;
        "previous")
            # 找到上一个版本（按修改时间）
            ROLLBACK_TARGET=$(ls -1t "$DEPLOY_DIR/releases"/release_* | head -1)
            log_info "回滚到上一个版本: $(basename "$ROLLBACK_TARGET")"
            ;;
        *)
            # 指定版本
            if [ -d "$DEPLOY_DIR/releases/$ROLLBACK_VERSION" ]; then
                ROLLBACK_TARGET="$DEPLOY_DIR/releases/$ROLLBACK_VERSION"
                log_info "回滚到指定版本: $ROLLBACK_VERSION"
            else
                log_error "指定的版本不存在: $ROLLBACK_VERSION"
                echo "可用的版本:"
                ls -1 "$DEPLOY_DIR/releases"/
                exit 1
            fi
            ;;
    esac
    
    if [ ! -d "$ROLLBACK_TARGET" ]; then
        log_error "回滚目标版本不存在: $ROLLBACK_TARGET"
        exit 1
    fi
    
    log_success "回滚版本选择完成: $(basename "$ROLLBACK_TARGET")"
}

# 创建回滚前备份
create_rollback_backup() {
    log_step "创建回滚前备份..."
    
    local current_version=$(readlink "$DEPLOY_DIR/current")
    
    if [ -n "$current_version" ] && [ -d "$current_version" ]; then
        log_info "备份当前版本: $(basename "$current_version")"
        
        # 创建临时备份目录
        local temp_backup_dir="/tmp/rollback_backup_$TIMESTAMP"
        mkdir -p "$temp_backup_dir"
        
        # 复制当前版本到临时目录
        cp -r "$current_version" "$temp_backup_dir/current_version"
        
        # 复制配置文件
        if [ -d "$DEPLOY_DIR/config" ]; then
            cp -r "$DEPLOY_DIR/config" "$temp_backup_dir/"
        fi
        
        # 复制共享目录
        if [ -d "$DEPLOY_DIR/shared" ]; then
            cp -r "$DEPLOY_DIR/shared" "$temp_backup_dir/"
        fi
        
        # 压缩备份
        cd "$temp_backup_dir"
        tar -czf "$BACKUP_BEFORE_ROLLBACK" . 2>/dev/null || true
        rm -rf "$temp_backup_dir"
        
        # 记录备份信息
        echo "回滚前备份" > "$BACKUP_BEFORE_ROLLBACK.info"
        echo "备份时间: $(date)" >> "$BACKUP_BEFORE_ROLLBACK.info"
        echo "原版本: $(basename "$current_version")" >> "$BACKUP_BEFORE_ROLLBACK.info"
        echo "目标版本: $(basename "$ROLLBACK_TARGET")" >> "$BACKUP_BEFORE_ROLLBACK.info"
        echo "备份文件: $BACKUP_BEFORE_ROLLBACK" >> "$BACKUP_BEFORE_ROLLBACK.info"
        
        log_success "回滚前备份创建完成: $BACKUP_BEFORE_ROLLBACK"
    else
        log_warning "当前版本无效，跳过备份创建"
    fi
}

# 验证目标版本
verify_target_version() {
    log_step "验证目标版本..."
    
    # 检查目标版本目录
    if [ ! -d "$ROLLBACK_TARGET" ]; then
        log_error "目标版本目录不存在: $ROLLBACK_TARGET"
        exit 1
    fi
    
    # 检查关键文件
    local key_files=("index.html" "index.js" "app.py" "main.py")
    local found_key_file=false
    
    for file in "${key_files[@]}"; do
        if [ -f "$ROLLBACK_TARGET/$file" ]; then
            found_key_file=true
            log_success "找到关键文件: $file"
            break
        fi
    done
    
    if [ "$found_key_file" = false ]; then
        log_warning "未找到预期的关键文件，可能不是有效的应用版本"
    fi
    
    # 检查版本大小
    local target_size=$(du -sh "$ROLLBACK_TARGET" | cut -f1)
    log_info "目标版本大小: $target_size"
    
    # 检查版本时间
    local target_time=$(stat -c %Y "$ROLLBACK_TARGET" 2>/dev/null || echo "0")
    local target_date=$(date -d "@$target_time" '+%Y-%m-%d %H:%M:%S')
    log_info "目标版本时间: $target_date"
    
    log_success "目标版本验证完成"
}

# 执行回滚
perform_rollback() {
    log_step "执行版本回滚..."
    
    # 备份当前链接目标
    local current_link=$(readlink "$DEPLOY_DIR/current")
    local rollback_backup="$DEPLOY_DIR/backups/rollback_backup_$(basename "$current_link")_$TIMESTAMP"
    
    if [ -d "$current_link" ]; then
        log_info "备份当前版本到: $rollback_backup"
        mkdir -p "$DEPLOY_DIR/backups"
        cp -r "$current_link" "$rollback_backup"
    fi
    
    # 移除当前链接
    log_info "移除当前版本链接"
    rm -f "$DEPLOY_DIR/current"
    
    # 创建新链接到目标版本
    log_info "创建新版本链接到: $(basename "$ROLLBACK_TARGET")"
    ln -s "$ROLLBACK_TARGET" "$DEPLOY_DIR/current"
    
    log_success "版本回滚完成"
}

# 重启服务
restart_services() {
    log_step "重启相关服务..."
    
    # 重启Web服务器
    if systemctl list-unit-files | grep -q nginx; then
        if systemctl is-active --quiet nginx; then
            sudo systemctl reload nginx
            log_info "重新加载 Nginx 配置"
        fi
    fi
    
    if systemctl list-unit-files | grep -q apache2; then
        if systemctl is-active --quiet apache2; then
            sudo systemctl reload apache2
            log_info "重新加载 Apache 配置"
        fi
    fi
    
    # 重启应用服务
    if systemctl list-unit-files | grep -q "$PROJECT_NAME"; then
        sudo systemctl restart "$PROJECT_NAME"
        log_info "重启应用服务: $PROJECT_NAME"
    fi
    
    # 重启PM2进程（如果使用）
    if command -v pm2 >/dev/null 2>&1; then
        if pm2 list | grep -q "$PROJECT_NAME"; then
            pm2 restart "$PROJECT_NAME"
            log_info "重启 PM2 进程: $PROJECT_NAME"
        fi
    fi
    
    # 重启Docker容器
    if [ -f "docker-compose.yml" ]; then
        if command -v docker-compose >/dev/null 2>&1; then
            cd "$(dirname "$ROLLBACK_TARGET")"
            docker-compose down
            docker-compose up -d
            log_info "重启 Docker 容器"
        fi
    fi
    
    log_success "服务重启完成"
}

# 运行回滚后检查
post_rollback_checks() {
    log_step "运行回滚后检查..."
    
    # 等待服务启动
    sleep 5
    
    # 检查Web服务状态
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|301\|302"; then
        log_success "Web服务响应正常"
    else
        log_warning "Web服务可能未正常响应"
    fi
    
    # 检查应用进程
    local app_responsive=false
    for port in 80 443 3000 8080; do
        if netstat -tuln | grep -q ":$port "; then
            if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port" | grep -q "200"; then
                log_success "应用在端口 $port 响应正常"
                app_responsive=true
                break
            fi
        fi
    done
    
    if [ "$app_responsive" = false ]; then
        log_warning "应用可能未正常启动"
    fi
    
    # 检查数据库连接
    if command -v mysql >/dev/null 2>&1 && [ -n "${DB_NAME:-}" ]; then
        if mysql -u "${DB_USER:-root}" -p"${DB_PASSWORD:-}" "$DB_NAME" -e "SELECT 1" >/dev/null 2>&1; then
            log_success "数据库连接正常"
        else
            log_warning "数据库连接失败"
        fi
    fi
    
    log_success "回滚后检查完成"
}

# 更新版本历史
update_version_history() {
    log_step "更新版本历史..."
    
    local history_file="$DEPLOY_DIR/logs/version_history.log"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - 回滚操作: $(basename "$current_link") -> $(basename "$ROLLBACK_TARGET")" >> "$history_file"
    
    log_success "版本历史已更新"
}

# 生成回滚摘要
generate_rollback_summary() {
    log_step "生成回滚摘要..."
    
    local summary_file="$DEPLOY_DIR/logs/rollback_summary_$TIMESTAMP.txt"
    
    cat > "$summary_file" << EOF
回滚操作摘要
===========
项目名称: $PROJECT_NAME
回滚时间: $TIMESTAMP
部署目录: $DEPLOY_DIR

回滚详情:
  从版本: $(basename "$(readlink "$DEPLOY_DIR/current" 2>/dev/null || echo 'unknown')")
  回滚到: $(basename "$ROLLBACK_TARGET")
  回滚类型: $ROLLBACK_VERSION

备份信息:
  回滚前备份: $BACKUP_BEFORE_ROLLBACK
  原始版本备份: $rollback_backup

操作日志: $LOG_FILE

状态: 回滚完成
后续建议:
  1. 运行验证脚本检查系统状态
  2. 检查应用功能是否正常
  3. 确认数据库连接状态
  4. 监控错误日志
EOF
    
    log_success "回滚摘要已生成: $summary_file"
}

# 显示回滚结果
show_rollback_result() {
    echo
    echo -e "${GREEN}=== 回滚操作完成 ===${NC}"
    echo -e "项目名称: ${BLUE}$PROJECT_NAME${NC}"
    echo -e "回滚时间: ${BLUE}$TIMESTAMP${NC}"
    echo -e "回滚类型: ${BLUE}$ROLLBACK_VERSION${NC}"
    echo
    echo -e "${YELLOW}回滚详情:${NC}"
    echo "  当前版本: $(basename "$(readlink "$DEPLOY_DIR/current" 2>/dev/null || echo 'unknown')")"
    echo "  目标版本: $(basename "$ROLLBACK_TARGET")"
    echo "  备份文件: $BACKUP_BEFORE_ROLLBACK"
    echo
    echo -e "${BLUE}后续操作:${NC}"
    echo "  1. 运行验证脚本: ./verify.sh $PROJECT_NAME"
    echo "  2. 检查应用功能"
    echo "  3. 查看日志: $LOG_FILE"
    echo
    echo -e "${GREEN}回滚成功完成！${NC}"
}

# 主函数
main() {
    log_info "开始回滚操作..."
    log_info "项目名称: $PROJECT_NAME"
    log_info "部署目录: $DEPLOY_DIR"
    log_info "回滚类型: $ROLLBACK_VERSION"
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # 执行回滚步骤
    check_prerequisites
    show_available_releases
    select_rollback_version
    create_rollback_backup
    verify_target_version
    perform_rollback
    restart_services
    post_rollback_checks
    update_version_history
    generate_rollback_summary
    
    show_rollback_result
}

# 错误处理
trap 'log_error "回滚过程中发生错误，行号: $LINENO"' ERR

# 执行主函数
main "$@"