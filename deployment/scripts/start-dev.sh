#!/bin/bash

# 开发环境启动脚本
# 一键启动费用分摊管理系统的开发环境

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印彩色消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 函数：检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装 $1"
        exit 1
    fi
}

# 函数：检查Docker是否运行
check_docker() {
    if ! docker info &> /dev/null; then
        print_error "Docker未运行，请启动Docker Desktop"
        exit 1
    fi
}

# 函数：检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $port 已被占用，可能导致服务启动失败"
        return 1
    fi
    return 0
}

# 函数：等待服务就绪
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    print_info "等待 $name 服务就绪..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$name 服务就绪"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$name 服务启动超时"
    return 1
}

wait_for_docker_health() {
    local container=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    print_info "等待 $name 服务就绪..."
    
    while [ $attempt -le $max_attempts ]; do
        health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        
        if [ "$health_status" = "none" ]; then
            if docker ps --filter "name=$container" --filter "status=running" --format '{{.Names}}' | grep -q "$container"; then
                print_success "$name 服务就绪"
                return 0
            fi
        elif [ "$health_status" = "healthy" ]; then
            print_success "$name 服务就绪"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$name 服务启动超时"
    return 1
}

# 主函数
main() {
    echo ""
    echo "🚀 费用分摊管理系统 - 开发环境启动"
    echo "======================================"
    echo ""
    
    # 检查必要工具
    print_info "检查系统要求..."
    check_command "docker"
    check_command "docker-compose"
    check_command "curl"
    check_command "openssl"
    
    # 检查Docker状态
    print_info "检查Docker状态..."
    check_docker
    
    # 检查端口
    print_info "检查端口占用情况..."
    check_port 8000 || print_warning "端口8000可能被占用"
    check_port 8080 || print_warning "端口8080可能被占用"
    check_port 8081 || print_warning "端口8081可能被占用"
    check_port 5432 || print_warning "端口5432可能被占用"
    check_port 6379 || print_warning "端口6379可能被占用"
    check_port 5050 || print_warning "端口5050可能被占用"
    check_port 8443 || print_warning "端口8443可能被占用"
    
    echo ""
    
    # 生成SSL证书
    if [ ! -f "ssl/staging.crt" ] || [ ! -f "ssl/production.crt" ]; then
        print_info "生成SSL证书..."
        chmod +x deployment/scripts/generate-ssl.sh
        ./deployment/scripts/generate-ssl.sh
        echo ""
    else
        print_info "SSL证书已存在，跳过生成"
    fi
    
    # 停止现有容器
    print_info "停止现有容器..."
    docker-compose -f deployment/docker-compose.dev.yml down 2>/dev/null || true
    
    # 清理未使用的镜像和容器
    print_info "清理Docker资源..."
    docker system prune -f > /dev/null 2>&1 || true
    
    # 构建并启动服务
    print_info "构建并启动服务..."
    echo ""
    
    # 启动服务
    docker-compose -f deployment/docker-compose.dev.yml up --build -d
    
    echo ""
    
    # 等待服务启动
    print_info "等待服务启动..."
    
    # 等待数据库
    wait_for_docker_health "expense_dev_postgres" "PostgreSQL数据库"
    
    # 等待Redis
    wait_for_docker_health "expense_dev_redis" "Redis缓存"
    
    # 等待后端API
    wait_for_service "http://localhost:8000/health" "FastAPI后端"
    
    # 等待Nginx
    wait_for_service "http://localhost:8080" "Nginx代理"
    
    echo ""
    print_success "所有服务启动完成！"
    echo ""
    
    # 显示访问信息
    echo "🌐 访问地址："
    echo "================================"
    echo "📱 前端页面 (HTTP):  http://localhost:8080"
    echo "🔒 前端页面 (HTTPS): https://localhost:8443"
    echo "🔗 API文档:         http://localhost:8000/docs"
    echo "📊 后端健康检查:    http://localhost:8000/health"
    echo "🗄️  pgAdmin管理:    http://localhost:5050"
    echo "   用户名: admin@expense.local"
    echo "   密码: admin123"
    echo "📊 Redis管理:      http://localhost:8081"
    echo ""
    
    # 显示日志命令
    echo "📋 查看日志命令："
    echo "================================"
    echo "docker-compose -f deployment/docker-compose.dev.yml logs -f"
    echo "docker-compose -f deployment/docker-compose.dev.yml logs backend"
    echo "docker-compose -f deployment/docker-compose.dev.yml logs nginx"
    echo ""
    
    # 显示停止命令
    echo "🛑 停止服务命令："
    echo "================================"
    echo "docker-compose -f deployment/docker-compose.dev.yml down"
    echo ""
    
    print_success "开发环境已准备就绪！开始使用吧 🎉"
    echo ""
}

# 错误处理
trap 'print_error "脚本执行失败，请检查错误信息"; exit 1' ERR

# 运行主函数
main "$@"