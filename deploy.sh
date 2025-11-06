#!/bin/bash

# ProjectPG12 修复版本部署脚本
# 部署说明：将此文件夹替换 /home/sadm/projectpg12 目录

echo "=== ProjectPG12 修复版本部署脚本 ==="
echo "开始部署修复版本..."

# 检查是否为root用户或有sudo权限
if [ "$EUID" -eq 0 ]; then
    echo "以root用户运行"
    TARGET_DIR="/home/sadm/projectpg12"
else
    echo "当前用户: $(whoami)"
    echo "请确保有权限访问 /home/sadm/projectpg12 目录"
    TARGET_DIR="/home/sadm/projectpg12"
fi

# 备份原始目录（如果存在）
if [ -d "$TARGET_DIR" ]; then
    echo "正在备份原始目录..."
    BACKUP_DIR="${TARGET_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
    sudo cp -r "$TARGET_DIR" "$BACKUP_DIR"
    echo "备份完成: $BACKUP_DIR"
fi

# 停止Docker服务
echo "正在停止Docker服务..."
sudo docker-compose down 2>/dev/null || true
sudo docker-compose -f docker-compose.yml down 2>/dev/null || true

# 复制修复文件
echo "正在部署修复文件..."
if [ "$EUID" -eq 0 ]; then
    sudo cp -r . "$TARGET_DIR/"
else
    cp -r . "$TARGET_DIR/"
fi

# 设置正确的权限
echo "正在设置文件权限..."
chmod +x "$TARGET_DIR"/*.sh 2>/dev/null || true

# 重启Docker服务
echo "正在重启Docker服务..."
cd "$TARGET_DIR"
sudo docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
if sudo docker-compose ps | grep -q "Up"; then
    echo "✅ 部署成功！服务已启动"
    echo "请访问: https://172.25.76.174:443/"
else
    echo "❌ 部署可能存在问题，请检查Docker状态"
    echo "检查命令: sudo docker-compose ps"
    echo "查看日志: sudo docker-compose logs"
fi

echo "=== 部署脚本执行完成 ==="
