# 部署指南 - 针对 172.25.76.174:443

本文档专门针对在服务器 `172.25.76.174` 上部署到路径 `/home/sadm/projectpg12` 并通过 `https://172.25.76.174:443/` 访问的配置说明。

## 🎯 部署目标

- **服务器IP**: `172.25.76.174`
- **部署路径**: `/home/sadm/projectpg12`
- **访问URL**: `https://172.25.76.174:443/`
- **数据库路径**: `/home/sadm/projectpg12/data/postgres`
- **日志路径**: `/home/sadm/projectpg12/logs`

## 📋 前置准备

### 系统要求
- Ubuntu 20.04+ / Debian 11+
- Docker >= 20.10
- Docker Compose >= 2.0
- 至少 4GB 内存
- 开放端口：80, 443, 8000, 8080, 5432, 6379, 5050

### 安装Docker (如果尚未安装)
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl wget git

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 将用户加入docker组
sudo usermod -aG docker $USER
```

## 🚀 快速部署步骤

### 1. 解压项目文件
```bash
# 创建部署目录
sudo mkdir -p /home/sadm/projectpg12
cd /home/sadm/projectpg12

# 解压项目文件
sudo tar -xzf projectpg12-complete-final.tar.gz --strip-components=1
sudo chown -R $USER:$USER /home/sadm/projectpg12
```

### 2. 创建必要的目录结构
```bash
mkdir -p data/postgres data/redis logs/backend logs/nginx ssl/certs
```

### 3. 配置环境变量
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**重要配置内容**：
```env
# 数据库配置
DATABASE_URL=postgresql://expense_user:expense_password@postgres:5432/expense_dev
POSTGRES_DB=expense_dev
POSTGRES_USER=expense_user
POSTGRES_PASSWORD=expense_password

# Redis配置
REDIS_URL=redis://redis:6379/0

# JWT配置
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 邮件配置 (可选)
SMTP_TLS=True
SMTP_PORT=587
SMTP_HOST=your-smtp-host
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-email-password

# 部署配置
COMPOSE_PROJECT_NAME=expense-sharing
COMPOSE_FILE=docker-compose.yml

# IP和域名配置 (重要)
BACKEND_HOST=0.0.0.0
FRONTEND_HOST=0.0.0.0
DOMAIN=172.25.76.174
SSL_EMAIL=admin@172.25.76.174

# 路径配置
DATA_PATH=/home/sadm/projectpg12/data
LOGS_PATH=/home/sadm/projectpg12/logs
SSL_PATH=/home/sadm/projectpg12/ssl
```

### 4. 配置Nginx用于HTTPS (端口443)

创建或更新 `deployment/nginx/nginx.dev.conf`：
```nginx
# /home/sadm/projectpg12/deployment/nginx/nginx.dev.conf

upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name 172.25.76.174;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 172.25.76.174;

    # SSL证书配置 (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/172.25.76.174/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/172.25.76.174/privkey.pem;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    # 前端静态文件
    location / {
        root /app/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket支持 (如果需要)
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5. 生成SSL证书
```bash
cd /home/sadm/projectpg12

# 使用内置脚本生成SSL证书
chmod +x deployment/scripts/generate-ssl.sh
sudo ./deployment/scripts/generate-ssl.sh
```

**手动SSL证书生成（如果脚本失败）**：
```bash
# 安装certbot
sudo apt install -y certbot

# 生成证书
sudo certbot certonly --standalone -d 172.25.76.174

# 创建符号链接到项目目录
sudo mkdir -p /home/sadm/projectpg12/ssl/live/172.25.76.174
sudo ln -s /etc/letsencrypt/live/172.25.76.174/fullchain.pem /home/sadm/projectpg12/ssl/live/172.25.76.174/fullchain.pem
sudo ln -s /etc/letsencrypt/live/172.25.76.174/privkey.pem /home/sadm/projectpg12/ssl/live/172.25.76.174/privkey.pem
```

### 6. 更新Docker Compose配置

创建 `docker-compose.prod.yml` 用于生产环境：
```yaml
# /home/sadm/projectpg12/docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: expense-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-expense_dev}
      POSTGRES_USER: ${POSTGRES_USER:-expense_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-expense_password}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./deployment/docker/db/postgresql.dev.conf:/etc/postgresql/postgresql.conf
    ports:
      - "5432:5432"
    networks:
      - expense-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: expense-redis
    volumes:
      - ./data/redis:/data
      - ./deployment/docker/redis/redis.dev.conf:/usr/local/etc/redis/redis.conf
    ports:
      - "6379:6379"
    networks:
      - expense-network
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: expense-backend
    environment:
      - DATABASE_URL=postgresql://expense_user:expense_password@postgres:5432/expense_dev
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY:-your-secret-key}
    volumes:
      - ./app:/app/app
      - ./logs/backend:/app/logs
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    networks:
      - expense-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: expense-nginx
    volumes:
      - ./frontend:/app/frontend:ro
      - ./deployment/nginx/nginx.dev.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/letsencrypt:ro
      - ./logs/nginx:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - expense-network
    restart: unless-stopped

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: expense-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@expense.local
      PGADMIN_DEFAULT_PASSWORD: admin123
      PGADMIN_LISTEN_PORT: 80
    volumes:
      - ./data/pgadmin:/var/lib/pgadmin
    ports:
      - "5050:80"
    depends_on:
      - postgres
    networks:
      - expense-network
    restart: unless-stopped

networks:
  expense-network:
    driver: bridge
```

### 7. 启动服务
```bash
cd /home/sadm/projectpg12

# 停止所有服务（如果之前运行过）
docker-compose -f docker-compose.prod.yml down

# 启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看启动状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 8. 验证部署

#### 检查服务状态
```bash
# 检查所有容器
docker ps

# 检查特定服务
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs nginx
```

#### 访问测试
- **主应用**: https://172.25.76.174:443/
- **API文档**: https://172.25.76.174:443/docs
- **pgAdmin**: http://172.25.76.174:5050
  - 用户名: `admin@expense.local`
  - 密码: `admin123`

#### 功能测试
1. **用户注册/登录**: 在 https://172.25.76.174:443/ 访问应用
2. **群组管理**: 创建测试群组
3. **费用管理**: 添加测试费用
4. **支付记录**: 测试支付功能

## 🔧 维护操作

### 重启服务
```bash
cd /home/sadm/projectpg12
docker-compose -f docker-compose.prod.yml restart
```

### 更新应用
```bash
# 备份数据
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U expense_user expense_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# 更新代码
git pull  # 如果使用Git

# 重新构建并启动
docker-compose -f docker-compose.prod.yml up -d --build
```

### 监控和日志
```bash
# 实时查看所有日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f nginx

# 系统资源监控
docker stats
```

### SSL证书自动续期
```bash
# 添加cron任务（每天检查一次）
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# 手动续期
sudo certbot renew
```

## 🚨 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 检查端口占用
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80

# 停止冲突进程
sudo systemctl stop apache2  # 如果安装了Apache
sudo systemctl disable apache2
```

#### 2. SSL证书问题
```bash
# 检查证书状态
sudo certbot certificates

# 重新生成证书
sudo certbot delete --cert-name 172.25.76.174
sudo certbot certonly --standalone -d 172.25.76.174
```

#### 3. 数据库连接问题
```bash
# 检查数据库状态
docker-compose -f docker-compose.prod.yml exec postgres psql -U expense_user -d expense_dev -c "SELECT version();"

# 重置数据库
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d postgres
```

#### 4. 权限问题
```bash
# 修复文件权限
sudo chown -R $USER:$USER /home/sadm/projectpg12
chmod +x /home/sadm/projectpg12/deployment/scripts/*.sh
```

### 日志分析
```bash
# 后端错误日志
tail -f /home/sadm/projectpg12/logs/backend/app.log

# Nginx访问日志
tail -f /home/sadm/projectpg12/logs/nginx/access.log

# Nginx错误日志
tail -f /home/sadm/projectpg12/logs/nginx/error.log
```

## 📊 性能优化

### 数据库优化
```sql
-- 在PostgreSQL中执行
VACUUM ANALYZE;
REINDEX DATABASE expense_dev;
```

### Nginx优化
- 启用gzip压缩
- 配置静态资源缓存
- 调整worker进程数

### 监控建议
- 使用 `htop` 监控系统资源
- 设置日志轮转
- 配置应用性能监控

## 🔒 安全建议

1. **防火墙配置**:
   ```bash
   sudo ufw enable
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw deny 8000   # 禁止直接访问API
   sudo ufw deny 8080   # 禁止直接访问前端
   ```

2. **定期更新**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   docker-compose pull
   ```

3. **备份策略**:
   - 每日自动数据库备份
   - 每周完整数据备份
   - SSL证书备份

## 📞 技术支持

如果在部署过程中遇到问题，请检查：
1. 系统日志: `sudo journalctl -u docker`
2. 容器日志: `docker logs <container_name>`
3. 网络连通性: `curl -I https://172.25.76.174:443/`

---

**部署成功后，你将拥有一个完整的费用分摊管理系统，可以通过 https://172.25.76.174:443/ 访问使用！**