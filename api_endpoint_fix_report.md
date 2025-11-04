# API 端点修复报告

## 问题描述
用户报告在登录和注册时遇到 404 错误：
```
production_backend  | INFO:     172.18.0.1:36362 - "POST /auth/login HTTP/1.1" 404 Not Found
```

## 根本原因
前端代码中的 API 端点与后端实际提供的端点不匹配。

## 修复详情

### 1. 登录端点修复
**问题**: 前端调用 `/auth/login`，后端提供 `/token`

**修复前**:
```javascript
const response = await fetch('/auth/login', {
    method: 'POST',
    body: formData
});
```

**修复后**:
```javascript
const response = await fetch('/token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData.toString()
});
```

**修复的文件**:
- `/workspace/expense-tracker/app/templates/login.html`
- `/workspace/projectpg12/app/templates/login.html`

### 2. 注册端点修复
**问题**: 前端调用 `/auth/signup`，后端提供 `/users/signup`

**修复前**:
```javascript
const response = await fetch('/auth/signup', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
});
```

**修复后**:
```javascript
const response = await fetch('/users/signup', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestData)
});
```

**修复的文件**:
- `/workspace/expense-tracker/app/templates/signup.html`
- `/workspace/projectpg12/app/templates/signup.html`

## 技术细节

### OAuth2 登录流程
后端实现的是标准的 OAuth2 密码流：
1. **端点**: `/token` (不是 `/auth/login`)
2. **认证方式**: `application/x-www-form-urlencoded`
3. **参数**: `username` (邮箱) 和 `password`
4. **返回**: 包含 `access_token` 的 JSON 响应

### 正确的API端点对应关系
| 功能 | 前端应该调用 | 后端实际提供 |
|------|-------------|-------------|
| 用户注册 | `/users/signup` | `/users/signup` |
| 用户登录 | `/token` | `/token` |
| 用户退出 | `/auth/logout` | `/auth/logout` |
| 获取当前用户 | `/me` | `/me` |

## 测试验证
修复后应该能够：
1. ✅ 正常访问登录页面 (`https://localhost:8443/login`)
2. ✅ 正常访问注册页面 (`https://localhost:8443/signup`)
3. ✅ 成功提交登录表单，收到 200 响应
4. ✅ 成功提交注册表单，收到 201 响应
5. ✅ 登录后正确跳转和保存 token

## 注意事项
- 登录端点使用 `URLSearchParams` 而不是 `FormData`
- 登录请求需要设置 `Content-Type: application/x-www-form-urlencoded`
- 注册端点使用 `application/json` Content-Type
- 所有的 API 错误都会返回包含 `detail` 字段的 JSON 响应

## 建议
1. 建立前后端API端点对照表，确保一致性
2. 在开发环境中启用API端点验证工具
3. 考虑使用OpenAPI/Swagger文档来自动生成前端API调用代码
