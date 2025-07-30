#!/bin/bash

# 平台检测和配置脚本

echo "🔍 检测系统信息..."

# 检测架构
ARCH=$(uname -m)
echo "系统架构: ${ARCH}"

# 检测操作系统
OS=$(uname -s)
echo "操作系统: ${OS}"

# 推荐的 Docker 平台
case ${ARCH} in
    x86_64)
        RECOMMENDED_PLATFORM="linux/amd64"
        echo "✅ 推荐 Docker 平台: ${RECOMMENDED_PLATFORM}"
        ;;
    aarch64|arm64)
        RECOMMENDED_PLATFORM="linux/arm64"
        echo "✅ 推荐 Docker 平台: ${RECOMMENDED_PLATFORM}"
        ;;
    *)
        RECOMMENDED_PLATFORM="linux/amd64"
        echo "⚠️  未知架构，推荐使用: ${RECOMMENDED_PLATFORM}"
        ;;
esac

# 检查 Docker 版本
if command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Docker 信息:"
    docker version --format "版本: {{.Server.Version}}"
    
    # 检查是否支持 BuildKit
    if docker buildx version &> /dev/null; then
        echo "✅ 支持 Docker Buildx (多架构构建)"
    else
        echo "⚠️  不支持 Docker Buildx"
    fi
else
    echo "❌ Docker 未安装"
fi

# 检查 Docker Compose 版本
if command -v docker-compose &> /dev/null; then
    echo ""
    echo "🔧 Docker Compose 信息:"
    docker-compose version --short
elif docker compose version &> /dev/null; then
    echo ""
    echo "🔧 Docker Compose 信息:"
    docker compose version --short
else
    echo "❌ Docker Compose 未安装"
fi

echo ""
echo "📋 配置建议:"
echo "1. 在 docker-compose.yml 中设置: platform: ${RECOMMENDED_PLATFORM}"
echo "2. 拉取镜像时使用: docker pull --platform ${RECOMMENDED_PLATFORM} <image>"
echo "3. 运行容器时使用: docker run --platform ${RECOMMENDED_PLATFORM} <image>"

# 自动配置 docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    echo ""
    read -p "是否自动配置 docker-compose.yml 使用推荐平台? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 备份原文件
        cp docker-compose.yml docker-compose.yml.backup
        
        # 更新平台设置
        sed -i "s|platform: linux/.*|platform: ${RECOMMENDED_PLATFORM}|g" docker-compose.yml
        
        echo "✅ 已更新 docker-compose.yml (原文件备份为 docker-compose.yml.backup)"
        echo "新的平台设置: ${RECOMMENDED_PLATFORM}"
    fi
fi
