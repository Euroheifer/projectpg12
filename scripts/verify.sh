#!/bin/bash

# 部署验证脚本
# 用法: ./verify.sh [项目名称] [部署目录]
# 示例: ./verify.sh myapp /var/www/deploy

set -euo pipefail

# 配置参数
PROJECT_NAME=${1:-"deploy_project"}
DEPLOY_DIR=${2:-"/var/www/deploy"}
VERIFY_LOG_FILE="$DEPLOY_DIR/logs/verify_$(date +%Y%m%d_%H%M%S).log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 验证结果统计
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# 日志函数
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$VERIFY_LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$VERIFY_LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$VERIFY_LOG_FILE"
    ((PASSED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1" | tee -a "$VERIFY_LOG_FILE"
    ((FAILED_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$VERIFY_LOG_FILE"
    ((WARNING_CHECKS++))
    ((TOTAL_CHECKS++))
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1" | tee -a "$VERIFY_LOG_FILE"
}

# 检查目录结构
check_directory_structure() {
    log_step "检查目录结构..."
    
    local required_dirs=(
        "$DEPLOY_DIR"
        "$DEPLOY_DIR/current"
        "$DEPLOY_DIR/releases"
        "$DEPLOY_DIR/shared"
        "$DEPLOY_DIR/logs"
        "$DEPLOY_DIR/config"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_success "目录存在: $dir"
        else
            log_fail "目录不存在: $dir"
        fi
    done
}

# 检查文件权限
check_file_permissions() {
    log_step "检查文件权限..."
    
    # 检查当前版本符号链接
    if [ -L "$DEPLOY_DIR/current" ]; then
        local current_target=$(readlink "$DEPLOY_DIR/current")
        log_success "当前版本链接: $current_target"
        
        if [ -d "$current_target" ]; then
            log_success "链接目标目录存在"
        else
            log_fail "链接目标目录不存在: $current_target"
        fi
    else
        log_fail "当前版本链接不存在"
    fi
    
    # 检查关键文件权限
    if [ -f "$DEPLOY_DIR/config/.env" ]; then
        local env_perms=$(stat -c "%a" "$DEPLOY_DIR/config/.env")
        if [ "$env_perms" = "600" ]; then
            log_success "环境变量文件权限正确: $env_perms"
        else
            log_warning "环境变量文件权限: $env_perms (建议600)"
        fi
    fi
}

# 检查Web服务状态
check_web_services() {
    log_step "检查Web服务状态..."
    
    # 检查 Nginx
    if systemctl list-unit-files | grep -q nginx; then
        if systemctl is-active --quiet nginx; then
            log_success "Nginx 服务正在运行"
            
            # 测试 Nginx 配置
            if nginx -t >/dev/null 2>&1; then
                log_success "Nginx 配置语法正确"
            else
                log_fail "Nginx 配置语法错误"
            fi
        else
            log_fail "Nginx 服务未运行"
        fi
    else
        log_warning "Nginx 未安装"
    fi
    
    # 检查 Apache
    if systemctl list-unit-files | grep -q apache2; then
        if systemctl is-active --quiet apache2; then
            log_success "Apache 服务正在运行"
        else
            log_fail "Apache 服务未运行"
        fi
    else
        log_warning "Apache 未安装"
    fi
    
    # 检查端口监听
    for port in 80 443 3000 8080; do
        if netstat -tuln | grep -q ":$port "; then
            log_success "端口 $port 正在监听"
        else
            log_warning "端口 $port 未监听"
        fi
    done
}

# 检查应用状态
check_application_status() {
    log_step "检查应用状态..."
    
    # 检查主页面响应
    local test_urls=(
        "http://localhost"
        "http://localhost:80"
        "http://localhost:3000"
        "http://localhost:8080"
    )
    
    for url in "${test_urls[@]}"; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
            log_success "网站可访问: $url"
            break
        fi
    done
    
    # 检查应用进程
    local app_processes=("node" "pm2" "python" "java")
    for process in "${app_processes[@]}"; do
        if pgrep -f "$process" >/dev/null; then
            log_success "应用进程正在运行: $process"
        fi
    done
    
    # 检查Docker容器
    if command -v docker >/dev/null 2>&1; then
        if docker ps | grep -q "$PROJECT_NAME"; then
            log_success "Docker 容器正在运行: $PROJECT_NAME"
            
            # 检查容器健康状态
            if docker ps --format "table {{.Names}}\t{{.Status}}" | grep "$PROJECT_NAME" | grep -q "Up"; then
                log_success "Docker 容器状态健康"
            else
                log_fail "Docker 容器状态不健康"
            fi
        fi
    fi
}

# 检查数据库连接
check_database_connectivity() {
    log_step "检查数据库连接..."
    
    # MySQL/MariaDB 检查
    if command -v mysql >/dev/null 2>&1; then
        if [ -n "${DB_NAME:-}" ] && [ -n "${DB_USER:-}" ]; then
            if mysql -u "$DB_USER" -p"${DB_PASSWORD:-}" "$DB_NAME" -e "SELECT 1" >/dev/null 2>&1; then
                log_success "MySQL 数据库连接正常"
                
                # 检查关键表
                local important_tables=("users" "sessions" "settings")
                for table in "${important_tables[@]}"; do
                    if mysql -u "$DB_USER" -p"${DB_PASSWORD:-}" "$DB_NAME" -e "SHOW TABLES LIKE '$table'" | grep -q "$table"; then
                        log_success "数据表存在: $table"
                    else
                        log_warning "数据表不存在: $table"
                    fi
                done
            else
                log_fail "MySQL 数据库连接失败"
            fi
        fi
    fi
    
    # PostgreSQL 检查
    if command -v psql >/dev/null 2>&1; then
        if [ -n "${PG_DB_NAME:-}" ] && [ -n "${PG_USER:-}" ]; then
            if PGPASSWORD="${PG_PASSWORD:-}" psql -U "$PG_USER" -d "$PG_DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
                log_success "PostgreSQL 数据库连接正常"
            else
                log_fail "PostgreSQL 数据库连接失败"
            fi
        fi
    fi
    
    # Redis 检查
    if command -v redis-cli >/dev/null 2>&1; then
        if redis-cli ping | grep -q "PONG"; then
            log_success "Redis 连接正常"
        else
            log_fail "Redis 连接失败"
        fi
    fi
}

# 检查日志文件
check_log_files() {
    log_step "检查日志文件..."
    
    # 检查日志目录
    if [ -d "$DEPLOY_DIR/logs" ]; then
        log_success "日志目录存在"
        
        # 检查最近的日志
        local recent_logs=$(find "$DEPLOY_DIR/logs" -name "*.log" -mtime -1 | wc -l)
        if [ "$recent_logs" -gt 0 ]; then
            log_success "发现 $recent_logs 个最近24小时内的日志文件"
        else
            log_warning "没有发现最近的日志文件"
        fi
        
        # 检查错误日志
        local error_logs=$(find "$DEPLOY_DIR/logs" -name "*error*.log" | wc -l)
        if [ "$error_logs" -gt 0 ]; then
            log_info "发现 $error_logs 个错误日志文件"
            
            # 检查是否有新的错误
            local recent_errors=$(find "$DEPLOY_DIR/logs" -name "*error*.log" -mtime -1 -exec grep -i "error\|fatal\|exception" {} \; | wc -l)
            if [ "$recent_errors" -gt 0 ]; then
                log_warning "发现 $recent_errors 个最近的错误记录"
            else
                log_success "最近的错误日志中没有新的错误"
            fi
        fi
    else
        log_fail "日志目录不存在"
    fi
}

# 检查磁盘空间
check_disk_space() {
    log_step "检查磁盘空间..."
    
    local threshold=90
    local deploy_disk_usage=$(df "$DEPLOY_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$deploy_disk_usage" -lt "$threshold" ]; then
        log_success "部署目录磁盘使用率: ${deploy_disk_usage}%"
    elif [ "$deploy_disk_usage" -lt 95 ]; then
        log_warning "部署目录磁盘使用率: ${deploy_disk_usage}%"
    else
        log_fail "部署目录磁盘使用率过高: ${deploy_disk_usage}%"
    fi
    
    # 检查tmp目录
    local tmp_usage=$(df /tmp | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$tmp_usage" -gt "$threshold" ]; then
        log_warning "临时目录磁盘使用率: ${tmp_usage}%"
    fi
}

# 检查系统资源
check_system_resources() {
    log_step "检查系统资源..."
    
    # 检查内存使用
    local memory_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$memory_usage < 80" | bc -l) )); then
        log_success "内存使用率正常: ${memory_usage}%"
    else
        log_warning "内存使用率较高: ${memory_usage}%"
    fi
    
    # 检查CPU负载
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_percent=$(echo "scale=1; $load_avg / $cpu_cores * 100" | bc)
    
    if (( $(echo "$load_percent < 80" | bc -l) )); then
        log_success "CPU负载正常: ${load_percent}%"
    else
        log_warning "CPU负载较高: ${load_percent}%"
    fi
    
    # 检查进程数量
    local process_count=$(ps aux | wc -l)
    if [ "$process_count" -lt 500 ]; then
        log_success "系统进程数量正常: $process_count"
    else
        log_warning "系统进程数量较多: $process_count"
    fi
}

# 检查安全配置
check_security_config() {
    log_step "检查安全配置..."
    
    # 检查防火墙状态
    if command -v ufw >/dev/null 2>&1; then
        if ufw status | grep -q "Status: active"; then
            log_success "UFW 防火墙已启用"
        else
            log_warning "UFW 防火墙未启用"
        fi
    elif command -v firewall-cmd >/dev/null 2>&1; then
        if firewall-cmd --state | grep -q "running"; then
            log_success "Firewalld 防火墙已启用"
        else
            log_warning "Firewalld 防火墙未启用"
        fi
    fi
    
    # 检查SSH配置
    if [ -f "/etc/ssh/sshd_config" ]; then
        if grep -q "PermitRootLogin no" /etc/ssh/sshd_config; then
            log_success "SSH 禁止root登录配置正确"
        else
            log_warning "SSH 建议禁止root登录"
        fi
    fi
    
    # 检查文件权限
    local sensitive_files=(".env" "config.json" "*.key" "*.pem")
    for pattern in "${sensitive_files[@]}"; do
        local files=$(find "$DEPLOY_DIR" -name "$pattern" 2>/dev/null)
        if [ -n "$files" ]; then
            for file in $files; do
                local perms=$(stat -c "%a" "$file")
                if [[ "$perms" =~ ^[6-7][0-4][0]$ ]]; then
                    log_success "敏感文件权限正确: $file ($perms)"
                else
                    log_warning "敏感文件权限建议检查: $file ($perms)"
                fi
            done
        fi
    done
}

# 检查SSL证书
check_ssl_certificates() {
    log_step "检查SSL证书..."
    
    # 检查Let's Encrypt证书
    if [ -d "/etc/letsencrypt/live" ]; then
        local cert_count=$(find /etc/letsencrypt/live -name "cert.pem" | wc -l)
        if [ "$cert_count" -gt 0 ]; then
            log_success "发现 $cert_count 个SSL证书"
            
            # 检查证书有效期
            for cert in /etc/letsencrypt/live/*/cert.pem; do
                if [ -f "$cert" ]; then
                    local expiry_date=$(openssl x509 -enddate -noout -in "$cert" | cut -d= -f2)
                    local expiry_timestamp=$(date -d "$expiry_date" +%s)
                    local current_timestamp=$(date +%s)
                    local days_left=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                    
                    if [ "$days_left" -gt 30 ]; then
                        log_success "SSL证书有效期充足: $days_left 天"
                    elif [ "$days_left" -gt 7 ]; then
                        log_warning "SSL证书即将过期: $days_left 天"
                    else
                        log_fail "SSL证书即将过期: $days_left 天"
                    fi
                fi
            done
        fi
    fi
}

# 检查备份状态
check_backup_status() {
    log_step "检查备份状态..."
    
    # 检查备份目录
    if [ -d "$DEPLOY_DIR/backups" ]; then
        log_success "备份目录存在"
        
        # 检查备份文件
        local backup_count=$(find "$DEPLOY_DIR/backups" -name "*.tar.gz" 2>/dev/null | wc -l)
        if [ "$backup_count" -gt 0 ]; then
            log_success "发现 $backup_count 个备份文件"
            
            # 检查最近的备份
            local recent_backups=$(find "$DEPLOY_DIR/backups" -name "*.tar.gz" -mtime -7 | wc -l)
            if [ "$recent_backups" -gt 0 ]; then
                log_success "过去7天内有 $recent_backups 个备份"
            else
                log_warning "过去7天内没有备份文件"
            fi
        else
            log_warning "没有发现备份文件"
        fi
    fi
}

# 生成验证报告
generate_verification_report() {
    log_step "生成验证报告..."
    
    local report_file="$DEPLOY_DIR/logs/verification_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
部署验证报告
============
项目名称: $PROJECT_NAME
验证时间: $(date '+%Y-%m-%d %H:%M:%S')
部署目录: $DEPLOY_DIR

验证结果统计:
  总检查项: $TOTAL_CHECKS
  通过: $PASSED_CHECKS
  失败: $FAILED_CHECKS
  警告: $WARNING_CHECKS

验证状态: $([ $FAILED_CHECKS -eq 0 ] && echo "通过" || echo "有失败项")

详细日志: $VERIFY_LOG_FILE

建议操作:
EOF
    
    if [ "$FAILED_CHECKS" -gt 0 ]; then
        echo "- 立即检查失败的验证项" >> "$report_file"
    fi
    
    if [ "$WARNING_CHECKS" -gt 0 ]; then
        echo "- 关注警告项，可能需要后续处理" >> "$report_file"
    fi
    
    echo "- 定期运行验证脚本监控系统状态" >> "$report_file"
    
    log_success "验证报告已生成: $report_file"
}

# 显示验证摘要
show_verification_summary() {
    echo
    echo -e "${PURPLE}=== 验证结果摘要 ===${NC}"
    echo -e "项目名称: ${BLUE}$PROJECT_NAME${NC}"
    echo -e "部署目录: ${BLUE}$DEPLOY_DIR${NC}"
    echo -e "验证时间: ${BLUE}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo
    echo -e "${GREEN}通过: $PASSED_CHECKS${NC}"
    echo -e "${RED}失败: $FAILED_CHECKS${NC}"
    echo -e "${YELLOW}警告: $WARNING_CHECKS${NC}"
    echo -e "总计: $TOTAL_CHECKS"
    echo
    
    if [ "$FAILED_CHECKS" -eq 0 ]; then
        echo -e "${GREEN}✅ 验证通过！部署状态良好。${NC}"
    else
        echo -e "${RED}❌ 验证失败！请检查失败项目。${NC}"
    fi
    
    echo
    echo -e "${BLUE}详细日志: $VERIFY_LOG_FILE${NC}"
}

# 主函数
main() {
    log_info "开始部署验证..."
    log_info "项目名称: $PROJECT_NAME"
    log_info "部署目录: $DEPLOY_DIR"
    
    # 创建日志目录
    mkdir -p "$(dirname "$VERIFY_LOG_FILE")"
    
    # 执行验证步骤
    check_directory_structure
    check_file_permissions
    check_web_services
    check_application_status
    check_database_connectivity
    check_log_files
    check_disk_space
    check_system_resources
    check_security_config
    check_ssl_certificates
    check_backup_status
    
    generate_verification_report
    show_verification_summary
}

# 错误处理
trap 'log_info "验证过程中发生错误，行号: $LINENO"' ERR

# 执行主函数
main "$@"