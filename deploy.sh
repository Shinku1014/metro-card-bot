#!/bin/bash

# Metro Card Bot 部署脚本
# 使用方法: ./deploy.sh [tag]
# 例如: ./deploy.sh latest 或 ./deploy.sh v1.0.0

set -e

# 默认标签
TAG=${1:-latest}
IMAGE_NAME="ghcr.io/shinku1014/metro-card-bot:${TAG}"

# 检测系统架构
ARCH=$(uname -m)
case ${ARCH} in
    x86_64)
        PLATFORM="linux/amd64"
        ;;
    aarch64|arm64)
        PLATFORM="linux/arm64"
        ;;
    *)
        echo "⚠️  未知架构: ${ARCH}，使用默认平台"
        PLATFORM="linux/amd64"
        ;;
esac

echo "🚀 开始部署 Metro Card Bot..."
echo "📦 镜像: ${IMAGE_NAME}"
echo "🏗️  平台: ${PLATFORM} (检测到架构: ${ARCH})"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 创建必要的目录
echo "📁 创建数据目录..."
mkdir -p ./data

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件"
    echo "📝 请创建 .env 文件并添加以下内容:"
    echo "BOT_TOKEN=your_bot_token_here"
    echo ""
    read -p "是否现在创建 .env 文件? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "BOT_TOKEN=your_bot_token_here" > .env
        echo "✅ 已创建 .env 文件，请编辑并添加您的 Bot Token"
        echo "💡 编辑命令: nano .env"
        exit 0
    else
        echo "❌ 部署取消，请先创建 .env 文件"
        exit 1
    fi
fi

# 拉取最新镜像
echo "⬇️  拉取镜像..."
docker pull --platform ${PLATFORM} ${IMAGE_NAME}

# 停止现有容器
echo "🛑 停止现有容器..."
docker compose down || true

# 更新镜像标签和平台
export IMAGE_TAG=${TAG}
export DOCKER_PLATFORM=${PLATFORM}

# 临时更新 docker-compose.yml 中的平台设置
sed -i.bak "s|platform: linux/.*|platform: ${PLATFORM}|g" docker-compose.yml

# 启动容器
echo "🚀 启动容器..."
docker compose up -d

# 等待容器启动
echo "⏳ 等待容器启动..."
sleep 5

# 检查容器状态
if docker compose ps | grep -q "Up"; then
    echo "✅ 部署成功！"
    echo "🏗️  使用平台: ${PLATFORM}"
    echo "📊 容器状态:"
    docker compose ps
    echo ""
    echo "📝 查看日志: docker compose logs -f"
    echo "🛑 停止服务: docker compose down"
    echo "🔄 重启服务: docker compose restart"
    
    # 恢复原始 docker-compose.yml
    if [ -f "docker-compose.yml.bak" ]; then
        mv docker-compose.yml.bak docker-compose.yml.bak.used
    fi
else
    echo "❌ 部署失败，请检查日志:"
    docker compose logs
    
    # 恢复原始 docker-compose.yml
    if [ -f "docker-compose.yml.bak" ]; then
        mv docker-compose.yml.bak docker-compose.yml
    fi
    exit 1
fi
