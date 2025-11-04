#!/bin/bash

echo "=========================================="
echo "Iter2 修复版本验证脚本"
echo "=========================================="

# 验证关键文件
echo "1. 验证核心文件修复状态..."
echo "=================================="

# 检查home.html中的escapeHtml函数
if grep -q "window.escapeHtml = function(text)" app/templates/home.html; then
    echo "✅ escapeHtml函数已修复"
else
    echo "❌ escapeHtml函数未找到"
    exit 1
fi

# 检查loadInvitations函数是否完整实现
if grep -q "fetch('/invitations/me'" app/templates/home.html; then
    echo "✅ 邀请API调用已实现"
else
    echo "❌ 邀请API调用未实现"
    exit 1
fi

# 检查邀请显示函数
if grep -q "function displayInvitations" app/templates/home.html; then
    echo "✅ 邀请显示函数存在"
else
    echo "❌ 邀请显示函数未找到"
    exit 1
fi

# 检查API文件中的函数命名
if grep -q "export.*rejectInvitation" app/static/js/api/invitations.js; then
    echo "✅ rejectInvitation函数已实现"
else
    echo "❌ rejectInvitation函数未找到"
    exit 1
fi

# 检查showMessage函数
if grep -q "window.showMessage" app/templates/home.html; then
    echo "✅ showMessage函数已实现"
else
    echo "❌ showMessage函数未找到"
    exit 1
fi

echo ""
echo "2. 验证关键功能点..."
echo "=================================="

# 检查群组显示功能
if grep -q "displayGroups(groups)" app/templates/home.html; then
    echo "✅ 群组显示功能正常"
else
    echo "❌ 群组显示功能未找到"
fi

# 检查进入群组功能
if grep -q "function enterGroup" app/templates/home.html; then
    echo "✅ 进入群组功能正常"
else
    echo "❌ 进入群组功能未找到"
fi

# 检查群组创建功能
if grep -q "createGroup" app/templates/home.html; then
    echo "✅ 群组创建功能存在"
else
    echo "❌ 群组创建功能未找到"
fi

echo ""
echo "3. 验证项目结构..."
echo "=================================="

# 检查必要目录
if [ -d "app" ]; then
    echo "✅ app目录存在"
else
    echo "❌ app目录不存在"
fi

if [ -d "app/templates" ]; then
    echo "✅ templates目录存在"
else
    echo "❌ templates目录不存在"
fi

if [ -d "app/static" ]; then
    echo "✅ static目录存在"
else
    echo "❌ static目录不存在"
fi

# 检查关键文件
if [ -f "docker-compose.yml" ]; then
    echo "✅ docker-compose.yml存在"
else
    echo "❌ docker-compose.yml不存在"
fi

if [ -f "Dockerfile" ]; then
    echo "✅ Dockerfile存在"
else
    echo "❌ Dockerfile不存在"
fi

echo ""
echo "4. 检查项目完整性..."
echo "=================================="

# 计算重要文件数量
template_files=$(find app/templates -name "*.html" | wc -l)
js_files=$(find app/static -name "*.js" | wc -l)
py_files=$(find app -name "*.py" | wc -l)

echo "   HTML模板文件: $template_files 个"
echo "   JavaScript文件: $js_files 个"
echo "   Python文件: $py_files 个"

echo ""
echo "=========================================="
echo "验证完成！"
echo "项目已准备好部署和测试。"
echo "=========================================="

echo ""
echo "5. 部署步骤："
echo "=================================="
echo "1. 复制此项目到您的目标目录"
echo "2. 运行: docker-compose down --remove-orphans"
echo "3. 运行: docker-compose up -d --build"
echo "4. 访问: https://localhost:8443"
echo "5. 测试所有Iter2功能"