# API端点404错误修复报告

## 问题分析

根据Console错误信息，发现问题根源：

```
GET https://localhost:8443/api/groups/9/balances 404 (Not Found)
GET https://localhost:8443/api/groups/9/members 404 (Not Found)
```

**根本原因：前端调用的API端点在后端不存在或路径不匹配**

## 具体问题

1. **缺失的API端点**：
   - 前端调用：`/api/groups/9/balances`
   - 后端提供：`/groups/9/members`（缺少/api前缀）
   - 完全缺失：`/api/groups/9/balances`

2. **路径不匹配**：
   - 前端groups.html调用：`/api/groups/{id}/members`
   - 后端实际提供：`/groups/{id}/members`

3. **硬编码数据未动态更新**：
   - 群组名称显示"周末旅行基金"而非实际群组名
   - 余额显示预设的¥150.50、¥45.00等数据

## 修复内容

### 1. 添加缺失的API端点

在`app/crud.py`中添加群组余额计算函数：
```python
def calculate_group_balances(db: Session, group_id: int):
    """Calculate balances for all members in a group."""
    # 计算每个成员的净余额
    # 返回余额汇总数据
```

在`app/main.py`中添加API端点：
```python
@app.get("/api/groups/{group_id}/members", response_model=list[schemas.GroupMember])
def get_group_members_api(...):
    """获取群组成员列表。API版本。"""

@app.get("/api/groups/{group_id}/balances")
def get_group_balances_api(...):
    """获取群组余额汇总。"""
    balance_data = crud.calculate_group_balances(db, group_id=group_id)
    return balance_data
```

### 2. 修复API路径匹配

- ✅ `/api/groups/{id}/members` - 现在有对应的后端端点
- ✅ `/api/groups/{id}/balances` - 新增的后端端点

### 3. 修复前端硬编码初始值

发现并修复groups.html中的所有硬编码预设数据：

**修复前**（显示预设数据）：
```html
<p id="balance-owed">¥150.50</p>
<p id="balance-owed-context">给 2 位成员</p>
<p id="balance-owing-me">¥45.00</p>
<p id="balance-owing-me-context">从 1 位成员</p>
<p id="settlement-summary-text">总计 2 笔待清算</p>
费用 (<span id="expense-count">3</span>)
定期费用 (<span id="recurring-count">2</span>)
支付 (<span id="payment-count">2</span>)
成员 (<span id="member-count">4</span>)
```

**修复后**（显示初始值）：
```html
<p id="balance-owed">¥0.00</p>
<p id="balance-owed-context">给 0 位成员</p>
<p id="balance-owing-me">¥0.00</p>
<p id="balance-owing-me-context">从 0 位成员</p>
<p id="settlement-summary-text">总计 0 笔待清算</p>
费用 (<span id="expense-count">0</span>)
定期费用 (<span id="recurring-count">0</span>)
支付 (<span id="payment-count">0</span>)
成员 (<span id="member-count">0</span>)
```

### 4. 余额计算逻辑

**balanceData返回格式**：
```json
{
    "total_owed": 0.0,      // 当前用户欠款总额
    "total_owing": 0.0,     // 当前用户被欠款总额
    "owed_to_count": 0,     // 欠款给多少人
    "owing_from_count": 0,  // 被多少人欠款
    "detailed_balances": {} // 每个成员的详细余额
}
```

## 部署步骤

1. **下载修复版**：
   ```bash
   # 将整个 expense-tracker-最终修复版 文件夹复制到WSL环境
   ```

2. **重新部署**：
   ```bash
   cd expense-tracker-最终修复版
   bash 快速部署.sh
   ```

3. **等待启动完成**：
   - 容器重新构建和启动
   - 检查控制台输出是否显示"✅ 部署完成！"

4. **验证修复**：
   - 访问 https://localhost:8443
   - 登录后创建新群组"测试群组2"
   - 进入群组详情页，检查：
     - 群组名称显示"测试群组2"（不是"周末旅行基金"）
     - 欠款显示¥0.00（不是¥150.50）
     - 被欠款显示¥0.00（不是¥45.00）
     - 待清算显示0笔（不是2笔）

## 预期结果

修复后，Console应该显示：
```
✅ 获取余额数据成功
✅ 获取成员列表成功
```

页面应该显示：
- ✅ 群组名称：测试群组2 (ID: 实际ID)
- ✅ 欠款：¥0.00 (给 0 位成员)
- ✅ 被欠款：¥0.00 (从 0 位成员)
- ✅ 建议结算：总计 0 笔待清算

## 如果仍有问题

请提供：
1. **F12 Console的完整错误信息**
2. **Network选项卡中API调用的请求和响应**
3. **具体是哪个页面出现问题**

## 修复验证清单

- [x] 添加缺失的 `/api/groups/{id}/balances` API端点
- [x] 添加 `/api/groups/{id}/members` API端点（带/api前缀）
- [x] 实现群组余额计算逻辑
- [x] 修复前端API调用路径匹配
- [x] 生成新的部署脚本
- [ ] 等待用户验证修复结果

**版本信息**：
- 文件夹：expense-tracker-最终修复版
- 修复日期：2025-11-05
- 修复版本：v3.0 API端点修复版