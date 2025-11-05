#!/bin/bash

# 费用分摊管理系统 - 自动部署脚本
# 目标服务器: 172.25.76.174
# 部署路径: /home/sadm/projectpg12
# 访问地址: https://172.25.76.174:443/

set -e

echo "🚀 费用分摊管理系统 - 自动部署脚本"
echo "=========================================="
echo "目标: https://172.25.76.174:443/"
echo "路径: /home/sadm/projectpg12"
echo ""

# 检查是否为root用户
if [ "$EUID" -eq 0 ]; then
    echo "❌ 请不要使用root用户运行此脚本"
    exit 1
fi

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "📦 正在安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker安装完成，请重新登录后再次运行此脚本"
    exit 0
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "📦 正在安装Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose安装完成"
fi

echo "📁 创建部署目录..."
sudo mkdir -p /home/sadm/projectpg12/data/postgres /home/sadm/projectpg12/data/redis
sudo mkdir -p /home/sadm/projectpg12/logs/backend /home/sadm/projectpg12/logs/nginx
sudo mkdir -p /home/sadm/projectpg12/ssl/live/172.25.76.174

echo "📋 复制项目文件..."
cd /home/sadm/projectpg12
if [ ! -f "projectpg12-complete-final.tar.gz" ]; then
    echo "❌ 请先将 projectpg12-complete-final.tar.gz 文件放到 /home/sadm/projectpg12/ 目录下"
    exit 1
fi

sudo tar -xzf projectpg12-complete-final.tar.gz --strip-components=1
sudo chown -R $USER:$USER /home/sadm/projectpg12

echo "⚙️ 配置环境变量..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ 已创建 .env 文件，请根据需要修改"
else
    echo "ℹ️ .env 文件已存在，跳过创建"
fi

echo "🔒 配置SSL证书..."
# 安装certbot
sudo apt update
sudo apt install -y certbot

# 临时停止占用80端口的服务
sudo systemctl stop apache2 2>/dev/null || true
sudo systemctl disable apache2 2>/dev/null || true

# 生成SSL证书
echo "📜 正在生成SSL证书，这可能需要几分钟..."
sudo certbot certonly --standalone -d 172.25.76.174 --non-interactive --agree-tos --email admin@172.25.76.174

# 创建符号链接
if [ -d "/etc/letsencrypt/live/172.25.76.174" ]; then
    sudo ln -sf /etc/letsencrypt/live/172.25.76.174/fullchain.pem /home/sadm/projectpg12/ssl/live/172.25.76.174/fullchain.pem
    sudo ln -sf /etc/letsencrypt/live/172.25.76.174/privkey.pem /home/sadm/projectpg12/ssl/live/172.25.76.174/privkey.pem
    echo "✅ SSL证书配置完成"
else
    echo "⚠️ SSL证书生成失败，请手动配置"
fi

echo "🐳 启动Docker服务..."
# 停止所有相关容器
docker-compose -f docker-compose.yml down 2>/dev/null || true

# 构建并启动服务
docker-compose up -d --build

echo "⏳ 等待服务启动..."
sleep 30

echo "🔍 检查服务状态..."
docker-compose ps

echo ""
echo "🎉 部署完成！"
echo "=========================================="
echo "📍 访问地址: https://172.25.76.174:443/"
echo "📖 API文档: https://172.25.76.174:443/docs"
echo "🗄️ pgAdmin: http://172.25.76.174:5050"
echo "   用户名: admin@expense.local"
echo "   密码: admin123"
echo ""
echo "📋 常用命令:"
echo "  查看日志: docker-compose logs -f"
echo "  重启服务: docker-compose restart"
echo "  停止服务: docker-compose down"
echo ""
echo "⚠️ 如果无法访问，请检查:"
echo "  1. 防火墙是否开放80和443端口"
echo "  2. SSL证书是否正确生成"
echo "  3. 容器是否正常运行: docker ps"
echo ""
echo "📖 详细文档请查看: deployment-guide-for-172.25.76.174.md"