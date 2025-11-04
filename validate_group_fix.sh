#!/bin/bash

echo "=========================================="
echo "群组详情页面修复验证脚本"
echo "=========================================="

echo "1. 检查管理员页面修复状态..."
echo "=================================="

# 检查管理员页面的修复
if grep -q "正在加载群组信息" app/templates/\(demo\)group_details_admin.html; then
    echo "✅ 管理员页面: 群组名称已修复为动态加载"
else
    echo "❌ 管理员页面: 群组名称修复失败"
fi

if grep -q "group-id-display" app/templates/\(demo\)group_details_admin.html; then
    echo "✅ 管理员页面: 群组ID显示元素已添加"
else
    echo "❌ 管理员页面: 群组ID显示元素未找到"
fi

if grep -q "balance-owed-count" app/templates/\(demo\)group_details_admin.html; then
    echo "✅ 管理员页面: 余额计数元素已添加"
else
    echo "❌ 管理员页面: 余额计数元素未找到"
fi

if grep -q "loadGroupData" app/templates/\(demo\)group_details_admin.html; then
    echo "✅ 管理员页面: loadGroupData函数已添加"
else
    echo "❌ 管理员页面: loadGroupData函数未找到"
fi

echo ""
echo "2. 检查成员页面修复状态..."
echo "=================================="

# 检查成员页面的修复
if grep -q "正在加载群组信息" app/templates/\(demo\)group_details_member.html; then
    echo "✅ 成员页面: 群组名称已修复为动态加载"
else
    echo "❌ 成员页面: 群组名称修复失败"
fi

if grep -q "group-id-display" app/templates/\(demo\)group_details_member.html; then
    echo "✅ 成员页面: 群组ID显示元素已添加"
else
    echo "❌ 成员页面: 群组ID显示元素未找到"
fi

if grep -q "balance-owed-count" app/templates/\(demo\)group_details_member.html; then
    echo "✅ 成员页面: 余额计数元素已添加"
else
    echo "❌ 成员页面: 余额计数元素未找到"
fi

if grep -q "loadGroupData" app/templates/\(demo\)group_details_member.html; then
    echo "✅ 成员页面: loadGroupData函数已添加"
else
    echo "❌ 成员页面: loadGroupData函数未找到"
fi

echo ""
echo "3. 检查硬编码数据清理状态..."
echo "=================================="

# 检查硬编码演示数据是否已清理
HARD_CODED_COUNT=$(grep -c "周末旅行基金\|¥150\.50\|¥45\.00" app/templates/\(demo\)group_details_admin.html app/templates/\(demo\)group_details_member.html || true)

if [ "$HARD_CODED_COUNT" -eq 0 ]; then
    echo "✅ 硬编码演示数据已完全清理"
else
    echo "❌ 仍有 $HARD_CODED_COUNT 处硬编码演示数据未清理"
    echo "   位置:"
    grep -n "周末旅行基金\|¥150\.50\|¥45\.00" app/templates/\(demo\)group_details_admin.html app/templates/\(demo\)group_details_member.html
fi

echo ""
echo "4. 验证API调用代码..."
echo "=================================="

# 检查API调用代码
if grep -q "fetch(\`/api/groups/\${groupId}\`" app/templates/\(demo\)group_details_admin.html; then
    echo "✅ 管理员页面: API调用代码已添加"
else
    echo "❌ 管理员页面: API调用代码未找到"
fi

if grep -q "fetch(\`/groups/\${groupId}/balance\`" app/templates/\(demo\)group_details_admin.html; then
    echo "✅ 管理员页面: 余额API调用已添加"
else
    echo "❌ 管理员页面: 余额API调用未找到"
fi

echo ""
echo "5. 项目结构验证..."
echo "=================================="

# 检查关键文件是否存在
if [ -f "app/templates/(demo)group_details_admin.html" ]; then
    echo "✅ 管理员页面模板文件存在"
else
    echo "❌ 管理员页面模板文件不存在"
fi

if [ -f "app/templates/(demo)group_details_member.html" ]; then
    echo "✅ 成员页面模板文件存在"
else
    echo "❌ 成员页面模板文件不存在"
fi

if [ -f "app/main.py" ]; then
    echo "✅ 后端主文件存在"
else
    echo "❌ 后端主文件不存在"
fi

if [ -f "app/pages.py" ]; then
    echo "✅ 页面路由文件存在"
else
    echo "❌ 页面路由文件不存在"
fi

echo ""
echo "=========================================="
echo "群组详情页面修复验证完成！"
echo "=========================================="

echo ""
echo "6. 部署和测试建议："
echo "=================================="
echo "修复完成后，请执行以下步骤测试："
echo ""
echo "1. 重新构建Docker容器："
echo "   docker-compose down --remove-orphans"
echo "   docker-compose up -d --build"
echo ""
echo "2. 创建测试群组："
echo "   - 访问 https://localhost:8443"
echo "   - 登录系统"
echo "   - 创建新群组（不要使用'周末旅行基金'这个名字）"
echo ""
echo "3. 验证群组详情页："
echo "   - 点击进入刚创建的群组"
echo "   - 确认页面显示正确的群组名称（不是'周末旅行基金'）"
echo "   - 确认余额显示为 ¥0.00（不是 ¥150.50 或 ¥45.00）"
echo "   - 确认没有硬编码的演示数据"
echo ""
echo "4. 检查浏览器控制台："
echo "   - 打开F12开发者工具"
echo "   - 查看控制台是否显示 '正在加载群组数据，群组ID: X'"
echo "   - 确认没有JavaScript错误"

echo ""
echo "修复说明："
echo "- 移除了所有硬编码的演示数据（'周末旅行基金'、¥150.50、¥45.00）"
echo "- 实现了从URL路径获取群组ID"
echo "- 添加了后端API调用获取真实数据"
echo "- 新创建的群组将显示正确的空白数据（¥0.00）"
echo "- 修复适用于管理员和成员视图"
echo ""
echo "预期效果："
echo "✅ 新创建群组的详情页应该显示："
echo "   - 正确的群组名称（不是'周末旅行基金'）"
echo "   - 余额 ¥0.00（不是 ¥150.50 或 ¥45.00）"
echo "   - 正确的成员数量"
echo "   - 从后端API获取的真实数据"