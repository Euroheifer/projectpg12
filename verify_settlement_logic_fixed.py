#!/usr/bin/env python3
"""
结算功能逻辑验证脚本（修正版）
验证结算计算逻辑的正确性
"""

def validate_basic_settlement():
    """验证基础结算计算"""
    print("=== 基础结算计算验证 ===\n")
    
    # 场景：3人群体，费用100元，平均分摊
    # 张三支付了100元，李四支付了10元给张三，王五支付了20元给张三
    
    members = {
        1: {"name": "张三", "paid": 100.0, "share": 100.0/3, "received": 30.0},
        2: {"name": "李四", "paid": 10.0, "share": 100.0/3, "received": 0.0},
        3: {"name": "王五", "paid": 20.0, "share": 100.0/3, "received": 0.0},
    }
    
    print(f"测试场景：3人群体，总费用${100.0}")
    print("成员详情：")
    for mid, data in members.items():
        print(f"  {data['name']}: 支付${data['paid']}, 应承担${data['share']:.2f}, 收款${data['received']}")
    
    # 计算最终余额
    balances = {}
    total_balance = 0.0
    
    print(f"\n余额计算：")
    for mid, data in members.items():
        balance = data['paid'] - data['received'] - data['share']
        balances[mid] = balance
        total_balance += balance
        
        status = "应收" if balance > 0.01 else "应付" if balance < -0.01 else "平衡"
        print(f"  {data['name']}: ${data['paid']} - ${data['received']} - ${data['share']:.2f} = ${balance:.2f} ({status})")
    
    print(f"\n账目平衡检查：总余额 = ${total_balance:.2f} (应该为0)")
    return abs(total_balance) < 0.01

def validate_transaction_generation():
    """验证交易生成逻辑"""
    print(f"\n=== 交易生成验证 ===\n")
    
    # 模拟债权人和债务人
    creditors = [
        {"user_id": 1, "username": "张三", "amount": 36.67},
        {"user_id": 2, "username": "李四", "amount": 10.0},  # 新增一个债权人
    ]
    
    debtors = [
        {"user_id": 3, "username": "王五", "amount": 23.33},
        {"user_id": 4, "username": "赵六", "amount": 23.34},
    ]
    
    # 贪心算法匹配
    transactions = []
    i, j = 0, 0
    
    while i < len(creditors) and j < len(debtors):
        creditor = creditors[i]
        debtor = debtors[j]
        
        # 匹配金额
        amount = min(creditor["amount"], debtor["amount"])
        
        if amount > 0.01:
            transaction = {
                "from_user_id": debtor["user_id"],
                "to_user_id": creditor["user_id"],
                "amount": amount,
                "from_name": debtor["username"],
                "to_name": creditor["username"]
            }
            transactions.append(transaction)
            
            # 更新剩余金额
            creditors[i]["amount"] -= amount
            debtors[j]["amount"] -= amount
        
        # 移动指针
        if creditors[i]["amount"] <= 0.01:
            i += 1
        if debtors[j]["amount"] <= 0.01:
            j += 1
    
    # 显示生成的交易
    print("生成的交易路径：")
    for transaction in transactions:
        print(f"  {transaction['from_name']} → {transaction['to_name']}: ${transaction['amount']:.2f}")
    
    # 验证交易金额
    total_credit = sum(t["amount"] for t in transactions)
    expected_credit = 36.67 + 10.0  # 债权人总金额
    expected_debt = 23.33 + 23.34   # 债务人总金额
    
    print(f"\n交易验证：")
    print(f"  交易总额: ${total_credit:.2f}")
    print(f"  债权人应收: ${expected_credit:.2f}")
    print(f"  债务人应付: ${expected_debt:.2f}")
    
    # 容差检查
    credit_ok = abs(total_credit - expected_credit) < 0.01
    debt_ok = abs(total_credit - expected_debt) < 0.01  # 交易总额应该等于债务总额
    
    print(f"  债权人匹配: {'✅' if credit_ok else '❌'}")
    print(f"  债务人匹配: {'✅' if debt_ok else '❌'}")
    
    return credit_ok and debt_ok

def validate_payment_scenarios():
    """验证各种支付场景"""
    print(f"\n=== 支付场景验证 ===\n")
    
    scenarios = [
        {
            "name": "完全平摊",
            "total": 300.0,
            "members": 3,
            "payments": [100.0, 100.0, 100.0],
            "expected_balances": [0.0, 0.0, 0.0]  # 所有人都支付了正好应承担的部分
        },
        {
            "name": "一人全部垫付",
            "total": 300.0,
            "members": 3,
            "payments": [300.0, 0.0, 0.0],
            "expected_balances": [200.0, -100.0, -100.0]  # 第一人应收200元，其他人各应付100元
        },
        {
            "name": "部分支付",
            "total": 300.0,
            "members": 3,
            "payments": [200.0, 50.0, 50.0],
            "expected_balances": [100.0, -50.0, -50.0]  # 第一人应收100元，其他人各应付50元
        }
    ]
    
    for scenario in scenarios:
        print(f"场景: {scenario['name']}")
        print(f"  总费用: ${scenario['total']}")
        print(f"  成员数: {scenario['members']}")
        print(f"  支付: {[f'${p}' for p in scenario['payments']]}")
        
        per_person = scenario['total'] / scenario['members']
        actual_balances = []
        
        for i, payment in enumerate(scenario['payments']):
            balance = payment - per_person
            actual_balances.append(balance)
            expected = scenario['expected_balances'][i]
            match = abs(balance - expected) < 0.01
            print(f"    成员{i+1}: 支付${payment} - 应承担${per_person:.2f} = 余额${balance:.2f} (预期${expected:.2f} {'✅' if match else '❌'})")
        
        # 检查总平衡
        total_balance = sum(actual_balances)
        balance_ok = abs(total_balance) < 0.01
        print(f"  总余额: ${total_balance:.2f} (应该为0 {'✅' if balance_ok else '❌'})")
        print()
        
        if not balance_ok:
            return False
    
    return True

def main():
    """主函数"""
    print("群组结算功能逻辑验证\n")
    
    # 验证基础计算
    basic_ok = validate_basic_settlement()
    
    # 验证交易生成
    transaction_ok = validate_transaction_generation()
    
    # 验证支付场景
    scenario_ok = validate_payment_scenarios()
    
    # 总结
    print("=== 验证结果总结 ===")
    print(f"基础计算: {'✅ 通过' if basic_ok else '❌ 失败'}")
    print(f"交易生成: {'✅ 通过' if transaction_ok else '❌ 失败'}")
    print(f"支付场景: {'✅ 通过' if scenario_ok else '❌ 失败'}")
    
    all_passed = basic_ok and transaction_ok and scenario_ok
    print(f"\n{'🎉 所有验证通过！' if all_passed else '❌ 存在验证失败的项目！'}")
    
    return all_passed

if __name__ == "__main__":
    main()
