#!/bin/bash

# 自动安装和配置脚本
# 用法: ./install.sh [项目名称] [配置类型]
# 配置类型: basic|full|custom
# 示例: ./install.sh myapp full

set -euo pipefail

# 配置参数
PROJECT_NAME=${1:-"deploy_project"}
INSTALL_TYPE=${2:-"full"}
DEPLOY_DIR=${3:-"/var/www/deploy"}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$DEPLOY_DIR/logs/install_${TIMESTAMP}.log"

# 系统检测
OS_TYPE=""
PACKAGE_MANAGER=""
NODE_VERSION=""
PYTHON_VERSION=""

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

# 检查系统环境
detect_system() {
    log_step "检测系统环境..."
    
    # 检测操作系统
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_TYPE="$ID"
        OS_VERSION="$VERSION_ID"
    else
        OS_TYPE="unknown"
        OS_VERSION="unknown"
    fi
    
    log_info "操作系统: $OS_TYPE $OS_VERSION"
    
    # 检测包管理器
    if command -v apt >/dev/null 2>&1; then
        PACKAGE_MANAGER="apt"
    elif command -v yum >/dev/null 2>&1; then
        PACKAGE_MANAGER="yum"
    elif command -v dnf >/dev/null 2>&1; then
        PACKAGE_MANAGER="dnf"
    elif command -v brew >/dev/null 2>&1; then
        PACKAGE_MANAGER="brew"
    else
        PACKAGE_MANAGER="none"
    fi
    
    log_info "包管理器: $PACKAGE_MANAGER"
    
    # 检测Node.js版本
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        log_info "Node.js版本: $NODE_VERSION"
    fi
    
    # 检测Python版本
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        log_info "Python版本: $PYTHON_VERSION"
    elif command -v python >/dev/null 2>&1; then
        PYTHON_VERSION=$(python --version | cut -d' ' -f2)
        log_info "Python版本: $PYTHON_VERSION"
    fi
}

# 检查管理员权限
check_root_privileges() {
    log_step "检查管理员权限..."
    
    if [ "$EUID" -ne 0 ]; then
        log_warning "非root用户，部分功能可能需要sudo权限"
        return 1
    else
        log_success "以root权限运行"
        return 0
    fi
}

# 更新系统包
update_system_packages() {
    log_step "更新系统包..."
    
    case "$PACKAGE_MANAGER" in
        "apt")
            log_info "使用apt更新系统包..."
            apt update
            apt upgrade -y
            ;;
        "yum")
            log_info "使用yum更新系统包..."
            yum update -y
            ;;
        "dnf")
            log_info "使用dnf更新系统包..."
            dnf update -y
            ;;
        "brew")
            log_info "使用brew更新系统包..."
            brew update
            brew upgrade
            ;;
        *)
            log_warning "未识别的包管理器，跳过系统更新"
            return 1
            ;;
    esac
    
    log_success "系统包更新完成"
}

# 安装基础软件包
install_basic_packages() {
    log_step "安装基础软件包..."
    
    local packages=(
        "curl"
        "wget"
        "git"
        "unzip"
        "software-properties-common"
        "apt-transport-https"
        "ca-certificates"
        "gnupg"
        "lsb-release"
        "build-essential"
    )
    
    case "$PACKAGE_MANAGER" in
        "apt")
            for package in "${packages[@]}"; do
                if ! dpkg -l | grep -q "^ii  $package "; then
                    log_info "安装软件包: $package"
                    apt install -y "$package"
                else
                    log_info "软件包已存在: $package"
                fi
            done
            ;;
        "yum")
            for package in "${packages[@]}"; do
                if ! rpm -q "$package" >/dev/null 2>&1; then
                    log_info "安装软件包: $package"
                    yum install -y "$package"
                else
                    log_info "软件包已存在: $package"
                fi
            done
            ;;
    esac
    
    log_success "基础软件包安装完成"
}

# 安装Node.js
install_nodejs() {
    log_step "安装Node.js..."
    
    if command -v node >/dev/null 2>&1; then
        log_info "Node.js已安装: $(node --version)"
        
        # 检查版本是否满足要求
        local node_major=$(node --version | cut -d'.' -f1 | sed 's/v//')
        if [ "$node_major" -lt 14 ]; then
            log_warning "Node.js版本过低，建议升级"
        else
            log_success "Node.js版本满足要求"
            return 0
        fi
    fi
    
    case "$PACKAGE_MANAGER" in
        "apt")
            log_info "通过NodeSource安装Node.js..."
            curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
            apt install -y nodejs
            ;;
        "yum")
            log_info "通过NodeSource安装Node.js..."
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | bash -
            yum install -y nodejs
            ;;
    esac
    
    if command -v node >/dev/null 2>&1; then
        log_success "Node.js安装完成: $(node --version)"
    else
        log_error "Node.js安装失败"
        return 1
    fi
}

# 安装npm/yarn
install_package_managers() {
    log_step "安装包管理器..."
    
    # 安装npm（通常随Node.js安装）
    if command -v npm >/dev/null 2>&1; then
        log_success "npm已安装: $(npm --version)"
        
        # 更新npm到最新版本
        npm install -g npm@latest
        log_success "npm已更新到最新版本"
    fi
    
    # 安装yarn
    if ! command -v yarn >/dev/null 2>&1; then
        log_info "安装Yarn..."
        npm install -g yarn
        log_success "Yarn安装完成: $(yarn --version)"
    else
        log_info "Yarn已安装: $(yarn --version)"
    fi
    
    # 安装pnpm
    if ! command -v pnpm >/dev/null 2>&1; then
        log_info "安装pnpm..."
        npm install -g pnpm
        log_success "pnpm安装完成"
    fi
}

# 安装Web服务器
install_web_server() {
    log_step "安装Web服务器..."
    
    case "$PACKAGE_MANAGER" in
        "apt")
            # 安装Nginx
            if ! command -v nginx >/dev/null 2>&1; then
                log_info "安装Nginx..."
                apt install -y nginx
                systemctl enable nginx
                systemctl start nginx
                log_success "Nginx安装并启动完成"
            else
                log_info "Nginx已安装"
            fi
            
            # 安装Apache2（可选）
            if [ "$INSTALL_TYPE" = "full" ]; then
                if ! command -v apache2 >/dev/null 2>&1; then
                    log_info "安装Apache2..."
                    apt install -y apache2
                    systemctl enable apache2
                    log_success "Apache2安装完成"
                else
                    log_info "Apache2已安装"
                fi
            fi
            ;;
    esac
    
    # 配置防火墙
    if command -v ufw >/dev/null 2>&1; then
        log_info "配置防火墙规则..."
        ufw allow 'Nginx Full' 2>/dev/null || ufw allow 'Apache' 2>/dev/null || true
        ufw allow ssh
        ufw --force enable
        log_success "防火墙规则配置完成"
    fi
}

# 安装数据库
install_database() {
    log_step "安装数据库..."
    
    case "$PACKAGE_MANAGER" in
        "apt")
            # 安装MySQL/MariaDB
            if [ "$INSTALL_TYPE" != "basic" ]; then
                if ! command -v mysql >/dev/null 2>&1 && ! command -v mariadb >/dev/null 2>&1; then
                    log_info "安装MariaDB..."
                    apt install -y mariadb-server
                    systemctl enable mariadb
                    systemctl start mariadb
                    
                    # 基础安全配置
                    log_info "运行MariaDB安全配置..."
                    mysql_secure_installation <<EOF

y
y
y
y
y
EOF
                    log_success "MariaDB安装并配置完成"
                else
                    log_info "MySQL/MariaDB已安装"
                fi
            fi
            
            # 安装PostgreSQL
            if [ "$INSTALL_TYPE" = "full" ]; then
                if ! command -v psql >/dev/null 2>&1; then
                    log_info "安装PostgreSQL..."
                    apt install -y postgresql postgresql-contrib
                    systemctl enable postgresql
                    systemctl start postgresql
                    log_success "PostgreSQL安装完成"
                else
                    log_info "PostgreSQL已安装"
                fi
            fi
            ;;
    esac
    
    # 安装Redis
    if [ "$INSTALL_TYPE" = "full" ]; then
        if ! command -v redis-server >/dev/null 2>&1; then
            log_info "安装Redis..."
            case "$PACKAGE_MANAGER" in
                "apt")
                    apt install -y redis-server
                    ;;
            esac
            systemctl enable redis-server
            systemctl start redis-server
            log_success "Redis安装完成"
        else
            log_info "Redis已安装"
        fi
    fi
}

# 安装Docker
install_docker() {
    log_step "安装Docker..."
    
    if command -v docker >/dev/null 2>&1; then
        log_info "Docker已安装: $(docker --version)"
        return 0
    fi
    
    case "$PACKAGE_MANAGER" in
        "apt")
            log_info "安装Docker..."
            
            # 添加Docker官方GPG密钥
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            
            # 添加Docker软件源
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # 安装Docker
            apt update
            apt install -y docker-ce docker-ce-cli containerd.io
            
            # 添加用户到docker组
            usermod -aG docker "$SUDO_USER" || true
            
            # 启动Docker
            systemctl enable docker
            systemctl start docker
            
            log_success "Docker安装完成"
            ;;
    esac
    
    # 安装Docker Compose
    if command -v docker >/dev/null 2>&1; then
        if ! command -v docker-compose >/dev/null 2>&1; then
            log_info "安装Docker Compose..."
            curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
            log_success "Docker Compose安装完成"
        else
            log_info "Docker Compose已安装"
        fi
    fi
}

# 配置系统服务
configure_system_services() {
    log_step "配置系统服务..."
    
    # 配置PM2（如果安装了Node.js）
    if command -v npm >/dev/null 2>&1; then
        if ! command -v pm2 >/dev/null 2>&1; then
            log_info "安装PM2..."
            npm install -g pm2
            log_success "PM2安装完成"
        fi
        
        # 配置PM2开机自启
        if command -v pm2 >/dev/null 2>&1; then
            pm2 startup
            log_info "配置PM2开机自启"
        fi
    fi
    
    # 配置日志轮转
    log_info "配置日志轮转..."
    cat > /etc/logrotate.d/deploy_project << EOF
$DEPLOY_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF
    log_success "日志轮转配置完成"
}

# 创建部署目录结构
create_deploy_structure() {
    log_step "创建部署目录结构..."
    
    # 创建基础目录
    mkdir -p "$DEPLOY_DIR"/{current,releases,shared,backups,logs,config}
    
    # 创建共享子目录
    mkdir -p "$DEPLOY_DIR/shared"/{uploads,cache,sessions,tmp}
    
    # 设置权限
    chmod 755 "$DEPLOY_DIR"
    chmod -R 755 "$DEPLOY_DIR"/{current,releases,shared,backups,logs,config}
    
    # 创建部署配置文件
    cat > "$DEPLOY_DIR/deploy.conf" << EOF
# 部署配置文件
PROJECT_NAME=$PROJECT_NAME
DEPLOY_DIR=$DEPLOY_DIR
INSTALL_TIME=$TIMESTAMP
INSTALL_TYPE=$INSTALL_TYPE
OS_TYPE=$OS_TYPE
NODE_VERSION=$NODE_VERSION
PYTHON_VERSION=$PYTHON_VERSION

# 服务配置
WEB_SERVER_ENABLED=true
DATABASE_ENABLED=true
DOCKER_ENABLED=false

# 目录结构
CURRENT_DIR=\$DEPLOY_DIR/current
RELEASES_DIR=\$DEPLOY_DIR/releases
SHARED_DIR=\$DEPLOY_DIR/shared
BACKUPS_DIR=\$DEPLOY_DIR/backups
LOGS_DIR=\$DEPLOY_DIR/logs
CONFIG_DIR=\$DEPLOY_DIR/config
EOF
    
    log_success "部署目录结构创建完成"
}

# 创建示例配置文件
create_sample_configs() {
    log_step "创建示例配置文件..."
    
    # 创建环境变量模板
    cat > "$DEPLOY_DIR/config/.env.example" << EOF
# 应用配置
APP_NAME=$PROJECT_NAME
APP_ENV=production
APP_DEBUG=false
APP_URL=http://localhost

# 数据库配置
DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=${PROJECT_NAME}_db
DB_USERNAME=root
DB_PASSWORD=

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 邮件配置
MAIL_DRIVER=smtp
MAIL_HOST=
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls

# 安全配置
JWT_SECRET=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here
EOF
    
    # 创建Nginx配置模板
    cat > "$DEPLOY_DIR/config/nginx.conf.example" << EOF
server {
    listen 80;
    server_name localhost;
    
    root $DEPLOY_DIR/current;
    index index.html index.htm index.php;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|tar|gz)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 主应用文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # API代理（如果需要）
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
EOF
    
    # 创建systemd服务模板
    cat > "$DEPLOY_DIR/config/$PROJECT_NAME.service.example" << EOF
[Unit]
Description=$PROJECT_NAME Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$DEPLOY_DIR/current
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$DEPLOY_DIR/config/.env

[Install]
WantedBy=multi-user.target
EOF
    
    log_success "示例配置文件创建完成"
}

# 设置监控
setup_monitoring() {
    log_step "设置基础监控..."
    
    # 安装htop（系统监控）
    case "$PACKAGE_MANAGER" in
        "apt")
            if ! command -v htop >/dev/null 2>&1; then
                apt install -y htop
            fi
            ;;
    esac
    
    # 创建简单的健康检查脚本
    cat > "$DEPLOY_DIR/scripts/health_check.sh" << 'EOF'
#!/bin/bash
# 健康检查脚本

DEPLOY_DIR="/var/www/deploy"
LOG_FILE="$DEPLOY_DIR/logs/health_check.log"

# 检查磁盘使用率
DISK_USAGE=$(df "$DEPLOY_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "$(date): WARNING - 磁盘使用率: ${DISK_USAGE}%" >> "$LOG_FILE"
fi

# 检查内存使用率
MEMORY_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
if (( $(echo "$MEMORY_USAGE > 90" | bc -l) )); then
    echo "$(date): WARNING - 内存使用率: ${MEMORY_USAGE}%" >> "$LOG_FILE"
fi

# 检查Web服务
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo "$(date): ERROR - Web服务无响应" >> "$LOG_FILE"
fi
EOF
    
    chmod +x "$DEPLOY_DIR/scripts/health_check.sh"
    
    # 创建crontab任务
    (crontab -l 2>/dev/null; echo "*/5 * * * * $DEPLOY_DIR/scripts/health_check.sh") | crontab -
    
    log_success "监控设置完成"
}

# 生成安装报告
generate_install_report() {
    log_step "生成安装报告..."
    
    local report_file="$DEPLOY_DIR/logs/install_report_$TIMESTAMP.txt"
    
    cat > "$report_file" << EOF
自动安装和配置报告
==================
项目名称: $PROJECT_NAME
安装时间: $TIMESTAMP
安装类型: $INSTALL_TYPE
部署目录: $DEPLOY_DIR

系统信息:
  操作系统: $OS_TYPE $OS_VERSION
  包管理器: $PACKAGE_MANAGER
  Node.js版本: ${NODE_VERSION:-"未安装"}
  Python版本: ${PYTHON_VERSION:-"未安装"}

安装的软件包:
EOF
    
    # 列出已安装的包
    case "$PACKAGE_MANAGER" in
        "apt")
            dpkg -l | grep -E "(nginx|apache2|mariadb|postgresql|redis|docker)" | awk '{print "  " $2 " " $3}' >> "$report_file"
            ;;
    esac
    
    cat >> "$report_file" << EOF

安装的服务:
EOF
    
    systemctl list-unit-files --state=enabled | grep -E "(nginx|apache2|mariadb|postgresql|redis|docker)" >> "$report_file" || echo "  没有启用的相关服务" >> "$report_file"
    
    cat >> "$report_file" << EOF

配置文件位置:
  环境变量模板: $DEPLOY_DIR/config/.env.example
  Nginx配置模板: $DEPLOY_DIR/config/nginx.conf.example
  Systemd服务模板: $DEPLOY_DIR/config/$PROJECT_NAME.service.example

下一步操作:
  1. 配置环境变量: cp $DEPLOY_DIR/config/.env.example $DEPLOY_DIR/config/.env
  2. 编辑配置文件
  3. 部署应用: ./deploy.sh full $PROJECT_NAME
  4. 验证部署: ./verify.sh $PROJECT_NAME

安装日志: $LOG_FILE
EOF
    
    log_success "安装报告已生成: $report_file"
}

# 显示安装摘要
show_install_summary() {
    echo
    echo -e "${GREEN}=== 自动安装完成 ===${NC}"
    echo -e "项目名称: ${BLUE}$PROJECT_NAME${NC}"
    echo -e "安装类型: ${BLUE}$INSTALL_TYPE${NC}"
    echo -e "部署目录: ${BLUE}$DEPLOY_DIR${NC}"
    echo
    echo -e "${YELLOW}已安装组件:${NC}"
    [ -n "$NODE_VERSION" ] && echo "  ✅ Node.js: $NODE_VERSION"
    [ -n "$PYTHON_VERSION" ] && echo "  ✅ Python: $PYTHON_VERSION"
    command -v nginx >/dev/null && echo "  ✅ Nginx"
    command -v apache2 >/dev/null && echo "  ✅ Apache2"
    command -v mysql >/dev/null && echo "  ✅ MySQL/MariaDB"
    command -v psql >/dev/null && echo "  ✅ PostgreSQL"
    command -v redis-server >/dev/null && echo "  ✅ Redis"
    command -v docker >/dev/null && echo "  ✅ Docker"
    echo
    echo -e "${BLUE}下一步操作:${NC}"
    echo "  1. 配置环境变量: cp $DEPLOY_DIR/config/.env.example $DEPLOY_DIR/config/.env"
    echo "  2. 编辑配置文件并设置数据库等参数"
    echo "  3. 部署应用: ./deploy.sh full $PROJECT_NAME"
    echo "  4. 验证部署: ./verify.sh $PROJECT_NAME"
    echo
    echo -e "${GREEN}安装日志: $LOG_FILE${NC}"
    echo
    echo -e "${GREEN}自动安装配置完成！${NC}"
}

# 主函数
main() {
    echo -e "${CYAN}=== 自动安装和配置脚本 ===${NC}"
    log_info "开始自动安装和配置..."
    log_info "项目名称: $PROJECT_NAME"
    log_info "安装类型: $INSTALL_TYPE"
    log_info "部署目录: $DEPLOY_DIR"
    
    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # 执行安装步骤
    detect_system
    check_root_privileges || log_warning "建议以root权限运行以获得最佳效果"
    
    case "$INSTALL_TYPE" in
        "basic")
            update_system_packages
            install_basic_packages
            install_nodejs
            install_package_managers
            install_web_server
            ;;
        "full")
            update_system_packages
            install_basic_packages
            install_nodejs
            install_package_managers
            install_web_server
            install_database
            install_docker
            ;;
        "custom")
            # 自定义安装，用户可以选择组件
            log_info "自定义安装模式，请选择要安装的组件:"
            echo "1. 基础软件包"
            echo "2. Node.js"
            echo "3. Web服务器"
            echo "4. 数据库"
            echo "5. Docker"
            echo "6. 全部安装"
            ;;
        *)
            log_error "不支持的安装类型: $INSTALL_TYPE"
            exit 1
            ;;
    esac
    
    configure_system_services
    create_deploy_structure
    create_sample_configs
    setup_monitoring
    generate_install_report
    
    show_install_summary
}

# 错误处理
trap 'log_error "安装过程中发生错误，行号: $LINENO"' ERR

# 执行主函数
main "$@"