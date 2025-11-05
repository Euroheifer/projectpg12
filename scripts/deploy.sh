#!/bin/bash

# 部署脚本
# 用法: ./deploy.sh [部署类型] [项目名称]
# 部署类型: full|code|config|database
# 示例: ./deploy.sh full myapp

set -euo pipefail

# 配置参数
DEPLOY_TYPE=${1:-"full"}
PROJECT_NAME=${2:-"deploy_project"}
DEPLOY_DIR=${3:-"/var/www/deploy"}
DEPLOY_PACKAGE_DIR="$(dirname "$(dirname "$0")")"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$DEPLOY_DIR/logs/deploy_${TIMESTAMP}.log"
BACKUP_DIR="${DEPLOY_DIR}/backups"

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

# 检查部署环境
check_environment() {
    log_step "检查部署环境..."
    
    # 检查目录权限
    if [ ! -w "$(dirname "$DEPLOY_DIR")" ]; then
        log_error "没有权限创建部署目录: $DEPLOY_DIR"
        exit 1
    fi
    
    # 检查必要工具
    local required_tools=("curl" "systemctl" "docker" "docker-compose")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            log_warning "工具不存在: $tool (可能需要安装)"
        fi
    done
    
    # 检查部署包
    if [ ! -d "$DEPLOY_PACKAGE_DIR" ]; then
        log_error "部署包目录不存在: $DEPLOY_PACKAGE_DIR"
        exit 1
    fi
    
    log_success "环境检查完成"
}

# 创建目录结构
create_directories() {
    log_step "创建部署目录结构..."
    
    # 创建主目录
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$DEPLOY_DIR/current"
    mkdir -p "$DEPLOY_DIR/releases"
    mkdir -p "$DEPLOY_DIR/shared"
    mkdir -p "$DEPLOY_DIR/backups"
    mkdir -p "$DEPLOY_DIR/logs"
    mkdir -p "$DEPLOY_DIR/config"
    
    # 创建共享目录
    mkdir -p "$DEPLOY_DIR/shared/uploads"
    mkdir -p "$DEPLOY_DIR/shared/cache"
    mkdir -p "$DEPLOY_DIR/shared/sessions"
    
    # 设置权限
    chmod 755 "$DEPLOY_DIR"
    chmod -R 755 "$DEPLOY_DIR"
    
    log_success "目录结构创建完成"
}

# 准备部署包
prepare_package() {
    log_step "准备部署包..."
    
    # 进入部署包目录
    cd "$DEPLOY_PACKAGE_DIR"
    
    # 清理之前的构建
    if [ -d "dist" ]; then
        rm -rf dist
    fi
    
    # 检查是否有构建脚本
    if [ -f "build.sh" ]; then
        log_info "执行构建脚本..."
        chmod +x build.sh
        ./build.sh
    elif [ -f "package.json" ]; then
        if command -v npm >/dev/null 2>&1; then
            log_info "安装依赖包..."
            npm ci --production
            log_info "构建项目..."
            npm run build
        elif command -v yarn >/dev/null 2>&1; then
            log_info "使用 Yarn 安装依赖包..."
            yarn install --production
            log_info "构建项目..."
            yarn run build
        else
            log_warning "未找到包管理器，跳过构建"
        fi
    else
        log_info "未找到构建脚本，使用源代码目录"
    fi
    
    # 创建部署包
    local release_name="release_${TIMESTAMP}"
    mkdir -p "$DEPLOY_DIR/releases/$release_name"
    
    # 复制文件
    if [ -d "dist" ]; then
        cp -r dist/* "$DEPLOY_DIR/releases/$release_name/"
    else
        cp -r * "$DEPLOY_DIR/releases/$release_name/" 2>/dev/null || true
    fi
    
    # 复制共享目录
    cp -r "$DEPLOY_DIR/shared"/* "$DEPLOY_DIR/releases/$release_name/shared/" 2>/dev/null || true
    
    # 链接当前版本
    ln -sfn "$DEPLOY_DIR/releases/$release_name" "$DEPLOY_DIR/current_link"
    mv "$DEPLOY_DIR/current_link" "$DEPLOY_DIR/current"
    
    log_success "部署包准备完成: $release_name"
}

# 部署配置文件
deploy_config() {
    log_step "部署配置文件..."
    
    # 复制配置文件
    if [ -f "config.json" ]; then
        cp config.json "$DEPLOY_DIR/config/"
        log_info "复制配置文件: config.json"
    fi
    
    # 环境变量文件
    if [ -f ".env" ]; then
        cp .env "$DEPLOY_DIR/config/"
        log_info "复制环境变量文件: .env"
    fi
    
    # Nginx 配置
    if [ -f "nginx.conf" ]; then
        sudo cp nginx.conf /etc/nginx/sites-available/"$PROJECT_NAME"
        sudo ln -sf /etc/nginx/sites-available/"$PROJECT_NAME" /etc/nginx/sites-enabled/
        log_info "配置 Nginx"
    fi
    
    # Apache 配置
    if [ -f "apache.conf" ]; then
        sudo cp apache.conf /etc/apache2/sites-available/"$PROJECT_NAME".conf
        sudo a2ensite "$PROJECT_NAME"
        log_info "配置 Apache"
    fi
    
    log_success "配置文件部署完成"
}

# 部署数据库
deploy_database() {
    log_step "部署数据库..."
    
    # 检查数据库迁移脚本
    if [ -f "migrate.sql" ]; then
        log_info "执行数据库迁移..."
        
        # MySQL/MariaDB
        if command -v mysql >/dev/null 2>&1; then
            if [ -n "${DB_NAME:-}" ] && [ -n "${DB_USER:-}" ] && [ -n "${DB_PASSWORD:-}" ]; then
                mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < migrate.sql
                log_success "MySQL 数据库迁移完成"
            else
                log_warning "数据库连接参数未设置，跳过迁移"
            fi
        # PostgreSQL
        elif command -v psql >/dev/null 2>&1; then
            if [ -n "${PG_DB_NAME:-}" ] && [ -n "${PG_USER:-}" ] && [ -n "${PG_PASSWORD:-}" ]; then
                PGPASSWORD="$PG_PASSWORD" psql -U "$PG_USER" -d "$PG_DB_NAME" -f migrate.sql
                log_success "PostgreSQL 数据库迁移完成"
            else
                log_warning "PostgreSQL 连接参数未设置，跳过迁移"
            fi
        else
            log_warning "未找到数据库客户端，跳过迁移"
        fi
    else
        log_info "未找到数据库迁移文件"
    fi
    
    log_success "数据库部署完成"
}

# 重启服务
restart_services() {
    log_step "重启相关服务..."
    
    # 重启 Web 服务器
    if systemctl list-unit-files | grep -q nginx; then
        sudo systemctl reload nginx
        log_info "重新加载 Nginx 配置"
    fi
    
    if systemctl list-unit-files | grep -q apache2; then
        sudo systemctl reload apache2
        log_info "重新加载 Apache 配置"
    fi
    
    # 重启应用服务（如果有 systemd 服务）
    if systemctl list-unit-files | grep -q "$PROJECT_NAME"; then
        sudo systemctl restart "$PROJECT_NAME"
        log_info "重启应用服务: $PROJECT_NAME"
    fi
    
    # 重启 Docker 容器（如果使用 Docker）
    if [ -f "docker-compose.yml" ]; then
        docker-compose down
        docker-compose up -d
        log_info "重启 Docker 容器"
    fi
    
    log_success "服务重启完成"
}

# 清理旧版本
cleanup_old_releases() {
    log_step "清理旧版本..."
    
    # 保留最近5个版本
    local keep_count=5
    local release_count=$(ls -1d "$DEPLOY_DIR/releases"/release_* 2>/dev/null | wc -l)
    
    if [ "$release_count" -gt "$keep_count" ]; then
        ls -1td "$DEPLOY_DIR/releases"/release_* | tail -n +$((keep_count + 1)) | while read -r release_dir; do
            log_info "删除旧版本: $(basename "$release_dir")"
            rm -rf "$release_dir"
        done
    fi
    
    log_success "版本清理完成"
}

# 设置权限
set_permissions() {
    log_step "设置文件权限..."
    
    # 设置所有者
    sudo chown -R www-data:www-data "$DEPLOY_DIR" 2>/dev/null || sudo chown -R nginx:nginx "$DEPLOY_DIR" 2>/dev/null || true
    
    # 设置目录权限
    find "$DEPLOY_DIR" -type d -exec chmod 755 {} \;
    
    # 设置文件权限
    find "$DEPLOY_DIR" -type f -exec chmod 644 {} \;
    
    # 可执行文件权限
    find "$DEPLOY_DIR" -name "*.sh" -exec chmod 755 {} \;
    
    # 共享目录权限
    chmod -R 755 "$DEPLOY_DIR/shared" 2>/dev/null || true
    
    log_success "权限设置完成"
}

# 运行部署后检查
post_deploy_checks() {
    log_step "运行部署后检查..."
    
    # 检查 Web 服务
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|301\|302"; then
        log_success "Web 服务正常运行"
    else
        log_warning "Web 服务可能未正常启动"
    fi
    
    # 检查数据库连接
    if command -v mysql >/dev/null 2>&1 && [ -n "${DB_NAME:-}" ]; then
        if mysql -u "${DB_USER:-}" -p"${DB_PASSWORD:-}" "$DB_NAME" -e "SELECT 1" >/dev/null 2>&1; then
            log_success "数据库连接正常"
        else
            log_warning "数据库连接失败"
        fi
    fi
    
    # 检查日志
    if [ -f "$LOG_FILE" ]; then
        log_info "部署日志: $LOG_FILE"
    fi
    
    log_success "部署后检查完成"
}

# 创建部署摘要
create_deploy_summary() {
    log_step "创建部署摘要..."
    
    cat > "$DEPLOY_DIR/logs/deploy_summary_${TIMESTAMP}.txt" << EOF
部署摘要
========
项目名称: $PROJECT_NAME
部署类型: $DEPLOY_TYPE
部署时间: $TIMESTAMP
部署目录: $DEPLOY_DIR
当前版本: $(readlink "$DEPLOY_DIR/current")
部署包: $DEPLOY_PACKAGE_DIR
日志文件: $LOG_FILE

部署内容:
$(ls -la "$DEPLOY_DIR/current")

系统信息:
主机名: $(hostname)
用户: $(whoami)
磁盘使用: $(df -h "$DEPLOY_DIR" | tail -1)

部署状态: 完成
EOF
    
    log_success "部署摘要已创建"
}

# 显示部署结果
show_deploy_result() {
    log_info "部署操作完成！"
    echo
    echo -e "${GREEN}部署摘要:${NC}"
    echo "  项目名称: $PROJECT_NAME"
    echo "  部署类型: $DEPLOY_TYPE"
    echo "  部署时间: $TIMESTAMP"
    echo "  部署目录: $DEPLOY_DIR"
    echo "  当前版本: $(readlink "$DEPLOY_DIR/current" 2>/dev/null || echo "无")"
    echo "  日志文件: $LOG_FILE"
    echo
    echo -e "${BLUE}可用命令:${NC}"
    echo "  查看部署状态: ./verify.sh $PROJECT_NAME"
    echo "  回滚到上一个版本: ./rollback.sh $PROJECT_NAME"
    echo "  创建备份: ./backup.sh $PROJECT_NAME"
    echo
    echo -e "${GREEN}部署成功完成！${NC}"
}

# 主函数
main() {
    log_info "开始部署操作..."
    log_info "部署类型: $DEPLOY_TYPE"
    log_info "项目名称: $PROJECT_NAME"
    log_info "部署目录: $DEPLOY_DIR"
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # 执行部署步骤
    check_environment
    
    case "$DEPLOY_TYPE" in
        "full")
            create_directories
            prepare_package
            deploy_config
            deploy_database
            restart_services
            ;;
        "code")
            prepare_package
            restart_services
            ;;
        "config")
            deploy_config
            restart_services
            ;;
        "database")
            deploy_database
            restart_services
            ;;
        *)
            log_error "不支持的部署类型: $DEPLOY_TYPE"
            exit 1
            ;;
    esac
    
    set_permissions
    cleanup_old_releases
    post_deploy_checks
    create_deploy_summary
    
    show_deploy_result
}

# 错误处理
trap 'log_error "部署过程中发生错误，行号: $LINENO"' ERR

# 执行主函数
main "$@"