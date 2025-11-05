#!/bin/bash

# SSL证书生成脚本
# 用于生成开发环境的自签名SSL证书

set -e

echo "🔐 生成SSL证书..."

# 创建SSL目录
mkdir -p ssl

# 生成暂存环境证书
echo "📝 生成暂存环境证书..."
openssl req -x509 -newkey rsa:4096 -keyout ssl/staging.key -out ssl/staging.crt -days 365 -nodes \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=Development/OU=IT/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

# 生成生产环境证书
echo "📝 生成生产环境证书..."
openssl req -x509 -newkey rsa:4096 -keyout ssl/production.key -out ssl/production.crt -days 365 -nodes \
    -subj "/C=CN/ST=Beijing/L=Beijing/O=Production/OU=IT/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:::1"

# 设置文件权限
chmod 600 ssl/*.key
chmod 644 ssl/*.crt

echo "✅ SSL证书生成完成！"
echo "📁 证书文件位置："
echo "   - ssl/staging.key (暂存环境私钥)"
echo "   - ssl/staging.crt (暂存环境证书)"
echo "   - ssl/production.key (生产环境私钥)"
echo "   - ssl/production.crt (生产环境证书)"

echo ""
echo "⚠️  注意：这些是自签名证书，仅用于开发环境。"
echo "⚠️  浏览器会显示安全警告，请选择'继续访问'或'高级'->'继续到localhost(不安全)'"

# 验证证书
echo ""
echo "🔍 验证证书信息："
echo "暂存环境证书："
openssl x509 -in ssl/staging.crt -text -noout | grep -E "Subject:|Not Before|Not After|DNS|IP Address" | head -5

echo ""
echo "生产环境证书："
openssl x509 -in ssl/production.crt -text -noout | grep -E "Subject:|Not Before|Not After|DNS|IP Address" | head -5

echo ""
echo "🎉 SSL证书准备完成！现在可以启动Docker容器了。"