#!/bin/bash

# 修复版自动安装和配置脚本
# 使用当前目录作为部署目录
# 用法: ./install_fixed.sh [项目名称] [配置类型]

set -euo pipefail

# 配置参数 - 使用当前目录作为默认部署目录
PROJECT_NAME=${1:-"projectpg12"}
INSTALL_TYPE=${2:-"full"}
DEPLOY_DIR=${3:-"$(pwd)"}  # 使用当前目录作为部署目录
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$DEPLOY_DIR/logs/install_${TIMESTAMP}.log"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

# 创建日志目录
create_log_directory() {
    log_step "创建日志目录..."
    mkdir -p "$DEPLOY_DIR/logs"
    mkdir -p "$DEPLOY_DIR/backup"
    chmod 755 "$DEPLOY_DIR/logs" "$DEPLOY_DIR/backup"
    log_success "日志目录创建完成"
}

# 检查项目文件
check_project_files() {
    log_step "检查项目文件..."
    
    local required_files=("server.js" "package.json" "ecosystem.config.js")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$DEPLOY_DIR/$file" ]; then
            missing_files+=("$file")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_warning "缺少以下文件: ${missing_files[*]}"
        log_info "请确保所有项目文件都在当前目录中"
    else
        log_success "项目文件检查完成"
    fi
}

# 安装Node.js依赖
install_dependencies() {
    log_step "安装Node.js依赖..."
    
    if [ -f "$DEPLOY_DIR/package.json" ]; then
        cd "$DEPLOY_DIR"
        log_info "安装npm依赖包..."
        npm install
        
        # 安装PM2全局包
        if ! command -v pm2 >/dev/null 2>&1; then
            log_info "安装PM2..."
            npm install -g pm2
        fi
        
        log_success "依赖安装完成"
    else
        log_error "未找到package.json文件"
        return 1
    fi
}

# 配置PM2
configure_pm2() {
    log_step "配置PM2..."
    
    if [ -f "$DEPLOY_DIR/ecosystem.config.js" ]; then
        # 启动应用
        pm2 start ecosystem.config.js --env production
        pm2 save
        
        # 配置开机自启
        pm2 startup > /tmp/pm2_startup.sh 2>/dev/null
        chmod +x /tmp/pm2_startup.sh
        /tmp/pm2_startup.sh
        
        log_success "PM2配置完成"
    else
        log_warning "未找到ecosystem.config.js文件"
    fi
}

# 配置防火墙
configure_firewall() {
    log_step "配置防火墙规则..."
    
    # 检查ufw是否可用
    if command -v ufw >/dev/null 2>&1; then
        log_info "启用防火墙规则..."
        ufw allow ssh
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 3000/tcp  # Node.js应用端口
        ufw --force enable
        log_success "防火墙规则配置完成"
    else
        log_info "ufw不可用，跳过防火墙配置"
    fi
}

# 创建启动脚本
create_startup_scripts() {
    log_step "创建启动脚本..."
    
    # 创建启动脚本
    cat > "$DEPLOY_DIR/start.sh" << 'EOF'
#!/bin/bash
# 项目启动脚本

echo "启动项目应用..."
cd "$(dirname "$0")"

# 启动PM2应用
pm2 start ecosystem.config.js --env production

echo "应用已启动"
echo "状态检查:"
pm2 status
echo ""
echo "日志查看: pm2 logs"
echo "停止应用: pm2 stop all"
EOF

    # 创建停止脚本
    cat > "$DEPLOY_DIR/stop.sh" << 'EOF'
#!/bin/bash
# 项目停止脚本

echo "停止项目应用..."
cd "$(dirname "$0")"

# 停止PM2应用
pm2 stop all

echo "应用已停止"
echo "状态检查:"
pm2 status
EOF

    # 创建重启脚本
    cat > "$DEPLOY_DIR/restart.sh" << 'EOF'
#!/bin/bash
# 项目重启脚本

echo "重启项目应用..."
cd "$(dirname "$0")"

# 重启PM2应用
pm2 restart all

echo "应用已重启"
echo "状态检查:"
pm2 status
EOF

    # 创建状态检查脚本
    cat > "$DEPLOY_DIR/status.sh" << 'EOF'
#!/bin/bash
# 项目状态检查脚本

echo "=== 项目状态检查 ==="
echo "当前目录: $(pwd)"
echo "时间: $(date)"
echo

echo "PM2进程状态:"
pm2 status

echo
echo "端口监听状态:"
netstat -tlnp | grep :3000 || echo "端口3000未被监听"

echo
echo "磁盘使用情况:"
df -h .

echo
echo "内存使用情况:"
free -h
EOF

    # 给脚本添加执行权限
    chmod +x "$DEPLOY_DIR/start.sh" "$DEPLOY_DIR/stop.sh" "$DEPLOY_DIR/restart.sh" "$DEPLOY_DIR/status.sh"
    
    log_success "启动脚本创建完成"
}

# 创建简单的健康检查
setup_health_check() {
    log_step "设置健康检查..."
    
    cat > "$DEPLOY_DIR/health_check.sh" << 'EOF'
#!/bin/bash
# 简单健康检查脚本

LOG_FILE="$(dirname "$0")/logs/health_check.log"

# 检查应用是否运行
if ! pm2 describe projectpg12 >/dev/null 2>&1; then
    echo "$(date): ERROR - PM2进程不存在" >> "$LOG_FILE"
    # 尝试重启应用
    cd "$(dirname "$0")"
    pm2 start ecosystem.config.js --env production
    echo "$(date): INFO - 已尝试重启应用" >> "$LOG_FILE"
fi

# 检查端口
if ! netstat -tlnp | grep -q ":3000 "; then
    echo "$(date): WARNING - 端口3000未监听" >> "$LOG_FILE"
fi

# 检查磁盘空间
DISK_USAGE=$(df . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "$(date): WARNING - 磁盘使用率: ${DISK_USAGE}%" >> "$LOG_FILE"
fi
EOF

    chmod +x "$DEPLOY_DIR/health_check.sh"
    
    # 添加到crontab（每5分钟检查一次）
    (crontab -l 2>/dev/null; echo "*/5 * * * * $DEPLOY_DIR/health_check.sh") | crontab -
    
    log_success "健康检查设置完成"
}

# 生成安装报告
generate_install_report() {
    log_step "生成安装报告..."
    
    local report_file="$DEPLOY_DIR/logs/install_report_$TIMESTAMP.txt"
    
    cat > "$report_file" << EOF
项目PG12安装报告
================
项目名称: $PROJECT_NAME
安装时间: $TIMESTAMP
部署目录: $DEPLOY_DIR
安装类型: $INSTALL_TYPE

系统信息:
  用户: $(whoami)
  当前目录: $(pwd)
  Node.js版本: $(node --version 2>/dev/null || echo "未安装")
  npm版本: $(npm --version 2>/dev/null || echo "未安装")
  PM2版本: $(pm2 --version 2>/dev/null || echo "未安装")

文件列表:
EOF

    ls -la "$DEPLOY_DIR" >> "$report_file"
    
    cat >> "$report_file" << EOF

已创建的管理脚本:
  start.sh  - 启动应用
  stop.sh   - 停止应用
  restart.sh - 重启应用
  status.sh - 检查状态
  health_check.sh - 健康检查

下一步操作:
  1. 启动应用: ./start.sh
  2. 检查状态: ./status.sh
  3. 查看日志: pm2 logs
  4. 访问应用: http://localhost:3000 或 https://172.25.76.174:443/

安装日志: $LOG_FILE
EOF
    
    log_success "安装报告已生成: $report_file"
}

# 显示安装摘要
show_install_summary() {
    echo
    echo -e "${GREEN}=== 项目PG12安装完成 ===${NC}"
    echo -e "项目名称: ${BLUE}$PROJECT_NAME${NC}"
    echo -e "部署目录: ${BLUE}$DEPLOY_DIR${NC}"
    echo
    echo -e "${YELLOW}已安装组件:${NC}"
    command -v node >/dev/null && echo "  ✅ Node.js: $(node --version)"
    command -v npm >/dev/null && echo "  ✅ npm: $(npm --version)"
    command -v pm2 >/dev/null && echo "  ✅ PM2: $(pm2 --version)"
    echo
    echo -e "${GREEN}管理脚本:${NC}"
    echo "  ./start.sh    - 启动应用"
    echo "  ./stop.sh     - 停止应用"
    echo "  ./restart.sh  - 重启应用"
    echo "  ./status.sh   - 检查状态"
    echo "  ./health_check.sh - 健康检查"
    echo
    echo -e "${BLUE}快速启动:${NC}"
    echo "  1. 启动应用: ./start.sh"
    echo "  2. 检查状态: ./status.sh"
    echo "  3. 查看日志: pm2 logs"
    echo
    echo -e "${GREEN}安装日志: $LOG_FILE${NC}"
    echo
    echo -e "${GREEN}项目PG12安装配置完成！${NC}"
}

# 主函数
main() {
    echo -e "${CYAN}=== 项目PG12自动安装脚本 ===${NC}"
    log_info "开始项目PG12安装配置..."
    
    # 创建日志目录
    create_log_directory
    
    # 执行安装步骤
    check_project_files
    install_dependencies
    configure_pm2
    configure_firewall
    create_startup_scripts
    setup_health_check
    generate_install_report
    
    show_install_summary
}

# 错误处理
trap 'log_error "安装过程中发生错误，行号: $LINENO"' ERR

# 执行主函数
main "$@"