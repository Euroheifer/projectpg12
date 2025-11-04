#!/bin/bash

# 记账应用最终修复版部署脚本
echo "🚀 开始部署 expense-tracker-最终修复版..."

# 检查当前目录
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：未找到docker-compose.yml文件"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

echo "📁 当前目录：$(pwd)"
echo "🔍 检查Docker环境..."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ 错误：Docker未运行，请启动Docker服务"
    exit 1
fi

echo "✅ Docker环境正常"

# 停止并删除现有容器
echo "🛑 停止现有容器..."
docker-compose down --remove-orphans
docker container prune -f
docker image prune -f

# 清理可能的旧镜像
echo "🧹 清理旧镜像和缓存..."
docker system prune -f
docker builder prune -f

# 构建并启动服务
echo "🔨 重新构建并启动服务..."
docker-compose up -d --build --force-recreate

# 等待服务启动
echo "⏳ 等待服务启动（约20秒）..."
sleep 20

# 检查服务状态
echo "📊 检查服务状态..."
docker-compose ps

# 获取日志（最后30行）
echo "📋 最近的日志输出："
docker-compose logs --tail=30

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 请访问：https://localhost:8443"
echo ""
echo "🔍 如果需要查看实时日志，运行："
echo "   docker-compose logs -f"
echo ""
echo "🛑 如果需要停止服务，运行："
echo "   docker-compose down"

# 显示访问信息
echo ""
echo "🎯 修复内容："
echo "   ✅ 修复了API端点404错误"
echo "   ✅ 添加了 /api/groups/{id}/balances 端点"
echo "   ✅ 添加了 /api/groups/{id}/members 端点"
echo "   ✅ 群组页面现在会显示真实数据"
