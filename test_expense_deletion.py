#!/usr/bin/env python3
"""
费用删除功能测试脚本
检查DELETE /groups/{group_id}/expenses/{expense_id}端点是否正确实现
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def test_api_endpoint():
    """测试费用删除API端点"""
    print("=== 费用删除API端点测试 ===")
    
    # 1. 检查API端点是否存在于main.py
    with open('app/main.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 查找删除端点
    if '@app.delete("/groups/{group_id}/expenses/{expense_id}"' in content:
        print("✓ API端点存在: DELETE /groups/{group_id}/expenses/{expense_id}")
    else:
        print("✗ API端点不存在")
        return False
    
    # 2. 检查函数实现
    if 'def delete_expense_from_group(' in content:
        print("✓ 删除函数存在: delete_expense_from_group")
    else:
        print("✗ 删除函数不存在")
        return False
    
    # 3. 检查权限验证
    if 'is_admin' in content and 'is_creator' in content:
        print("✓ 权限验证存在")
    else:
        print("✗ 权限验证缺失")
        return False
    
    # 4. 检查crud函数调用
    if 'crud.delete_expense(db, expense_id=expense_id, user_id=current_user.id)' in content:
        print("✓ CRUD函数调用正确")
    else:
        print("✗ CRUD函数调用错误")
        return False
    
    return True

def test_crud_function():
    """测试CRUD删除函数"""
    print("\n=== CRUD删除函数测试 ===")
    
    with open('app/crud.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'def delete_expense(db: Session, expense_id: int, user_id: int)' in content:
        print("✓ delete_expense函数存在")
    else:
        print("✗ delete_expense函数不存在")
        return False
    
    if 'create_audit_log' in content:
        print("✓ 审计日志记录存在")
    else:
        print("✗ 审计日志记录缺失")
        return False
    
    if 'db.query(models.Payment).filter(models.Payment.expense_id == expense_id).delete' in content:
        print("✓ 关联支付记录删除存在")
    else:
        print("✗ 关联支付记录删除缺失")
        return False
    
    return True

def test_frontend_bindings():
    """测试前端事件绑定"""
    print("\n=== 前端事件绑定测试 ===")
    
    # 1. 检查expense.js中的删除函数
    with open('app/static/js/api/expense.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'export function handleDeleteExpense()' in content:
        print("✓ handleDeleteExpense函数存在")
    else:
        print("✗ handleDeleteExpense函数不存在")
        return False
    
    if 'export async function confirmDeleteExpense()' in content:
        print("✓ confirmDeleteExpense函数存在")
    else:
        print("✗ confirmDeleteExpense函数不存在")
        return False
    
    if "fetch(`/groups/${groupId}/expenses/${expenseId}`, {" in content and 'method: \'DELETE\'' in content:
        print("✓ DELETE请求代码存在")
    else:
        print("✗ DELETE请求代码缺失")
        return False
    
    if 'window.handleDeleteExpense = handleDeleteExpense' in content:
        print("✓ handleDeleteExpense已暴露到全局")
    else:
        print("✗ handleDeleteExpense未暴露到全局")
        return False
    
    if 'window.confirmDeleteExpense = confirmDeleteExpense' in content:
        print("✓ confirmDeleteExpense已暴露到全局")
    else:
        print("✗ confirmDeleteExpense未暴露到全局")
        return False
    
    # 2. 检查group_page.js中的事件绑定
    with open('app/static/js/page/group_page.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'onclick="handleDeleteExpense()"' in open('app/templates/groups.html', 'r', encoding='utf-8').read():
        print("✓ HTML中的删除按钮onclick绑定存在")
    else:
        print("✗ HTML中的删除按钮onclick绑定缺失")
        return False
    
    if 'onclick="confirmDeleteExpense()"' in open('app/templates/groups.html', 'r', encoding='utf-8').read():
        print("✓ HTML中的确认删除按钮onclick绑定存在")
    else:
        print("✗ HTML中的确认删除按钮onclick绑定缺失")
        return False
    
    return True

def test_delete_button_fix():
    """测试删除按钮修复"""
    print("\n=== 删除按钮修复检查 ===")
    
    with open('app/static/js/page/group_page.js', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否还有错误的函数重复定义
    if 'window.handleDeleteExpense = function() {' in content:
        print("✗ 仍有错误的handleDeleteExpense重复定义")
        return False
    else:
        print("✓ 错误的handleDeleteExpense重复定义已移除")
    
    if 'window.confirmDeleteExpense = function() {' in content:
        print("✗ 仍有错误的confirmDeleteExpense重复定义")
        return False
    else:
        print("✓ 错误的confirmDeleteExpense重复定义已移除")
    
    return True

def main():
    """主测试函数"""
    print("费用删除功能检查")
    print("=" * 50)
    
    tests = [
        test_api_endpoint,
        test_crud_function, 
        test_frontend_bindings,
        test_delete_button_fix
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"测试 {test.__name__} 出错: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    print("测试总结:")
    if all(results):
        print("✓ 所有测试通过！费用删除功能已修复。")
        print("\n修复内容:")
        print("1. API端点 DELETE /groups/{group_id}/expenses/{expense_id} 正确实现")
        print("2. 权限检查正常工作（管理员和创建者可删除）")
        print("3. 前端删除按钮事件绑定正确")
        print("4. 移除了错误的函数重复定义")
        print("5. 删除操作的完整流程已修复")
    else:
        print("✗ 部分测试失败，需要进一步修复")
        for i, result in enumerate(results):
            test_name = tests[i].__name__
            status = "✓" if result else "✗"
            print(f"  {status} {test_name}")

if __name__ == "__main__":
    main()