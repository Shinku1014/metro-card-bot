#!/bin/bash

# 本地 Docker 构建测试脚本

set -e

echo "🧪 开始本地 Docker 构建测试..."

# 构建镜像
echo "🔨 构建 Docker 镜像..."
docker build -t metro-card-bot:test .

echo "✅ Docker 镜像构建成功！"

# 显示镜像信息
echo "📊 镜像信息:"
docker images | grep metro-card-bot

# 可选：运行测试容器
read -p "是否要测试运行容器? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 启动测试容器..."
    echo "⚠️  请确保已设置 BOT_TOKEN 环境变量"
    
    if [ -f ".env" ]; then
        docker run --rm -it \
            --env-file .env \
            -v $(pwd)/data:/app/data \
            metro-card-bot:test
    else
        echo "❌ 未找到 .env 文件，请先创建并配置 BOT_TOKEN"
        echo "💡 创建示例: echo 'BOT_TOKEN=your_token_here' > .env"
    fi
fi

echo "🎉 测试完成！"
