/**
 * 部署配置文件
 * 包含环境配置、API端点、构建部署脚本、Docker配置和CI/CD配置
 */

// 环境配置
const environments = {
    development: {
        name: '开发环境',
        apiBaseUrl: 'http://localhost:3000/api',
        wsUrl: 'ws://localhost:3000/ws',
        assetsUrl: 'http://localhost:3000/assets',
        authDomain: 'localhost',
        features: {
            debug: true,
            hotReload: true,
            mockApi: true,
            performanceMonitoring: false
        },
        buildConfig: {
            outputDir: 'dist',
            sourceMap: true,
            minify: false,
            uglify: false,
            bundleAnalyzer: true
        }
    },
    
    staging: {
        name: '预发布环境',
        apiBaseUrl: 'https://staging-api.example.com/api',
        wsUrl: 'wss://staging-api.example.com/ws',
        assetsUrl: 'https://staging-assets.example.com/assets',
        authDomain: 'staging.example.com',
        features: {
            debug: false,
            hotReload: false,
            mockApi: false,
            performanceMonitoring: true
        },
        buildConfig: {
            outputDir: 'dist',
            sourceMap: true,
            minify: true,
            uglify: true,
            bundleAnalyzer: false
        }
    },
    
    production: {
        name: '生产环境',
        apiBaseUrl: 'https://api.example.com/api',
        wsUrl: 'wss://api.example.com/ws',
        assetsUrl: 'https://cdn.example.com/assets',
        authDomain: 'example.com',
        features: {
            debug: false,
            hotReload: false,
            mockApi: false,
            performanceMonitoring: true
        },
        buildConfig: {
            outputDir: 'dist',
            sourceMap: false,
            minify: true,
            uglify: true,
            bundleAnalyzer: false
        }
    }
};

// API端点配置
const apiEndpoints = {
    auth: {
        login: '/auth/login',
        logout: '/auth/logout',
        register: '/auth/register',
        refresh: '/auth/refresh',
        profile: '/auth/profile'
    },
    
    groups: {
        list: '/groups',
        create: '/groups',
        get: '/groups/{id}',
        update: '/groups/{id}',
        delete: '/groups/{id}',
        members: '/groups/{id}/members',
        join: '/groups/{id}/join',
        leave: '/groups/{id}/leave'
    },
    
    expenses: {
        list: '/expenses',
        create: '/expenses',
        get: '/expenses/{id}',
        update: '/expenses/{id}',
        delete: '/expenses/{id}',
        categories: '/expenses/categories',
        statistics: '/expenses/statistics'
    },
    
    payments: {
        list: '/payments',
        create: '/payments',
        get: '/payments/{id}',
        update: '/payments/{id}',
        delete: '/payments/{id}',
        process: '/payments/{id}/process',
        cancel: '/payments/{id}/cancel'
    },
    
    uploads: {
        upload: '/uploads',
        get: '/uploads/{id}',
        delete: '/uploads/{id}',
        thumbnail: '/uploads/{id}/thumbnail'
    },
    
    notifications: {
        list: '/notifications',
        markRead: '/notifications/{id}/read',
        markAllRead: '/notifications/read-all',
        unsubscribe: '/notifications/unsubscribe'
    }
};

// WebSocket事件配置
const wsEvents = {
    client: {
        joinRoom: 'join_room',
        leaveRoom: 'leave_room',
        typing: 'typing',
        message: 'message'
    },
    
    server: {
        userJoined: 'user_joined',
        userLeft: 'user_left',
        messageReceived: 'message_received',
        expenseAdded: 'expense_added',
        paymentProcessed: 'payment_processed',
        groupUpdated: 'group_updated'
    }
};

// 构建配置
const buildConfig = {
    // Vite构建配置
    vite: {
        base: '/',
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        minify: 'terser',
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    router: ['react-router-dom'],
                    ui: ['antd', '@ant-design/icons']
                }
            }
        }
    },
    
    // 打包优化
    optimization: {
        chunkSizeWarningLimit: 1000,
        assetInlineLimit: 4096,
        minifyWhitespace: true,
        removeComments: true,
        treeShaking: true,
        sideEffectsDetection: true
    },
    
    // 环境变量
    env: {
        VITE_APP_TITLE: '群组支出管理',
        VITE_APP_VERSION: process.env.npm_package_version || '1.0.0',
        VITE_API_URL: process.env.VITE_API_URL || 'http://localhost:3000/api',
        VITE_WS_URL: process.env.VITE_WS_URL || 'ws://localhost:3000/ws',
        VITE_ENVIRONMENT: process.env.NODE_ENV || 'development'
    }
};

// Docker配置
const dockerConfig = {
    // Dockerfile
    dockerfile: `# Dockerfile for frontend application
FROM node:18-alpine as builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产环境镜像
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]`,
    
    // Nginx配置
    nginx: `events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # 缓存配置
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 单页应用路由支持
    location / {
        try_files $uri $uri/ /index.html;
        
        # 安全头
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
    
    # API代理
    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket代理
    location /ws {
        proxy_pass http://backend:3000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`,
    
    // Docker Compose配置
    dockerCompose: `version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    networks:
      - app-network
    
  backend:
    image: your-registry/backend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/appdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    networks:
      - app-network
    
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    
  redis:
    image: redis:7-alpine
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge`
};

// CI/CD配置
const cicdConfig = {
    // GitHub Actions
    githubActions: {
        workflow: `.github/workflows/deploy.yml:
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run linting
      run: npm run lint
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Generate test coverage
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
      env:
        VITE_API_URL: \${{ secrets.PRODUCTION_API_URL }}
        VITE_WS_URL: \${{ secrets.PRODUCTION_WS_URL }}
    
    - name: Build Docker image
      run: |
        docker build -t frontend-app:\${{ github.sha }} .
        docker tag frontend-app:\${{ github.sha }} frontend-app:latest
    
    - name: Push to registry
      run: |
        echo \${{ secrets.DOCKER_PASSWORD }} | docker login -u \${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push frontend-app:\${{ github.sha }}
        docker push frontend-app:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to staging
      if: github.ref == 'refs/heads/develop'
      run: |
        echo "Deploy to staging environment"
        # 部署脚本
    
    - name: Deploy to production
      if: github.ref == 'refs/heads/main'
      run: |
        echo "Deploy to production environment"
        # 生产部署脚本`,
        
        deployStages: {
            staging: {
                trigger: 'develop',
                tests: ['unit', 'integration', 'e2e'],
                deployCommand: 'npm run deploy:staging'
            },
            production: {
                trigger: 'main',
                tests: ['unit', 'integration', 'e2e', 'performance', 'security'],
                deployCommand: 'npm run deploy:production'
            }
        }
    },
    
    // GitLab CI
    gitlabCi: {
        stages: ['install', 'test', 'build', 'deploy'],
        
        variables: {
            NODE_VERSION: '18',
            DOCKER_IMAGE: '$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA'
        },
        
        'install dependencies': {
            stage: 'install',
            image: 'node:18-alpine',
            script: 'npm ci'
        },
        
        test: {
            stage: 'test',
            image: 'node:18-alpine',
            script: [
                'npm run lint',
                'npm run test:unit',
                'npm run test:coverage',
                'npm run test:e2e'
            ],
            artifacts: {
                reports: {
                    coverage_report: {
                        coverage_format: 'cobertura',
                        path: 'coverage/cobertura-coverage.xml'
                    }
                }
            }
        },
        
        build: {
            stage: 'build',
            image: 'node:18-alpine',
            script: [
                'npm run build',
                'docker build -t $DOCKER_IMAGE .'
            ],
            artifacts: {
                paths: ['dist/'],
                expire_in: '1 week'
            }
        },
        
        deploy: {
            stage: 'deploy',
            image: 'docker:latest',
            script: [
                'docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY',
                'docker push $DOCKER_IMAGE'
            ],
            only: ['main']
        }
    }
};

// 部署脚本
const deploymentScripts = {
    // 预部署检查
    preDeployCheck: `#!/bin/bash
# 预部署检查脚本

set -e

echo "开始预部署检查..."

# 检查Node.js版本
node_version=$(node --version)
echo "Node.js版本: $node_version"

# 检查npm依赖
npm audit --audit-level moderate
echo "依赖安全检查通过"

# 运行测试
npm run test:unit
npm run test:integration
echo "单元测试和集成测试通过"

# 构建应用
npm run build
echo "应用构建成功"

# 构建镜像
docker build -t frontend-app:latest .
echo "Docker镜像构建成功"

echo "预部署检查完成"`,
    
    // 部署脚本
    deploy: `#!/bin/bash
# 部署脚本

set -e

ENVIRONMENT=${1:-staging}
IMAGE_TAG=${2:-latest}

echo "部署到 $ENVIRONMENT 环境"

# 拉取最新镜像
docker pull frontend-app:$IMAGE_TAG

# 停止现有容器
docker-compose down --remove-orphans

# 启动新容器
docker-compose up -d --no-deps frontend

# 健康检查
./scripts/health-check.sh

echo "部署完成"`,
    
    // 健康检查脚本
    healthCheck: `#!/bin/bash
# 健康检查脚本

MAX_RETRIES=30
RETRY_INTERVAL=10

for i in $(seq 1 $MAX_RETRIES); do
    echo "健康检查尝试 $i/$MAX_RETRIES"
    
    # 检查前端服务
    if curl -f http://localhost/ > /dev/null 2>&1; then
        echo "前端服务健康检查通过"
        exit 0
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "健康检查失败，服务启动超时"
        exit 1
    fi
    
    sleep $RETRY_INTERVAL
done`,
    
    // 回滚脚本
    rollback: `#!/bin/bash
# 回滚脚本

CURRENT_VERSION=${1}
PREVIOUS_VERSION=${2}

echo "回滚从 $CURRENT_VERSION 到 $PREVIOUS_VERSION"

# 停止当前服务
docker-compose down

# 拉取并启动上一个版本
docker pull frontend-app:$PREVIOUS_VERSION
docker tag frontend-app:$PREVIOUS_VERSION frontend-app:latest

# 启动服务
docker-compose up -d

# 验证回滚
./scripts/health-check.sh

echo "回滚完成"`
};

// 监控配置
const monitoringConfig = {
    // 性能监控
    performance: {
        tools: [
            {
                name: 'Google Analytics',
                trackingId: 'GA_TRACKING_ID',
                events: ['pageview', 'user_interaction', 'error']
            },
            {
                name: 'Sentry',
                dsn: 'SENTRY_DSN',
                environment: process.env.NODE_ENV,
                tracesSampleRate: 0.1
            }
        ],
        metrics: [
            'page_load_time',
            'time_to_interactive',
            'first_contentful_paint',
            'largest_contentful_paint',
            'cumulative_layout_shift',
            'first_input_delay'
        ]
    },
    
    // 错误监控
    errorTracking: {
        enabled: true,
        environments: ['staging', 'production'],
        levels: ['error', 'warning', 'info'],
        filters: {
            ignorePatterns: [
                '/(favicon\\.ico|robots\\.txt)/',
                'Non-Error promise rejections captured'
            ]
        }
    },
    
    // 业务监控
    business: {
        events: [
            'user_registration',
            'user_login',
            'group_creation',
            'expense_addition',
            'payment_processing'
        ],
        funnels: [
            {
                name: '用户注册流程',
                steps: ['访问首页', '点击注册', '填写信息', '注册成功']
            },
            {
                name: '添加支出流程',
                steps: ['进入群组', '点击添加支出', '填写信息', '提交成功']
            }
        ]
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        environments,
        apiEndpoints,
        wsEvents,
        buildConfig,
        dockerConfig,
        cicdConfig,
        deploymentScripts,
        monitoringConfig
    };
}

// 全局可访问
window.DeployConfig = {
    environments,
    apiEndpoints,
    wsEvents,
    buildConfig,
    dockerConfig,
    cicdConfig,
    deploymentScripts,
    monitoringConfig
};