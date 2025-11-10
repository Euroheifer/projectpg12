#!/usr/bin/env python3
"""
结算API测试脚本
测试结算功能的各个端点
"""

import requests
import json
from datetime import datetime

# API基础URL
BASE_URL = "http://localhost:8000"

# 测试数据
test_user = {
    "email": "test@example.com",
    "password": "test123"
}

def login_and_get_token():
    """登录并获取访问令牌"""
    response = requests.post(
        f"{BASE_URL}/token",
        data=test_user,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"登录失败: {response.status_code} - {response.text}")
        return None

def test_get_settlement(token, group_id):
    """测试获取群组结算信息"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/groups/{group_id}/settlement",
        headers=headers
    )
    
    print(f"\n=== 测试获取群组结算信息 ===")
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ 成功获取结算信息")
        print(f"群组名称: {data['group_name']}")
        print(f"总支出: ${data['total_amount']/100:.2f}")
        print(f"成员数量: {data['member_count']}")
        print(f"成员余额:")
        for balance in data['balances']:
            print(f"  - {balance['username']}: ${balance['balance']/100:.2f} ({balance['status']})")
        print(f"推荐交易: {len(data['transactions'])} 笔")
        for transaction in data['transactions']:
            print(f"  - 用户{transaction['from_user_id']} → 用户{transaction['to_user_id']}: ${transaction['amount']/100:.2f}")
    else:
        print(f"❌ 获取失败: {response.text}")
        return False
    
    return True

def test_execute_settlement(token, group_id):
    """测试执行群组结算"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    settlement_data = {
        "description": f"群组结算测试 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    }
    
    response = requests.post(
        f"{BASE_URL}/groups/{group_id}/settlement",
        json=settlement_data,
        headers=headers
    )
    
    print(f"\n=== 测试执行群组结算 ===")
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ 结算执行成功")
        print(f"消息: {data['message']}")
        print(f"创建时间: {data['created_at']}")
    else:
        print(f"❌ 结算执行失败: {response.text}")
        return False
    
    return True

def test_get_member_balance(token, group_id, user_id):
    """测试获取指定成员余额"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/groups/{group_id}/settlement/member/{user_id}",
        headers=headers
    )
    
    print(f"\n=== 测试获取成员{user_id}的余额详情 ===")
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ 成功获取成员余额")
        print(f"用户名: {data['username']}")
        print(f"总支出: ${data['total_expenses']/100:.2f}")
        print(f"已支付: ${data['total_payments_made']/100:.2f}")
        print(f"已收款: ${data['total_payments_received']/100:.2f}")
        print(f"当前余额: ${data['balance']/100:.2f}")
        print(f"状态: {data['status']}")
    else:
        print(f"❌ 获取成员余额失败: {response.text}")
        return False
    
    return True

def main():
    print("开始测试结算API功能")
    
    # 获取访问令牌
    token = login_and_get_token()
    if not token:
        print("❌ 无法获取访问令牌，测试终止")
        return
    
    print(f"✅ 登录成功，获得访问令牌")
    
    # 假设我们有一个群组ID为1的测试数据
    # 在实际测试中，你需要根据实际情况修改这个ID
    test_group_id = 1
    test_user_id = 1
    
    # 测试获取结算信息
    if not test_get_settlement(token, test_group_id):
        print("❌ 结算信息获取测试失败")
        return
    
    # 测试获取成员余额
    if not test_get_member_balance(token, test_group_id, test_user_id):
        print("❌ 成员余额获取测试失败")
        return
    
    # 测试执行结算
    if not test_execute_settlement(token, test_group_id):
        print("❌ 结算执行测试失败")
        return
    
    print("\n🎉 所有结算API测试完成")

if __name__ == "__main__":
    main()
