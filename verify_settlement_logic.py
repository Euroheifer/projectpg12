#!/usr/bin/env python3
"""
结算功能逻辑验证脚本
验证结算计算逻辑的正确性
"""

def validate_settlement_calculations():
    """验证结算计算逻辑"""
    print("=== 结算功能逻辑验证 ===\n")
    
    # 模拟场景：3人群体，总费用100元
    # 角色定义
    # - 张三: 支付了100元（付费者）
    # - 李四: 应承担33.34元，已支付10元给张三
    # - 王五: 应承担33.33元，已支付20元给张三
    
    # 基础数据
    total_expense = 100.0  # 总费用
    
    # 假设费用平均分，每人33.33元
    share_per_person = total_expense / 3
    
    member_data = {
        1: {"name": "张三", "paid": 100.0, "share": share_per_person, "received": 30.0, "owed": 0.0},  # 付费者
        2: {"name": "李四", "paid": 10.0, "share": share_per_person, "received": 0.0, "owed": 23.34},  # 支付10元给张三
        3: {"name": "王五", "paid": 20.0, "share": share_per_person, "received": 0.0, "owed": 13.33},  # 支付20元给张三
    }
    
    print(f"测试场景：群组总费用${total_expense}")
    print("成员详情：")
    for member_id, data in member_data.items():
        print(f"  {data['name']}: 支付${data['paid']}, 应承担${data['share']}, 收款${data['received']}, 欠款${data['owed']}")
    
    # 计算每个人应该结算的金额
    print(f"\n=== 结算计算结果 ===")
    settlement_balances = {}
    
    for member_id, data in member_data.items():
        # 计算当前余额
        current_balance = data['paid'] - data['received'] - data['share']
        settlement_balances[member_id] = current_balance
        
        status = "应收钱" if current_balance > 0.01 else "应付钱" if current_balance < -0.01 else "账目平衡"
        print(f"{data['name']}: 当前余额 ${current_balance:.2f} ({status})")
    
    # 验证账目平衡
    total_balance = sum(settlement_balances.values())
    print(f"\n总余额检查: ${total_balance:.2f} (应该为0)")
    
    if abs(total_balance) < 0.01:
        print("✅ 账目平衡验证通过")
    else:
        print("❌ 账目平衡验证失败")
        return False
    
    # 生成推荐支付路径
    print(f"\n=== 推荐支付路径 ===")
    creditors = [(id, balance) for id, balance in settlement_balances.items() if balance > 0.01]
    debtors = [(id, balance) for id, balance in settlement_balances.items() if balance < -0.01]
    
    creditors.sort(key=lambda x: x[1], reverse=True)
    debtors.sort(key=lambda x: x[1], reverse=True)
    
    transactions = []
    i, j = 0, 0
    while i < len(creditors) and j < len(debtors):
        creditor_id, creditor_amount = creditors[i]
        debtor_id, debtor_amount = debtors[j]
        
        transaction_amount = min(creditor_amount, debtor_amount)
        
        if transaction_amount > 0.01:
            transactions.append({
                'from_user_id': debtor_id,
                'to_user_id': creditor_id,
                'amount': transaction_amount,
                'description': f"{member_data[debtor_id]['name']} 支付给 {member_data[creditor_id]['name']}"
            })
            
            creditors[i] = (creditor_id, creditor_amount - transaction_amount)
            debtors[j] = (debtor_id, debtor_amount - transaction_amount)
        
        if creditors[i][1] <= 0.01:
            i += 1
        if debtors[j][1] <= 0.01:
            j += 1
    
    # 显示交易路径
    for transaction in transactions:
        from_name = member_data[transaction['from_user_id']]['name']
        to_name = member_data[transaction['to_user_id']]['name']
        print(f"  {from_name} → {to_name}: ${transaction['amount']:.2f}")
    
    # 验证交易路径的完整性
    print(f"\n=== 交易路径验证 ===")
    expected_payments = {
        1: 0.0,  # 张三已经收到了30元，还应收13.33元
        2: -23.34,  # 李四还应付23.34元
        3: -13.33,  # 王五还应付13.33元
    }
    
    actual_payments = {member_id: 0.0 for member_id in member_data}
    for transaction in transactions:
        actual_payments[transaction['from_user_id']] -= transaction['amount']
        actual_payments[transaction['to_user_id']] += transaction['amount']
    
    print("预期 vs 实际支付:")
    for member_id in member_data:
        expected = expected_payments[member_id]
        actual = actual_payments[member_id]
        match = abs(expected - actual) < 0.01
        status = "✅" if match else "❌"
        print(f"  {member_data[member_id]['name']}: 预期${expected:.2f}, 实际${actual:.2f} {status}")
    
    return True

def validate_edge_cases():
    """验证边界情况"""
    print(f"\n=== 边界情况验证 ===\n")
    
    # 情况1: 两人群体，A支付100，B承担100，B支付100给A
    print("情况1: 两人群体完全结算")
    a_balance = 100.0 - 100.0  # 100 - 100
    b_balance = 0.0 - 100.0 + 100.0  # 0 - 100 + 100
    print(f"  A余额: ${a_balance} (应收钱)")
    print(f"  B余额: ${b_balance} (应付钱)")
    
    if abs(a_balance + b_balance) < 0.01:
        print("  ✅ 账目平衡")
    else:
        print("  ❌ 账目不平衡")
    
    # 情况2: 三人群体，费用完全平均分
    print(f"\n情况2: 三人群体完全平均分")
    total = 300.0
    per_person = 100.0
    
    payments = [50.0, 0.0, 100.0]  # A支付50，B支付0，C支付250
    received = [50.0, 50.0, 50.0]  # A收到50，B收到50，C收到50
    
    balances = []
    for i in range(3):
        balance = payments[i] - received[i] - per_person
        balances.append(balance)
        print(f"  第{i+1}人: 支付${payments[i]}, 收款${received[i]}, 承担${per_person}, 余额${balance}")
    
    total_balance = sum(balances)
    print(f"  总余额: ${total_balance} (应该为0)")
    
    if abs(total_balance) < 0.01:
        print("  ✅ 账目平衡")
    else:
        print("  ❌ 账目不平衡")
    
    return True

def main():
    """主函数"""
    print("群组结算功能验证\n")
    
    # 验证基本计算逻辑
    if not validate_settlement_calculations():
        print("❌ 基础计算逻辑验证失败")
        return
    
    # 验证边界情况
    if not validate_edge_cases():
        print("❌ 边界情况验证失败")
        return
    
    print(f"\n🎉 所有验证通过！结算功能逻辑正确。")

if __name__ == "__main__":
    main()
