#!/bin/bash

echo "=========================================="
echo "Iter2 修复版本部署脚本"
echo "=========================================="

# 检查是否在正确的目录
if [ ! -f "docker-compose.yml" ]; then
    echo "错误: 请在expense-tracker-fixed项目根目录下运行此脚本"
    exit 1
fi

echo "当前项目路径: $(pwd)"
echo "=========================="

# 1. 停止现有服务
echo "1. 停止现有Docker服务..."
docker-compose down --remove-orphans 2>/dev/null || true

# 2. 清理系统
echo "2. 清理Docker系统..."
docker system prune -f 2>/dev/null || true
docker volume prune -f 2>/dev/null || true

# 3. 重新构建服务
echo "3. 重新构建并启动服务..."
docker-compose up -d --build production_db production_backend

# 4. 等待服务启动
echo "4. 等待服务启动..."
echo "   请耐心等待，容器启动需要15-30秒..."

# 等待20秒
for i in {1..20}; do
    echo -n "."
    sleep 1
done
echo ""

# 5. 检查服务状态
echo ""
echo "5. 检查服务状态..."
docker-compose ps

# 6. 验证端口访问
echo ""
echo "6. 验证服务访问..."
if curl -k -s --max-time 5 https://localhost:8443 > /dev/null; then
    echo "✅ https://localhost:8443 可以正常访问"
else
    echo "⚠️  https://localhost:8443 暂时无法访问，请稍后重试"
    echo "   可能需要更多时间启动"
fi

# 7. 提供测试指导
echo ""
echo "7. 测试指导"
echo "=================================="
echo "请按以下顺序测试Iter2功能："
echo ""
echo "📝 基础功能测试："
echo "1. 访问 https://localhost:8443"
echo "2. 注册新用户账号"
echo "3. 登录系统"
echo "4. 点击'创建群组'按钮"
echo "5. 验证群组出现在首页列表中（不应该有escapeHtml错误）"
echo ""
echo "🔗 邀请功能测试："
echo "1. 需要第二个用户账号"
echo "2. 测试邀请发送、接受、拒绝"
echo ""
echo "💰 高级功能测试："
echo "1. 添加支出记录"
echo "2. 上传收据图片"
echo "3. 创建支付记录"
echo "4. 设置重复支出"

# 8. 提供故障排除信息
echo ""
echo "8. 故障排除"
echo "=================================="
echo "如果遇到问题，请运行以下命令："
echo ""
echo "# 查看服务日志"
echo "docker-compose logs production_backend"
echo ""
echo "# 检查容器状态"
echo "docker-compose ps"
echo ""
echo "# 重新启动服务"
echo "docker-compose restart production_backend"
echo ""
echo "# 完全重建（如果问题持续）"
echo "docker-compose down --remove-orphans"
echo "docker system prune -f"
echo "docker-compose up -d --build"

echo ""
echo "=========================================="
echo "部署完成！"
echo "项目已准备就绪，请开始测试。"
echo "=========================================="