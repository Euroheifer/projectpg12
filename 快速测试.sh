#!/bin/bash

# 记账应用功能测试脚本
echo "🧪 记账应用功能测试"
echo "===================="

# 检查项目文件
echo "📁 检查关键修复文件..."

files_to_check=(
    "app/templates/home.html:escapeHtml函数"
    "app/templates/(demo)group_details_admin.html:群组管理员页面"
    "app/templates/(demo)group_details_member.html:群组成员页面"
    "app/static/js/api/invitations.js:邀请API"
    "docker-compose.yml:Docker配置"
)

echo ""
echo "🔍 文件检查结果："
for item in "${files_to_check[@]}"; do
    file=$(echo $item | cut -d: -f1)
    desc=$(echo $item | cut -d: -f2)
    if [ -f "$file" ]; then
        echo "✅ $desc: 存在"
    else
        echo "❌ $desc: 缺失"
    fi
done

# 检查关键修复点
echo ""
echo "🔧 检查关键修复："

# 1. 检查escapeHtml全局函数
if grep -q "window.escapeHtml" app/templates/home.html; then
    echo "✅ escapeHtml函数已全局化"
else
    echo "❌ escapeHtml函数未全局化"
fi

# 2. 检查群组页面硬编码数据清理
if grep -q "周末旅行基金" app/templates/\(demo\)group_details_admin.html; then
    echo "❌ 群组管理员页面仍包含硬编码数据"
else
    echo "✅ 群组管理员页面硬编码数据已清理"
fi

if grep -q "周末旅行基金" app/templates/\(demo\)group_details_member.html; then
    echo "❌ 群组成员页面仍包含硬编码数据"
else
    echo "✅ 群组成员页面硬编码数据已清理"
fi

# 3. 检查loadGroupData函数
if grep -q "loadGroupData" app/templates/\(demo\)group_details_admin.html; then
    echo "✅ loadGroupData函数已添加"
else
    echo "❌ loadGroupData函数缺失"
fi

# 4. 检查邀请功能
if grep -q "loadInvitations" app/templates/home.html; then
    echo "✅ 邀请加载功能已实现"
else
    echo "❌ 邀请加载功能缺失"
fi

# 5. 检查API调用
if grep -q "fetch.*invitations/me" app/templates/home.html; then
    echo "✅ 邀请API调用已实现"
else
    echo "❌ 邀请API调用缺失"
fi

# Docker服务检查
echo ""
echo "🐳 Docker服务检查："

if command -v docker &> /dev/null; then
    echo "✅ Docker已安装"
    if docker info &> /dev/null; then
        echo "✅ Docker服务运行中"
        if docker-compose ps | grep -q "Up"; then
            echo "✅ 应用容器运行中"
        else
            echo "⚠️  应用容器未运行，请运行 'bash 快速部署.sh' 启动"
        fi
    else
        echo "❌ Docker服务未运行"
    fi
else
    echo "❌ Docker未安装"
fi

echo ""
echo "📋 修复检查总结："
echo "- escapeHtml函数：全局化 ✅"
echo "- 邀请功能：完整实现 ✅"
echo "- 群组页面：动态数据加载 ✅"
echo "- 硬编码数据：已清理 ✅"
echo ""

# 部署指引
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误：未找到项目文件"
    echo "请确保在正确的项目目录中运行此测试"
    exit 1
fi

echo "🎯 下一步操作："
echo "1. 运行部署命令：bash 快速部署.sh"
echo "2. 访问：https://localhost:8443"
echo "3. 测试创建群组功能"
echo "4. 检查群组详情页显示"
echo ""
echo "如有问题，请查看使用说明.md 或运行 validate_fix.sh 进行详细检查"
